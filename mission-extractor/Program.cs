using Microsoft.Extensions.Configuration;
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

MissionRowBoundries missionRowBoundries = selectedProfileSection?
    .GetSection("MissionRowBoundaries")
    .Get<MissionRowBoundries>() ?? new();

var outputDirectory = Path.GetFullPath(
    config["OutputSettings:OutputDirectory"] ?? "output",
    AppContext.BaseDirectory);
var debugImagesEnabled = config.GetValue<bool>("DebugImages");
var missionExtractionService = new MissionEtractionService(missionRowBoundries, debugImagesEnabled);

await RunMenuLoop(missionExtractionService);

async Task RunMenuLoop(MissionEtractionService service)
{
    bool isRunning = true;

    while (isRunning)
    {
        DisplayMenu(service);
        var choice = Console.ReadLine();

        if (choice != "7")
        {
            Console.Clear();
        }

        switch (choice)
        {
            case "1":
                await CaptureTopMissionDetails(service);
                break;
            case "2":
                Console.WriteLine("Capture lower mission details: not yet implemented.");
                break;
            case "3":
                await RunLightweightValidation(service);
                break;
            case "4":
                Console.WriteLine("Full validation and transformation: not yet implemented.");
                break;
            case "5":
                await SaveUnstructuredMissions(service);
                break;
            case "6":
                await LoadUnstructuredMissions(service);
                break;
            case "7":
                isRunning = false;
                Console.WriteLine("Exiting application...");
                break;
            default:
                Console.WriteLine("Invalid choice. Please try again.");
                break;
        }
    }
}

void DisplayMenu(MissionEtractionService service)
{
    Console.WriteLine($"\n=== Mission Extractor ({service.Missions.Count} mission(s) in memory) ===");
    Console.WriteLine("1. Capture top mission details");
    Console.WriteLine("2. Capture lower mission details (not implemented)");
    Console.WriteLine("3. Light-weight validation and transformation");
    Console.WriteLine("4. Full validation and transformation (not implemented)");
    Console.WriteLine("5. Save unstructured mission data");
    Console.WriteLine("6. Load unstructured mission data");
    Console.WriteLine("7. Exit");
    Console.WriteLine(new string('=', 50));
    Console.Write("Enter your choice (1-7): ");
}

async Task CaptureTopMissionDetails(MissionEtractionService service)
{
    Console.WriteLine("\nCapturing top mission details...");
    try
    {
        await service.ExtractTopMissionStructureAndDetails();
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error: {ex.Message}");
    }
}

async Task RunLightweightValidation(MissionEtractionService service)
{
    if (service.Missions.Count == 0)
    {
        Console.WriteLine("\nNo missions in memory to validate.");
        return;
    }

    try
    {
        await service.RunLightweightValidation(outputDirectory);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error: {ex.Message}");
    }
}

async Task SaveUnstructuredMissions(MissionEtractionService service)
{
    if (service.Missions.Count == 0)
    {
        Console.WriteLine("\nNo missions in memory to save.");
        return;
    }

    try
    {
        await service.SaveUnstructuredMissions(outputDirectory);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error: {ex.Message}");
    }
}

async Task LoadUnstructuredMissions(MissionEtractionService service)
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
        await service.LoadUnstructuredMissions(filePath);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error: {ex.Message}");
    }
}
