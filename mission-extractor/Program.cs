using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using mission_extractor.Models;
using mission_extractor.Services;

// Load configuration
var config = new ConfigurationBuilder()
    .SetBasePath(AppContext.BaseDirectory)
    .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
    .Build();

var selectedProfileName = config["SelectedOOTPProfile"];

var selectedProfileSection = config
    .GetSection("OotpProfiles")
    .GetChildren()
    .FirstOrDefault(profile =>
        string.Equals(profile["Name"], selectedProfileName, StringComparison.OrdinalIgnoreCase));

var missionRowBoundries = selectedProfileSection?
    .GetSection("MissionRowBoundaries")
    .Get<MissionRowBoundries>() ?? new();

var outputDirectory = Path.GetFullPath(
    config["OutputSettings:OutputDirectory"] ?? "output",
    AppContext.BaseDirectory);
var debugImagesEnabled = config.GetValue<bool>("DebugImages");

// Register services
var services = new ServiceCollection();
services.AddSingleton<MissionState>();
services.AddSingleton(missionRowBoundries);
services.AddSingleton(_ => new OcrCaptureService(debugImagesEnabled));
services.AddSingleton<MissionBoundryService>();
services.AddSingleton<MissionEtractionService>();
services.AddSingleton<LightweightValidationService>();

var provider = services.BuildServiceProvider();

var missionState = provider.GetRequiredService<MissionState>();
var extractionService = provider.GetRequiredService<MissionEtractionService>();
var validationService = provider.GetRequiredService<LightweightValidationService>();

await RunMenuLoop();

async Task RunMenuLoop()
{
    bool isRunning = true;

    while (isRunning)
    {
        DisplayMenu();
        var choice = Console.ReadLine();

        if (choice != "8")
        {
            Console.Clear();
        }

        switch (choice)
        {
            case "1":
                await CaptureTopMissionDetails();
                break;
            case "2":
                Console.WriteLine("Capture lower mission details: not yet implemented.");
                break;
            case "3":
                await RunLightweightValidation();
                break;
            case "4":
                Console.WriteLine("Full validation and transformation: not yet implemented.");
                break;
            case "5":
                await SaveUnstructuredMissions();
                break;
            case "6":
                await LoadUnstructuredMissions();
                break;
            case "7":
                DeleteDebugImages();
                break;
            case "8":
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
    Console.WriteLine($"\n=== Mission Extractor ({missionState.Count} mission(s) in memory) ===");
    Console.WriteLine("1. Capture top mission details");
    Console.WriteLine("2. Capture lower mission details (not implemented)");
    Console.WriteLine("3. Lightweight cleanup and validation");
    Console.WriteLine("4. Full validation and transformation (not implemented)");
    Console.WriteLine("5. Save unstructured mission data");
    Console.WriteLine("6. Load unstructured mission data");
    Console.WriteLine("7. Delete debug images");
    Console.WriteLine("8. Exit");
    Console.WriteLine(new string('=', 50));
    Console.Write("Enter your choice (1-8): ");
}

async Task CaptureTopMissionDetails()
{
    Console.WriteLine("\nCapturing top mission details...");
    try
    {
        await extractionService.ExtractTopMissionStructureAndDetails();
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error: {ex.Message}");
    }
}

async Task RunLightweightValidation()
{
    if (missionState.Count == 0)
    {
        Console.WriteLine("\nNo missions in memory to validate.");
        return;
    }

    try
    {
        await validationService.Run(outputDirectory);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error: {ex.Message}");
    }
}

async Task SaveUnstructuredMissions()
{
    if (missionState.Count == 0)
    {
        Console.WriteLine("\nNo missions in memory to save.");
        return;
    }

    try
    {
        await extractionService.SaveUnstructuredMissions(outputDirectory);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error: {ex.Message}");
    }
}

async Task LoadUnstructuredMissions()
{
    Console.Write("\nEnter path to unstructured missions JSON file: ");
    var filePath = Console.ReadLine()?.Trim();

    if (string.IsNullOrEmpty(filePath))
    {
        Console.WriteLine("No path entered.");
        return;
    }

    try
    {
        await extractionService.LoadUnstructuredMissions(filePath);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error: {ex.Message}");
    }
}

void DeleteDebugImages()
{
    var debugDir = Path.Combine(AppContext.BaseDirectory, "debugImages");
    if (!Directory.Exists(debugDir))
    {
        Console.WriteLine("\nNo debug images directory found.");
        return;
    }

    var files = Directory.GetFiles(debugDir);
    if (files.Length == 0)
    {
        Console.WriteLine("\nNo debug images to delete.");
        return;
    }

    foreach (var file in files)
        File.Delete(file);

    Console.WriteLine($"\nDeleted {files.Length} debug image(s).");
}
