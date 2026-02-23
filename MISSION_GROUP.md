# 5. Group missions by reward / category

**Goal:** Visually group the mission list under collapsible headers instead of a flat list.

Available groups should be

- Chain - Any mission that requires other missions and does not feed into a mission itself is the end of a chain, all required missions are part of the group
- Reward Type - Packs Only, Cards (if there's a card in the reward at all), Other
- Category (default group)

- A group should show the combined group rewards and combined group price somewhere

### UI design

```
[v] Debut heat  (5 missions)
    Mission A ...
    Mission B ...

[>] Sale on Sale  (5 missions)    ← collapsed
```

---

## Status

### Done

- **`Missions.vue`** — `groupBy` ref: `'none' | 'chain' | 'category'`, defaulting to `'category'`
- **`Missions.vue`** — `groupedMissions` computed: produces `Array<{ label: string; missions: UserMission[] }>` from `filteredMissions` + `groupBy`
  - `'none'` → single group with empty label (renders identically to the original flat list)
  - `'category'` → group by `rawMission.category` (or `'Other'` if blank)
  - `'chain'` → missions-type missions that aren't sub-missions of another missions-type mission become group roots; their `missionIds` members are gathered under them; everything else falls into a `'Standalone'` group at the end
- **`Missions.vue`** — "Group by" select added to sidebar (above Target Mission filter); wires `@calculateGroup` to `missionStore.calculateAllNotCalculatedMissions`
- **`MissionList.vue`** — accepts `groups` prop instead of flat `filteredMissions`
- **`MissionList.vue`** — collapsible group headers: chevron flips ▼/▶, collapse state stored in `Set<string>` ref keyed by label
- **`MissionList.vue`** — group header shows mission count + combined remaining cost (cost only shown when all missions in group are calculated)
- **`MissionList.vue`** — group header shows a **Calculate** button (green, stops click propagation) when any mission in the group is uncalculated; emits `calculateGroup` with the uncalculated ids

### Remaining

- **Reward Type grouping** — deferred until a future feature adds structured reward data to `missions.json` (reward is currently a free-text string). Groups would be: Packs Only, Cards (any card in reward), Other.
- **Combined group rewards** — not yet shown in the group header; blocked by the same structured reward data requirement.
