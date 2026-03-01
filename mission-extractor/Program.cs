using System.Diagnostics;
using System.Text.Json;
using Microsoft.Extensions.FileProviders;
using mission_extractor.Models;
using mission_extractor.Services;

var builder = WebApplication.CreateBuilder(args);

// Configuration is auto-loaded from appsettings.json by the Web SDK
var config = builder.Configuration;

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

var cardCsvPath = Path.GetFullPath("data/shop_cards.csv", AppContext.BaseDirectory);
var cardMappingService = new CardMappingService(cardCsvPath);

builder.Services.AddSingleton<MissionState>();
builder.Services.AddSingleton(missionRowBoundries);
builder.Services.AddSingleton(_ => new OcrCaptureService(debugImagesEnabled));
builder.Services.AddSingleton<MissionBoundryService>();
builder.Services.AddSingleton<MissionEtractionService>();
builder.Services.AddSingleton<LightweightValidationService>();
builder.Services.AddSingleton(cardMappingService);
builder.Services.AddSingleton<FullTransformationService>();

builder.Services.ConfigureHttpJsonOptions(o =>
    o.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase);

var app = builder.Build();

app.UseDefaultFiles(); // rewrites / to /index.html
app.UseStaticFiles(); // wwwroot/

var debugImagesDir = Path.Combine(AppContext.BaseDirectory, "debugImages");
Directory.CreateDirectory(debugImagesDir);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(debugImagesDir),
    RequestPath = "/debug-images"
});

var state = app.Services.GetRequiredService<MissionState>();
var extractionService = app.Services.GetRequiredService<MissionEtractionService>();
var validationService = app.Services.GetRequiredService<LightweightValidationService>();
var fullTransformService = app.Services.GetRequiredService<FullTransformationService>();

// GET /api/missions
app.MapGet("/api/missions", () =>
    new { count = state.Count, missions = state.Missions });

// PATCH /api/missions/{id}
app.MapMethods("/api/missions/{id}", ["PATCH"], (int id, MissionUpdateRequest req) =>
{
    var updated = state.TryUpdate(id, req.Name, req.Category, req.Reward, req.Status, req.MissionDetails);
    return updated is null ? Results.NotFound() : Results.Ok(updated);
});

// POST /api/capture
app.MapPost("/api/capture", async () =>
{
    int before = state.Count;
    var log = await CaptureConsole(async () =>
        await extractionService.ExtractTopMissionStructureAndDetails());
    int after = state.Count;
    object? addedMission = after > before ? (object)state.Missions[^1] : null;
    return new { log, missionCount = state.Count, addedMission };
});

// POST /api/validate
app.MapPost("/api/validate", async () =>
{
    if (state.Count == 0)
        return Results.BadRequest(new { error = "No missions in memory to validate." });

    List<mission_extractor.Models.ValidationError> errors = null!;
    var log = await CaptureConsole(async () =>
        errors = await validationService.Run(outputDirectory));

    var errorDtos = errors.Select(e => new
    {
        missionId = e.Mission.Id,
        missionName = e.Mission.Name,
        errorType = e.ErrorType,
        imagePaths = e.ImagePaths?.Select(Path.GetFileName).ToList() ?? []
    }).ToList();

    return Results.Ok(new { log, missionCount = state.Count, errors = errorDtos });
});

// POST /api/transform
app.MapPost("/api/transform", async () =>
{
    if (state.Count == 0)
        return Results.BadRequest(new { error = "No missions in memory to transform." });

    List<mission_extractor.Models.ValidationError> errors = null!;
    var log = await CaptureConsole(async () =>
        errors = await fullTransformService.Run(outputDirectory));

    var errorDtos = errors.Select(e => new
    {
        missionId = e.Mission.Id,
        missionName = e.Mission.Name,
        errorType = e.ErrorType,
        imagePaths = e.ImagePaths?.Select(Path.GetFileName).ToList() ?? []
    }).ToList();

    return Results.Ok(new { log, missionCount = state.Count, errors = errorDtos });
});

// POST /api/save-unstructured
app.MapPost("/api/save-unstructured", async () =>
{
    if (state.Count == 0)
        return Results.BadRequest(new { error = "No missions in memory to save." });

    var log = await CaptureConsole(async () =>
        await extractionService.SaveUnstructuredMissions(outputDirectory));

    return Results.Ok(new { log });
});

// POST /api/load-unstructured
app.MapPost("/api/load-unstructured", async (LoadRequest req) =>
{
    if (string.IsNullOrWhiteSpace(req.FilePath))
        return Results.BadRequest(new { error = "filePath is required." });

    var log = await CaptureConsole(async () =>
        await extractionService.LoadUnstructuredMissions(req.FilePath));

    return Results.Ok(new { log, missionCount = state.Count });
});

// DELETE /api/missions
app.MapDelete("/api/missions", () =>
{
    state.Clear();
    return new { missionCount = state.Count };
});

// DELETE /api/debug-images
app.MapDelete("/api/debug-images", () =>
{
    if (!Directory.Exists(debugImagesDir))
        return new { deletedCount = 0 };

    var files = Directory.GetFiles(debugImagesDir);
    foreach (var file in files)
        File.Delete(file);

    return new { deletedCount = files.Length };
});

app.Start();
Process.Start(new ProcessStartInfo { FileName = "http://localhost:5000", UseShellExecute = true });
await app.WaitForShutdownAsync();

static async Task<string> CaptureConsole(Func<Task> action)
{
    var sw = new StringWriter();
    var prev = Console.Out;
    Console.SetOut(sw);
    try { await action(); }
    finally { Console.SetOut(prev); }
    return sw.ToString();
}

record MissionUpdateRequest(string? Name, string? Category, string? Reward,
                             string? Status, List<string>? MissionDetails);
record LoadRequest(string? FilePath);
