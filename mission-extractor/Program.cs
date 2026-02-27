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

// Load capture regions from configuration
var missionRowConfig = config.GetSection("CaptureRegions:MissionRowStructure")
    .Get<CaptureRegionConfig>() ?? new();
var shopCardsConfig = config.GetSection("CaptureRegions:ShopCards")
    .Get<CaptureRegionConfig>() ?? new();
var missionDetailsConfig = config.GetSection("CaptureRegions:MissionDetails")
    .Get<CaptureRegionConfig>() ?? new();

await RunMenuLoop(ocrService, missionRowConfig, shopCardsConfig, missionDetailsConfig);

async Task RunMenuLoop(
    OcrCaptureService ocrService,
    CaptureRegionConfig missionRowConfig,
    CaptureRegionConfig shopCardsConfig,
    CaptureRegionConfig missionDetailsConfig)
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
                await CaptureMissionRowStructure(ocrService, missionRowConfig);
                break;
            case "2":
                await CaptureShopCards(ocrService, shopCardsConfig);
                break;
            case "3":
                await CaptureMissionDetails(ocrService, missionDetailsConfig);
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
    Console.WriteLine("2. Capture shop cards");
    Console.WriteLine("3. Capture mission details");
    Console.WriteLine("4. Exit");
    Console.WriteLine("==============================");
    Console.Write("Enter your choice (1-4): ");
}

async Task CaptureMissionRowStructure(
    OcrCaptureService ocrService,
    CaptureRegionConfig config)
{
    Console.WriteLine("\nCapturing mission row structure...");
    try
    {
        var result = await ocrService.CaptureMissionRowStructure(config);
        Console.WriteLine("Mission row structure captured successfully!");
        Console.WriteLine($"Mission ID: {result.MissionId}");
        Console.WriteLine($"Title: {result.Title}");
        
        // TODO: Save to file
        Console.WriteLine("Data prepared for serialization to JSON.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error: {ex.Message}");
    }
}

async Task CaptureShopCards(
    OcrCaptureService ocrService,
    CaptureRegionConfig config)
{
    Console.WriteLine("\nCapturing shop cards...");
    try
    {
        var result = await ocrService.CaptureShopCards(config);
        Console.WriteLine($"Shop cards captured successfully! Found {result.Count} cards.");
        
        // TODO: Save to file
        Console.WriteLine("Data prepared for serialization to JSON.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error: {ex.Message}");
    }
}

async Task CaptureMissionDetails(
    OcrCaptureService ocrService,
    CaptureRegionConfig config)
{
    Console.WriteLine("\nCapturing mission details...");
    try
    {
        var result = await ocrService.CaptureScreenRegion(config, "MissionDetails");
        Console.WriteLine("Mission details captured successfully!");
        Console.WriteLine($"Extracted {result.ExtractedText.Count} text items.");
        
        // TODO: Save to file
        Console.WriteLine("Data prepared for serialization to JSON.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error: {ex.Message}");
    }
}
