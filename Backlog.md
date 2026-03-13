# Backlog

## Mission Tracker Bugs

- [B1] [DONE] Mission type missions with the same mission as multiple leafs calculate correctly but the mission details are confusing
    - Parent mission has 2 missions and 2 needed. Child 1 is a Point mission, Child 2 is a Mission mission. Child 2 has one mission in it which is Child 1
    - Child 2 should have it's displayed cost in the mission details displayed minus the Child 1 mission cost
    - Child 2 should have a note that Child 1 is included in that mission
- [B2] [DONE] Mission progress isn't updated on upload or set all complete, at least for mission type missions
- [B3] [CANTREPRO] Target card groups do not have child missions in the group, at least not after enabling optimized mode
- [B4] [DONE] Target card and target mission selections are clunky, deselecting and reselecting takes too many clicks

## Mission Tracker Features

- [F1] [DONE] Add option to not include card price in reward calculation
- [F2] [DONE] Add filter for mission type allowing you to include any of points, cards or mission types defaulting to all
- [F3] [DONE] In Mission type details, show rewards of missions
- [F4] [DONE] Show badges for clubhouse and nonpack card types cards in mission details. clubhouse="CS" blue, nonpack="Special" orange
- [F5] [DONE] Refactor upload to be a modal allowing drag and drop and put that on main screen when the user hasn't uploaded
    - On main page when there is no upload there should not be a open upload dialog modal
    - On the main page, clicking in the dropzone should open the file chooser like it does in the modal
    - Help should be included in the component below the dropzones, not a separate modal with a button
    - In the modal the dropzone should be bigger and have the same style as on the main page
    - In the modal the clear button should only show if there is an upload   
    - The lock upload should be a dropzone too
- [F6] Allow for CS and PP mission rewards
    - Include a CS to PP ratio option with a default to define CS reward value
- [F7] [DONE] Remove default lock to complete functionality
    - Everything related to locked cards should be removed by default and only used when an Optimized toggle is set
    - The Optimized toggle will have the same ux as the shopping mode toggle
    - The tooltip should note that Optimized mode takes into account locked cards and finals optimal mission values taking into account the value of selling unlocked cards. This should note that it is only intended if the user has uploaded their locked card data.
    - Use unlocked cards in Net option will be removed, when the Optimized toggle is on calculations will be done the same as if that were set and vice versa
    - Optimized Card Assignments will be removed, when the Optimized toggle is on calculations will be done the same as if that were set and vice versa
    - The unlocked value in missions and groups will only be shown when the Optimized toggle is on
    - All references to setting a mission complete are removed, with the toggle is off a mission is complete if you have enough owned cards, when it is on a mission is complete if you have enough locked cards.
    - A section to the help modal is added for Optimized mode. References to removed settings are removed.
    - The upload help is modified to refer to Optimized mode in the lock upload section.
- [F8] [DONE] Update shopping list mode
- Shopping Mode Upgrades
  - [S1] [DONE] In shopping mode, if missions are excluded due to price, show cost to complete those missions
  - [S2] In shopping mode, if optimize locked cards is on, after the cards to buy to complete a mission, put a list of cards to lock for the mission and the combined cost of those cards using the buy sell difference. Include total cost of cards to lock in header
  - [S3] [DONE] The html report should include the updated header format
  - [S4] [DONE] Combine rewards should be in badge format
- [F9] Set Limited Edition Card Type as nonpack

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