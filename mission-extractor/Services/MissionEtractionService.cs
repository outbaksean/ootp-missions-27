using MissionExtractor.dto;
using mission_extractor.Models;
using System.Net;
using System.Text;
using System.Text.Json;

namespace mission_extractor.Services
{
    public class MissionEtractionService
    {
        private readonly MissionBoundryService _missionBoundryService;
        private readonly OcrCaptureService _ocrCaptureService;
        private readonly List<Mission> _missions = new();

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

        public IReadOnlyList<Mission> Missions => _missions.AsReadOnly();

        public MissionEtractionService(MissionRowBoundries missionRowBoundries, bool debugImagesEnabled = false)
        {
            _missionBoundryService = new MissionBoundryService(missionRowBoundries);
            _ocrCaptureService = new OcrCaptureService(debugImagesEnabled);
        }

        private async Task<Mission?> CaptureTopMissionRow()
        {
            int nextId = _missions.Count > 0 ? _missions.Max(m => m.Id) + 1 : 1;
            const int rowOffset = 0;

            CaptureResult categoryResult = await ExtractCategory(0, rowOffset, $"Category-{nextId}");
            if (IsNoDataCapture(categoryResult))
            {
                return null;
            }

            CaptureResult titleResult = await ExtractTitle(0, rowOffset, $"Title-{nextId}");
            CaptureResult rewardResult = await ExtractReward(0, rowOffset, $"Reward-{nextId}");
            CaptureResult statusResult = await ExtractStatus(0, rowOffset, $"Status-{nextId}");

            return new Mission
            {
                Id = nextId,
                Category = string.Join(" ", categoryResult.ExtractedText).Trim(),
                Name = string.Join(" ", titleResult.ExtractedText).Trim(),
                Reward = string.Join(" ", rewardResult.ExtractedText).Trim(),
                Status = string.Join(" ", statusResult.ExtractedText).Trim()
            };
        }

        /// <summary>
        /// Captures the detail card grid and appends detail text to the specified mission.
        /// </summary>
        public async Task ExtractMissionDetails(int missionId)
        {
            var mission = _missions.FirstOrDefault(m => m.Id == missionId);
            if (mission == null)
            {
                Console.WriteLine($"No mission found with ID {missionId}.");
                return;
            }

            Console.WriteLine($"Capturing details for mission {missionId}: {mission.Name}...");

            int noDataCount = 0;
            int maxNoDataCount = 2;
            int rowIndex = 0;
            int maxRowIndex = 2;
            int colIndex = 0;
            int maxColIndex = _missionBoundryService.MaxColumnIndex;
            int detailsAdded = 0;

            while (noDataCount < maxNoDataCount && rowIndex <= maxRowIndex)
            {
                CaptureResult captureResult = await ExtractMissionDetail(rowIndex, colIndex, 0);
                var text = string.Join(" ", captureResult.ExtractedText).Trim();

                colIndex++;
                if (colIndex > maxColIndex)
                {
                    colIndex = 0;
                    rowIndex++;
                }

                if (!string.IsNullOrWhiteSpace(text))
                {
                    mission.MissionDetails.Add(text);
                    detailsAdded++;
                    noDataCount = 0;
                }
                else
                {
                    noDataCount++;
                }
            }

            Console.WriteLine($"Added {detailsAdded} detail(s) to mission {missionId}.");
        }

        /// <summary>
        /// Captures the top mission row and its detail card grid, appending a new Mission to memory.
        /// Use this when OOTP has a single mission selected/expanded on screen.
        /// </summary>
        public async Task ExtractTopMissionStructureAndDetails()
        {
            var mission = await CaptureTopMissionRow();
            if (mission == null)
            {
                Console.WriteLine("No mission data found in the top row. Aborting.");
                return;
            }

            _missions.Add(mission);
            Console.WriteLine($"Captured mission row: [{mission.Id}] {mission.Name}");

            await ExtractMissionDetails(mission.Id);
        }

        public async Task RunLightweightValidation(string outputDirectory)
        {
            // Remove empty missions (all key fields blank)
            int removed = _missions.RemoveAll(m =>
                string.IsNullOrWhiteSpace(m.Name) &&
                string.IsNullOrWhiteSpace(m.Category) &&
                string.IsNullOrWhiteSpace(m.Reward) &&
                string.IsNullOrWhiteSpace(m.Status) &&
                m.MissionDetails.Count == 0);

            if (removed > 0)
                Console.WriteLine($"Removed {removed} empty mission(s).");

            // Deduplicate by Name + Category, keeping first occurrence
            var seen = new HashSet<string>();
            var deduplicated = new List<Mission>();
            foreach (var mission in _missions)
            {
                var key = $"{mission.Name.Trim()}|{mission.Category.Trim()}";
                if (seen.Add(key))
                    deduplicated.Add(mission);
            }

            int duplicatesRemoved = _missions.Count - deduplicated.Count;
            if (duplicatesRemoved > 0)
                Console.WriteLine($"Removed {duplicatesRemoved} duplicate mission(s).");

            // Regenerate IDs, updating any missionIds cross-references
            var idMap = new Dictionary<int, int>();
            for (int i = 0; i < deduplicated.Count; i++)
            {
                int oldId = deduplicated[i].Id;
                int newId = i + 1;
                idMap[oldId] = newId;
                deduplicated[i].Id = newId;
            }

            foreach (var mission in deduplicated)
            {
                if (mission.MissionIds != null)
                    mission.MissionIds = mission.MissionIds
                        .Select(id => idMap.TryGetValue(id, out int newId) ? newId : id)
                        .ToList();
            }

            _missions.Clear();
            _missions.AddRange(deduplicated);

            // Validate category for each mission
            var errors = new List<(Mission Mission, string ErrorType)>();
            foreach (var mission in _missions)
            {
                if (string.IsNullOrWhiteSpace(mission.Category))
                    errors.Add((mission, "Category Blank"));
                else if (!AvailableCategories.Contains(mission.Category.Trim()))
                    errors.Add((mission, "Category Invalid"));
            }

            if (errors.Count == 0)
            {
                Console.WriteLine("Validation passed. No errors found.");
            }
            else
            {
                Console.WriteLine($"{errors.Count} validation error(s) found. Generating report...");
                await GenerateLightweightValidationReport(errors, outputDirectory);
            }

            // Save full missions array regardless of validation result
            Directory.CreateDirectory(outputDirectory);
            var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
            var jsonPath = Path.Combine(outputDirectory, $"mission_unstructured_{timestamp}.json");
            var json = JsonSerializer.Serialize(_missions, new JsonSerializerOptions { WriteIndented = true });
            await File.WriteAllTextAsync(jsonPath, json);
            Console.WriteLine($"Saved {_missions.Count} mission(s) to {jsonPath}");
        }

        private async Task GenerateLightweightValidationReport(
            List<(Mission Mission, string ErrorType)> errors,
            string outputDirectory)
        {
            var debugImagesPath = Path.Combine(AppContext.BaseDirectory, "debugImages");
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

            foreach (var (mission, errorType) in errors)
            {
                sb.AppendLine("<div class=\"error\">");
                sb.AppendLine($"<h2>Mission ID {mission.Id}: {WebUtility.HtmlEncode(mission.Name)}</h2>");

                sb.Append("<p class=\"error-label\">");
                sb.Append($"<span>{WebUtility.HtmlEncode(errorType)}</span>");

                var imagePath = Path.Combine(debugImagesPath, $"Category-{mission.Id}.png");
                if (File.Exists(imagePath))
                {
                    var imageBytes = await File.ReadAllBytesAsync(imagePath);
                    var base64 = Convert.ToBase64String(imageBytes);
                    sb.Append($"<img src=\"data:image/png;base64,{base64}\" alt=\"Category OCR capture\" />");
                }

                sb.AppendLine("</p>");

                var missionJson = JsonSerializer.Serialize(mission, new JsonSerializerOptions { WriteIndented = true });
                sb.AppendLine($"<pre>{WebUtility.HtmlEncode(missionJson)}</pre>");
                sb.AppendLine("</div>");
            }

            sb.AppendLine("</body></html>");

            Directory.CreateDirectory(outputDirectory);
            await File.WriteAllTextAsync(reportPath, sb.ToString());
            Console.WriteLine($"Validation report saved to {reportPath}");
        }

        public async Task SaveUnstructuredMissions(string outputDirectory)
        {
            Directory.CreateDirectory(outputDirectory);
            var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
            var filePath = Path.Combine(outputDirectory, $"missions-unstructured-{timestamp}.json");

            var options = new JsonSerializerOptions { WriteIndented = true };
            var json = JsonSerializer.Serialize(_missions, options);
            await File.WriteAllTextAsync(filePath, json);

            Console.WriteLine($"Saved {_missions.Count} mission(s) to {filePath}");
        }

        public async Task LoadUnstructuredMissions(string filePath)
        {
            if (!File.Exists(filePath))
            {
                Console.WriteLine($"File not found: {filePath}");
                return;
            }

            var json = await File.ReadAllTextAsync(filePath);
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var missions = JsonSerializer.Deserialize<List<Mission>>(json, options);

            if (missions == null)
            {
                Console.WriteLine("Failed to deserialize missions from file.");
                return;
            }

            _missions.Clear();
            _missions.AddRange(missions);
            Console.WriteLine($"Loaded {_missions.Count} mission(s) from {filePath}");
        }

        private async Task<CaptureResult> ExtractMissionDetail(int row, int column, int rowOffset)
        {
            var captureRegion = _missionBoundryService.GetDetail(row, column, rowOffset);
            string debugImageOverrideName = $"Detail-{row}x{column}";
            return await _ocrCaptureService.CaptureScreenRegion(captureRegion, debugImageOverrideName);
        }

        private async Task<CaptureResult> ExtractCategory(int rowIndex, int rowOffset, string? debugNameOverride = null)
        {
            var captureRegion = _missionBoundryService.GetCategory(rowIndex, rowOffset);
            string debugImageOverrideName = debugNameOverride ?? $"Category-{rowIndex}";
            return await _ocrCaptureService.CaptureScreenRegion(captureRegion, debugImageOverrideName);
        }

        private async Task<CaptureResult> ExtractReward(int rowIndex, int rowOffset, string? debugNameOverride = null)
        {
            var captureRegion = _missionBoundryService.GetReward(rowIndex, rowOffset);
            string debugImageOverrideName = debugNameOverride ?? $"Reward-{rowIndex}";
            return await _ocrCaptureService.CaptureScreenRegion(captureRegion, debugImageOverrideName);
        }

        private async Task<CaptureResult> ExtractTitle(int rowIndex, int rowOffset, string? debugNameOverride = null)
        {
            var captureRegion = _missionBoundryService.GetTitle(rowIndex, rowOffset);
            string debugImageOverrideName = debugNameOverride ?? $"Title-{rowIndex}";
            return await _ocrCaptureService.CaptureScreenRegion(captureRegion, debugImageOverrideName);
        }

        private async Task<CaptureResult> ExtractStatus(int rowIndex, int rowOffset, string? debugNameOverride = null)
        {
            var captureRegion = _missionBoundryService.GetStatus(rowIndex, rowOffset);
            string debugImageOverrideName = debugNameOverride ?? $"Status-{rowIndex}";
            return await _ocrCaptureService.CaptureScreenRegion(captureRegion, debugImageOverrideName);
        }

        private bool IsNoDataCapture(CaptureResult captureResult)
        {
            return string.IsNullOrWhiteSpace(string.Join("", captureResult.ExtractedText));
        }
    }
}
