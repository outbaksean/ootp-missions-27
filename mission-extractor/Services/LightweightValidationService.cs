using MissionExtractor.dto;
using mission_extractor.Models;
using System.Net;
using System.Text;
using System.Text.Json;

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

    /// <summary>
    /// Runs all lightweight validation steps in order and updates MissionState with the result.
    /// </summary>
    public async Task Run(string outputDirectory)
    {
        var (afterEmpty, emptyRemoved) = RemoveEmptyMissions(_missionState.Missions);
        if (emptyRemoved > 0)
            Console.WriteLine($"Removed {emptyRemoved} empty mission(s).");

        var (afterDedup, dupRemoved) = Deduplicate(afterEmpty);
        if (dupRemoved > 0)
            Console.WriteLine($"Removed {dupRemoved} duplicate mission(s).");

        var result = RegenerateIds(afterDedup);

        var errors = ValidateCategories(result);
        if (errors.Count == 0)
        {
            Console.WriteLine("Validation passed. No errors found.");
        }
        else
        {
            Console.WriteLine($"{errors.Count} validation error(s) found. Generating report...");
            await GenerateReport(errors, outputDirectory);
        }

        await SaveMissions(result, outputDirectory);

        _missionState.Replace(result);
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
    /// Validates the category field of each mission against the allowed category list.
    /// Resolves the debug image path for each error at validation time so report
    /// generation has no knowledge of image naming conventions.
    /// </summary>
    public List<ValidationError> ValidateCategories(IReadOnlyList<Mission> missions)
    {
        var errors = new List<ValidationError>();

        foreach (var mission in missions)
        {
            if (string.IsNullOrWhiteSpace(mission.Category))
                errors.Add(new ValidationError(mission, "Category Blank", mission.CategoryImagePath));
            else if (!AvailableCategories.Contains(mission.Category.Trim()))
                errors.Add(new ValidationError(mission, "Category Invalid", mission.CategoryImagePath));
        }

        return errors;
    }

    /// <summary>
    /// Generates a self-contained HTML validation report with inline OCR images.
    /// </summary>
    public async Task GenerateReport(List<ValidationError> errors, string outputDirectory)
    {
        var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
        var reportPath = Path.Combine(outputDirectory, $"validation_lightweight_{timestamp}.html");

        var sb = new StringBuilder();
        sb.AppendLine("<!DOCTYPE html><html><head><meta charset=\"utf-8\">");
        sb.AppendLine("<title>Lightweight Validation Report</title>");
        sb.AppendLine("<style>");
        sb.AppendLine("body { font-family: monospace; padding: 20px; background: #fff; color: #000; }");
        sb.AppendLine("h1 { font-size: 1.2em; }");
        sb.AppendLine("h2 { font-size: 1em; margin-bottom: 4px; }");
        sb.AppendLine(".error { margin-bottom: 28px; border-bottom: 1px solid #ccc; padding-bottom: 16px; }");
        sb.AppendLine(".error-label { margin: 4px 0; }");
        sb.AppendLine(".error-label span { color: red; font-weight: bold; margin-right: 8px; }");
        sb.AppendLine("img { display: inline-block; vertical-align: middle; max-height: 60px; image-rendering: pixelated; }");
        sb.AppendLine("pre { background: #f4f4f4; padding: 10px; overflow-x: auto; margin-top: 8px; }");
        sb.AppendLine("</style></head><body>");
        sb.AppendLine("<h1>Lightweight Validation Report</h1>");
        sb.AppendLine($"<p>{errors.Count} error(s) across {errors.Select(e => e.Mission.Id).Distinct().Count()} mission(s).</p>");

        foreach (var error in errors)
        {
            sb.AppendLine("<div class=\"error\">");
            sb.AppendLine($"<h2>Mission ID {error.Mission.Id}: {WebUtility.HtmlEncode(error.Mission.Name)}</h2>");

            sb.Append("<p class=\"error-label\">");
            sb.Append($"<span>{WebUtility.HtmlEncode(error.ErrorType)}</span>");

            if (error.ImagePath != null)
            {
                var imageBytes = await File.ReadAllBytesAsync(error.ImagePath);
                var base64 = Convert.ToBase64String(imageBytes);
                sb.Append($"<img src=\"data:image/png;base64,{base64}\" alt=\"Category OCR capture\" />");
            }

            sb.AppendLine("</p>");

            var missionJson = JsonSerializer.Serialize(error.Mission, new JsonSerializerOptions { WriteIndented = true });
            sb.AppendLine($"<pre>{WebUtility.HtmlEncode(missionJson)}</pre>");
            sb.AppendLine("</div>");
        }

        sb.AppendLine("</body></html>");

        Directory.CreateDirectory(outputDirectory);
        await File.WriteAllTextAsync(reportPath, sb.ToString());
        Console.WriteLine($"Validation report saved to {reportPath}");
    }

    /// <summary>
    /// Serializes the mission list to a timestamped unstructured JSON file.
    /// </summary>
    public async Task SaveMissions(IReadOnlyList<Mission> missions, string outputDirectory)
    {
        Directory.CreateDirectory(outputDirectory);
        var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
        var jsonPath = Path.Combine(outputDirectory, $"mission_unstructured_{timestamp}.json");
        var json = JsonSerializer.Serialize(missions, new JsonSerializerOptions { WriteIndented = true });
        await File.WriteAllTextAsync(jsonPath, json);
        Console.WriteLine($"Saved {missions.Count} mission(s) to {jsonPath}");
    }
}
