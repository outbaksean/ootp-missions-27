using MissionExtractor.dto;
using mission_extractor.Models;
using System.Text.Json;

namespace mission_extractor.Services
{
    public class MissionEtractionService
    {
        private readonly MissionBoundryService _missionBoundryService;
        private readonly OcrCaptureService _ocrCaptureService;
        private readonly List<Mission> _missions = new();

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

            CaptureResult categoryResult = await ExtractCategory(0, rowOffset);
            if (IsNoDataCapture(categoryResult))
            {
                return null;
            }

            CaptureResult titleResult = await ExtractTitle(0, rowOffset);
            CaptureResult rewardResult = await ExtractReward(0, rowOffset);
            CaptureResult statusResult = await ExtractStatus(0, rowOffset);

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

        private async Task<CaptureResult> ExtractCategory(int rowIndex, int rowOffset)
        {
            var captureRegion = _missionBoundryService.GetCategory(rowIndex, rowOffset);
            string debugImageOverrideName = $"Category-{rowIndex}";
            return await _ocrCaptureService.CaptureScreenRegion(captureRegion, debugImageOverrideName);
        }

        private async Task<CaptureResult> ExtractReward(int rowIndex, int rowOffset)
        {
            var captureRegion = _missionBoundryService.GetReward(rowIndex, rowOffset);
            string debugImageOverrideName = $"Reward-{rowIndex}";
            return await _ocrCaptureService.CaptureScreenRegion(captureRegion, debugImageOverrideName);
        }

        private async Task<CaptureResult> ExtractTitle(int rowIndex, int rowOffset)
        {
            var captureRegion = _missionBoundryService.GetTitle(rowIndex, rowOffset);
            string debugImageOverrideName = $"Title-{rowIndex}";
            return await _ocrCaptureService.CaptureScreenRegion(captureRegion, debugImageOverrideName);
        }

        private async Task<CaptureResult> ExtractStatus(int rowIndex, int rowOffset)
        {
            var captureRegion = _missionBoundryService.GetStatus(rowIndex, rowOffset);
            string debugImageOverrideName = $"Status-{rowIndex}";
            return await _ocrCaptureService.CaptureScreenRegion(captureRegion, debugImageOverrideName);
        }

        private bool IsNoDataCapture(CaptureResult captureResult)
        {
            return string.IsNullOrWhiteSpace(string.Join("", captureResult.ExtractedText));
        }
    }
}
