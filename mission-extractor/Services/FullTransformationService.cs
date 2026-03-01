using MissionExtractor.dto;
using mission_extractor.Models;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization.Metadata;
using System.Text.RegularExpressions;

namespace mission_extractor.Services;

public class FullTransformationService
{
    private readonly MissionState _missionState;
    private readonly LightweightValidationService _lws;
    private readonly CardMappingService _cardMapping;

    public FullTransformationService(
        MissionState missionState,
        LightweightValidationService lws,
        CardMappingService cardMapping)
    {
        _missionState = missionState;
        _lws = lws;
        _cardMapping = cardMapping;
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

    public async Task<List<ValidationError>> Run(string outputDirectory)
    {
        var (afterEmpty, emptyRemoved) = _lws.RemoveEmptyMissions(_missionState.Missions);
        if (emptyRemoved > 0)
            Console.WriteLine($"Removed {emptyRemoved} empty mission(s).");

        var (afterDedup, dupRemoved) = _lws.Deduplicate(afterEmpty);
        if (dupRemoved > 0)
            Console.WriteLine($"Removed {dupRemoved} duplicate mission(s).");

        var result = _lws.RegenerateIds(afterDedup);

        _lws.CleanFields(result);
        _lws.ParseAllStatuses(result);
        _lws.StripDetailTrailingCommas(result);
        DeduplicateMissionDetails(result);

        var errors = ValidateFields(result);
        var errorMissionIds = new HashSet<int>(errors.Select(e => e.Mission.Id));

        TransformPass1(result, errors, errorMissionIds);
        TransformPass2(result, errors, errorMissionIds);
        SetTotals(result);
        result = ReorderMissions(result, errors);

        _lws.RegenerateIds(result);

        if (errors.Count > 0)
            await GenerateValidationReport(result, errors, emptyRemoved, dupRemoved, outputDirectory);
        else
            Console.WriteLine("Validation passed.");

        await SaveTransformedMissions(result, outputDirectory);
        _missionState.Replace(result);
        return errors;
    }

    private static void DeduplicateMissionDetails(List<Mission> missions)
    {
        foreach (var mission in missions)
            mission.MissionDetails = mission.MissionDetails.Distinct().ToList();
    }

    private static List<ValidationError> ValidateFields(IReadOnlyList<Mission> missions)
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

    private void TransformPass1(
        List<Mission> missions,
        List<ValidationError> errors,
        HashSet<int> errorMissionIds)
    {
        foreach (var mission in missions)
        {
            if (errorMissionIds.Contains(mission.Id))
                continue;

            var detailImages = mission.DebugImages?.GetValueOrDefault("missionDetails");

            if (mission.Type == MissionType.Count)
            {
                var cards = new List<MissionCard>();
                for (int i = 0; i < mission.MissionDetails.Count; i++)
                {
                    var detail = mission.MissionDetails[i];
                    if (_cardMapping.TryLookup(detail, out var entry))
                    {
                        cards.Add(new MissionCard { CardId = entry.CardId });
                    }
                    else
                    {
                        cards.Add(new MissionCard { CardId = 0 });
                        errors.Add(new ValidationError(mission, $"Card Not Found: {detail}",
                            DetailImage(detailImages, i)));
                    }
                }
                mission.Cards = cards;
            }
            else if (mission.Type == MissionType.Points)
            {
                var cards = new List<MissionCard>();
                for (int i = 0; i < mission.MissionDetails.Count; i++)
                {
                    var detail = mission.MissionDetails[i];
                    var extractedPoints = TryExtractTrailingParenInt(detail);
                    var cleanTitle = detail;
                    int parenIndex = detail.LastIndexOf('(');
                    if (parenIndex >= 0)
                        cleanTitle = detail[..parenIndex].TrimEnd();

                    int cardId;
                    int mappedPoints;
                    if (_cardMapping.TryLookup(cleanTitle, out var entry))
                    {
                        cardId = entry.CardId;
                        mappedPoints = CardValueToPoints(entry.CardValue);
                    }
                    else
                    {
                        cardId = 0;
                        mappedPoints = 0;
                        errors.Add(new ValidationError(mission, $"Card Not Found: {cleanTitle}",
                            DetailImage(detailImages, i)));
                    }

                    if (extractedPoints != null && extractedPoints != mappedPoints)
                        errors.Add(new ValidationError(mission,
                            $"Points Mismatch: {cleanTitle} (expected {mappedPoints}, got {extractedPoints})",
                            DetailImage(detailImages, i)));

                    cards.Add(new MissionCard { CardId = cardId, Points = mappedPoints });
                }
                mission.Cards = cards;
            }
        }
    }

    private static void TransformPass2(
        List<Mission> missions,
        List<ValidationError> errors,
        HashSet<int> errorMissionIds)
    {
        var nameLookup = missions.ToDictionary(
            m => m.Name.Trim(),
            m => m.Id,
            StringComparer.OrdinalIgnoreCase);

        foreach (var mission in missions)
        {
            if (errorMissionIds.Contains(mission.Id))
                continue;

            if (mission.Type != MissionType.Mission)
                continue;

            var detailImages = mission.DebugImages?.GetValueOrDefault("missionDetails");
            mission.MissionIds = new List<int>();
            for (int i = 0; i < mission.MissionDetails.Count; i++)
            {
                var detail = mission.MissionDetails[i];
                if (nameLookup.TryGetValue(detail.Trim(), out int refId))
                {
                    mission.MissionIds.Add(refId);
                }
                else
                {
                    mission.MissionIds.Add(0);
                    errors.Add(new ValidationError(mission, $"Mission Not Found: {detail.Trim()}",
                        DetailImage(detailImages, i)));
                }
            }

            if (mission.MissionIds.Count != mission.RequiredCount)
                errors.Add(new ValidationError(mission,
                    $"Mission Count Mismatch: found {mission.MissionIds.Count}, expected {mission.RequiredCount}",
                    null));
        }
    }

    private List<Mission> ReorderMissions(List<Mission> missions, List<ValidationError> errors)
    {
        var inDegree = new Dictionary<int, int>(missions.Count);
        foreach (var m in missions)
            inDegree[m.Id] = 0;

        var dependents = new Dictionary<int, List<Mission>>();

        foreach (var m in missions.Where(m => m.Type == MissionType.Mission && m.MissionIds != null))
        {
            foreach (var refId in m.MissionIds!)
            {
                if (refId == 0) continue;
                if (!inDegree.ContainsKey(refId)) continue;

                if (!dependents.TryGetValue(refId, out var list))
                {
                    list = new List<Mission>();
                    dependents[refId] = list;
                }
                list.Add(m);
                inDegree[m.Id]++;
            }
        }

        var queue = new Queue<Mission>(missions.Where(m => inDegree[m.Id] == 0));
        var sorted = new List<Mission>(missions.Count);

        while (queue.Count > 0)
        {
            var current = queue.Dequeue();
            sorted.Add(current);

            if (dependents.TryGetValue(current.Id, out var deps))
            {
                foreach (var dep in deps)
                {
                    inDegree[dep.Id]--;
                    if (inDegree[dep.Id] == 0)
                        queue.Enqueue(dep);
                }
            }
        }

        if (sorted.Count < missions.Count)
        {
            Console.WriteLine("Warning: dependency cycle detected in Mission-type missions. Order not changed.");
            var sortedIds = new HashSet<int>(sorted.Select(m => m.Id));
            foreach (var m in missions.Where(m => !sortedIds.Contains(m.Id)))
                errors.Add(new ValidationError(m, "Dependency Cycle", null));
            return missions;
        }

        return sorted;
    }

    private static void SetTotals(List<Mission> missions)
    {
        foreach (var mission in missions)
        {
            mission.TotalPoints = mission.Type switch
            {
                MissionType.Count   => mission.Cards.Count,
                MissionType.Points  => mission.Cards.Sum(c => c.Points ?? 0),
                MissionType.Mission => mission.MissionIds?.Count ?? 0,
                _                   => 0
            };
        }
    }

    private static int CardValueToPoints(int cardValue) => cardValue switch
    {
        < 60  => 1,
        < 70  => 2,
        < 80  => 5,
        < 85  => 10,
        < 90  => 15,
        < 95  => 50,
        < 100 => 75,
        _     => 200
    };

    private static IReadOnlyList<string>? DetailImage(List<string>? images, int index) =>
        images != null && index < images.Count ? new[] { images[index] } : null;

    private static int? TryExtractTrailingParenInt(string text)
    {
        var match = Regex.Match(text, @"\((\d+)\)\s*$");
        return match.Success ? int.Parse(match.Groups[1].Value) : null;
    }

    private async Task GenerateValidationReport(
        IReadOnlyList<Mission> missions,
        List<ValidationError> errors,
        int emptyRemoved,
        int dupRemoved,
        string outputDirectory)
    {
        var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
        var reportPath = Path.Combine(outputDirectory, $"missions-validation-report-{timestamp}.html");

        var errorsByMission = errors
            .GroupBy(e => e.Mission.Id)
            .ToDictionary(g => g.Key, g => g.ToList());

        var sb = new StringBuilder();
        sb.AppendLine("<!DOCTYPE html><html><head><meta charset=\"utf-8\">");
        sb.AppendLine("<title>Validation Report</title>");
        sb.AppendLine("<style>");
        sb.AppendLine("body { font-family: monospace; padding: 20px; background: #fff; color: #000; }");
        sb.AppendLine("h1 { font-size: 1.2em; }");
        sb.AppendLine("h2 { font-size: 1em; margin-bottom: 4px; }");
        sb.AppendLine("table { border-collapse: collapse; width: 100%; }");
        sb.AppendLine("th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }");
        sb.AppendLine("th { background: #f4f4f4; }");
        sb.AppendLine(".flag { color: red; }");
        sb.AppendLine(".detail { margin-bottom: 28px; border-bottom: 1px solid #ccc; padding-bottom: 16px; }");
        sb.AppendLine(".error-label { margin: 4px 0; }");
        sb.AppendLine(".error-label span { color: red; font-weight: bold; margin-right: 8px; }");
        sb.AppendLine("img { display: inline-block; vertical-align: middle; max-height: 60px; image-rendering: pixelated; }");
        sb.AppendLine("pre { background: #f4f4f4; padding: 10px; overflow-x: auto; margin-top: 8px; }");
        sb.AppendLine("</style></head><body>");
        sb.AppendLine("<h1>Validation Report</h1>");
        sb.AppendLine($"<p>{dupRemoved} duplicate(s) removed. {emptyRemoved} empty mission(s) removed.</p>");

        sb.AppendLine("<table>");
        sb.AppendLine("<thead><tr><th>ID</th><th>Name</th><th>Category</th><th>Type</th><th>Flags</th></tr></thead>");
        sb.AppendLine("<tbody>");

        foreach (var mission in missions)
        {
            var flags = errorsByMission.TryGetValue(mission.Id, out var missionErrors)
                ? string.Join(", ", missionErrors.Select(e => e.ErrorType))
                : string.Empty;

            var flagCell = string.IsNullOrEmpty(flags)
                ? string.Empty
                : $"<span class=\"flag\">{WebUtility.HtmlEncode(flags)}</span>";

            sb.AppendLine("<tr>");
            sb.AppendLine($"<td>{mission.Id}</td>");
            sb.AppendLine($"<td>{WebUtility.HtmlEncode(mission.Name)}</td>");
            sb.AppendLine($"<td>{WebUtility.HtmlEncode(mission.Category)}</td>");
            sb.AppendLine($"<td>{mission.Type?.ToString() ?? string.Empty}</td>");
            sb.AppendLine($"<td>{flagCell}</td>");
            sb.AppendLine("</tr>");
        }

        sb.AppendLine("</tbody></table>");

        if (errors.Count == 0)
        {
            sb.AppendLine("<p>No issues found.</p>");
        }
        else
        {
            foreach (var mission in missions.Where(m => errorsByMission.ContainsKey(m.Id)))
            {
                var missionErrors = errorsByMission[mission.Id];
                sb.AppendLine("<div class=\"detail\">");
                sb.AppendLine($"<h2>Mission ID {mission.Id}: {WebUtility.HtmlEncode(mission.Name)}</h2>");

                foreach (var error in missionErrors)
                {
                    sb.Append("<p class=\"error-label\">");
                    sb.Append($"<span>{WebUtility.HtmlEncode(error.ErrorType)}</span>");

                    if (error.ImagePaths != null)
                    {
                        foreach (var imagePath in error.ImagePaths.Where(File.Exists))
                        {
                            var imageBytes = await File.ReadAllBytesAsync(imagePath);
                            var base64 = Convert.ToBase64String(imageBytes);
                            sb.Append($"<img src=\"data:image/png;base64,{base64}\" alt=\"OCR capture\" />");
                        }
                    }

                    sb.AppendLine("</p>");
                }

                var missionJson = JsonSerializer.Serialize(mission, new JsonSerializerOptions { WriteIndented = true });
                sb.AppendLine($"<pre>{WebUtility.HtmlEncode(missionJson)}</pre>");
                sb.AppendLine("</div>");
            }
        }

        sb.AppendLine("</body></html>");

        Directory.CreateDirectory(outputDirectory);
        await File.WriteAllTextAsync(reportPath, sb.ToString());
        Console.WriteLine($"Validation report saved to {reportPath}");
    }

    private static async Task SaveTransformedMissions(IReadOnlyList<Mission> missions, string outputDirectory)
    {
        Directory.CreateDirectory(outputDirectory);
        var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
        var jsonPath = Path.Combine(outputDirectory, $"missions-transformed-{timestamp}.json");

        var options = new JsonSerializerOptions
        {
            WriteIndented = true,
            TypeInfoResolver = new DefaultJsonTypeInfoResolver
            {
                Modifiers =
                {
                    static info =>
                    {
                        if (info.Type != typeof(Mission)) return;
                        foreach (var prop in info.Properties)
                            if (prop.Name is "status" or "missionDetails" or "debugImages")
                                prop.ShouldSerialize = (_, _) => false;
                    }
                }
            }
        };

        var json = JsonSerializer.Serialize(missions, options);
        await File.WriteAllTextAsync(jsonPath, json);
        Console.WriteLine($"Saved {missions.Count} transformed mission(s) to {jsonPath}");
    }
}
