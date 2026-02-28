# Mission Update Process

## General Plan

 With the ootp running in one monitor and the mission extractor app running in a terminal on another monitor, run "capture mission data" options for missions to extract. This will update an array of missions in memory with data from ocr. At any point you can do "Save current unstructured mission data" which serializes the current missions array with no validations or transformations to `missions-unstructured-{timestamp}.json` for review. At any point you can do "Load unstructured mission data" which prompts for a filepath to replace the current missions array with data from a file. When missions have been extracted, run "Validate, transform, and de-duplicate mission" data. This validate and transform the missions array in memory, serialize and save to `missions-transformed-{timestamp}.json`, and save a validation report `mission-validation-{timestamp}.html` including images used for ocr. Review the validation report and manually fix issues. 

 The Mission DTO has all properties to serialize to the missions.json format from `ootp-missions-27\app\public\data\missions.`json`. The DTO also includes a missionDetails array that includes the raw mission details from ocr(card titles or mission names). This will only be serialized to the unstructured json, not the transformed json, it is used in the transform step.

 ## Extraction Steps

1. Run OOTP and go to the missions page, all filters should be off, select the first mission to extract
2. Run mission-extractor with the terminal on a separate monitor and do "Capture top mission details"
    - This updates an in memory missions array with mission dto objects. Missions have a generated id.
    - OCR doesn't work yet for mission type missions, it needs to be updated to change it's detail boundries based on Status from the mission row
3. If mission details do not fit, scroll until the bottom mission details are available and do "Capture lower mission details" (to be created)
    - OCR work needs to be done for this using anchoring to find the bottom of the expanded mission and generate row boundries from the bottom
4. Optionally repeat steps 2 and 3 until all missions have been extracted
5. In the terminal select option "Validate, transform, and de-duplicate mission data" (to be created)
    - Deduplicates mission dto array, delete empty dtos, and regenerate ids if needed. Order should be preserved
    - For each mission does the following validation and transformation, saves any validation errors to a new `mission-validation-{timestamp}.html` file
        - All text will be trimmed.
        - Category must exist. Category must match from a list of available categories (to be created).
        - Mission Name must exist. Trasformed to remove all text after the first '[' inclusive
        - Reward must exist. Structured rewards will not be generated, that will be done outside of this process.
        - Status must exist. Transform Status into mission type and required count and total points. If the transform cannot be done it's a validation error. Required count must be less than total points.
        - Deduplicate mission details array for the mission
        - Missions detail array must include at least one value
        - Based on mission type do the following:
            - Undefined: Include the mission details array in the validation report for manual mapping
            - Count: 
                - Remove all text after the last '(' inclusive
                - Map details to cardIds (mapping to be created)
                - Include cardIds in the cards property
                - Any mission detail that doesn't map use 0 as cardId and include in validation report for manual mapping
                - The amount of cards must equal required count
            - Points:
                - Remove all text after the last '(' inclusive
                - Map details to cardIds and points (mapping to be created)
                - Include cardIds in the cards property
                - Any mission detail that doesn't map use 0 as cardId and include in validation report for manual mapping
                - In the original mission detail string, get the points value and compare against the mapped points value. If points value cannot be found or does not match the mapped value include in validation report
                - The sum of points must equal the total count
            - Mission:
                - Remove all text after the last '(' inclusive
                - Mission Detail mapping must be done in a second pass after all other missions have been transformed
                - Map mission details to mission id in the missions array, any mission detail that doesn't map use 0 as missionID and include in validation report
    - After individual missions have been validated and transformed, Update the ordering so any mission type mission has a greater id than any of it's missionIds
    - The validation report will contain the raw cell images for any validation errors
    - Saves the validated, transformed, de-duplicated, serialized missions array to `missions-transformed-{timestamp}.json` for user review
6. Manually review `missions-transformed-{timestamp}.json` overwrite `ootp-missions-27\app\public\data\missions.json` after full validation to update missions in the app.
