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
  - Add Save and Load working copy buttons, uses hardcoded filename, overwrites each time
  - Add Save Verified Missions, saves all missions marked verified in final format (intermediate properties like missionDetails omitted)
- Stop auto saving unstructured json and validation reports
- Validation points mismatch not doing anything

- Add date added mapping and expose it in the app
- Add structured reward mapping and validation format: Card, Packs, Park
- Add way to combine mission files into one and reorder, regenerate ids, validate
