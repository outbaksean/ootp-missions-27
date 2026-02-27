using Microsoft.Extensions.Configuration;
using mission_extractor.Models;
using mission_extractor.Services;

// Load configuration
var config = new ConfigurationBuilder()
    .SetBasePath(AppContext.BaseDirectory)
    .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
    .Build();

// Initialize services
var ocrService = new OcrCaptureService();

var selectedProfileName = config["SelectedOOTPProfile"];

var selectedProfileSection = config
    .GetSection("OotpProfiles")
    .GetChildren()
    .FirstOrDefault(profile =>
        string.Equals(profile["Name"], selectedProfileName, StringComparison.OrdinalIgnoreCase));

MissionRowBoundries missionRowBoundries = selectedProfileSection?
    .GetSection("MissionRowBoundaries")
    .Get<MissionRowBoundries>() ?? new();

var debugImagesEnabled = config.GetValue<bool>("DebugImages");
var missionExtractionService = new MissionEtractionService(missionRowBoundries, debugImagesEnabled);

await RunMenuLoop(missionExtractionService);

async Task RunMenuLoop(
    MissionEtractionService missionExtractionService)
{
    bool isRunning = true;

    while (isRunning)
    {
        DisplayMenu();
        var choice = Console.ReadLine();

        if (isRunning && choice != "4")
        {
            Console.Clear();
        }

        switch (choice)
        {
            case "1":
                await CaptureMissionRowStructure();
                break;
            case "2":
                await CaptureMainScreen();
                break;
            case "3":
                await CaptureMissionDetails();
                break;
            case "4":
                isRunning = false;
                Console.WriteLine("Exiting application...");
                break;
            default:
                Console.WriteLine("Invalid choice. Please try again.");
                break;
        }
    }
}

void DisplayMenu()
{
    Console.WriteLine("\n=== Mission Extractor Menu ===");
    Console.WriteLine("1. Capture mission row structure");
    Console.WriteLine("2. Capture main screen");
    Console.WriteLine("3. Capture mission details");
    Console.WriteLine("4. Exit");
    Console.WriteLine("==============================");
    Console.Write("Enter your choice (1-4): ");
}

async Task CaptureMissionRowStructure()
{
    Console.WriteLine("\nCapturing mission row structure...");
    try
    {
        await missionExtractionService.ExtractMissionRows();
        Console.WriteLine("Data prepared for serialization to JSON.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error: {ex.Message}");
    }
}

async Task CaptureMissionDetails()
{
    Console.WriteLine("\nCapturing mission details...");
    try
    {
        await missionExtractionService.ExtractMissionDetails();
        Console.WriteLine("Data prepared for serialization to JSON.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error: {ex.Message}");
    }
}

async Task CaptureMainScreen()
{
    var ocrCaptureService = new OcrCaptureService(debugImagesEnabled);
    var cardExtractionService = new CardExtractionService();
    
    var debugImageOverrideName = "MainScreenCapture2";
    var captureRegion = new CaptureRegionConfig
    {
        Left = 17,
        Top = 375,
        Width = 2850,
        Height = 1000
    };
    var captureResult = await ocrCaptureService.CaptureScreenRegion(captureRegion, debugImageOverrideName);
    
    Console.WriteLine($"\nTotal OCR words detected: {captureResult.OcrWords.Count}");
    
    // Write word positions to file for debugging
    var debugPath = Path.Combine(AppContext.BaseDirectory, "debugImages", "word_positions.txt");
    Directory.CreateDirectory(Path.GetDirectoryName(debugPath)!);
    using (var writer = new StreamWriter(debugPath))
    {
        writer.WriteLine("Text\tLeft\tTop\tWidth\tHeight");
        foreach (var word in captureResult.OcrWords.OrderBy(w => w.Top).ThenBy(w => w.Left))
        {
            writer.WriteLine($"{word.Text}\t{word.Left:F1}\t{word.Top:F1}\t{word.Width:F1}\t{word.Height:F1}");
        }
    }
    Console.WriteLine($"Word positions written to: {debugPath}");
    
    var cards = cardExtractionService.ExtractCards(captureResult.OcrWords);
    
    Console.WriteLine("\n=== Extracted Card Titles ===");
    Console.WriteLine($"Total cards found: {cards.Count}\n");
    
    foreach (var card in cards.OrderBy(c => c.Row).ThenBy(c => c.Column))
    {
        Console.WriteLine($"[Row {card.Row}, Col {card.Column}] {card.Title}");
    }
}