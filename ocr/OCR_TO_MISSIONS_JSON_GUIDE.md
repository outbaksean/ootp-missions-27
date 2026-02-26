# OCR to missions.json Extraction Guide

## Overview
This guide documents the process of extracting mission data from screenshot images in `ocr/screenshots/missionsByCategory/` and converting them to the structured JSON format used in `app/public/data/missions.json`.

## Source Data Location
- **Screenshot Images**: `ocr/screenshots/missionsByCategory/*.png`
- **Target Output**: `ocr/output/missions_{datetime}.json`
- **Reference Format**: `app/public/data/missions.json`

## missions.json Structure

```json
{
  "version": "YYYY-MM-DD",
  "missions": [
    {
      "id": 1,
      "name": "Mission Name",
      "type": "count" | "points" | "missions",
      "requiredCount": 100,
      "reward": "Reward description",
      "category": "Category Name",
      "cards": [           // for "count" and "points" types
        {
          "cardId": 12345,
          "points": 5  // only for points-based missions
        }
      ],
      "missionIds": [1, 2, 3],  // only for "missions" type
      "totalPoints": 100,  // optional, for points missions
      "rewards": [         // optional, structured rewards
        {
          "type": "pack",
          "packType": "Standard",
          "count": 3
        }
      ]
    }
  ]
}
```

## Mission Types
- **count**: Complete by collecting X cards (any card counts as 1)
- **points**: Complete by accumulating X points (cards have different point values)
- **missions**: Complete by finishing X other missions (has `missionIds` array instead of `cards`)

## Screenshot Categories

The mission screenshots are organized by category:
- `BonusRewards1.png` / `BonusRewards2.png`
- `FinalMissionSet.png`
- `FutureLegends.png`
- `HolidayTimes.png`
- `PTElite.png`
- `WorldSeriesStart.png`

## Mission Row Format in Screenshots

Each mission row in the game UI displays:
```
[Category] [Mission Name] [+] [Days] [Reward] [Progress] - [Percentage]%
```

### Examples:
```
Future Legends | The Next Generation [+] | 243 days | 3x Historical Diamond Pack | 280 / 450 points - 64%
PT Elite | PT Elite - LAA [+] | 31 days | PT Elite 2 SS Zach Neto LAA, 2x Historical Silver Pack | 56 / any 57 out of 57 - 98%
Bonus Rewards | Bronze Builds [+] | 202 days | 4x Standard Pack | 21/ any 24 out of 32 - 88%
Bonus Rewards | T4 Checkpoint 2 [+] | 7 days | 10x Historical Gold Pack | 13 / 15 Missions - 87%
```

## Extraction Mapping

### Category (Direct from OCR)
Located at start of line after the `l` marker:
- `Future Legends`
- `World Series Start`
- `Holiday Times`
- `PT Elite`
- `Bonus Rewards`
- `Final Mission Set`

### Mission Name
Text between category and `[+]` marker

### Days Remaining
Number followed by "days" or "dave" (OCR error)

### Reward Description
Text between days and progress indicator
- Can include card descriptions like "PT Elite 2 SS Zach Neto LAA"
- Pack counts like "3x Historical Diamond Pack"
- Special rewards like parks, specific player cards

### Progress Indicators (determines mission type)

**Points-based**: `X / Y points - Z%`
- Example: `280 / 450 points - 64%`
- `type: "points"`
- `requiredCount: 450`

**Count-based (any)**: `X / any Y out of Z - W%`
- Example: `21/ any 24 out of 32 - 88%`
- `type: "count"`
- `requiredCount: 32` (total cards available)

**Missions-based**: `X / Y Missions - Z%`
- Example: `2 / 4 Missions - 50%`
- `type: "missions"`
- `requiredCount: 4`
- `missionIds: []` (IDs of required missions - may need manual mapping)

## Common OCR Errors to Handle

| OCR Text | Should Be | Context |
|----------|-----------|---------|
| dave | days | Time remaining |
| Miccions | Missions | Progress type |
| Hietorical | Historical |Mission List Screenshots

The following data requires additional screenshots or manual entry:

### 1. Card IDs
Mission list screenshots show progress but not individual card IDs. Card arrays will be empty `[]` unless:
- You have screenshots of the expanded mission view showing all cards
- Manually entered from clicking into each mission in-game
- Mapped from player names if card images can be OCR'd

### 2. Individual Card Points
For points-based missions, each card's point value is only visible when viewing the detailed mission screen.

### 3. Structured Rewards
The `rewards` array with typed pack information is optional but not available from the mission list view
The OCR text shows progress but not individual card IDs. Card arrays will be empty `[]` unless:
- Manually entered from game screenshots
- Extracted from individual card images
- MapProcess Screenshot Images**
   - View screenshots in `ocr/screenshots/missionsByCategory/`
   - For each category image (BonusRewards1.png, PTElite.png, etc.)
   - Extract visible mission data from each row

2. **Extract Data Per Mission Row**
   - Mission name (between category and [+])
   - Category (filename or visible in row)
   - Type (determined from progress format: "points" vs "out of")
   - Required count (denominator of progress fraction)
   - Reward description (between days and progress)

3. **Handle OCR Errors** (if using automated OCR)
   - Common substitutions (see table below)
   - Verify numbers and critical text
   - Team abbreviations

4. **Generate JSON Structure**
   - Sequential IDs starting from 1
   - Empty cards arrays `[]`
   - Version date from extraction date
   - Add note about missing card IDs

5  - Extract category, name, type, required count, reward
   - Handle common OCR errors
   - Determine mission type from progress format

3. **Generate JSON**
   - Sequential IDs starting from 1
   - Empty cards arrays
   - Version date from extraction date
   - Add note about missing card IDs

4. **Output Location**
   - `ocr/output/missions.json`

## ID Assignment Strategy

IDs should be assigned sequentially in the order missions appear across all category files:
1. Read files in alphabetical order or logical category order
2. Assign IDs 1, 2, 3, ... as missions are encountered
3. Group by category for readability

## Validation Checklist

- [ ] All category files processed
- [ ] Mission types correctly identified (count vs points)
- [ ] Required counts match OCR progress denominators
- [ ] Reward descriptions preserved accurately
- [ ] Category names consistent
- [ ] Empty cards arrays present
- [ ] JSON is valid and properly formatted

## Future Enhancements

### Card ID Extraction
To populate card arrays, would need:
1. Screenshots of individual mission card views
2. OCR on card images to extract player names
3. Fuzzy matching against card database
4. Manual verification of card IDs

### Automated Error Correction
Build a correction dictionary for:
- Team abbreviations
- Player name variations
- Pack tyhave new mission screenshots, include this guide in context with:

```
Can you look at the images in ootp-missions-27/ocr/screenshots/missionsByCategory 
and extract the available data into missions.json following the structure described 
in OCR_TO_MISSIONS_JSON_GUIDE.md
```

Or if you've already run OCR and have text data:

```
Here's the OCR text from the mission screenshots [paste text]. 
Extract this into missions.json followingd mission view screenshots
- Inferred from card rarity/overall rating
- Manually entered from game data

## Example Command for Future Use

When you receive new OCR text files, include this guide in context with:
 and require manual entry
- Progress percentages and current completion status are not needed for base mission structure
- Days remaining is not needed for the mission definition
- Focus on extracting: name, type, category, requiredCount, reward
- Card arrays will be empty unless you have detailed mission view screenshots
- Consider using the C# OCR tool in `ocr/MissionExtractor/` for batch processing if available.json 
following the guide in OCR_TO_MISSIONS_JSON_GUIDE.md
```

## Notes
- OCR quality varies; some rows may be completely garbled
- Progress percentages and current completion not needed for base mission structure
- Days remaining not needed for mission definition
- Focus on: name, type, category, requiredCount, reward
