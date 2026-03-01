using MissionExtractor.dto;
using mission_extractor.Models;
using System.Text.RegularExpressions;

namespace mission_extractor.Services;

public class LightweightValidationService
{
    private readonly MissionState _missionState;

    public LightweightValidationService(MissionState missionState)
    {
        _missionState = missionState;
    }

    private static readonly HashSet<string> AvailableCategories = new(StringComparer.OrdinalIgnoreCase)
    {
        "Live Series",
        "Pack Rewards",
        "Launch Deck",
        "Bonus Rewards",
        "Immortal Seasons",
        "Negro Leagues",
        "Hall of Fame",
        "Baseball Reference",
        "Future Legends",
        "Launch Plus",
        "PT Elite",
        "Playoff Moments",
        "World Series Start",
        "Holiday Times",
        "Final Mission Set"
    };

    // Confirmed OCR status text patterns:
    //   Count:   "X / Y out of Z"  — Y -> RequiredCount
    //   Points:  "X / Y Points"    — Y -> TotalPoints
    //   Mission: "X / Y Missions"  — Y -> RequiredCount
    //   No match -> Type left null (reported as "Type Unparsed" by ValidateFields)
    private static readonly Regex CountPattern =
        new(@"\S+\s*/\s*(?:[a-z]+\s+)*(\d+)\s+out\s+of\s+\d+", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex PointsPattern =
        new(@"\S+\s*/\s*(\d+)\s+Points", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex MissionPattern =
        new(@"\S+\s*/\s*(\d+)\s+Missions", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    /// <summary>
    /// Runs all lightweight cleanup and validation steps in order and updates MissionState with the result.
    /// </summary>
    public List<ValidationError> Run()
    {
        var (afterEmpty, emptyRemoved) = RemoveEmptyMissions(_missionState.Missions);
        if (emptyRemoved > 0)
            Console.WriteLine($"Removed {emptyRemoved} empty mission(s).");

        var (afterDedup, dupRemoved) = Deduplicate(afterEmpty);
        if (dupRemoved > 0)
            Console.WriteLine($"Removed {dupRemoved} duplicate mission(s).");

        var result = RegenerateIds(afterDedup);

        CleanFields(result);

        ParseAllStatuses(result);

        StripDetailTrailingCommas(result);

        var errors = ValidateFields(result);

        if (errors.Count == 0)
            Console.WriteLine("Validation passed. No errors found.");

        _missionState.Replace(result);
        return errors;
    }

    /// <summary>
    /// Removes missions where all key fields are blank.
    /// </summary>
    public (List<Mission> result, int removedCount) RemoveEmptyMissions(IReadOnlyList<Mission> missions)
    {
        var result = missions
            .Where(m =>
                !string.IsNullOrWhiteSpace(m.Name) ||
                !string.IsNullOrWhiteSpace(m.Category) ||
                !string.IsNullOrWhiteSpace(m.Reward) ||
                !string.IsNullOrWhiteSpace(m.Status) ||
                m.MissionDetails.Count > 0)
            .ToList();

        return (result, missions.Count - result.Count);
    }

    /// <summary>
    /// Deduplicates by Name + Category, keeping the first occurrence of each.
    /// </summary>
    public (List<Mission> result, int removedCount) Deduplicate(IReadOnlyList<Mission> missions)
    {
        var seen = new HashSet<string>();
        var result = new List<Mission>();

        foreach (var mission in missions)
        {
            var key = $"{mission.Name.Trim()}|{mission.Category.Trim()}";
            if (seen.Add(key))
                result.Add(mission);
        }

        return (result, missions.Count - result.Count);
    }

    /// <summary>
    /// Reassigns sequential IDs starting at 1 and updates any missionIds cross-references.
    /// </summary>
    public List<Mission> RegenerateIds(List<Mission> missions)
    {
        var idMap = new Dictionary<int, int>();

        for (int i = 0; i < missions.Count; i++)
        {
            int oldId = missions[i].Id;
            int newId = i + 1;
            idMap[oldId] = newId;
            missions[i].Id = newId;
        }

        foreach (var mission in missions)
        {
            if (mission.MissionIds != null)
                mission.MissionIds = mission.MissionIds
                    .Select(id => idMap.TryGetValue(id, out int newId) ? newId : id)
                    .ToList();
        }

        return missions;
    }

    /// <summary>
    /// Trims OCR noise from key text fields: strips everything from the last "[" in Name,
    /// and strips everything from the last "(" in each MissionDetails entry.
    /// </summary>
    public void CleanFields(List<Mission> missions)
    {
        foreach (var mission in missions)
        {
            int bracketIndex = mission.Name.LastIndexOf('[');
            if (bracketIndex >= 0)
                mission.Name = mission.Name[..bracketIndex].TrimEnd();

            for (int i = 0; i < mission.MissionDetails.Count; i++)
            {
                int parenIndex = mission.MissionDetails[i].IndexOf('(');
                if (parenIndex >= 0)
                    mission.MissionDetails[i] = mission.MissionDetails[i][..parenIndex].TrimEnd();
                int buyIndex = mission.MissionDetails[i].IndexOf("Buy", StringComparison.InvariantCultureIgnoreCase);
                if (buyIndex >= 0)
                    mission.MissionDetails[i] = mission.MissionDetails[i][..buyIndex].TrimEnd();
                mission.MissionDetails[i] = mission.MissionDetails[i].Replace("Sell Orders", "", StringComparison.InvariantCultureIgnoreCase).TrimEnd();
                mission.MissionDetails[i] = mission.MissionDetails[i].Replace("Locked", "", StringComparison.InvariantCultureIgnoreCase).TrimStart();
                mission.MissionDetails[i] = mission.MissionDetails[i].TrimStart('-');

                mission.MissionDetails[i] = mission.MissionDetails[i].Replace("Historical AS", "Historical All-Star", StringComparison.InvariantCultureIgnoreCase).TrimEnd();
                mission.MissionDetails[i] = mission.MissionDetails[i].Replace("UnH Heroes", "Unsung Heroes", StringComparison.InvariantCultureIgnoreCase).TrimEnd();
                mission.MissionDetails[i] = mission.MissionDetails[i].Replace("RSSensation", "Rookie Sensation", StringComparison.InvariantCultureIgnoreCase).TrimEnd();
                mission.MissionDetails[i] = mission.MissionDetails[i].Replace("HaHes", "Hardware Heroes", StringComparison.InvariantCultureIgnoreCase).TrimEnd();
                mission.MissionDetails[i] = mission.MissionDetails[i].Replace("Future Leg", "Future Legend", StringComparison.InvariantCultureIgnoreCase).TrimEnd();
            }
        }
    }

    /// <summary>
    /// Strips trailing commas from MissionDetails entries for Count and Points missions.
    /// Must be called after ParseAllStatuses so Type is known.
    /// </summary>
    public void StripDetailTrailingCommas(List<Mission> missions)
    {
        foreach (var mission in missions)
        {
            if (mission.Type != MissionType.Count && mission.Type != MissionType.Points)
                continue;

            for (int i = 0; i < mission.MissionDetails.Count; i++)
                mission.MissionDetails[i] = mission.MissionDetails[i].Replace(",", "");
        }
    }

    /// <summary>
    /// Infers mission Type and sets RequiredCount or TotalPoints by parsing the Status field.
    /// Mutates each mission in place. Missions with no matching pattern remain Undefined.
    /// </summary>
    public void ParseAllStatuses(List<Mission> missions)
    {
        foreach (var mission in missions)
        {
            if (string.IsNullOrWhiteSpace(mission.Status))
                continue;

            Match m;
            if ((m = CountPattern.Match(mission.Status)).Success)
            {
                mission.Type = MissionType.Count;
                mission.RequiredCount = int.Parse(m.Groups[1].Value);
            }
            else if ((m = PointsPattern.Match(mission.Status)).Success)
            {
                mission.Type = MissionType.Points;
                mission.RequiredCount = int.Parse(m.Groups[1].Value);
            }
            else if ((m = MissionPattern.Match(mission.Status)).Success)
            {
                mission.Type = MissionType.Mission;
                mission.RequiredCount = int.Parse(m.Groups[1].Value);
            }
            // else: leave Type = null
        }
    }

    /// <summary>
    /// Validates all key fields of each mission. Images for each error are pulled from
    /// the mission's DebugImages dict by field name.
    /// </summary>
    public List<ValidationError> ValidateFields(IReadOnlyList<Mission> missions)
    {
        var errors = new List<ValidationError>();

        foreach (var mission in missions)
        {
            if (string.IsNullOrWhiteSpace(mission.Name))
                errors.Add(new ValidationError(mission, "Name Blank",
                    mission.DebugImages?.GetValueOrDefault("name")));

            if (string.IsNullOrWhiteSpace(mission.Category))
                errors.Add(new ValidationError(mission, "Category Blank",
                    mission.DebugImages?.GetValueOrDefault("category")));
            else if (!AvailableCategories.Contains(mission.Category.Trim()))
                errors.Add(new ValidationError(mission, "Category Invalid",
                    mission.DebugImages?.GetValueOrDefault("category")));

            if (string.IsNullOrWhiteSpace(mission.Reward))
                errors.Add(new ValidationError(mission, "Reward Blank",
                    mission.DebugImages?.GetValueOrDefault("reward")));

            if (string.IsNullOrWhiteSpace(mission.Status))
                errors.Add(new ValidationError(mission, "Status Blank",
                    mission.DebugImages?.GetValueOrDefault("status")));
            else if (mission.Type == null)
                errors.Add(new ValidationError(mission, "Type Unparsed",
                    mission.DebugImages?.GetValueOrDefault("status")));

            if (mission.MissionDetails.Count == 0)
                errors.Add(new ValidationError(mission, "MissionDetails Empty",
                    mission.DebugImages?.GetValueOrDefault("missionDetails")));
        }

        return errors;
    }

}
