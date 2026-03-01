using MissionExtractor.dto;
using mission_extractor.Models;
using System.Text.Json;

namespace mission_extractor.Services
{
    public class MissionEtractionService
    {
        private readonly MissionState _missionState;
        private readonly MissionBoundryService _missionBoundryService;
        private readonly OcrCaptureService _ocrCaptureService;

        public MissionEtractionService(
            MissionState missionState,
            MissionBoundryService missionBoundryService,
            OcrCaptureService ocrCaptureService)
        {
            _missionState = missionState;
            _missionBoundryService = missionBoundryService;
            _ocrCaptureService = ocrCaptureService;
        }

        private async Task<Mission?> CaptureTopMissionRow()
        {
            int nextId = _missionState.NextId();
            const int rowOffset = 0;

            CaptureResult categoryResult = await ExtractCategory(0, rowOffset, $"Category-{nextId}");
            if (IsNoDataCapture(categoryResult))
            {
                return null;
            }

            CaptureResult titleResult = await ExtractTitle(0, rowOffset, $"Title-{nextId}");
            CaptureResult rewardResult = await ExtractReward(0, rowOffset, $"Reward-{nextId}");
            CaptureResult statusResult = await ExtractStatus(0, rowOffset, $"Status-{nextId}");

            var debugImages = new Dictionary<string, List<string>>();
            if (categoryResult.DebugImagePath != null)
                debugImages["category"] = [categoryResult.DebugImagePath];
            if (titleResult.DebugImagePath != null)
                debugImages["name"] = [titleResult.DebugImagePath];
            if (rewardResult.DebugImagePath != null)
                debugImages["reward"] = [rewardResult.DebugImagePath];
            if (statusResult.DebugImagePath != null)
                debugImages["status"] = [statusResult.DebugImagePath];

            return new Mission
            {
                Id = nextId,
                DebugImages = debugImages.Count > 0 ? debugImages : null,
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
            var mission = _missionState.Missions.FirstOrDefault(m => m.Id == missionId);
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
            var missionDetailImages = new List<string>();

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
                    if (captureResult.DebugImagePath != null)
                        missionDetailImages.Add(captureResult.DebugImagePath);
                    detailsAdded++;
                    noDataCount = 0;
                }
                else
                {
                    noDataCount++;
                }
            }

            if (missionDetailImages.Count > 0)
            {
                mission.DebugImages ??= new();
                mission.DebugImages["missionDetails"] = missionDetailImages;
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

            _missionState.Add(mission);
            Console.WriteLine($"Captured mission row: [{mission.Id}] {mission.Name}");

            await ExtractMissionDetails(mission.Id);
        }

        public async Task SaveToPath(string filePath)
        {
            var dir = Path.GetDirectoryName(filePath);
            if (!string.IsNullOrEmpty(dir))
                Directory.CreateDirectory(dir);
            var json = JsonSerializer.Serialize(_missionState.Missions, new JsonSerializerOptions { WriteIndented = true });
            await File.WriteAllTextAsync(filePath, json);
            Console.WriteLine($"Saved {_missionState.Count} mission(s) to {filePath}");
        }

        public async Task SaveUnstructuredMissions(string outputDirectory)
        {
            Directory.CreateDirectory(outputDirectory);
            var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
            var filePath = Path.Combine(outputDirectory, $"missions-unstructured-{timestamp}.json");

            var options = new JsonSerializerOptions { WriteIndented = true };
            var json = JsonSerializer.Serialize(_missionState.Missions, options);
            await File.WriteAllTextAsync(filePath, json);

            Console.WriteLine($"Saved {_missionState.Count} mission(s) to {filePath}");
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

            _missionState.Replace(missions);
            Console.WriteLine($"Loaded {_missionState.Count} mission(s) from {filePath}");
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
