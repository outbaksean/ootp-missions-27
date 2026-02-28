# mission-extractor

A .NET 10 console tool that extracts OOTP 27 mission data from screenshots of the running game client using region-based OCR, then serializes the results to `missions.json` for use by the ootp-missions-27 web app.

## How it works

1. The tool takes a screenshot of the OOTP client window.
2. Pixel boundaries configured in `appsettings.json` define the screen regions for each data cell (category, title, reward, status, and mission detail cards).
3. Each region is cropped and passed through OCR (`OcrCaptureService`) to extract text.
4. The extracted text is assembled into DTOs (`Mission`, `MissionCard`, `MissionReward`).
5. The DTOs are serialized to  a new `missions.json` file which is saved and will replace ootp-missions-27\app\public\data\missions.json after user validation

OCR runs cell-by-cell rather than on the full screen to improve accuracy. The tool stops scanning rows automatically when it encounters several consecutive empty captures.

## Current status

OCR capture is working. Extracted text is currently written to the console. JSON serialization and file output are not yet implemented (menu options 2 and 3 are stubs or incomplete).

## Menu options

| Option | Description |
|--------|-------------|
| 1 | Capture mission row structure (category, title, reward, status per row) |
| 2 | Capture shop cards (not implemented, to be removed) |
| 3 | Capture mission details (card grid for individual missions) |
| 4 | Exit |

## Configuration

`appsettings.json` controls all pixel boundaries and behavior. A profile named `SelectedOOTPProfile` is selected at startup; add additional profiles for different screen resolutions or window sizes.

### Key settings

| Setting | Description |
|---------|-------------|
| `DebugImages` | When true, saves cropped region images to disk for calibration |
| `SelectedOOTPProfile` | Name of the active profile |
| `MissionRowBoundaries` | Pixel coordinates for mission list rows and detail card grid |

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
  Program.cs                      Entry point, menu loop
  appsettings.json                Pixel boundary profiles and settings
  Enums/
    MissionType.cs
    PackType.cs
    RewardType.cs
  Models/
    CaptureRegionConfig.cs        Defines a screen region to capture
    CaptureResult.cs              OCR result for a single region
    MissionRowBoundries.cs        Deserialization target for appsettings profile
    DTO/
      Mission.cs
      MissionCard.cs
      MissionReward.cs
  Services/
    MissionBoundryService.cs      Computes capture regions from boundary config
    OcrCaptureService.cs          Takes screenshots and runs OCR on regions
    ScreenshotService.cs          Raw screenshot capture
    MissionEtractionService.cs    Orchestrates row and detail extraction
```

## Next steps

- Map OCR text to Mission DTOs
- Serialize the DTO list to `missions.json`
- Write the output file to the path from `OutputSettings.OutputDirectory`
- Implement shop card capture (menu option 2)
