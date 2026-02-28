# Implementation Plan

This document outlines the work needed to implement the full mission update process described in `Mission_Update_Process.md`. Items are grouped by phase and roughly ordered by dependency.

---

## Phase 1: Foundation

These changes unblock everything else and should be done first.

### 1.1 Add missionDetails to Mission DTO

Add a `List<string> MissionDetails` property to `Mission.cs` decorated with `[JsonIgnore]` so it is excluded from transformed output but available during the transform step.

### 1.2 In-memory mission state

Introduce a session state object (or add state to `MissionEtractionService`) that holds the active `List<Mission>` across menu operations. Capture operations append to or update this list rather than only writing to the console.

### 1.3 Revamp menu

Replace the current four-option menu with the full workflow menu:

1. Capture mission rows
2. Capture top mission details
3. Capture lower mission details
4. Save unstructured mission data
5. Load unstructured mission data
6. Validate, transform, and deduplicate
7. Exit

Options 3 and 6 can be stubbed initially.

---

## Phase 2: Capture to DTO

Map OCR output into the Mission DTO instead of writing to the console.

### 2.1 Row capture mapping

After `ExtractMissionRows` runs, parse each row's OCR text (category, title, reward, status) into a `Mission` object and add it to the in-memory list. Assign sequential generated IDs.

### 2.2 Top detail capture mapping

After `ExtractMissionDetails` runs, match each detail cell's OCR text to the corresponding in-memory `Mission` by position and append the text to `MissionDetails`.

### 2.3 Lower detail capture

Implement the "Capture lower mission details" option. This requires using the status value from the mission row to determine if a mission is expanded, then anchoring OCR region boundaries to the bottom of the expanded mission rather than fixed coordinates. Append results to the same `Mission.MissionDetails` as the top capture.

---

## Phase 3: Intermediate persistence

### 3.1 Save unstructured

Serialize the current in-memory `List<Mission>` (including `MissionDetails`) to `missions-unstructured-{timestamp}.json`. Use `System.Text.Json` with `WriteIndented = true`.

### 3.2 Load unstructured

Prompt for a file path, deserialize the file back into the in-memory list, replacing current state. Allows re-running the transform without re-doing OCR.

---

## Phase 4: Transform pipeline

Implement the validate/transform/deduplicate step. Process missions in order and collect validation errors as you go.

### 4.1 Deduplication and cleanup

Remove duplicate missions from the list, drop missions with no meaningful data, and regenerate IDs while preserving order.

### 4.2 Field-level validation and transforms

For each mission:

- Trim all text fields.
- Validate category exists and matches the allowed category list (see 4.7).
- Transform name: strip everything from the first `[` onward.
- Validate reward exists.
- Parse status into `type`, `requiredCount`, and `totalPoints`. Record a validation error if parsing fails.
- Deduplicate `MissionDetails`.
- Validate `MissionDetails` has at least one entry.

### 4.3 Count mission transform

- Strip everything from the last `(` onward in each detail string.
- Look up each detail in the card mapping (see 4.8) to get `cardId`. Use 0 for unmapped entries and record them as validation errors.
- Populate `cards`.
- Validate that `cards.Count == requiredCount`.

### 4.4 Points mission transform

- Strip everything from the last `(` onward in each detail string.
- Look up each detail in the card mapping to get `cardId` and `points`. Use 0 for unmapped entries and record them.
- Extract the points value from the original detail string and compare against the mapped value; record a mismatch as a validation error.
- Populate `cards`.
- Validate that the sum of card points equals `totalPoints`.

### 4.5 Mission-type first pass

- Strip everything from the last `(` onward in each detail string.
- Mark these missions for second-pass resolution; do not attempt sub-mission ID mapping yet.

### 4.6 Mission-type second pass

After all other missions are transformed, resolve each mission-type mission's `MissionDetails` to `missionId` values by matching against the names of transformed missions. Use 0 for unresolved entries and record them. Populate `cards` (or a separate sub-missions collection, depending on the schema).

### 4.7 Ordering

After both passes, reorder the list so that mission-type missions always appear after all missions referenced in their detail list.

### 4.8 Category list

Create `data/categories.json` (or a static list in code) with the allowed category values. Used for category validation in 4.2.

### 4.9 Card mapping data

Create `data/card-mapping.json` mapping detail text strings to `cardId` (and `points` for points missions). This file will need to be built incrementally as new missions are encountered. The transform step reads this file; unmatched entries are flagged in the validation report for manual addition.

---

## Phase 5: Validation report

### 5.1 HTML report generation

After the transform step, generate `mission-validation-{timestamp}.html` containing:

- A summary of all validation errors grouped by mission.
- For each error, the raw OCR text and the saved debug cell image (from `DebugImages` output).
- Unmapped card/mission detail strings with their raw images for manual resolution.

### 5.2 Debug image linkage

Ensure `OcrCaptureService` saves debug images with deterministic filenames that correspond to the mission ID and cell type, so the report can reference them reliably.

---

## Phase 6: Transformed output

### 6.1 Serialize transformed missions

After passing validation (or after user review), serialize the mission list to `missions-transformed-{timestamp}.json` excluding `MissionDetails`. Use the same JSON shape as `app/public/data/missions.json`.

### 6.2 Final copy step

Document (or optionally automate) copying the reviewed `missions-transformed-{timestamp}.json` to `ootp-missions-27/app/public/data/missions.json` to complete the update.

---

## Known gaps and deferred work

| Item | Notes |
|------|-------|
| Lower detail OCR anchoring | Requires detecting expanded mission boundary at runtime |
| Mission-type row OCR | Current OCR does not handle mission-type rows correctly; boundary logic needs updating based on status value |
| Card mapping data | Must be built manually or semi-manually as missions are encountered |
| Structured rewards | Out of scope for this tool; populated separately after output |
