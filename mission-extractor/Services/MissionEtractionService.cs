using mission_extractor.Models;

namespace mission_extractor.Services
{
    public class MissionEtractionService
    {
        private readonly MissionBoundryService _missionBoundryService;
        private readonly OcrCaptureService _ocrCaptureService;
        public MissionEtractionService(MissionRowBoundries missionRowBoundries, bool debugImagesEnabled = false)
        {
            _missionBoundryService = new MissionBoundryService(missionRowBoundries);
            _ocrCaptureService = new OcrCaptureService(debugImagesEnabled);
        }

        public async Task ExtractMissionRows()
        {
            int noDataCount = 0;
            int maxNoDataCount = 5;
            int rowIndex = 0;
            int maxRowIndex = _missionBoundryService.MaxRowIndex;
            while (noDataCount < maxNoDataCount && rowIndex <= maxRowIndex)
            {
                // TODO: Account for offset rows after scrolling down with anchoring to horizontal line
                CaptureResult captureResult = await ExtractCategory(rowIndex);
                Console.WriteLine($"Row {rowIndex} Category: {string.Join(", ", captureResult.ExtractedText)}");

                CaptureResult titleResult = await ExtractTitle(rowIndex);
                Console.WriteLine($"Row {rowIndex} Title: {string.Join(", ", titleResult.ExtractedText)}");

                CaptureResult rewardResult = await ExtractReward(rowIndex);
                Console.WriteLine($"Row {rowIndex} Reward: {string.Join(", ", rewardResult.ExtractedText)}");

                CaptureResult statusResult = await ExtractStatus(rowIndex);
                Console.WriteLine($"Row {rowIndex} Status: {string.Join(", ", statusResult.ExtractedText)}");

                rowIndex++;
                if (IsNoDataCapture(captureResult))
                {
                    noDataCount++;
                }
                else
                {
                    noDataCount = 0;
                }
            }
        }

        public async Task ExtractMissionDetails()
        {
            int noDataCount = 0;
            int maxNoDataCount = 5;
            int rowIndex = 0;
            int maxRowIndex = 2;
            int colIndex = 0;
            int maxColIndex = _missionBoundryService.MaxColumnIndex;
            while (noDataCount < maxNoDataCount && rowIndex <= maxRowIndex)
            {
                CaptureResult captureResult = await ExtractMissionDetail(rowIndex, colIndex);
                Console.WriteLine($"Mission Detail Row {rowIndex} Col {colIndex}: {string.Join(", ", captureResult.ExtractedText)}");
                colIndex++;
                if (colIndex > maxColIndex)
                {
                    colIndex = 0;
                    rowIndex++;
                }
                if (IsNoDataCapture(captureResult))
                {
                    noDataCount++;
                }
                else
                {
                    noDataCount = 0;
                }
            }
        }

        private async Task<CaptureResult> ExtractMissionDetail(int row, int column)
        {
            var captureRegion = _missionBoundryService.GetDetail(row, column);
            string debugImageOverrideName = $"Detail-{row}x{column}";
            return await _ocrCaptureService.CaptureScreenRegion(captureRegion, debugImageOverrideName);
        }

        private async Task<CaptureResult> ExtractCategory(int rowIndex)
        {
            var captureRegion = _missionBoundryService.GetCategory(rowIndex);
            string debugImageOverrideName = $"Category-{rowIndex}";
            return await _ocrCaptureService.CaptureScreenRegion(captureRegion, debugImageOverrideName);
        }

        private async Task<CaptureResult> ExtractReward(int rowIndex)
        {
            var captureRegion = _missionBoundryService.GetReward(rowIndex);
            string debugImageOverrideName = $"Reward-{rowIndex}";
            return await _ocrCaptureService.CaptureScreenRegion(captureRegion, debugImageOverrideName);
        }

        private async Task<CaptureResult> ExtractTitle(int rowIndex)
        {
            var captureRegion = _missionBoundryService.GetTitle(rowIndex);
            string debugImageOverrideName = $"Title-{rowIndex}";
            return await _ocrCaptureService.CaptureScreenRegion(captureRegion, debugImageOverrideName);
        }

        private async Task<CaptureResult> ExtractStatus(int rowIndex)
        {
            var captureRegion = _missionBoundryService.GetStatus(rowIndex);
            string debugImageOverrideName = $"Status-{rowIndex}";
            return await _ocrCaptureService.CaptureScreenRegion(captureRegion, debugImageOverrideName);
        }

        private bool IsNoDataCapture(CaptureResult captureResult)
        {
            // Define criteria for determining if the capture contains no data
            // For example, if the extracted text is empty or contains only whitespace
            return string.IsNullOrWhiteSpace(string.Join("", captureResult.ExtractedText));
        }
    }
}
