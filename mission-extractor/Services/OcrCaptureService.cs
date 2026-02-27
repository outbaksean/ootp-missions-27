namespace mission_extractor.Services;

using mission_extractor.Models;

/// <summary>
/// Service for capturing screen regions and performing OCR
/// </summary>
public class OcrCaptureService
{
    public OcrCaptureService()
    {
        // Initialize OCR engine
    }

    /// <summary>
    /// Capture a screen region and extract text using OCR
    /// </summary>
    public async Task<CaptureResult> CaptureScreenRegion(CaptureRegionConfig region, string captureType)
    {
        throw new NotImplementedException();
    }

    /// <summary>
    /// Capture mission row structure from specified screen region
    /// </summary>
    public async Task<MissionRowStructure> CaptureMissionRowStructure(CaptureRegionConfig region)
    {
        throw new NotImplementedException();
    }

    /// <summary>
    /// Capture shop cards from specified screen region
    /// </summary>
    public async Task<List<ShopCard>> CaptureShopCards(CaptureRegionConfig region)
    {
        throw new NotImplementedException();
    }
}
