# Code Review: ootp-missions-27

## Bugs

### High

**B1. [DONE] `toggleOwn` in `MissionDetails.vue` never propagates to other missions**
When you toggle a card's owned state in the detail panel, `missionStore.updateCardOwnedState(cardId)` is never called. Only the single `MissionCard` object in the currently open mission is patched manually. Every other mission containing that card stays stale — wrong progress bars, wrong completion badges, wrong sort order. The `hasUnappliedChanges` flag and Recalculate button are a workaround but don't fix the other missions.

**B2. [DONE] `updatePriceType` calls `missionStore.initialize()` instead of `buildUserMissions()`**
Toggling "Use Sell Price" triggers a full `initialize()`, which re-fetches missions.json from the CDN/cache, resets `loading = true`, and flashes the spinner. It should just call `buildUserMissions()` — the same pattern used by the "Optimize card assignment" toggle.

### Medium

**B3. [DONE] Count mission `progressText` renders `"undefined"` for the total**
Count-type missions don't have a `totalPoints` field in `missions.json`, but the `progressText` template string uses `mission.totalPoints`, producing e.g. `"3 out of any 18 of undefined total"`.

**B4. [DONE] Zero-price cards silently excluded from cost calculation**
Cards with `price === 0` are filtered out of the optimizer and `remainingPrice`. The mission can show $0 remaining while still being incomplete, with un-highlighted unowned cards in the detail panel and no signal about what to actually acquire.

**B5. [DONE] Missing cards (not in the shop CSV) are silently dropped**
Cards in `missions.json` that aren't in the uploaded CSV are filtered out with no indication to the user. This makes `remainingPrice` appear lower than reality and could produce a false "completed" signal.

**B6. [DONE] Lock file data is destroyed on every shop card re-upload**
`uploadShopFile` calls `clearShopCards()` which wipes all cards (resetting all `locked: false`) before writing the new set. The user must remember to re-upload the lock file every time they refresh their card data, with no reminder in the UI.

### Low

**B7. [DONE] Inconsistent sell-price fallback logic between `MissionHelper` and `useMissionStore`**
`MissionHelper` uses `sellOrderLow > 0` as the guard; the store uses `sellOrderLow || lastPrice` (JS truthy coercion). They produce the same result today but are a maintenance trap — the two paths should be identical.

**B8. [DONE] Lock file upload silently does nothing if shop cards aren't loaded yet**
If the user uploads the lock file before uploading the shop CSV, the loop over `shopCards.value` (which is empty) runs zero iterations. No error or warning is shown — the file input just displays the filename as if it worked.

**B9. [DONE] Chain grouping only goes one level deep**
The "Group by Chain" logic collects a root mission's direct `missionIds` children. If a "missions"-type mission is itself a sub-mission of another "missions"-type mission, the grandchildren end up in "Standalone" instead.

**B10. [DONE] Group "Calculate" button queues the parent before sub-missions are done**
"missions"-type parent missions aggregate from sub-mission costs. Clicking the group Calculate button will try to calculate the parent, but if sub-missions are also uncalculated, the parent will return zeros.

**B11. [DONE] `selectedMissionFilter` typed `string | null` but the select binds to `""`**
The initial `null` and the reset-to-all `""` are both falsy so it works, but the type is misleading and could cause issues in future edits.

---

## Features / UX gaps

**F1. [DONE] Price overrides not persisted across page reloads**
`cardOwnedOverrides` persists to localStorage; `cardPriceOverrides` does not. A page refresh wipes all manual price overrides.

**F2. [DONE] Sidebar filter/sort preferences not persisted**
`sortBy`, `groupBy`, `hideCompleted`, `showPositiveOnly`, `selectedCategoryFilter`, and `useSellPrice` all reset on reload.

**F3. [WONTDO] No stale-cost indicator after a price override**
After overriding a card's price, other missions in the list containing that card show the old calculated cost with no visual indicator that the number is stale.

**F4. [WONTDO] Calculating a leaf mission doesn't bubble up to its parent**
Clicking "Calculate" on a single sub-mission doesn't trigger a recalculation of the "missions"-type parent that aggregates it. The parent stays "Not Calculated" until the user separately calculates it.

**F5. [WONTDO] Search doesn't match reward text**
Searching "Gold Pack" or "Diamond" returns nothing because `m.rawMission.reward` isn't included in the search filter.

**F6. [DONE] Sub-missions in the detail panel aren't clickable**
When viewing a "missions"-type parent, the sub-mission list is static. You can't click a sub-mission to open its detail — you have to close the panel, find it in the list, and Select it manually.

**F7. Missions completion status enhancements** — _Needs detailed plan_
Missions should not be marked complete unless the required cards are locked, not just owned. Users should be able to mark a mission complete. Mission Net should be 0 for all complete missions.

**F7b. Group header Net stat mixes completed and pending missions** — _Needs detailed plan (combine with F7)_
`groupRewardText` and `groupValueText` include completed missions in their totals. The "Net" figure becomes a blend of already-earned and still-earnable value with no distinction shown.

**F8. [WONTDO] No CSV export**
Given the app already uses PapaParse, exporting the current filtered mission list (with calculated costs, reward values, net values) to CSV would be a natural addition.

**F9. [WONTDO] No event deadline / expiry tracking**
No `expiresAt` field on missions and no filtering by urgency. Useful for time-limited events.

**F10. [DONE] Allow resizing of columns**
Allow the user to resize the mission column by dragging to the left

**F11. Include combined mission rewards in group**
This could either be part of the mission update process or in the main application to automatically generate the reward string from the mission structured rewards. Include a combined reward string for groups.

**F12. Consider cards that are in multiple missions** — _Needs detailed plan_
Give some indication or calcuation on when it makes sense to buy a more expensive card because it can be used for another mission

**F13. [DONE] Add parent missions in mission details**
In mission details for child missions, add parent mission details

**F14. [DONE] Add discount for unlocked card value**
Unlocked cards cannot be sold for the full price, there is at least a 10% discount. Add that discount with a 10% default and let the user override that.

**F15. Cleanup help text and tooltips**
The upload help box can be cleaned up, an overall help button may be worth adding, distinct from the current help that only mentions uploading. Tooltips can be added and cleaned up.

---

## Backlog

### 1. F11 — Combined reward string in group headers

**Effort: Medium**
The `Mission` model already has an optional `rewards?: MissionReward[]` structured field alongside the existing `reward` string. Two parts:

- Generate a human-readable reward string from `rewards[]` when `reward` is empty or missing (useful for data quality).
- In `MissionList.vue` group headers, aggregate the `rewards[]` arrays across all missions in the group and render a combined reward summary (e.g. "3x Diamond Pack, 2x Gold Pack").

Files touched: `MissionList.vue`, possibly `MissionReward.ts` (helper), `missions.json` data audit.

### 2. F12 — Cross-mission card value

**Effort: High — needs planning session**
When a card appears in multiple missions, buying it may be justified even if it's the most expensive option for a single mission. Ideas to explore:

- A "shared by N missions" indicator on cards in the detail panel.
- A sort/filter option in the mission list that surfaces missions sharing high-value cards.
- A separate "card overlap" view listing cards and which missions they satisfy.

Requires agreement on what surface area to build before implementation.

### 3. F7 + F7b — Completion status overhaul

**Effort: High — needs planning session**
Three interlocked changes:

- **Lock-gated completion**: `mission.completed` should require all assigned cards to be locked, not just owned. This changes the `completed` computation in `useMissionStore`.
- **Manual complete toggle**: Let the user override and mark a mission done regardless. Needs a new persisted flag (localStorage or IndexedDB).
- **Net = 0 for complete missions**: Once complete, a mission's net value contribution should be treated as 0 in both the card view and group totals.
- **F7b**: Group Cost/Reward/Net stats should exclude already-completed missions so the group header reflects only outstanding work.

Files touched: `useMissionStore.ts`, `MissionList.vue`, `MissionDetails.vue`, `UserMission.ts`, possibly `useCardStore.ts`.

### Review

When all other feature work is done, before doing help cleanup do another thorough review of potential bugs and new features

### 4. F15 — Help text and tooltip cleanup

**Effort: Low-Medium**

- Consolidate and rewrite the upload help modal content (currently in `CardUploader.vue`).
- Add a general help button in the sidebar (or top bar) separate from the upload-specific one.
- Add tooltips to toggle labels that need explanation (e.g. "Include unlocked cards in net value", "Optimize card assignment").

Files touched: `CardUploader.vue`, `Missions.vue`.
