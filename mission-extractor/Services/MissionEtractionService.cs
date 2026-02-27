using mission_extractor.Models;
using System;
using System.Collections.Generic;
using System.Text;
using Windows.Media.Devices;

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
            int maxNoDataCount = 5; // Maximum number of consecutive no-data captures before stopping
            int rowIndex = 0;
            while (noDataCount < maxNoDataCount)
            {
                var captureRegion = _missionBoundryService.GetCategory(rowIndex);
                var captureResult = await _ocrCaptureService.CaptureScreenRegion(captureRegion);
                Console.WriteLine($"Captured Row {rowIndex} - Category: {string.Join(", ", captureResult.ExtractedText)}");

                rowIndex++;
                if (IsNoDataCapture(captureResult)) {
                    noDataCount++;
                }
            }
        }

        private bool IsNoDataCapture(CaptureResult captureResult)
        {
            // Define criteria for determining if the capture contains no data
            // For example, if the extracted text is empty or contains only whitespace
            return string.IsNullOrWhiteSpace(string.Join("", captureResult.ExtractedText));
        }
    }
}
