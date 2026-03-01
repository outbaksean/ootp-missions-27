# Mission Update Process

## General Plan

This is a **semi-automated, iterative process** designed to capture mission data from OOTP and prepare it for the app with manual validation and correction. The workflow is flexible and supports multiple iterations.

**Setup**: Run OOTP on one monitor and the mission-extractor app in a terminal on another.

**General workflow**:
1. Capture a batch of missions using the capture options (row + details)
   - Basic validations run automatically after capture to flag OCR issues early
2. At any point, save the current in-memory missions to `missions-unstructured-{timestamp}.json`
3. Review captured data in the unstructured JSON. Manually fix OCR errors, missing data, or other issues directly in the file
4. Load the corrected file back into the app to restore state
5. When ready, run the full validate/transform/deduplicate step, which generates a validation report
6. Review the validation report (includes OCR cell images). Fix any remaining transformation errors in the unstructured JSON and repeat steps 3-5 as needed
7. Once satisfied, the final transformed JSON is ready for review and integration

**Note**: Transformations require explicit user action—they do not happen automatically during capture. This gives you control over when and which missions are transformed. 

The Mission DTO has all properties to serialize to the missions.json format from `ootp-missions-27\app\public\data\missions.json`. The DTO also includes a `missionDetails` array that holds the raw mission details from OCR (card titles or mission names). The `missionDetails` array is serialized to the unstructured JSON (for manual review and editing) but excluded from the transformed output. It is used during the transform step to map details to card IDs or mission IDs.

## Extraction Steps

### Known OCR Limitations (High Priority)

The following issues are in the backlog and should be completed soon:
- **Mission-type mission rows**: OCR detail boundaries are currently fixed and do not account for expanded mission-type rows. The status value from the mission row determines if a mission is expanded; boundaries need to be dynamic.
- **Lower mission details**: Capturing details below the initially visible area (step 3 below) has not yet been implemented. This requires OCR anchoring to detect the bottom boundary of an expanded mission.

### Steps

1. Run OOTP and go to the missions page, all filters off. Select the first mission to extract.
2. Run mission-extractor and select "Capture mission rows".
   - This captures the row data for visible missions (category, title, reward, status) and creates `Mission` DTO objects in memory with generated IDs.
3. Select "Capture top mission details".
   - This appends detail text (card titles or mission names) to the corresponding `Mission.MissionDetails` array.
   - **Known limitation**: This will not work correctly for mission-type missions due to OCR boundary issues (see above).
4. If mission details do not fit on screen, scroll until you can see the bottom details, then select "Capture lower mission details" (to be implemented).
   - This appends additional details to the same `Mission.MissionDetails` array using boundary anchoring.
5. Repeat steps 2-4 as needed for additional mission batches.
6. At any time:
   - **Save**: Select "Save unstructured mission data" to persist the in-memory array to `missions-unstructured-{timestamp}.json` for manual review and editing.
   - **Load**: Select "Load unstructured mission data" to restore a previously saved state.
   - **Lightweight Cleanup**: (Recommended between capture batches) Select "Lightweight cleanup and validation" to deduplicate missions, remove empty ones, regenerate IDs, and get early feedback on basic validation issues. This updates the in-memory state, auto-saves to `missions-unstructured-cleaned-{timestamp}.json`, and generates a `missions-cleanup-report-{timestamp}.html` with inferred mission types and flagged fields. See "Lightweight Cleanup" section below.
   - **Validate & Transform**: When ready, select "Validate, transform, and de-duplicate mission data" (see step 5 below).
5. When ready to validate and transform the mission data, select "Validate, transform, and de-duplicate mission data":
    - This runs automatically; **no explicit user confirmation is needed between missions**.
    - Deduplicates the mission DTO array, removes empty missions, and regenerates IDs while preserving order.
    - For each mission, performs detailed validation and transformation. Any errors are saved to `mission-validation-{timestamp}.html`.
    - **Full validation and transformation steps**:
        - All text fields are trimmed.
        - Category must exist and match an allowed category list.
        - Mission name must exist; transformed to remove all text after the first `[` (inclusive).
        - Reward must exist (structured reward data is populated separately, outside this tool).
        - Status must exist; transformed into mission type, required count, and total points. Parse failures are validation errors.
        - Mission details array is deduplicated and must contain at least one entry.
        - **By mission type**:
          - **Undefined**: Mission details are included in the validation report for manual review (you decide what to do with them).
          - **Count**: 
            - Remove all text after the last `(` (inclusive).
            - Map each detail to a card ID using the pre-built card mapping. Unmapped entries use cardId=0 and are flagged in the report.
            - The card count must equal `requiredCount`.
          - **Points**: 
            - Remove all text after the last `(` (inclusive).
            - Map each detail to card ID and points using the pre-built card mapping. Unmapped entries use cardId=0.
            - Extract the points value from the original detail string and compare against the mapped points value. Mismatches are flagged in the report.
            - The sum of card points must equal `totalPoints`.
          - **Mission (two-pass resolution)**:
            - Remove all text after the last `(` (inclusive).
            - In the second pass (after non-mission missions are transformed), map mission details to mission IDs by matching against transformed mission names.
            - Unmatched details use missionId=0 and are flagged in the report. This typically means OCR output doesn't match the actual mission name—manually inspect and update the unstructured JSON or set the correct missionId manually.
        - After both transformation passes, **reorder** the missions so any mission-type mission always appears after all missions it references (all its missionIds). **Note**: During reordering, IDs may shift. Any cross-references to these IDs (e.g., a mission-type mission referencing another by ID) are automatically updated to stay consistent.
    - The validation report (`mission-validation-{timestamp}.html`) contains:
      - Summary of all validation errors grouped by mission.
      - Raw OCR text and debug cell images for each error.
      - Unmapped card/mission details and their images for manual resolution.
    - The validated, transformed, deduplicated missions are saved to `missions-transformed-{timestamp}.json` for user review.

## Lightweight Cleanup and Validation

**When to use**: Run this between capture batches or anytime you want quick feedback on data quality before committing to the full transform. Recommended after each capture session.

**What it does**:
- Deduplicates missions (keeps first occurrence, removes subsequent exact matches)
- Removes empty missions (those with missing critical fields)
- Regenerates IDs while preserving mission order
- Parses the status field for each mission to **infer mission type** (Undefined, Count, Points, or Mission)
- Runs basic field-level validation

**Output**:
- **Automatic save**: A cleaned unstructured JSON is saved to `missions-unstructured-cleaned-{timestamp}.json`. This replaces the in-memory state.
- **Cleanup report** (`missions-cleanup-report-{timestamp}.html`) containing:
  - Summary of deduplicated missions (count of duplicates removed)
  - Removed empty missions (count and which ones)
  - Full list of remaining missions with inferred mission types
  - Flagged fields for each mission: missing or invalid category, name, reward, status, or missionDetails
  - No cell images are included (this is intentionally lightweight)

**Next steps after cleanup**:
1. Review the cleanup report. If flagged fields are expected or acceptable, proceed to step 2.
2. If you want to fix issues in the JSON directly, edit `missions-unstructured-cleaned-{timestamp}.json` and load it back into the app (Load unstructured mission data).
3. Run lightweight cleanup again if you made changes.
4. Once satisfied, run the full "Validate, transform, and de-duplicate mission data" step to map cards and resolve mission-type references.

