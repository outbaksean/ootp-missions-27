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
    - For each mission, validate Category is in AvailableCategories (to be added by the user)
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

5. Expand Light-Weight Validation and Transformation
    - Details TBD

6. Implement Full Validation and Transformation
    - Details TBD
    - Will include card mappings

7. Update OCR for mission type missions
    - Details TBD

8. Update OCR for Lower Mission Details
    - Details TBD
    