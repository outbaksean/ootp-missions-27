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

        const int ocrScale = 4;
        using var scaledBitmap = new Bitmap(region.Width * ocrScale, region.Height * ocrScale, PixelFormat.Format32bppArgb);
        using (var graphics = Graphics.FromImage(scaledBitmap))
        {
            graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
            graphics.PixelOffsetMode = PixelOffsetMode.Half; // Try HighQuality (no effect in testing)
            //graphics.SmoothingMode = SmoothingMode.HighQuality; // Try (no effect in testing)

            // Try Grayscape (no effect in testing)
            //var colorMatrix = new ColorMatrix(new float[][] {
            //    new float[] {.3f, .3f, .3f, 0, 0},
            //    new float[] {.59f, .59f, .59f, 0, 0},
            //    new float[] {.11f, .11f, .11f, 0, 0},
            //    new float[] {0, 0, 0, 1, 0},
            //    new float[] {0, 0, 0, 0, 1}
            //});
            //var attributes = new ImageAttributes();
            //attributes.SetColorMatrix(colorMatrix);


            //graphics.DrawImage(bitmap,
            //new Rectangle(0, 0, scaledBitmap.Width, scaledBitmap.Height),
            //0, 0, bitmap.Width, bitmap.Height,
            //GraphicsUnit.Pixel, attributes);


            graphics.DrawImage(
                bitmap,
                new Rectangle(0, 0, scaledBitmap.Width, scaledBitmap.Height),
                new Rectangle(0, 0, bitmap.Width, bitmap.Height),
                GraphicsUnit.Pixel);
        }

        // Try manual thresholding (no effect in testing)
        //var data = scaledBitmap.LockBits(new Rectangle(0, 0, scaledBitmap.Width, scaledBitmap.Height),
        //ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);

        //    unsafe
        //    {
        //        byte* ptr = (byte*)data.Scan0;
        //        for (int i = 0; i < data.Height * data.Width; i++)
        //        {
        //            // Calculate brightness (Average of RGB)
        //            int luminance = (ptr[0] + ptr[1] + ptr[2]) / 3;

        //            // Threshold: 180 is a good starting point for light backgrounds. 
        //            // Lower it if text disappears; raise it if background noise stays.
        //            byte color = (luminance < 180) ? (byte)0 : (byte)255;

        //            ptr[0] = ptr[1] = ptr[2] = color; // Set R, G, and B
        //            ptr += 4; // Move to next pixel (BGRA)
        //        }
        //    }
        //    scaledBitmap.UnlockBits(data);

        if (_debugImagesEnabled)
        {
            Directory.CreateDirectory(_debugImagesPath);
            var stamp = DateTime.Now.ToString("yyyyMMdd_HHmmss_fff");
            var rawFileName = $"capture_{stamp}_{region.Left}_{region.Top}_{region.Width}x{region.Height}_raw.png";
            var scaledFileName = $"capture_{stamp}_{region.Left}_{region.Top}_{scaledBitmap.Width}x{scaledBitmap.Height}_scaled.png";
            if (!string.IsNullOrWhiteSpace(debugImageOverrideName))
            {
                rawFileName = $"{debugImageOverrideName}.png";
                scaledFileName = $"{debugImageOverrideName}_scaled.png";
            }
            bitmap.Save(Path.Combine(_debugImagesPath, rawFileName), ImageFormat.Png);
            scaledBitmap.Save(Path.Combine(_debugImagesPath, scaledFileName), ImageFormat.Png);
        }

        // Create a larger "canvas" to ensure we meet minimum size requirements
        int paddingPixels = 100;
        int finalWidth = scaledBitmap.Width + paddingPixels;
        int finalHeight = scaledBitmap.Height + paddingPixels;

        using var paddedBitmap = new Bitmap(finalWidth, finalHeight, PixelFormat.Format32bppArgb);
        using (var g = Graphics.FromImage(paddedBitmap))
        {
            g.Clear(Color.White); // Use white (or your background color)
                                  // Center the scaled text in the padded area
            g.DrawImage(scaledBitmap, (finalWidth - scaledBitmap.Width) / 2, (finalHeight - scaledBitmap.Height) / 2);
        }
        // Proceed to save paddedBitmap to stream...

        using var memoryStream = new MemoryStream();
        paddedBitmap.Save(memoryStream, ImageFormat.Bmp);
        memoryStream.Position = 0;

        using var randomAccessStream = memoryStream.AsRandomAccessStream();
        var decoder = await BitmapDecoder.CreateAsync(randomAccessStream);
        var softwareBitmap = await decoder.GetSoftwareBitmapAsync(BitmapPixelFormat.Bgra8, BitmapAlphaMode.Ignore);

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
                { "RegionHeight", region.Height },
                { "OcrScale", ocrScale }
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
