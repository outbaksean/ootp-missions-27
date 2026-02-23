# 2. Mission value calculation

**Goal:** Compute net value of completing a mission: reward value minus cost of non-locked cards needed.

### Formula

```
missionValue = rewardValue - costExcludingLocked
```

- `rewardValue` — calculated based off of restructured mission data
- `costExcludingLocked` — The sum of cards marked buy and owned cards that are not marked locked (unowned cards cannot be locked)

### Structured reward data

The current `reward` field in `missions.json` is a plain display string (`"3 Standard Packs"`). To calculate value automatically, rewards need to be structured. The display string stays for rendering; a new `rewards` array carries the machine-readable data.

#### New `MissionReward` type

```ts
// src/models/MissionReward.ts
export type MissionReward =
  | { type: "pack"; packType: string; count: number } // e.g., 3 Standard Packs
  | { type: "card"; cardId: number; count?: number } // e.g., a specific card reward
  | { type: "other" }; // reward we can't value (ignored in calc)
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
- `type: 'card'` → `shopCardsById.get(cardId)?.lastPrice * (count ?? 1)` (automatic from shop data, last price or sell price based on toggle)
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
  - One price input per pack type (e.g., Standard Pack: **_, Historical Diamond Pack: _**)
  - No per-reward-string inputs — the count comes from the structured data

### Filters to add

- Filter: only show missions with positive value
- Sort: value ascending/descending
