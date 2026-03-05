# TODO

## Notes

- Latest pack rewards 164 days ago on 3/2
- All live missions need to be redone since cards have been added
- Ready to go!!!
  - Ignore live missions, they can use the alternate strategy no ocr needed
  - Go per category
  - Do mission type missions last of the category
  - Fix as you go
  - Save working copy often
  - Check save verified missions regularly
  - Combine verified missions occasionally and reorder

## Progress

- _`Pack Rewards` Complete!_ Estimated 85 minutes for 19 missions, code changes as I went
- `Bonus Rewards` Complete through 165 days ago - Bo Knows Best
- Skipping `Roberto Clemente Giveaway` due to having cards beaking ocr, It should work if I show boundries and temporarily update offset
- `Bonus Rewards` Complete through 158 days ago - Left Arm of God - About the same time per mission, code changes as I went
- `Bonus Rewards` Complete through 109 days ago - Miggy Mania
- `Final Mission Set` Complete
- `Holiday Times` Complete
- `Bonus Rewards` Complete through 47 days ago - Weighs and Means
- `Bonus Rewards` Complete through 33 days ago - Unleash the deGrominator
- `Bonus Rewards` Complete
- `Trouble Twins` is the first one to go through with no errors!
- `Playoff Moments` Complete
- `World Series Start` Complete
- Updated original live missions with all cards
- Cleaned up original missions in `mission-extractor\in-progress-missions\misions_live_updated_cleaned.json`
- Cleaned up most of new extracted missions in `mission-extractor\in-progress-missions\missions_verified_20260303_224132.json`
- Added running cleaned missions file to in progress missions
- Updated `Bo Knows Iron` and `PG Associates` using manage missions screen, it was pretty nice
- Re-captured `PG Heroes` and `Stars` and added to running cleaned missions, these have duplicate mission names
- Cleaned up `PT27`, `PT26` manually in the json, the name spacing and category casing were wrong
- Added `PT Elite` live missions to running cleaned missions

## Next

- Cleanup Category casing
- Extract `Roberto Clemente Giveaway`
- Extract `PT Elite` category with a combination of ocr extraction and live mission helper
- Mission Tracker: Update category order
- Mission Tracker: Fix App reward parsing
- Mission Tracker: Add "Mission Update Notes" modal that explains when missions were last updated and any to be updated
- Mission Tracker: Fix Mobile Layout
- Mission Tracker: Test and deploy updated missions with udpated PreReleaase Notes
- Mission Tracker: Deploy archived ootp26 version, add links in CraterVar and 27 tracker

## Proposed Features - Mission Tracker

- Deploy Card Ranker (in memory of Fabtron)
- Mission Tracker: Find a better way to highight cards in multiple missions
- Mission Tracker: Revisit report generation
- Mission Tracker: Export to csv (maybe combined with report)

## Live

- Get mission scaffold: name, type (count), reward, requiredCount
- Put every live card with the team in the cards array
- Update totalPoints
- Combine with main mission pool

## Live Missions Helper page

- Dropdown with abbreviation for each of the 30 mlb teams
- "Get Live CardIDs" button displays all cardIDs for the team in the live category
- Has a copy all button
- Card that are in the live category have titles that start with "MLB 2025 Live"
- The last word of the title is the team abbreviation "WSH" for the Washington Nationals.
- Example "MLB 2025 Live LF James Wood WSH"

## Old to New Cleanup

- Update pack part of reward string "3 Standard Packs" -> "3x Standard Packs", do not consider this an error or warning
- Try to parse reward to structured rewards
- For mission type missions - set totalPoints to length of missionIds array
- Try to do a substring match of reward card

## Categories

- Live Series
  - Complete, not deployed
- Pack Rewards
  - Complete, not deployed
- Launch Deck
  - Complete previously
- Bonus Rewards
  - Complete, not deployed
- Immortal Seasons
  - Complete previously
- Negro Leagues
  - Complete previously
- Hall of Fame
  - Complete previously
- Baseball Reference
  - Complete previously
- Future Legends
  - Complete previously
- Launch Plus
  - Complete previously
- PT Elite
  - To be done, 43 missions
- Playoff Moments
  - Complete, not deployed
- World Series Start
  - Complete, not deployed
- Holiday Times
  - Complete, not deployed
- Final Mission Set
  - Complete, not deployed
- Total
  - 14 missions left

## Combine with previous missions

- Make a script to update the live mission cards for previous missions.json
- Make a script update structured pack rewards strucure to match mission-extractor, go from "2 Standard Packs" to "2x Standard Packs"
- Update mission-extractor to Load missions from final format as unformatted to manually map reward cards to card ids
- Load cleaned up prefious missions.json, validate no errors other than rewards and fix rewards mapping
- Combine previous missions into working set, or refactor to allow smaller sets and combine verified missions at the end

## After missions.json is done

- Deploy to ootp-missions-27
- Ensure rewards are hooked up right in the app, verify parks are shown and card rewards have their prices included in reward price
- Add date added mapping to missions, possibly manually, possibly don't bother
- Update version in missions.json to include datatime, update the ocr and the app to use that
- Find a way better way than date to show what missions are in the app for intermediate deploys
- Finish release checklist and update process docs
- Change totalPoints to totalItems in ocr and app, refactor only no behavior change

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
- [Done] "NeL Star"

- [Done] Add structured reward mapping and validation format: Card, Packs, Park
- Change version format to include time, update app to parse date from it
- Add date added mapping and expose it in the app, or don't
- Change totalPoints to totalItems in ocr and app

- Validation points mismatch not doing anything
- Try Fuzzy Search for the mapping
- [Done] Show offsets on screen and make them editable
