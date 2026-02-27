namespace mission_extractor.Services;

using mission_extractor.Models;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using Windows.Graphics.Imaging;
using Windows.Media.Ocr;

/// <summary>
/// Service for capturing screen regions and performing OCR
/// </summary>
public class OcrCaptureService
{
    private readonly bool _debugImagesEnabled;
    private readonly string _debugImagesPath;

    public OcrCaptureService(bool debugImagesEnabled = false)
    {
        _debugImagesEnabled = debugImagesEnabled;
        _debugImagesPath = Path.Combine(AppContext.BaseDirectory, "debugImages");
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

        using var bitmap = new Bitmap(region.Width, region.Height, PixelFormat.Format32bppArgb);
        using (var graphics = Graphics.FromImage(bitmap))
        {
            graphics.CopyFromScreen(region.Left, region.Top, 0, 0, new Size(region.Width, region.Height));
        }

        var ocrEngine = OcrEngine.TryCreateFromUserProfileLanguages()
            ?? throw new InvalidOperationException("Unable to initialize Windows OCR engine.");

        var stamp = DateTime.Now.ToString("yyyyMMdd_HHmmss_fff");
        var baseName = string.IsNullOrWhiteSpace(debugImageOverrideName)
            ? $"capture_{stamp}_{region.Left}_{region.Top}_{region.Width}x{region.Height}"
            : debugImageOverrideName;

        if (_debugImagesEnabled)
        {
            Directory.CreateDirectory(_debugImagesPath);
            bitmap.Save(Path.Combine(_debugImagesPath, $"{baseName}_raw.png"), ImageFormat.Png);
        }

        List<string> bestText = await RecognizeLinesAsync(ocrEngine, bitmap);
        var bestScore = ScoreText(bestText);
        var bestVariant = "raw";

        using var scaledNearest = ScaleBitmap(bitmap, 3, InterpolationMode.NearestNeighbor);
        if (_debugImagesEnabled)
        {
            scaledNearest.Save(Path.Combine(_debugImagesPath, $"{baseName}_scaled_nearest.png"), ImageFormat.Png);
        }
        var nearestText = await RecognizeLinesAsync(ocrEngine, scaledNearest);
        var nearestScore = ScoreText(nearestText);
        if (nearestScore > bestScore)
        {
            bestText = nearestText;
            bestScore = nearestScore;
            bestVariant = "scaled_nearest";
        }

        using var scaledBicubic = ScaleBitmap(bitmap, 3, InterpolationMode.HighQualityBicubic);
        if (_debugImagesEnabled)
        {
            scaledBicubic.Save(Path.Combine(_debugImagesPath, $"{baseName}_scaled_bicubic.png"), ImageFormat.Png);
        }
        var bicubicText = await RecognizeLinesAsync(ocrEngine, scaledBicubic);
        var bicubicScore = ScoreText(bicubicText);
        if (bicubicScore > bestScore)
        {
            bestText = bicubicText;
            bestScore = bicubicScore;
            bestVariant = "scaled_bicubic";
        }

        using var thresholded = ToBlackAndWhite(scaledNearest, 170);
        if (_debugImagesEnabled)
        {
            thresholded.Save(Path.Combine(_debugImagesPath, $"{baseName}_threshold.png"), ImageFormat.Png);
        }
        var thresholdText = await RecognizeLinesAsync(ocrEngine, thresholded);
        var thresholdScore = ScoreText(thresholdText);
        if (thresholdScore > bestScore)
        {
            bestText = thresholdText;
            bestScore = thresholdScore;
            bestVariant = "threshold";
        }

        var captureResult = new CaptureResult
        {
            CaptureType = "ScreenRegion",
            CaptureTime = DateTime.UtcNow,
            ExtractedText = bestText,
            MetaData = new Dictionary<string, object>
            {
                { "RegionLeft", region.Left },
                { "RegionTop", region.Top },
                { "RegionWidth", region.Width },
                { "RegionHeight", region.Height },
                { "OcrBestVariant", bestVariant },
                { "OcrBestScore", bestScore }
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

    private static Bitmap ScaleBitmap(Bitmap source, int scale, InterpolationMode interpolationMode)
    {
        var scaled = new Bitmap(source.Width * scale, source.Height * scale, PixelFormat.Format32bppArgb);
        using var graphics = Graphics.FromImage(scaled);
        graphics.InterpolationMode = interpolationMode;
        graphics.PixelOffsetMode = PixelOffsetMode.Half;
        graphics.DrawImage(source, new Rectangle(0, 0, scaled.Width, scaled.Height));
        return scaled;
    }

    private static Bitmap ToBlackAndWhite(Bitmap source, byte threshold)
    {
        var output = new Bitmap(source.Width, source.Height, PixelFormat.Format32bppArgb);
        for (var y = 0; y < source.Height; y++)
        {
            for (var x = 0; x < source.Width; x++)
            {
                var pixel = source.GetPixel(x, y);
                var luminance = (byte)((pixel.R * 0.299) + (pixel.G * 0.587) + (pixel.B * 0.114));
                var value = luminance >= threshold ? 255 : 0;
                output.SetPixel(x, y, Color.FromArgb(255, value, value, value));
            }
        }

        return output;
    }

    private static int ScoreText(List<string> lines)
    {
        if (lines.Count == 0)
        {
            return 0;
        }

        var totalChars = lines.Sum(x => x.Length);
        return totalChars + (lines.Count * 5);
    }

    private static async Task<List<string>> RecognizeLinesAsync(OcrEngine ocrEngine, Bitmap bitmap)
    {
        using var memoryStream = new MemoryStream();
        bitmap.Save(memoryStream, ImageFormat.Bmp);
        memoryStream.Position = 0;

        using var randomAccessStream = memoryStream.AsRandomAccessStream();
        var decoder = await BitmapDecoder.CreateAsync(randomAccessStream);
        var softwareBitmap = await decoder.GetSoftwareBitmapAsync(BitmapPixelFormat.Bgra8, BitmapAlphaMode.Ignore);

        var ocrResult = await ocrEngine.RecognizeAsync(softwareBitmap);
        return ocrResult.Lines.Select(line => line.Text).ToList();
    }
}
