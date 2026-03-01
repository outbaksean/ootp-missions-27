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
- Remove all accents

- Finish Lower Mission Details OCR
  - Measure boundries from mission details bottom going up and add them to appsettings
  - Add or update get details from bottom to use new boundries
- Implement Mission Type Missions OCR
  - Measure row length and top and add to boundries
  - Update validations and transforms

- [DONE] Find way to set/override parsed values type and requiredCount (allows extracting missions that are submitted but not complete)
- [Done] Fix caseing for status type parsing - Was actually O instead of 0 in ocr output, allowed anything in X part of X of Y for parsing
- [DONE] card title and mission mappings should be case insensitive
- [Done] Show shop cards on the right
- [Done] Fix points mapping to not just use card value
- [Done] Map totalPoints

- Stop auto saving of json and reports
- Mark mission verified and allow filtering out verified from view
- Update Save/Load buttons
  - Add Save and Load working copy buttons, uses hardcoded filename, overwrites each time
  - Add Save Verified Missions, saves all missions marked verified in final format (intermediate properties like missionDetails omitted)
- Stop auto saving unstructured json and validation reports
- Validation points mismatch not doing anything

- Add date added mapping and expose it in the app
- Add structured reward mapping and validation format: Card, Packs, Park
- Add way to combine mission files into one and reorder, regenerate ids, validate

## Auto Generate Boundries Notes

Top Row - Second Red Bar from top
Row Height - First divider below top bar
Num Rows - Count dividers to bottom
Row Left/Rights - Do an OCR Capture of the mission labels row (Category, Mission Title, etc) and use the bounding box from the output to find the left for each column (they ar left justified)
Details:
Find the first two rectangles on the first two rows (rectangle has one of two specific colors)
Measure from the center of 0x0 to 0x1 and 0x0 to 1x0
Detail width is 0x0 to 0x1 (horizontal)
Detail height is 0x0 to 1x0 (vertical) minus rectangle height
Left is transition from dark to light (can use exact color)
Columns is count of rectangles in a row

-     BoundingRect	{78,81,211,58}	Windows.Foundation.Rect

## Value - Points Mapping

<60 = 1
60-69 = 2
70-79 = 5
80-84 = 10
85-89 = 15
90-94 = 50
95-99 = 75

> = 100 = 200
