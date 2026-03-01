# mission-extractor

A .NET 10 web app that extracts OOTP 27 mission data from screenshots of the running game client using region-based OCR, then serializes the results to `missions.json` for use by the ootp-missions-27 web app.

Run with `dotnet run` — a browser window opens automatically at `http://localhost:5000`.

## How it works

1. The app takes a screenshot of the OOTP client window.
2. Pixel boundaries configured in `appsettings.json` define the screen regions for each data cell (category, title, reward, status, and mission detail cards).
3. Each region is cropped and passed through OCR (`OcrCaptureService`) to extract text.
4. The extracted text is assembled into `Mission` DTOs held in memory.
5. The browser UI lets you review and edit all OCR-extracted fields inline before running the next pipeline step.
6. Validate and Transform steps clean the data, map card names to IDs, and write `missions-transformed-{timestamp}.json` to the output directory.

OCR runs cell-by-cell rather than on the full screen to improve accuracy. The tool stops scanning rows automatically when it encounters several consecutive empty captures.

## Browser UI

The UI is a single page served from `wwwroot/index.html`. It shows all missions currently in memory and lets you:

- Edit any field (name, category, reward, status, missionDetails) and save changes without touching JSON files.
- Run pipeline actions (Capture, Validate, Transform, Save/Load Unstructured) via buttons; captured console output appears in the log area.
- View debug images inline next to each field when `DebugImages` is enabled in config.

## Pipeline actions

| Button | Description |
|--------|-------------|
| Capture | Screenshots the OOTP window and extracts the next mission row into memory |
| Validate | Runs lightweight cleanup (dedup, field cleaning, status parsing) and reports validation errors |
| Transform | Runs full transformation (card lookup, mission cross-references, topological sort) and writes `missions-transformed-{timestamp}.json` |
| Save Unstructured | Writes current in-memory missions to a timestamped JSON file |
| Load Unstructured | Loads a previously saved unstructured JSON file into memory |
| Delete Debug Images | Deletes all files in the `debugImages/` directory |

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/missions` | Returns all missions currently in memory |
| PATCH | `/api/missions/{id}` | Updates fields on a single mission |
| POST | `/api/capture` | Runs OCR capture |
| POST | `/api/validate` | Runs lightweight validation |
| POST | `/api/transform` | Runs full transformation |
| POST | `/api/save-unstructured` | Saves missions to disk |
| POST | `/api/load-unstructured` | Loads missions from a JSON file path in the request body |
| DELETE | `/api/debug-images` | Deletes all debug images |

## Configuration

`appsettings.json` controls all pixel boundaries and behavior. A profile named `SelectedOOTPProfile` is selected at startup; add additional profiles for different screen resolutions or window sizes.

### Key settings

| Setting | Description |
|---------|-------------|
| `DebugImages` | When true, saves cropped region images to `debugImages/` and serves them at `/debug-images/{filename}` |
| `SelectedOOTPProfile` | Name of the active profile |
| `MissionRowBoundaries` | Pixel coordinates for mission list rows and detail card grid |
| `OutputSettings:OutputDirectory` | Directory for saved JSON and report files |

### MissionRowBoundaries fields

| Field | Description |
|-------|-------------|
| `TopRow` | Y pixel of the first mission row |
| `RowHeight` | Pixel height of each row |
| `NumRows` | Maximum number of rows to scan |
| `CategoryLeft/Right` | X bounds of the category column |
| `TitleLeft/Right` | X bounds of the mission title column |
| `RewardLeft/Right` | X bounds of the reward column |
| `StatusLeft/Right` | X bounds of the status column |
| `DetailTop1/Bottom1` etc. | Y bounds of each mission detail card row (3 rows) |
| `DetailLeft` | X start of the first detail card column |
| `DetailWidth` | Width of each detail card cell |
| `DetailColumns` | Number of detail card columns per row |

## DTOs

The intended output shape mirrors the `missions.json` schema consumed by the web app.

**Mission**

| Field | Type | Description |
|-------|------|-------------|
| `id` | int | Mission identifier |
| `name` | string | Mission display name |
| `type` | MissionType | `Count`, `Points`, or `Mission` |
| `requiredCount` | int | Number required to complete |
| `reward` | string | Reward description text |
| `category` | string | Mission category label |
| `cards` | MissionCard[] | Cards that count toward the mission |
| `totalPoints` | int | Point target for points-type missions |
| `rewards` | MissionReward[] | Structured reward list |
| `status` | string | Raw OCR status text (pre-transform only) |
| `missionDetails` | string[] | Raw OCR detail card text (pre-transform only) |
| `debugImages` | object | OCR crop paths keyed by field name (pre-transform only) |

**MissionCard**

| Field | Type | Description |
|-------|------|-------------|
| `cardId` | int | Card identifier |
| `points` | int? | Points value (omitted for count-type missions) |

**MissionReward**

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Reward type label |
| `packType` | PackType? | Pack type (omitted when not applicable) |
| `count` | int | Quantity rewarded |

## Project structure

```
mission-extractor/
  Program.cs                      Entry point, web host, API endpoints
  appsettings.json                Pixel boundary profiles and settings
  wwwroot/
    index.html                    Single-page browser UI
  Enums/
    MissionType.cs
    PackType.cs
    RewardType.cs
  Models/
    CaptureRegionConfig.cs        Defines a screen region to capture
    CaptureResult.cs              OCR result for a single region
    MissionRowBoundries.cs        Deserialization target for appsettings profile
    MissionState.cs               In-memory mission list singleton
    ValidationError.cs            Error record used by validation services
    DTO/
      Mission.cs
      MissionCard.cs
      MissionReward.cs
  Services/
    MissionBoundryService.cs      Computes capture regions from boundary config
    OcrCaptureService.cs          Takes screenshots and runs OCR on regions
    ScreenshotService.cs          Raw screenshot capture
    MissionEtractionService.cs    Orchestrates row and detail extraction
    LightweightValidationService.cs  Dedup, cleaning, field validation
    FullTransformationService.cs  Card lookup, mission cross-references, output
    CardMappingService.cs         Loads shop_cards.csv and maps names to card IDs
```
