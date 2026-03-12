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
- [F7] Remove default lock to complete functionality
    - Everything related to locked cards should be removed by default and only used when an Optimized toggle is set
    - The Optimized toggle will have the same ux as the shopping mode toggle
    - The tooltip should note that Optimized mode takes into account locked cards and finals optimal mission values taking into account the value of selling unlocked cards. This should note that it is only intended if the user has uploaded their locked card data.
    - Use unlocked cards in Net option will be removed, when the Optimized toggle is on calculations will be done the same as if that were set and vice versa
    - Optimized Card Assignments will be removed, when the Optimized toggle is on calculations will be done the same as if that were set and vice versa
    - The unlocked value in missions and groups will only be shown when the Optimized toggle is on
    - All references to setting a mission complete are removed, with the toggle is off a mission is complete if you have enough owned cards, when it is on a mission is complete if you have enough locked cards.
    - A section to the help modal is added for Optimized mode. References to removed settings are removed.
    - The upload help is modified to refer to Optimized mode in the lock upload section.
- [F8] Update shopping list mode

  **Wizard — `ShoppingWizard.vue` (modal)**
  - Opens automatically when the user first enables shopping mode; re-opens via "Configure" button in the shopping list header
  - Three steps with a step indicator (e.g. `● ○ ○`) and Back / Next / Generate buttons
  - **Step 1 — Scope**
    - No "All Missions" toggle — the step opens empty, and empty means all missions. A helper note makes this clear: "No filters selected — all missions included"
    - Add scope by Category (dropdown of existing category values, multi-select pills), Chain (search + add), Target Reward Card (search + add), or Individual Mission (search + add)
    - Selections across types are combined and automatically deduplicated; a live count shows the resolved mission count (e.g. "42 missions selected")
    - Each added item shows as a dismissible pill — same pill style as existing tag components
    - When any filter is active a "Clear all" link resets to all missions and the helper note returns
  - **Step 2 — Strategy**
    - Two large card-style radio options (full-width, tappable):
      - **Completion** — "Complete as many missions as possible, cheapest first"
      - **Value** — "Prioritize missions where rewards exceed card costs"
    - Completion is the default
  - **Step 3 — Budget & Options**
    - Available PP: number input, placeholder "Unlimited"; shows formatted value on blur
    - Toggle: "Completable missions only" (default off) — when on, exclude missions that can't be fully completed (no partial mission spend)
    - Toggle: "Optimize for locked cards" (default off) — when on, the shopping list uses optimized mode calculations (accounts for locked cards and opportunity cost of selling unlocked cards); this setting is independent of the main Optimized Mode toggle and overrides it for the shopping list
    - Brief explainer line under each option
  - On Generate, close wizard and render the shopping list immediately

  **Mission list panel — shopping mode overrides normal list**
  - The left panel (MissionList area) switches to a read-only plan view; the normal select/filter controls are hidden
  - Shows missions in two sections:
    - **In Plan** — ordered by strategy priority, each showing mission name, remaining cost, and a status badge (Completing / Over Budget)
    - **Excluded** — collapsible, shows missions not in scope or filtered out with a brief reason (Out of Scope, Not Completable, Negative Value)
  - No "Include" buttons; scope is set entirely through the wizard
  - A "Configure" button at the top of this panel re-opens the wizard
  - Clicking a mission row highlights its cards in the shopping list panel (smooth scroll + brief highlight)

  **Shopping list panel — cleaned up**
  - Remove the collapsible Settings section (all settings live in the wizard now)
  - Header: "Shopping List" + Configure button + CSV/HTML export buttons
  - Summary bar at top: strategy, budget (or ∞), mission count, total cost
  - Card rows unchanged in structure but reward propagation added (see below)
  - Keep existing CSV and HTML export

  **Reward propagation**
  - After each mission is resolved in buy order, its reward cards are added to the "owned" pool before evaluating the next mission
  - Cards sourced from completed-mission rewards are shown in the list with a "Reward from [Mission Name]" label instead of a price, and don't add to total cost
  - This applies to pack rewards that resolve to specific cards when known; skip when reward is a random pack

  **Logic / data changes**
  - `ShoppingListHelper`: add `completableOnly` flag — when set, `selectMissionsForBudget` skips any mission whose `isCompletable` is false or whose cost would leave the budget partially spent on the last mission
  - Wizard scope state (categories, chains, rewardCards, missionIds) replaces the current `shoppingListMissionIds` Set driven by per-mission Include buttons; empty scope = all missions, no separate flag needed
  - Existing settings store flags (`useSellPrice`, `includeCardValueInRewards`) continue to be respected — no changes to those settings
  - Card deduplication across selected missions already handled in `buildShoppingItems`; ensure reward-pool updates don't re-add cards that were already purchased
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