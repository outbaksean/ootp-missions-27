# Backlog

## Mission Tracker Bugs

- [B1] Mission type missions with the same mission as multiple leafs calculate correctly but the mission details are confusing
    - Parent mission has 2 missions and 2 needed. Child 1 is a Point mission, Child 2 is a Mission mission. Child 2 has one mission in it which is Child 1
    - Child 2 should have it's displayed cost in the mission details displayed minus the Child 1 mission cost
    - Child 2 should have a note that Child 1 is included in that mission
- [B2] Mission progress isn't updated on upload or set all complete, at least for mission type missions

## Mission Tracker Features

- [F1] Add option to not include card price in reward calculation
- [F2] Add filter for mission type allowing you to include any of points, cards or mission types defaulting to all
- [F3] In Mission type details, show rewards of missions
- [F4] Show badges for clubhouse and nonpack card types cards in mission details. clubhouse="CS" blue, nonpack="Special" orange
- [F5] Refactor upload to be a modal allowing drag and drop and put that on main screen when the user hasn't uploaded
    - On main page when there is no upload there should not be a open upload dialog modal
    - On the main page, clicking in the dropzone should open the file chooser like it does in the modal
    - Help should be included in the component below the dropzones, not a separate modal with a button
    - In the modal the dropzone should be bigger and have the same style as on the main page
    - In the modal the clear button should only show if there is an upload   
    - The lock upload should be a dropzone too
- [F6] Allow for CS and PP mission rewards
    - Include a CS to PP ratio option with a default to define CS reward value
- [F7] Rethink lock to complete, make using unlocked the default
    - New mode that optimizes around locked cards. The unlocked price should only be visible when this mode is on
- [F8] Update shopping list mode
    - New wizard to input options
    - Overrides both mission list and mission details instead of just mission details when shopping list mode is on
    - Missions defaults to all, any number of categories, chains, target reward cards, or standalone missions can be selected, they are automatically deduplicated
    - Strategy can be Completion or Value
    - Add an option to only buy if a mission is completable, if this is set don't use the last pp to finish only part of a mission
    - Available pp defaults to unlimited and can be set 
    - Shopping list should account for cards in multiple selected missions when ordering cards
    - Shopping list should include rewards from missions to be completed in the list as available for later missions

## Mission Extractor

- Fix casing for category
- Try substring search for card title mapping
- Test with different themes and font sizes
- Update boundaries
- Move to a separate repo
- Update documentation
    - Manual snip ocr of columns can help with structure, particularly for live missions

## Release

- Update upload help images and text
- Verify card shop format imports correctly
- Update card shop import to use new Packable field
- Transform actual card shop csv into default card shop
- Create and test new missions.json with initial live rewards

## Later Features

- Link to other third party tools in the app
- Include the date the mission was added
- Include the mission difficulty stars
- Add way to load a missions.json to get ootp26 missions in there
- Add Pack EV Modal where based on card data pack expected value is caluclated per pack type
    -Give options for the user to remove specific outliers e.g. live irons with L10 over 300
    -Allow the user to override the calculations and set the pack rewards to them
- OOTP MCP

## Cleanup

- Add unit tests
    - Mission/Group Calculations
    - Sorting
    - Mission Details
- Add Playwright tests
    - Upload flow
- Cleanup mission and cardshop json structure
    - Change totalPoints to totalItems

## OOTP 26 Mission Issues (not intending to fix)

- Fix `Bee Gees` Mission (figure out missions version)
- Finish `Launch Plus` Missions
- Fix Live missions, remove `MLB 2025 Live CL Emmanuel Clase CLE` from CLE missions
- Fix `Early Era OF` Mission
- Fix `Immortal Relievers` Mission 
- Fix `There's a Link` Mission, the title is wrong
- Fix `Launch Help` Mission, the missions needed is wrong
- Mission `Nos Amours 2` is including Tim Wallach as available because it has a price but isn't actually avaiable due to being a reward card. I'm not sure the best way to hand this, probably force proce to 0 and put a special note on that card. (this will not be an issue in 27 due to the new packable field in shop cards)