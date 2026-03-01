using MissionExtractor.dto;
using mission_extractor.Models;
using System.Net;
using System.Text;
using System.Text.Json;
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
    public async Task<List<ValidationError>> Run(string outputDirectory)
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

        if (errors.Count > 0)
            await GenerateCleanupReport(result, errors, emptyRemoved, dupRemoved, outputDirectory);
        else
            Console.WriteLine("Validation passed. No errors found.");

        await SaveMissions(result, outputDirectory);

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
                mission.MissionDetails[i] = mission.MissionDetails[i].Replace("-", "", StringComparison.InvariantCultureIgnoreCase).TrimStart();

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

    /// <summary>
    /// Generates a self-contained HTML cleanup report showing every mission with its
    /// inferred type and flags. Only called when there are validation errors.
    /// Missions with errors get a detail section below the table with inline images and JSON.
    /// </summary>
    public async Task GenerateCleanupReport(
        IReadOnlyList<Mission> missions,
        List<ValidationError> errors,
        int emptyRemoved,
        int dupRemoved,
        string outputDirectory)
    {
        var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
        var reportPath = Path.Combine(outputDirectory, $"missions-cleanup-report-{timestamp}.html");

        var errorsByMission = errors
            .GroupBy(e => e.Mission.Id)
            .ToDictionary(g => g.Key, g => g.ToList());

        var sb = new StringBuilder();
        sb.AppendLine("<!DOCTYPE html><html><head><meta charset=\"utf-8\">");
        sb.AppendLine("<title>Cleanup Report</title>");
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
        sb.AppendLine("<h1>Cleanup Report</h1>");
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
        Console.WriteLine($"Cleanup report saved to {reportPath}");
    }

    /// <summary>
    /// Serializes the mission list to a timestamped unstructured JSON file.
    /// </summary>
    public async Task SaveMissions(IReadOnlyList<Mission> missions, string outputDirectory)
    {
        Directory.CreateDirectory(outputDirectory);
        var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
        var jsonPath = Path.Combine(outputDirectory, $"missions-unstructured-cleaned-{timestamp}.json");
        var json = JsonSerializer.Serialize(missions, new JsonSerializerOptions { WriteIndented = true });
        await File.WriteAllTextAsync(jsonPath, json);
        Console.WriteLine($"Saved {missions.Count} mission(s) to {jsonPath}");
    }
}
