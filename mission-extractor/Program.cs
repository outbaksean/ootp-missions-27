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

await RunMenuLoop( missionExtractionService);

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
                throw new NotImplementedException();
            case "3":
                throw new NotImplementedException();
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
    Console.WriteLine("2. Capture shop cards");
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
