# Implementation Plan

1. Update Menu Items with correct text and stubs
    1. Capture Mission Details (update to do what #2 does now)
    2. Capture Lower Mission Details (not implemented)
    3. Light-Weight Validation and Transformation (not implemented)
    4. Full Validation and Transformation (not implemented)
    5. Save Unstructured Mission Data (not implemented)
    6. Load Unstructured Mission Data (not implemented)

2. Cleanup dead code

3. Implement basic flow for save and load unstructured mission data
    - Update Mission DTO class to fully match ootp-missions-27\app\public\data\missions.json 
        - Add properties not in the schema that will be used for transformations, they will be omitted from final serialization: `MissionDetails` array of string and `Status` string
    - Initialize empty missions array on startup
    - Create Mission DTO when "Capture Mission Details" is run with captured data and save it into an in memory list
    - Implement "Save Unstructured Mission Data" serializes missions array and saves to file
    - Implement "Load Unstructured Mission Data" deserializes input to missions array and overwrites in memory array

4. Implement basic Light-Weight Validation and Transformation
    - Find a way to associate raw images used for ocr with the corresponding field 
    - Deletes any empty missions
    - Deduplicates the missions array
        - Regenerates IDs updating `missionIds` if needed
    - For each mission, validate Category is in AvailableCategories
        - AvailableCategories:
        - Live Series
        - Pack Rewards
        - Launch Deck
        - Bonus Rewards
        - Immortal Seasons
        - Negro Leagues
        - Hall of Fame
        - Baseball Reference
        - Future Legends
        - Launch Plus
        - PT Elite
        - Playoff Moments
        - Workd Series Start
        - Holiday Times
        - Final Mission Set
    - If there are any validation errors, generate a validation report html, if not display validation success in console
    - Validation report should be saved as `validation_lightweight_{timestamp}.html` in the following format:
    ``` 
    Mission ID {ID}: {title}
    Category Blank {raw image shown in line}
    {serialized json for mission}
    
    Mission ID {ID}: {title}
    Category Invalid {raw image shown in line}
    {serialized json for mission}
    ```
    - The full in memory missions array should be serialized and saved as `mission_unstructured_{datetime}.json

5. Expand Lightweight Validation and Transformation (Cleanup Mode)

    The goal is to turn the lightweight step into a full cleanup pass that infers mission types,
    validates all key fields, and produces an actionable report. The output is named to reflect
    that it is a cleaned intermediate file, not a final transform.

    ### MissionType enum
    - Add `Undefined` as a value to `MissionType`. This is the default state when type cannot
      be inferred from the status field.

    ### Status parsing — new `ParseStatus` step
    - Add a `ParseStatus` method to `LightweightValidationService` that parses `Mission.Status`
      (raw OCR text) and infers the mission type, setting `Mission.Type` in place.
    - The method should also set `Mission.RequiredCount` if it can extract a count from the status.
    - Run this step after `RegenerateIds` and before field validation.
    - Status text formats (confirmed from OCR output):
        - Count:   "X / Y out of Z"  (e.g. "3 / 18 out of 18")
        - Points:  "X / Y Points"    (e.g. "0 / 305 Points")
        - Mission: "X / Y Missions"  (e.g. "1 / 4 Missions")
        - Undefined: none of the above match
    - Y is the value to extract as `RequiredCount` (or `TotalPoints` for the Points type).
    - Parse failures at this step are NOT validation errors. A mission with an unrecognized status
      gets Type=Undefined and is flagged in the report for review, not blocked.

    ### Expand field validation
    - Replace `ValidateCategories` with a `ValidateFields` method that checks all key fields.
    - Validation rules:
        - Name blank: `string.IsNullOrWhiteSpace(Name)` -> error type "Name Blank"
        - Category blank: `string.IsNullOrWhiteSpace(Category)` -> error type "Category Blank"
        - Category invalid: category not in AvailableCategories -> error type "Category Invalid"
        - Reward blank: `string.IsNullOrWhiteSpace(Reward)` -> error type "Reward Blank"
        - Status blank: `string.IsNullOrWhiteSpace(Status)` -> error type "Status Blank"
        - MissionDetails empty: `MissionDetails.Count == 0` -> error type "MissionDetails Empty"
    - Type=Undefined is not itself a validation error; it will appear in the report as the
      inferred type. The user reviews and corrects these in the unstructured JSON if needed.

    ### Update report format
    - Rename report to `missions-cleanup-report-{timestamp}.html`.
    - Remove all inline images from the report. The cleanup report is intentionally lightweight.
    - Report structure:
        - Header with run timestamp
        - Summary section:
            - N duplicate mission(s) removed
            - N empty mission(s) removed
        - Full mission table: one row per remaining mission showing ID, Name, Category,
          Inferred Type, and any flagged error types for that mission inline (e.g. "Reward Blank")
        - If there are no flagged fields and no Undefined types: show "No issues found" after the
          mission table
    - The report is always generated (not only when there are errors), so the user always gets
      a full picture of the cleanup run.

    ### Update JSON output filename
    - Change the saved JSON filename from `mission_unstructured_{timestamp}.json` to
      `missions-unstructured-cleaned-{timestamp}.json` to distinguish it from raw capture saves.

    ### Run method updates
    - Pass `emptyRemoved` and `dupRemoved` counts into the report generator so the summary
      section can display them accurately.

    ### Menu rename
    - Rename menu option 3 in `Program.cs` and `DisplayMenu` from
      "Light-weight validation and transformation" to "Lightweight cleanup and validation".

6. Implement Full Validation and Transformation
    - Details TBD
    - Will include card mappings

7. Update OCR for mission type missions
    - Details TBD

8. Update OCR for Lower Mission Details
    - Details TBD
    