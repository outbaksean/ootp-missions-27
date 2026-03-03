# TODO

- [DONE] Only highlight mission details with validation errors
- [DONE] Allow the user to delete missions or mission details manuallly
- [DONE] Show readonly json in report
- [DONE] requiredCount not parsing correctly for points missions
- [DONE] Group validation errors by mission

- Card Title transformations, case sensitive, check for others
- [Done] "Historical AS" to "Historical All-Star"
- [Done] "UnH" to "Unsung Heroes"
- [Done] "RSSensation" to "Rookie Sensation"
- [Done] "HaHes" to "Hardware Heroes"

- [Done] Remove "Sell Orders"
- [Done] Remove trailing (VAR) from mission title.
- [Done] Remove all commas from mission titles, not just the first
- [Done] Remove all accents - initial try failed, maybe don't bother - Fixed, removing dashes from a separate cleanup was the issue

- [Done] Finish Lower Mission Details OCR
- [Done] Implement Mission Type Missions OCR

- [DONE] Find way to set/override parsed values type and requiredCount (allows extracting missions that are submitted but not complete)
- [Done] Fix caseing for status type parsing - Was actually O instead of 0 in ocr output, allowed anything in X part of X of Y for parsing
- [DONE] card title and mission mappings should be case insensitive
- [Done] Show shop cards on the right
- [Done] Fix points mapping to not just use card value
- [Done] Map totalPoints

- [Done] Stop auto saving of json and reports
- Try Fuzzy Search for the mapping
- Show offsets on screen and make them editable
- [Done] Mark mission verified and allow filtering out verified from view
- [WIP] Update Save/Load buttons
  - [Done] Add Save and Load working copy buttons, uses hardcoded filename, overwrites each time
  - [Done] Add Save Verified Missions, saves all missions marked verified in final format (intermediate properties like missionDetails omitted)
  - Add "Load Verified Missions" button - loads missions json file in the final format, validates it, any validated are added to the beginning of the array then ids regenerated.
    Validation:
  - All mission names must be unique, if missions with the same name are identical other than id load one of them and report the error, if they are different report both and don't load either, always try to load the remaining
  - For each mission validate the following:
    - requiredCount <= totalPoints,
    - no 0 in id or cardID or missionID,
    - category is in availableCategories,
    - type is in the enum
    - reward exists
    - for mission type requiredCount = length of missionIds array
    - for cards type requiredCount = length of cards array
    - for points type required count = sum of points in cards array
    - requiredCount must be > 0
    - mission type missions have missionids that all exist in the array

De-Duplication: When a mission to be loaded has the same name as one in state:

- if they don't have the exact same final fields that's a validation error, don't load it
- if they do have the exact same final fields mark the mission in state verified if it's not and don't load
  Any data from non final properties is ignored, the missions are imported as verified and are uneditable

- Change version format to include time, update app to parse date from it
- Change totalPoints to totalItems in ocr and app
- [Done] Stop auto saving unstructured json and validation reports
- Validation points mismatch not doing anything

- Add date added mapping and expose it in the app
- Add structured reward mapping and validation format: Card, Packs, Park
- Add way to combine mission files into one and reorder, regenerate ids, validate
