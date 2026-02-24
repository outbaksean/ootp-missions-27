# OOTP Mission OCR Extraction Plan

## Objective

Build a repeatable pipeline that:

1. Takes manual screenshots of OOTP mission screens
2. Extracts mission structure and required cards
3. Outputs a single `missions.json` file
4. Replaces the manually generated mission database
5. Can be re-run whenever missions update

No automation. No scrolling bots. No ToS risk.

---

# Scope

## Extract Mission-Level Data

See ootp-missions-27\app\public\data\missions.json for format

## Extract Required Cards Per Mission

Will be a list of card titles later to be mmapped to card ids

---

# Technology Options

## Option A — C# (Recommended Starting Point)

### Stack

- OpenCvSharp (image preprocessing)
- Tesseract .NET wrapper
- Regex parsing
- System.Text.Json for export

### Pros

- Prefer C# over Python
- Single ecosystem
- Strong typing
- Easier deployment

### Cons

- Slightly weaker OCR ecosystem than Python
- Less community examples for UI OCR

---

## Option B — Python OCR → JSON

### Stack

- OpenCV
- Tesseract OR PaddleOCR
- Regex parsing
- Output JSON

### Pros

- Better OCR tooling (especially PaddleOCR)
- Faster experimentation
- Strong layout-aware parsing options

### Cons

- Prefer C# over Python
- Need to keep JSON contract synchronized

---

## Recommendation

Start with **C# + Tesseract + OpenCvSharp**.

Switch to Python only if:

- OCR accuracy becomes problematic
- Layout-aware detection becomes necessary

The OOTP UI is structured enough that C# should be sufficient.

---

# Workflow Overview

```
Manual Screenshot
      ↓
Image Preprocessing
      ↓
OCR Extraction
      ↓
Text Parsing
      ↓
Structured Mission Model
      ↓
missions.json
```

---

# Implementation Steps

---

## 1. Define Data Model

### Mission Model

See ootp-missions-27\app\public\data\missions.json for format

---

## 2. Standardize Screenshot Process

### Consider changing theme in game

There may be a way to get better contrast in the screenshots

### Required Screenshots

- Mission list screen (table view)
- Individual mission card grid screen

### Naming Convention

```
/screenshots/YYYY-MM-DD/mission_slug.png
```

Example:

```
/screenshots/2026-02-24/pt_elite_laa.png
```

Consistency here reduces parsing errors.

---

## 3. Image Preprocessing (Critical for Accuracy)

Using OpenCvSharp:

### Steps

1. Load image
2. Convert to grayscale
3. Increase contrast
4. Apply threshold (binary)
5. Optional: isolate green text via HSV masking
6. Crop relevant region (avoid UI noise)

Save preprocessed image for debugging.

Green-on-dark UI benefits greatly from contrast + threshold tuning.

---

## 4. OCR Extraction

Use Tesseract with:

- Page segmentation mode suited for blocks (`PSM 6` equivalent)
- English language model

Run separately for:

- Mission table screenshot
- Card grid screenshot

Log raw OCR text for debugging.

---

## 5. Parsing Strategy

---

### Mission Table Parsing

Process:

1. Split OCR output into lines
2. Remove header rows
3. Identify mission rows
4. Extract:

- Category (leftmost text)
- Title
- Difficulty (count star characters)
- Reward (right side text)

You may need column-based slicing if OCR spacing is inconsistent.

---

### Card Parsing

Card lines follow a predictable pattern:

Example:

```
SP Jack Kochanowicz, LAA (40)
```

Regex pattern:

```
^(SP|RP|SS|CF|LF|RF|C|1B|2B|3B)\s(.+?),\s([A-Z]{2,3})\s\((\d+)\)
```

Extract:

- Position
- Name
- Team
- Overall

Series line example:

```
MLB 2025 Live
```

Associate that line with subsequent player entries.

---

## 6. Data Validation

After parsing:

- Ensure team is 2–3 uppercase letters
- Ensure overall is integer
- Ensure position is valid enum
- Remove duplicates
- Trim OCR artifacts

Fail fast if parsing confidence is low.

---

## 7. Mission ID Strategy

Generate stable ID:

Option A:

```
slug(category + title)
```

Option B (more robust):

```
SHA256(category + title + reward)
```

Slug is easier for debugging.

---

## 8. Output File

Single output file:

```
missions.json
```

Overwrite each time OR version:

```
missions_2026_02_24.json
```

Your existing app continues to read one unified file.

---

## 9. Optional: Change Detection

If versioning:

- Compare new file with previous
- Detect:
  - New missions
  - Removed missions
  - Reward changes
  - Card requirement changes

Helpful but not required for MVP.

---

# Re-Runnable Design Principles

- No UI automation
- No scrolling automation
- Manual screenshot only
- Deterministic parsing
- Log everything
- Save raw OCR output for troubleshooting

---

# Suggested Project Structure (C#)

```
/OotpMissionExtractor
    Program.cs
    ImagePreprocessor.cs
    OcrService.cs
    MissionParser.cs
    CardParser.cs
    Models/
        Mission.cs
        Card.cs
    Output/
        missions.json
```

Keep parsing isolated from OCR for easier tuning.

---

# MVP Order of Implementation

1. Hardcode one screenshot
2. Get clean OCR output
3. Build card regex parsing
4. Build mission parsing
5. Export JSON
6. Integrate into existing app
7. Add validation and logging

---

# Future Enhancements (Optional)

- Better color masking for green UI text
- Layout-aware parsing (coordinate-based)
- Simple UI to review parsed missions before export
- Diff viewer between versions

---

# Final Recommendation

Start with:

**C# + OpenCvSharp + Tesseract**

It is sufficient for:

- Structured UI
- Regex-based parsing
- Single JSON output
- Clean integration into existing system

Only move to Python if OCR accuracy becomes a blocker.

---

If you'd like, next we can create:

- A minimal C# project skeleton
- The preprocessing tuning guide for green-on-dark UI
- Or the exact regex + parsing implementation plan in detail
