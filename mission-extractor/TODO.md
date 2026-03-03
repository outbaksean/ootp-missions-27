# TODO

- Latest pack rewards 164 days ago on 3/2
- All live missions need to be redone since cards have been added
- Ready to go!!!
  - Ignore live missions, they can use the alternate strategy no ocr needed
  - Go per category
  - Do mission type missions last of the category
  - Fix as you go
  - Save working copy often
  - Check save verified missions regularly

- [DONE] Only highlight mission details with validation errors
- [DONE] Allow the user to delete missions or mission details manuallly
- [DONE] Show readonly json in report
- [DONE] requiredCount not parsing correctly for points missions
- [DONE] Group validation errors by mission
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
- [Done] Mark mission verified and allow filtering out verified from view
- [Done] Add way to combine mission files into one and reorder, regenerate ids, validate
- [Done] Stop auto saving unstructured json and validation reports
- [Done] Add way to capture missions that can't align with the top row
- [Done] Update Save/Load buttons
  - [Done] Add Save and Load working copy buttons, uses hardcoded filename, overwrites each time
  - [Done] Add Save Verified Missions, saves all missions marked verified in final format (intermediate properties like missionDetails omitted)
  - [Done] Add "Load Verified Missions" button - loads missions json file in the final format, validates it, any validated are added to the beginning of the array then ids regenerated.

- Card Title transformations, case sensitive, check for others
- [Done] "Historical AS" to "Historical All-Star"
- [Done] "UnH" to "Unsung Heroes"
- [Done] "RSSensation" to "Rookie Sensation"
- [Done] "HaHes" to "Hardware Heroes"
- "NeL Star"

- Add structured reward mapping and validation format: Card, Packs, Park
- Change version format to include time, update app to parse date from it
- Add date added mapping and expose it in the app
- Change totalPoints to totalItems in ocr and app

- Validation points mismatch not doing anything
- Try Fuzzy Search for the mapping
- Show offsets on screen and make them editable
