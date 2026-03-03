using MissionExtractor.dto;
using mission_extractor.Models;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace mission_extractor.Services;

public record LoadVerifiedResult(List<string> Errors, int LoadedCount, int MarkedVerifiedCount);

public class LoadVerifiedService
{
    private readonly MissionState _missionState;
    private readonly LightweightValidationService _lws;

    private static readonly HashSet<string> AvailableCategories = new(StringComparer.OrdinalIgnoreCase)
    {
        "Live Series", "Pack Rewards", "Launch Deck", "Bonus Rewards",
        "Immortal Seasons", "Negro Leagues", "Hall of Fame", "Baseball Reference",
        "Future Legends", "Launch Plus", "PT Elite", "Playoff Moments",
        "World Series Start", "Holiday Times", "Final Mission Set"
    };

    private static readonly JsonSerializerOptions CompareOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public LoadVerifiedService(MissionState missionState, LightweightValidationService lws)
    {
        _missionState = missionState;
        _lws = lws;
    }

    public LoadVerifiedResult Load(List<Mission> incoming)
    {
        var errors = new List<string>();
        int markedVerifiedCount = 0;

        // Phase 1: Deduplicate by name within the incoming file
        var candidates = DeduplicateIncoming(incoming, errors);

        // Phase 2: Per-mission validation
        var incomingIds = incoming.Select(m => m.Id).ToHashSet();
        var validCandidates = new List<Mission>();
        foreach (var mission in candidates)
        {
            var missionErrors = ValidateMission(mission, incomingIds);
            if (missionErrors.Count > 0)
                foreach (var e in missionErrors)
                    errors.Add($"'{mission.Name}': {e}");
            else
                validCandidates.Add(mission);
        }

        // Phase 3: Deduplicate against existing state
        var toLoad = new List<Mission>();
        foreach (var mission in validCandidates)
        {
            var existing = _missionState.Missions.FirstOrDefault(m =>
                string.Equals(m.Name.Trim(), mission.Name.Trim(), StringComparison.OrdinalIgnoreCase));

            if (existing == null)
            {
                mission.Verified = true;
                mission.ReadOnly = true;
                toLoad.Add(mission);
            }
            else if (FinalFieldsEqual(existing, mission))
            {
                if (!existing.Verified)
                {
                    existing.Verified = true;
                    markedVerifiedCount++;
                }
            }
            else
            {
                errors.Add($"'{mission.Name}': conflicts with existing mission in state (different final fields), not loaded");
            }
        }

        // Phase 4: Prepend to state and regenerate IDs
        if (toLoad.Count > 0)
        {
            // Remap incoming IDs to values above the current max to avoid conflicts
            // with existing state IDs before RegenerateIds renumbers everything
            int nextTempId = (_missionState.Count > 0 ? _missionState.Missions.Max(m => m.Id) : 0) + 1;
            var idRemap = new Dictionary<int, int>();
            foreach (var mission in toLoad)
            {
                idRemap[mission.Id] = nextTempId;
                mission.Id = nextTempId++;
            }
            foreach (var mission in toLoad)
            {
                if (mission.MissionIds != null)
                    mission.MissionIds = mission.MissionIds
                        .Select(id => idRemap.TryGetValue(id, out int newId) ? newId : id)
                        .ToList();
            }

            var allMissions = toLoad.Concat(_missionState.Missions).ToList();
            _lws.RegenerateIds(allMissions);
            _missionState.Replace(allMissions);
        }

        Console.WriteLine($"Loaded {toLoad.Count} verified mission(s). Marked {markedVerifiedCount} existing mission(s) as verified.");
        return new LoadVerifiedResult(errors, toLoad.Count, markedVerifiedCount);
    }

    private static List<Mission> DeduplicateIncoming(List<Mission> incoming, List<string> errors)
    {
        var result = new List<Mission>();
        var groups = incoming.GroupBy(m => m.Name.Trim(), StringComparer.OrdinalIgnoreCase);

        foreach (var group in groups)
        {
            var missions = group.ToList();
            if (missions.Count == 1)
            {
                result.Add(missions[0]);
                continue;
            }

            var firstJson = FinalFieldsJson(missions[0]);
            bool allSame = missions.Skip(1).All(m => FinalFieldsJson(m) == firstJson);

            if (allSame)
            {
                errors.Add($"'{group.Key}': {missions.Count} identical copies in file, loaded one");
                result.Add(missions[0]);
            }
            else
            {
                errors.Add($"'{group.Key}': duplicate name with different data in file, none loaded");
            }
        }

        return result;
    }

    private static List<string> ValidateMission(Mission m, HashSet<int> incomingIds)
    {
        var errors = new List<string>();

        if (m.RequiredCount <= 0)
            errors.Add($"requiredCount must be > 0 (got {m.RequiredCount})");

        if (m.Id == 0)
            errors.Add("id is 0");

        if (string.IsNullOrWhiteSpace(m.Reward))
            errors.Add("reward is blank");

        if (m.Type == null)
            errors.Add("type is invalid or missing");

        if (!AvailableCategories.Contains(m.Category?.Trim() ?? ""))
            errors.Add($"category '{m.Category}' is not in available categories");

        if (m.Cards.Any(c => c.CardId == 0))
            errors.Add("one or more cards has cardId 0");

        if (m.MissionIds != null && m.MissionIds.Any(id => id == 0))
            errors.Add("one or more missionIds is 0");

        if (m.Type == MissionType.Count)
        {
            int cardCount = m.Cards.Count;
            if (m.RequiredCount > cardCount)
                errors.Add($"count mission: requiredCount ({m.RequiredCount}) > cards.length ({cardCount})");
            if (cardCount != m.TotalPoints)
                errors.Add($"count mission: cards.length ({cardCount}) != totalPoints ({m.TotalPoints})");
        }
        else if (m.Type == MissionType.Points)
        {
            int sumPoints = m.Cards.Sum(c => c.Points ?? 0);
            if (m.RequiredCount > sumPoints)
                errors.Add($"points mission: requiredCount ({m.RequiredCount}) > sum of card points ({sumPoints})");
            if (sumPoints != m.TotalPoints)
                errors.Add($"points mission: sum of card points ({sumPoints}) != totalPoints ({m.TotalPoints})");
        }
        else if (m.Type == MissionType.Missions)
        {
            int missionIdsCount = m.MissionIds?.Count ?? 0;
            if (m.RequiredCount > missionIdsCount)
                errors.Add($"mission type: requiredCount ({m.RequiredCount}) > missionIds.length ({missionIdsCount})");
            if (missionIdsCount != m.TotalPoints)
                errors.Add($"mission type: missionIds.length ({missionIdsCount}) != totalPoints ({m.TotalPoints})");

            if (m.MissionIds != null)
            {
                var missing = m.MissionIds.Where(id => id != 0 && !incomingIds.Contains(id)).ToList();
                if (missing.Count > 0)
                    errors.Add($"mission type: missionIds [{string.Join(", ", missing)}] not found in file");
            }
        }

        return errors;
    }

    private static bool FinalFieldsEqual(Mission a, Mission b) =>
        FinalFieldsJson(a) == FinalFieldsJson(b);

    private static string FinalFieldsJson(Mission m)
    {
        var obj = new
        {
            name = m.Name?.Trim(),
            type = m.Type,
            requiredCount = m.RequiredCount,
            reward = m.Reward,
            category = m.Category,
            cards = m.Cards,
            missionIds = m.MissionIds,
            totalPoints = m.TotalPoints,
            rewards = m.Rewards
        };
        return JsonSerializer.Serialize(obj, CompareOptions);
    }
}
