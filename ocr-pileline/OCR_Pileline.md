# OCR Pipeline

## Objective
Use OCR to get mission text from OOTP into missions.json to be deployed in ootp-missions-27. MS PrintScreen Text Extractor (Win + Shift + T) will be used along with scripts and manual validation.

## Prelimary
From this directory: 
- Create a blank current-data.txt file
- Create a missions-structure.json file with the following:
```
{
  "version": "2026-02-22",
  "missions": []
}
```

## First Pass
This step is for getting the mission structures including category, name, reward and requirements into json.
Loop through extracting text from the mission page, inserting the missions into missions-structure.json until all missions are added.

1. In the OOTP mission page with no filter on and no missions expanded, extract all text using Text Extractor
2. Paste the results into current-data.txt and save
3. Run `insert-missions-structure.mjs` script to add mission category, name, reward, type and requirements to mission-structure.json without duplicating missions.
4. In OOTP Scroll down until you have new missions on screen then go to step 1 until all missions have been extracted

## Mission Structure Validation
A script will do basic validation of mission-structure.json and give a report of issues to the user. The user will clean up any issues.
Implementation TBD.

## Mission Details
This step is for getting card titles and mission titles needed to finish a mission, converting them to ids and inserting them into the json.
Loop through extracting each mission details from the mission page, updating missions-structure.json until all missions are updated

1. In the OOTP mission page, expand a mission that exists in mission-structures.json, extract all text using Text Extractor
2. Paste the results into current-data.txt and save
3. Run `update-mission-details.mjs` script to update requiredPoints and create or update `mission-details.json` with a list of card titles or mission names for the mission.
4. Repeat step 1 with a new mission until all missions have been extracted



### Alternatives to try
windows_media_ocr_cli - using Windows.Media.Ocr in C#
PsOCRCapture - Powershell for manual with more control than snip

``` C#
using System.Drawing;
using System.Drawing.Imaging;
using Windows.Media.Ocr;
using Windows.Graphics.Imaging;
using System.IO;

public async Task ProcessRegions()
{
    // 1. Setup OCR Engine
    var engine = OcrEngine.TryCreateFromLanguage(new Windows.Globalization.Language("en-US"));
    
    // 2. Define your exact pixel coordinates { X, Y, Width, Height }
    var regions = new[] {
        new Rectangle(100, 150, 300, 50), 
        new Rectangle(500, 200, 200, 40)
    };

    foreach (var rect in regions)
    {
        // 3. Capture specific rectangle from screen
        using (Bitmap bmp = new Bitmap(rect.Width, rect.Height))
        {
            using (Graphics g = Graphics.FromImage(bmp))
            {
                g.CopyFromScreen(rect.Left, rect.Top, 0, 0, rect.Size);
            }

            // 4. Convert System.Drawing.Bitmap to SoftwareBitmap (Required for OCR)
            using (var stream = new MemoryStream())
            {
                bmp.Save(stream, ImageFormat.Bmp);
                var decoder = await BitmapDecoder.CreateAsync(stream.AsRandomAccessStream());
                var softwareBitmap = await decoder.GetSoftwareBitmapAsync();

                // 5. Run OCR
                var result = await engine.RecognizeAsync(softwareBitmap);
                Console.WriteLine($"Region {rect}: {result.Text}");
            }
        }
    }
}
```

``` C#
using System.Drawing;
using System.Drawing.Imaging;
using System.Text.Json;
using Windows.Media.Ocr;
using Windows.Graphics.Imaging;

// 1. Grid Configuration (Pixels)
int startY = 200;    // Top row start
int rowHeight = 30;  // Height per row
int rowCount = 10;   // Number of rows to grab
int[] columns = { 100, 400, 700 }; // X-coordinates for Col A, Col B, Col C boundaries

var results = new List<Dictionary<string, string>>();
var engine = OcrEngine.TryCreateFromLanguage(new Windows.Globalization.Language("en-US"));

for (int i = 0; i < rowCount; i++)
{
    var rowData = new Dictionary<string, string>();
    int currentY = startY + (i * rowHeight);

    for (int c = 0; c < columns.Length - 1; c++)
    {
        int x = columns[c];
        int width = columns[c + 1] - x;
        
        // 2. Capture specific cell from screen
        using Bitmap bmp = new Bitmap(width, rowHeight);
        using (Graphics g = Graphics.FromImage(bmp))
        {
            // Use CopyFromScreen to grab from the global screen space
            g.CopyFromScreen(x, currentY, 0, 0, new Size(width, rowHeight));
        }

        // 3. Perform OCR
        string text = await GetTextFromBitmap(bmp, engine);
        rowData[$"Column_{c}"] = text.Trim();
    }
    results.Add(rowData);
}

// 4. Save to JSON
string jsonOutput = JsonSerializer.Serialize(results, new JsonSerializerOptions { WriteIndented = true });
File.WriteAllText("grid_data.json", jsonOutput);

async Task<string> GetTextFromBitmap(Bitmap bmp, OcrEngine engine)
{
    using var stream = new MemoryStream();
    bmp.Save(stream, ImageFormat.Bmp);
    var decoder = await BitmapDecoder.CreateAsync(stream.AsRandomAccessStream());
    var softBmp = await decoder.GetSoftwareBitmapAsync();
    var result = await engine.RecognizeAsync(softBmp);
    return result.Text;
}
```

## Critical Setup Notes

- NuGet: Install Microsoft.Windows.SDK.Contracts to access the Windows.Media.Ocr namespace in a console app.
- DPI Scaling: If your main monitor is set to 125% or 150% scaling in Windows Settings, your pixel coordinates will be scaled. To fix this, add an app.manifest to your project and set <dpiAware>true</dpiAware> to ensure 1:1 pixel mapping.
- Permissions: Ensure the app has "Screen Recording" permissions if Windows prompts for them. 

https://stackoverflow.com/questions/15792158/copyfromscreen-coordinates-off
https://www.leadtools.com/help/sdk/v21/tutorials/dotnet-core-export-ocr-results-to-json.html

## Anchor Strategy for offset rows

``` C#
using System.Drawing;
using System.Text.Json;
// ... other namespaces (Ocr, Imaging, etc.)

public async Task ExtractWithAnchor()
{
    // 1. Configuration
    int scanX = 150;           // A column X-coordinate where we know a line exists
    int searchStartY = 100;    // Where to start looking for the grid
    int searchMaxY = 500;      // How far down to look
    Color lineColor = Color.FromArgb(200, 200, 200); // The color of your grid lines
    
    // 2. Find the Anchor (Top of the first visible row)
    int anchorY = FindHorizontalLine(scanX, searchStartY, searchMaxY, lineColor);
    
    if (anchorY == -1) {
        Console.WriteLine("Could not find grid anchor. Is the window visible?");
        return;
    }

    // 3. Process Rows relative to the found Anchor
    int rowHeight = 35;
    int[] columns = { 100, 300, 600 }; 
    var results = new List<dynamic>();

    for (int i = 0; i < 10; i++) 
    {
        int currentY = anchorY + (i * rowHeight) + 2; // +2 to move inside the cell
        var row = new {
            ID = await GetOcr(new Rectangle(columns[0], currentY, columns[1]-columns[0], rowHeight)),
            Value = await GetOcr(new Rectangle(columns[1], currentY, columns[2]-columns[1], rowHeight))
        };
        results.Add(row);
    }

    File.WriteAllText("output.json", JsonSerializer.Serialize(results));
}

private int FindHorizontalLine(int x, int startY, int maxY, Color target)
{
    // Capture a 1-pixel wide strip to scan for the line color
    using Bitmap strip = new Bitmap(1, maxY - startY);
    using (Graphics g = Graphics.FromImage(strip)) {
        g.CopyFromScreen(x, startY, 0, 0, new Size(1, maxY - startY));
    }

    for (int y = 0; y < strip.Height; y++) {
        Color pixel = strip.GetPixel(0, y);
        // Use a small tolerance for color matching
        if (Math.Abs(pixel.R - target.R) < 10 && Math.Abs(pixel.G - target.G) < 10) {
            return startY + y;
        }
    }
    return -1;
}
```

Why this works for scrolling:

    Tolerance: By scanning a range (e.g., from Y=100 to Y=500), it doesn't matter if the grid starts exactly at the top or 50 pixels down.
    Speed: Scanning a 1-pixel strip for a color is nearly instantaneous (sub-millisecond).
    Reliability: As long as the grid line color is unique compared to the "whitespace" in the cells, it will find the anchor every time.

Troubleshooting Tips:

    Color Picking: Use a tool like PowerToys Color Picker (Win+Shift+C) to get the exact Hex/RGB value of your grid's horizontal line.
    Row Drifting: If the grid has borders of different thicknesses, you might want to "re-anchor" at every row (find the next line down) instead of multiplying i * rowHeight.

Would you like me to show you how to re-anchor for every row to account for grids that might have variable row heights?

How to make MS OCR even better:
If you still see errors in your grid extraction, try these two "cheats" in your C# code:

    Upscale by 2x: Before passing the Bitmap to the OCR engine, resize it to 200% using InterpolationMode.HighQualityBicubic. The engine loves larger targets.
    Padding: Don't crop right up to the text. Leave a 5-pixel "white buffer" around the text within your rectangle; OCR engines find text easier when it isn't touching the "edge" of the image.

Use Fira Sands or Roboto, prefer Fira Sands

## Upscale and padding

``` C#
using System.Drawing;
using System.Drawing.Drawing2D;

public Bitmap PrepareBitmapForOcr(Bitmap original, int scaleFactor = 3)
{
    int newWidth = original.Width * scaleFactor;
    int newHeight = original.Height * scaleFactor;
    
    // Create a slightly larger canvas to act as a "white padding" buffer
    int padding = 20; 
    Bitmap processedBmp = new Bitmap(newWidth + (padding * 2), newHeight + (padding * 2));

    using (Graphics g = Graphics.FromImage(processedBmp))
    {
        g.Clear(Color.White); // Vital: OCR engines need high-contrast background
        
        // Use HighQualityBicubic to keep edges sharp during the blow-up
        g.InterpolationMode = InterpolationMode.HighQualityBicubic;
        g.SmoothingMode = SmoothingMode.HighQuality;
        g.PixelOffsetMode = PixelOffsetMode.HighQuality;

        g.DrawImage(original, 
            new Rectangle(padding, padding, newWidth, newHeight), 
            new Rectangle(0, 0, original.Width, original.Height), 
            GraphicsUnit.Pixel);
    }

    return processedBmp;
}
```

## Updated Extranction Loop

``` C#
foreach (var rect in regions)
{
    using Bitmap rawCell = new Bitmap(rect.Width, rect.Height);
    using (Graphics g = Graphics.FromImage(rawCell))
    {
        g.CopyFromScreen(rect.Left, rect.Top, 0, 0, rect.Size);
    }

    // Apply the magic: Scale up 3x and add padding
    using Bitmap optimizedCell = PrepareBitmapForOcr(rawCell, 3);
    
    // Now convert optimizedCell to SoftwareBitmap and run OCR...
    string text = await GetTextFromBitmap(optimizedCell, engine);
}

## Packages

``` C#
using System.Drawing;              // For Bitmap, Graphics, Rectangle
using System.Drawing.Drawing2D;    // For InterpolationMode (the upscaling quality)
using System.Drawing.Imaging;      // For ImageFormat
using System.IO;                   // For MemoryStream
using System.Text.Json;            // For JSON output
using System.Threading.Tasks;      // For async/await support

// These come from the SDK Contracts:
using Windows.Media.Ocr;           // For OcrEngine
using Windows.Graphics.Imaging;    // For SoftwareBitmap and BitmapDecoder
```

## Debug Images

``` C#
// Inside your extraction loop:
string debugPath = Path.Combine("DebugImages", $"Row_{i}_Col_{c}.png");
optimizedCell.Save(debugPath, ImageFormat.Png); 
```