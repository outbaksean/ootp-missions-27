using OpenCvSharp;
using Microsoft.Extensions.Configuration;

var projectDir = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", ".."));
var rootDir = Directory.GetParent(projectDir)!.FullName;

// Load configuration from appsettings.json
var configuration = new ConfigurationBuilder()
    .SetBasePath(projectDir)
    .AddJsonFile("appsettings.json", optional: false, reloadOnChange: false)
    .Build();

// Read profile settings (using first profile)
var profile = configuration.GetSection("OotpProfiles:0");
var topRow = profile.GetValue<int>("Boundaries:TopRow");
var rowHeight = profile.GetValue<int>("Boundaries:RowHeight");
var numRows = profile.GetValue<int>("Boundaries:NumRows");
var categoryLeft = profile.GetValue<int>("Boundaries:CategoryLeft");
var titleLeft = profile.GetValue<int>("Boundaries:TitleLeft");
var rewardLeft = profile.GetValue<int>("Boundaries:RewardLeft");
var statusLeft = profile.GetValue<int>("Boundaries:StatusLeft");
var statusRight = profile.GetValue<int>("Boundaries:StatusRight");

var inputFileDir = Path.Combine(rootDir, "screenshots", "missionsByCategory");
var outputFileDir = Path.Combine(rootDir, "output");
var engineFilePath = Path.Combine(rootDir, "tesseract");

// Define row parameters (loaded from configuration)
int firstRowY = topRow;
// rowHeight now comes from configuration

string[] inputFiles = Directory.GetFiles(inputFileDir, "*.png");
using (var ocrEngine = new Tesseract.TesseractEngine(engineFilePath, "eng", Tesseract.EngineMode.Default))
{
    foreach (var inputFile in inputFiles)
    {
        Console.WriteLine($"\nProcessing {Path.GetFileName(inputFile)}:");

        using (var img = Cv2.ImRead(inputFile))
        {
            var outputLines = new List<string>();

            // Calculate all row positions dynamically from firstRowY to bottom of image
            var rowTops = new List<int>();
            for (int y = firstRowY; y + rowHeight <= img.Height; y += rowHeight)
            {
                rowTops.Add(y);
            }

            Console.WriteLine($"  Image size: {img.Width}x{img.Height}, extracting {rowTops.Count} rows");

            for (int i = 0; i < rowTops.Count; i++)
            {
                int y = rowTops[i];
                var rowRect = new Rect(0, y, img.Width, rowHeight);

                // Crop to row
                using (var rowImg = new Mat(img, rowRect))
                {
                    // Preprocessing: convert to grayscale and apply thresholding
                    using (var gray = new Mat())
                    using (var binary = new Mat())
                    {
                        Cv2.CvtColor(rowImg, gray, ColorConversionCodes.BGR2GRAY);
                        Cv2.Threshold(gray, binary, 0, 255, ThresholdTypes.Binary | ThresholdTypes.Otsu);

                        // Convert to bytes for Tesseract
                        var bytes = binary.ToBytes(".png");
                        using (var pix = Tesseract.Pix.LoadFromMemory(bytes))
                        using (var page = ocrEngine.Process(pix))
                        {
                            var text = page.GetText().Trim();
                            Console.WriteLine($"  Row {i + 1} (y={y}): {text}");
                            outputLines.Add($"Row {i + 1}: {text}");
                        }
                    }
                }
            }

            // Save output
            var outputFilePath = Path.Combine(outputFileDir, Path.GetFileNameWithoutExtension(inputFile) + ".txt");
            File.WriteAllLines(outputFilePath, outputLines);
            Console.WriteLine($"Saved output to {outputFilePath}");
        }
    }
}


