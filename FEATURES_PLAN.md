# Features Plan

## Suggested implementation order

1. **Mission data freshness indicator** — small, self-contained
2. **Lock toggle in UI** — foundation for mission value (locked cards affect the cost side of the formula)
3. **Card cost overrides** — also feeds into mission value; independent of grouping
4. **Mission value calculation** — depends on locked state and accurate prices being in place
5. **Group missions by reward / category** — pure UI, independent of the above

---

## 1. Mission data freshness indicator

**Goal:** Add a persistent, unobtrusive indicator showing when mission data was last updated — including a warning when it looks stale. The PreRelease Status button stays for now and is removed at OOTP 27 launch (see `RELEASE_CHECKLIST.md`).

### Context

- `missionsVersion` (a date string like `"2026-02-22"`) is already stored in `useMissionStore` and fetched from `missions.json`
- It is currently displayed in tiny muted text at the very bottom of the sidebar: `Mission data: 2026-02-22`
- `CardUploader.vue` has a "PreRelease Status" button that will be removed at launch — leave it in place until then

### Changes

- **`Missions.vue`** — replace the plain `sidebar-version` div with a human-readable date:
  - Parse `missionsVersion` as a date and format it (e.g., `"Missions updated Feb 22, 2026"`)
  - If `missionsVersion` is empty (still loading): show nothing

### Implementation detail

```ts
// In Missions.vue <script setup>
const missionsUpdatedLabel = computed(() => {
  const v = missionStore.missionsVersion
  if (!v) return null
  const updated = new Date(v)
  return updated.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
})
```

### Notes

- No new store, model, or DB changes needed
- `missionsVersion` is already reactively updated when a background cache refresh finds a new version, so the label updates automatically

---

## 2. Lock toggle in UI

**Goal:** Toggle a card's locked status directly in MissionDetails without re-uploading a CSV.

### Changes

- **`useCardStore.ts`** — add `toggleCardLocked(cardId: number)`:
  - Find card in `shopCards.value` by id (use `shopCardsById` Map for lookup)
  - Flip `locked` flag in-memory
  - Write updated card to IndexedDB via `db.shopCards.put(card)`
- **`MissionDetails.vue`** — add a lock/unlock button on each non-owned card row
  - Calls `cardStore.toggleCardLocked(card.cardId)`
  - Reactivity flows: `shopCards` → `shopCardsById` → `buildUserMissions` re-runs... but `buildUserMissions` is only called on `initialize`. Need to trigger a rebuild or just update `missionCards` locally.
  - Simplest: after toggle, call `missionStore.buildUserMissions()` to recompute all missions from current state.

### Notes

- No new models or DB schema needed
- "Locked" pill in the detail panel already exists; button goes alongside it

---

## 3. Card cost overrides

**Goal:** Let users set a manual price for any card. Overrides are session-scoped and cleared when a new CSV is uploaded.

### Changes

- **`useCardStore.ts`** — add:
  - `cardPriceOverrides` ref: `Map<number, number>` (in-memory only, not persisted)
  - `setCardPriceOverride(cardId, price)` — updates map
  - `clearCardPriceOverride(cardId)` — removes from map
  - `uploadShopFile` — clears all overrides when a new CSV is uploaded (overrides are intentionally session-scoped)
- **`MissionHelper.ts`** — `calculateTotalPriceOfNonOwnedCards` accepts an optional `overrides: Map<number, number>` param; uses `overrides.get(cardId) ?? shopCard.lastPrice` for price
- **`useMissionStore.ts`** — pass `cardStore.cardPriceOverrides` through to MissionHelper calls
- **`MissionDetails.vue`** — inline editable price field on each card row:
  - Displays current effective price
  - On blur/enter saves override via `cardStore.setCardPriceOverride`
  - Shows a visual indicator (e.g., italics or a dot) when a card has an override
  - Clear button to revert to CSV price

---

## 4. Mission value calculation

**Goal:** Compute net value of completing a mission: reward value minus cost of non-locked cards needed.

### Formula

```
missionValue = rewardValue - costExcludingLocked
```

- `rewardValue` — user-configured PP value for the reward string (e.g., "3 Standard Packs")
- `costExcludingLocked` — remaining price calculation using only non-locked, unowned cards (locked cards are treated as free — you want them regardless)

### Structured reward data

The current `reward` field in `missions.json` is a plain display string (`"3 Standard Packs"`). To calculate value automatically, rewards need to be structured. The display string stays for rendering; a new `rewards` array carries the machine-readable data.

#### New `MissionReward` type

```ts
// src/models/MissionReward.ts
export type MissionReward =
  | { type: 'pack'; packType: string; count: number }   // e.g., 3 Standard Packs
  | { type: 'card'; cardId: number; count?: number }    // e.g., a specific card reward
  | { type: 'other' }                                   // reward we can't value (ignored in calc)
```

#### `Mission` model update

```ts
// src/models/Mission.ts — add optional field
rewards?: MissionReward[]   // structured; omit for missions not yet annotated
```

The existing `reward: string` stays as the display value. `rewards` is optional — missions without it are treated as unvaluable (value shown as `—`).

#### Populating `rewards` in `missions.json`

Pack rewards follow a consistent pattern (`"N <Type> Pack(s)"`) and can be parsed by a migration script. Card rewards need manual identification.

- **Script**: `scripts/parse-rewards.mjs` — reads `missions.json`, attempts to parse each `reward` string into structured form, writes back a `rewards` array. Outputs a list of any rewards it couldn't parse for manual follow-up.
- **Manual**: card rewards (e.g., "a specific Diamond card") need a `cardId` looked up from `shop_cards.csv` by name.

### Value calculation

```
rewardValue     = sum of each MissionReward's PP value
costExcludingLocked = remaining price of non-locked unowned cards
missionValue    = rewardValue - costExcludingLocked
```

**Reward valuation rules:**
- `type: 'pack'` → `packPrices.get(packType) * count` (user-configured default per pack type)
- `type: 'card'` → `shopCardsById.get(cardId)?.lastPrice * (count ?? 1)` (automatic from shop data)
- `type: 'other'` → 0 (ignored)

### New store — `useSettingsStore`

```ts
// src/stores/useSettingsStore.ts
// Persisted in localStorage — small data, rarely changes
export const useSettingsStore = defineStore('settings', () => {
  const packPrices = ref<Map<string, number>>(loadFromStorage())  // packType → PP value

  function setPackPrice(packType: string, value: number) { ... }
  function getPackPrice(packType: string): number { return packPrices.value.get(packType) ?? 0 }

  return { packPrices, setPackPrice, getPackPrice }
})
```

Pack types are extracted dynamically from `missions.value` at runtime (unique `packType` values across all `rewards` arrays), so the settings UI always shows exactly what's needed with no hardcoding.

### Changes

- **`src/models/MissionReward.ts`** — new file (type above)
- **`src/models/Mission.ts`** — add `rewards?: MissionReward[]`
- **`missions.json`** — add `rewards` array to each mission (script-assisted + manual for card rewards)
- **`UserMission` model** — add `missionValue?: number`
- **`MissionHelper.ts`** — new method `calculateRewardValue(rewards, packPrices, shopCardsById, useSellPrice)` and updated `calculateMissionValue` that excludes locked cards from cost
- **`useMissionStore.ts`** — compute `missionValue` in `buildUserMissions` and `calculateMissionDetails`, passing `settingsStore.packPrices` and `shopCardsById`
- **`MissionList.vue`** — show value on mission card (positive = green, negative = red, `—` if no structured reward data)
- **`Missions.vue`** — add sort options: by remaining price (current), by mission value, by name
- **Sidebar settings modal** — pack price editor:
  - Lists unique pack types extracted from loaded missions
  - One price input per pack type (e.g., Standard Pack: ___, Historical Diamond Pack: ___)
  - No per-reward-string inputs — the count comes from the structured data

### Filters to add

- Filter: only show missions with positive value
- Sort: value ascending/descending

---

## 5. Group missions by reward / category

**Goal:** Visually group the mission list under collapsible headers instead of a flat list.

### UI design

```
[v] 3 Standard Packs  (12 missions)
    Mission A ...
    Mission B ...

[>] 2 Historical Diamond Packs  (8 missions)    ← collapsed
```

### Changes

- **`Missions.vue`** — add `groupBy` ref: `'none' | 'reward' | 'category'` (sidebar select)
- **`Missions.vue`** — compute `groupedMissions`: `Array<{ label: string, missions: UserMission[] }>` from `filteredMissions` + `groupBy`
  - `'none'` → single group with no label (renders same as today)
  - `'reward'` → group by `rawMission.reward`
  - `'category'` → group by `rawMission.category`
- **`MissionList.vue`** — accept `groupedMissions` prop instead of (or in addition to) flat `filteredMissions`; render a collapsible header per group
  - Collapse state stored per-group-label in a `Set<string>` ref
  - Each group header shows: label + mission count + total remaining price

### No new models or stores needed
