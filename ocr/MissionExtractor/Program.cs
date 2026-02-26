using OpenCvSharp;
using Microsoft.Extensions.Configuration;
using System.Text.Json;
using MissionExtractor.dto;

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
var categoryRight = profile.GetValue<int>("Boundaries:CategoryRight");
var titleLeft = profile.GetValue<int>("Boundaries:TitleLeft");
var titleRight = profile.GetValue<int>("Boundaries:TitleRight");
var rewardLeft = profile.GetValue<int>("Boundaries:RewardLeft");
var rewardRight = profile.GetValue<int>("Boundaries:RewardRight");
var statusLeft = profile.GetValue<int>("Boundaries:StatusLeft");
var statusRight = profile.GetValue<int>("Boundaries:StatusRight");

var inputFileDir = Path.Combine(rootDir, "screenshots", "missionsByCategory");
var outputFileDir = Path.Combine(rootDir, "output");
var engineFilePath = Path.Combine(rootDir, "tesseract");

// Define row parameters (loaded from configuration)
int firstRowY = topRow;

string[] inputFiles = Directory.GetFiles(inputFileDir, "*.png");
var allMissions = new List<Mission>();
var missionId = 1;

using (var ocrEngine = new Tesseract.TesseractEngine(engineFilePath, "eng", Tesseract.EngineMode.Default))
{
    foreach (var inputFile in inputFiles)
    {
        Console.WriteLine($"\nProcessing {Path.GetFileName(inputFile)}:");

        using (var img = Cv2.ImRead(inputFile))
        {
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

                // Extract cells based on boundary positions
                var category = ExtractCellText(img, ocrEngine, categoryLeft, y, categoryRight - categoryLeft, rowHeight);
                var title = ExtractCellText(img, ocrEngine, titleLeft, y, titleRight - titleLeft, rowHeight);
                var reward = ExtractCellText(img, ocrEngine, rewardLeft, y, rewardRight - rewardLeft, rowHeight);
                var status = ExtractCellText(img, ocrEngine, statusLeft, y, statusRight - statusLeft, rowHeight);

                Console.WriteLine($"  Row {i + 1}: Category='{category}', Title='{title}', Reward='{reward}', Status='{status}'");

                // Create mission object
                var mission = new Mission
                {
                    Id = missionId++,
                    Name = title,
                    Category = category,
                    Reward = reward,
                    Type = MissionType.Mission // Default type
                };

                allMissions.Add(mission);
            }
        }
    }
}

// Serialize and save to JSON
var jsonOptions = new JsonSerializerOptions
{
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    WriteIndented = true,
    Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
};
var missionJson = JsonSerializer.Serialize(allMissions, jsonOptions);
var outputFilePath = Path.Combine(outputFileDir, "missions.json");
File.WriteAllText(outputFilePath, missionJson);
Console.WriteLine($"\nSaved {allMissions.Count} missions to {outputFilePath}");

static string ExtractCellText(Mat img, Tesseract.TesseractEngine ocrEngine, int x, int y, int width, int height)
{
    // Ensure bounds are within image
    x = Math.Max(0, x);
    y = Math.Max(0, y);
    width = Math.Min(width, img.Width - x);
    height = Math.Min(height, img.Height - y);

    if (width <= 0 || height <= 0)
        return string.Empty;

    var cellRect = new Rect(x, y, width, height);
    using (var cellImg = new Mat(img, cellRect))
    {
        using (var gray = new Mat())
        using (var contrast = new Mat())
        using (var binary = new Mat())
        {
            // Convert to grayscale
            Cv2.CvtColor(cellImg, gray, ColorConversionCodes.BGR2GRAY);

            // Enhance contrast
            Cv2.EqualizeHist(gray, contrast);

            // Adaptive thresholding for variable lighting
            Cv2.AdaptiveThreshold(contrast, binary, 255, AdaptiveThresholdTypes.MeanC, ThresholdTypes.Binary, 15, 10);

            // Morphological closing to reduce noise
            var kernel = Cv2.GetStructuringElement(MorphShapes.Rect, new Size(2, 2));
            Cv2.MorphologyEx(binary, binary, MorphTypes.Close, kernel);

            // Convert to bytes for Tesseract
            var bytes = binary.ToBytes(".png");
            using (var pix = Tesseract.Pix.LoadFromMemory(bytes))
            using (var page = ocrEngine.Process(pix, Tesseract.PageSegMode.SingleLine))
            {
                var text = page.GetText().Trim();
                // Optional: Clean up common OCR errors
                text = text.Replace("\n", " ").Replace("\r", "");
                return text;
            }
        }
    }
}