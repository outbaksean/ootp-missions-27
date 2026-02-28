namespace mission_extractor.Services;

using mission_extractor.Models;
using System.Drawing;
using System.Drawing.Imaging;
using Windows.Graphics.Imaging;
using Windows.Media.Ocr;

/// <summary>
/// Service for capturing screen regions and performing OCR
/// </summary>
public class OcrCaptureService
{
    private readonly bool _debugImagesEnabled;

    public OcrCaptureService(bool debugImagesEnabled = false)
    {
        _debugImagesEnabled = debugImagesEnabled;
    }

    /// <summary>
    /// Capture a screen region and extract text using OCR
    /// </summary>
    public async Task<CaptureResult> CaptureScreenRegion(CaptureRegionConfig region, string debugImageOverrideName = "")
    {
        if (region.Width <= 0 || region.Height <= 0)
        {
            throw new ArgumentException("Capture region width and height must be greater than zero.");
        }

        var screenShotService = new ScreenshotService(_debugImagesEnabled);
        SoftwareBitmap softwareBitmap = await screenShotService.GetPreprocessedImage(region, debugImageOverrideName);

        var ocrEngine = OcrEngine.TryCreateFromUserProfileLanguages()
            ?? throw new InvalidOperationException("Unable to initialize Windows OCR engine.");

        var ocrResult = await ocrEngine.RecognizeAsync(softwareBitmap);
        var captureResult = new CaptureResult
        {
            CaptureType = "ScreenRegion",
            CaptureTime = DateTime.UtcNow,
            ExtractedText = ocrResult.Lines.Select(line => line.Text).ToList(),
            MetaData = new Dictionary<string, object>
            {
                { "RegionLeft", region.Left },
                { "RegionTop", region.Top },
                { "RegionWidth", region.Width },
                { "RegionHeight", region.Height }
            }
        };
        return captureResult;
    }

    /// <summary>
    /// Capture mission row structure from specified screen region
    /// </summary>
    public async Task<MissionRowStructure> CaptureMissionRowStructure(CaptureRegionConfig region)
    {
        if (region.Width <= 0 || region.Height <= 0)
        {
            throw new ArgumentException("Capture region width and height must be greater than zero.");
        }

        using var bitmap = new Bitmap(region.Width, region.Height, PixelFormat.Format32bppArgb);
        using (var graphics = Graphics.FromImage(bitmap))
        {
            graphics.CopyFromScreen(region.Left, region.Top, 0, 0, new Size(region.Width, region.Height));
        }

        using var memoryStream = new MemoryStream();
        bitmap.Save(memoryStream, ImageFormat.Bmp);
        memoryStream.Position = 0;

        using var randomAccessStream = memoryStream.AsRandomAccessStream();
        var decoder = await BitmapDecoder.CreateAsync(randomAccessStream);
        var softwareBitmap = await decoder.GetSoftwareBitmapAsync(BitmapPixelFormat.Bgra8, BitmapAlphaMode.Ignore);

        var ocrEngine = OcrEngine.TryCreateFromUserProfileLanguages()
            ?? throw new InvalidOperationException("Unable to initialize Windows OCR engine.");

        var ocrResult = await ocrEngine.RecognizeAsync(softwareBitmap);
        var lines = ocrResult.Lines.Select(line => line.Text).ToList();

        Console.WriteLine("OCR results:");
        if (lines.Count == 0)
        {
            Console.WriteLine("(no text recognized)");
        }
        else
        {
            foreach (var line in lines)
            {
                Console.WriteLine(line);
            }
        }

        return new MissionRowStructure
        {
            MissionId = lines.Count > 0 ? lines[0] : string.Empty,
            Title = lines.Count > 1 ? lines[1] : string.Empty,
            Description = lines.Count > 2 ? string.Join(" ", lines.Skip(2)) : string.Empty,
            Rewards = new List<string>()
        };
    }
}
