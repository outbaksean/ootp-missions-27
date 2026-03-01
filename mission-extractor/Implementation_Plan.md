# Implementation Plan

This document outlines the work needed to implement the full mission update process described in `Mission_Update_Process.md`. Items are grouped by phase and roughly ordered by dependency.

---

## Phase 0: High-Priority OCR Fixes

**These should be completed before scaling up the extraction process.**

### 0.1 Mission-type row boundary detection

Dynamic detail boundaries for mission-type rows. The status value from the mission row indicates whether a mission is expanded. Update `OcrCaptureService` to detect expanded state and adjust region boundaries accordingly.

### 0.2 Lower mission detail capture

Implement boundary anchoring to detect the bottom of an expanded mission and capture details that don't fit on the initial screen. This requires updating `MissionRowBoundries` logic.

---

## Phase 1: Foundation

These changes unblock everything else and should be done first (after Phase 0).

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
6. Lightweight cleanup and validation
7. Validate, transform, and deduplicate
8. Exit

**Note**: 
- Option 3 (lower details) requires Phase 0.2. 
- Option 6 (lightweight cleanup) requires Phase 3.5 and is recommended between capture batches.
- Option 7 (validate/transform) requires Phase 4 and does not auto-run; it requires explicit user action.

---

## Phase 2: Capture to DTO & Basic Validation

Map OCR output into the Mission DTO instead of writing to the console. After each capture operation, run lightweight validations to catch OCR issues early (notes below).

### 2.1 Row capture mapping

After `ExtractMissionRows` runs, parse each row's OCR text (category, title, reward, status) into a `Mission` object and add it to the in-memory list. Assign sequential generated IDs.

### 2.2 Top detail capture mapping

After `ExtractMissionDetails` runs, match each detail cell's OCR text to the corresponding in-memory `Mission` by position and append the text to `MissionDetails`.

**Post-capture validation**: After appending details, perform basic checks on the captured state (e.g., "Do we have details for all identified missions?" or "Does the detail count match expectations?"). Surface issues to the user but don't block—the user can manually fix issues in the unstructured JSON later.

### 2.3 Lower detail capture

Implement the "Capture lower mission details" option. This requires using the status value from the mission row to determine if a mission is expanded, then anchoring OCR region boundaries to the bottom of the expanded mission rather than fixed coordinates. Append results to the same `Mission.MissionDetails` as the top capture.

---

## Phase 3: Intermediate persistence

### 3.1 Save unstructured

Serialize the current in-memory `List<Mission>` (including `MissionDetails`) to `missions-unstructured-{timestamp}.json`. Use `System.Text.Json` with `WriteIndented = true`.

### 3.2 Load unstructured

Prompt for a file path, deserialize the file back into the in-memory list, replacing current state. Allows re-running the transform without re-doing OCR.

---

## Phase 3.5: Lightweight Cleanup & Validation

A lightweight alternative to the full transform. Users can run this between capture batches to clean up duplicates, remove empty missions, and see basic validation feedback without committing to the expensive transform step (card mapping, mission-type resolution, etc.).

### 3.5.1 Deduplication and cleanup

Remove duplicate missions from the list, drop missions with no meaningful data, and regenerate IDs while preserving order. This is identical to Phase 4.1.

### 3.5.2 Status parsing and mission-type inference

For each mission, parse the `Status` field to extract `type`, `requiredCount`, and `totalPoints`. This infers the mission type (Undefined, Count, Points, or Mission) without attempting to map cards or resolve references. Record parse failures as warnings.

### 3.5.3 Basic field validation

For each mission, check the following fields and flag issues:
- Category: Must exist and match allowed category list (see 4.8).
- Name: Must exist.
- Reward: Must exist.
- Status: Must exist and be parseable (checked above).
- MissionDetails: Must have at least one entry.

Report issues to the user but do not block. The user can edit the unstructured JSON manually to fix issues.

### 3.5.4 Generate cleanup report

Produce `missions-cleanup-report-{timestamp}.html` containing:
- Summary of deduplication (count of duplicates removed).
- List of removed empty missions.
- Full list of remaining missions with their inferred mission types.
- Flagged fields for each mission (missing or invalid entries).
- No cell images (intentionally lightweight).

### 3.5.5 Auto-save cleaned state

Automatically serialize the cleaned, deduplicated in-memory list to `missions-unstructured-cleaned-{timestamp}.json`. This becomes the new in-memory state.

---

## Phase 4: Transform pipeline

Implement the validate/transform/deduplicate step. Process missions in order and collect validation errors as you go. **This step must be explicitly triggered by the user and does not run automatically.**

### 4.1 Deduplication and cleanup

Remove duplicate missions from the list, drop missions with no meaningful data, and regenerate IDs while preserving order.

**ID regeneration strategy**: When IDs are regenerated, any cross-references to those IDs (e.g., missionIds in mission-type missions) must be updated to point to the new IDs. This is handled during Phase 4.6 (mission-type second pass) and validated before output. IDs do not need to be stable across sessions; only internal consistency within a session matters.

---### 4.2 Field-level validation and transforms

For each mission:

- Trim all text fields.
- Validate category exists and matches the allowed category list (see 4.8).
- Transform name: strip everything from the first `[` onward.
- Validate reward exists.
- Parse status into `type`, `requiredCount`, and `totalPoints`. Record a validation error if parsing fails.
- Deduplicate `MissionDetails`.
- Validate `MissionDetails` has at least one entry.

### 4.3 Count mission transform

- Strip everything from the last `(` onward in each detail string.
- Look up each detail in the card mapping (see 4.9) to get `cardId`. Use 0 for unmapped entries and record them as validation errors.
- Populate `cards`.
- Validate that `cards.Count == requiredCount`.

### 4.4 Points mission transform

- Strip everything from the last `(` onward in each detail string.
- Look up each detail in the card mapping (see 4.9) to get `cardId` and `points`. Use 0 for unmapped entries and record them.
- Extract the points value from the original detail string and compare against the mapped value; record a mismatch as a validation error.
- Populate `cards`.
- Validate that the sum of card points equals `totalPoints`.

### 4.5 Mission-type first pass

- Strip everything from the last `(` onward in each detail string.
- Mark these missions for second-pass resolution; do not attempt sub-mission ID mapping yet.
- Note: Matching may fail if OCR output doesn't match the actual mission name. This is expected; mismatches are flagged in the validation report and require user review.

### 4.6 Mission-type second pass

After all other missions are transformed, resolve each mission-type mission's `MissionDetails` to `missionId` values by matching against the names of transformed missions. Use 0 for unresolved entries and record them. Populate `cards` (or a separate sub-missions collection, depending on the schema).

**ID consistency**: When resolving mission-type references, use the current (regenerated) mission IDs from Phase 4.1. After this pass completes and Phase 4.7 reorders missions, verify that all missionId references still point to the correct missions and update them if needed due to reordering.

### 4.7 Ordering

After both passes, reorder the list so that mission-type missions always appear after all missions referenced in their detail list. When missions are reordered, their IDs may shift—update all missionId references in mission-type missions to point to the correct (new) IDs after reordering.

### 4.8 Category list

Create `data/categories.json` (or a static list in code) with the allowed category values. Used for category validation in 4.2.

### 4.9 Card mapping data

Create `data/card-mapping.json` mapping detail text strings to `cardId` (and `points` for points missions). The full mapping data is already available. The transform step reads this file; any unmatched entries are flagged in the validation report for manual review and addition if needed.

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
| **Lower detail OCR anchoring** (Phase 0.2) | Requires detecting expanded mission boundary at runtime. High priority. |
| **Mission-type row OCR** (Phase 0.1) | Current OCR does not handle mission-type rows correctly; boundary logic needs updating based on status value. High priority. |
| Card mapping data | Full mapping data is available and will be included in the app. |
| Structured rewards | Out of scope for this tool; populated separately after output. |
