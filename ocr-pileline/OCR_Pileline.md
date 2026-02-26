# OCR Pipeline

## Objective
Use OCR to get mission text from OOTP into missions.json to be deployed in ootp-missions-27. MS PrintScreen Text Extractor (Win + Shift + T) will be used along with scripts and manual validation.

## Prelimary
From this directory: 
- Create a blank current-data.txt file
- Create a missions-structure.json file with the following:
```
{
  "version": "2026-02-22",
  "missions": []
}
```

## First Pass
This step is for getting the mission structures including category, name, reward and requirements into json.
Loop through extracting text from the mission page, inserting the missions into missions-structure.json until all missions are added.

1. In the OOTP mission page with no filter on and no missions expanded, extract all text using Text Extractor
2. Paste the results into current-data.txt and save
3. Run `insert-missions-structure.mjs` script to add mission category, name, reward, type and requirements to mission-structure.json without duplicating missions.
4. In OOTP Scroll down until you have new missions on screen then go to step 1 until all missions have been extracted

## Mission Structure Validation
A script will do basic validation of mission-structure.json and give a report of issues to the user. The user will clean up any issues.
Implementation TBD.

## Mission Details
This step is for getting card titles and mission titles needed to finish a mission, converting them to ids and inserting them into the json.
Loop through extracting each mission details from the mission page, updating missions-structure.json until all missions are updated

1. In the OOTP mission page, expand a mission that exists in mission-structures.json, extract all text using Text Extractor
2. Paste the results into current-data.txt and save
3. Run `update-mission-details.mjs` script to update requiredPoints and create or update `mission-details.json` with a list of card titles or mission names for the mission.
4. Repeat step 1 with a new mission until all missions have been extracted



### Alternatives to try
windows_media_ocr_cli
PsOCRCapture