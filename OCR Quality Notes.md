# OCR Quality Notes

The Windows.Media.Ocr engine is highly optimized for document scanning (black text on white backgrounds). When you feed it small, UI-based "cells" (like from a game or spreadsheet), it often fails because the contrast is too low, the text is too small, or the anti-aliasing confuses the edge detection.
Here are the recommended improvements to your code to fix that 30% failure rate:
1. Change Interpolation Mode
You are currently using NearestNeighbor. While this makes things bigger, it creates "jaggy" edges that the OCR engine hates. For OCR, you want HighQualityBicubic. This smooths out the font curves, making them look more like the printed text the engine expects.
2. Convert to Grayscale & Increase Contrast
The Windows OCR engine performs significantly better on 8-bit grayscale than it does on 32-bit ARGB. By flattening the image and boosting contrast, you remove background "noise" that might be preventing detection.


``` C#
const int ocrScale = 3;
using var scaledBitmap = new Bitmap(region.Width * ocrScale, region.Height * ocrScale, PixelFormat.Format32bppArgb);

using (var graphics = Graphics.FromImage(scaledBitmap))
{
    // CHANGE: Use HighQualityBicubic instead of NearestNeighbor
    graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
    graphics.SmoothingMode = SmoothingMode.HighQuality;
    graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;

    // Optional: Set a white background first (improves results for transparent text)
    graphics.Clear(Color.White);

    using var attributes = new ImageAttributes();
    // OPTIONAL: Increase contrast via a ColorMatrix if cells are dim
    // var matrix = new ColorMatrix(new float[][] { ... });
    // attributes.SetColorMatrix(matrix);

    graphics.DrawImage(
        bitmap,
        new Rectangle(0, 0, scaledBitmap.Width, scaledBitmap.Height),
        0, 0, bitmap.Width, bitmap.Height,
        GraphicsUnit.Pixel,
        attributes);
}

// NEW: Convert to Grayscale for the OCR Engine
using var memoryStream = new MemoryStream();
scaledBitmap.Save(memoryStream, ImageFormat.Bmp); 
memoryStream.Position = 0;

using var randomAccessStream = memoryStream.AsRandomAccessStream();
var decoder = await BitmapDecoder.CreateAsync(randomAccessStream);

// CHANGE: Use Gray8 instead of Bgra8
// This forces the engine to focus on luminance (text) rather than color channels.
var softwareBitmap = await decoder.GetSoftwareBitmapAsync(BitmapPixelFormat.Gray8, BitmapAlphaMode.Ignore);
```




