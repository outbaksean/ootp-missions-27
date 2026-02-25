# F8: Mission Report Generator

## Overview

A report panel that analyzes all calculated incomplete missions against an optional PP budget and one or more selected objectives. Multiple objectives can be selected; the report renders a section per objective. The feature is gated behind all missions being calculated.

---

## Files

| Action | File                               |
| ------ | ---------------------------------- |
| New    | `src/components/MissionReport.vue` |
| New    | `src/components/ReportModal.vue`   |
| New    | `src/helpers/ReportHelper.ts`      |
| Modify | `src/components/Missions.vue`      |

---

## Data Models

### `ReportConfig` (local to Missions.vue)

```ts
interface ReportConfig {
  budget: number | null; // null = no budget constraint
  objectives: string[]; // one or more objective keys, in display order
  chainId: number | null; // required when "complete-chain" is selected
}
```

### `ObjectiveResult` (produced by ReportHelper, consumed by MissionReport)

```ts
interface ObjectiveResult {
  key: string;
  label: string;
  description: string;
  missions: UserMission[]; // ordered list of recommended missions
  totalCost: number;
  totalReward: number; // sum of rewardValue (0 for missions with no PP reward)
  netGain: number; // totalReward - totalCost
  budgetSufficient: boolean; // false when totalCost > budget (and budget is set)
}
```

---

## Objectives

Five objectives, rendered as checkboxes. Defaults: `net-value` and `most-missions` pre-checked.

All objectives operate on the same eligible pool:

```ts
const eligible = userMissions.filter(
  (m) => !m.completed && m.progressText !== "Not Calculated",
);
```

### `net-value` — Best net PP

Sort eligible by `missionValue` (= rewardValue - remainingPrice) descending. Greedily include missions while running cost ≤ budget (or all if no budget). Skip missions where `missionValue` is undefined.

### `most-missions` — Most missions completed

Sort eligible by `remainingPrice` ascending (cheapest first). Greedily include while running cost ≤ budget.

### `best-roi` — Best return on investment

Filter eligible to missions where `rewardValue !== undefined && remainingPrice > 0`. Sort by `rewardValue / remainingPrice` descending. Greedily include while running cost ≤ budget.

### `complete-chain` — Complete a specific chain

User picks a missions-type parent from a dropdown. The objective shows all incomplete sub-missions (not just the cheapest N), their individual costs, the total cost to finish the chain, and whether the budget covers it. The `budgetSufficient` flag drives a visual indicator. If the parent is partially done (some sub-missions already complete), only incomplete sub-missions are listed.

### `affordable-wins` — All positive-net missions

Filter eligible to `missionValue !== undefined && missionValue > 0`. Sort by `missionValue` descending. Include all that fit in budget (or all if no budget).

---

## ReportHelper.ts

```ts
export function runObjective(
  key: string,
  eligible: UserMission[],
  budget: number | null,
  chainId: number | null,
  allUserMissions: UserMission[],
): ObjectiveResult;
```

One exported function dispatches to a private function per objective. Each returns an `ObjectiveResult`. The `allUserMissions` param is needed only for `complete-chain` (to look up sub-missions).

Helper:

```ts
function greedySelect(
  missions: UserMission[],
  budget: number | null,
): UserMission[];
// Iterates in provided order, accumulates cost, stops when budget exceeded.
// If budget is null, returns entire list.
```

---

## Sidebar Button (Missions.vue)

A single "Generate Report" button in the sidebar actions section. Disabled when not all missions are calculated, with a tooltip/title explaining why.

```ts
const allMissionsCalculated = computed(
  () =>
    missionStore.userMissions.length > 0 &&
    missionStore.userMissions.every(
      (m) => m.completed || m.progressText !== "Not Calculated",
    ),
);

const reportModalOpen = ref(false);
const activeReport = ref<ReportConfig | null>(null);

function openReportModal() {
  reportModalOpen.value = true;
}

function onReportGenerate(config: ReportConfig) {
  activeReport.value = config;
  reportModalOpen.value = false;
  selectedMission.value = null; // clear detail panel
}

function clearReport() {
  activeReport.value = null;
}
```

Sidebar markup (single button alongside existing action buttons):

```html
<button
  class="btn-generate-report"
  :disabled="!allMissionsCalculated"
  :title="allMissionsCalculated ? '' : 'Calculate all missions first'"
  @click="openReportModal"
>
  Generate Report
</button>
```

---

## ReportModal.vue

A centered modal overlay. Owns the form state; emits `generate` with a `ReportConfig` when the user submits, emits `close` on cancel/backdrop click.

### Props / Emits

```ts
props: {
  chainOptions: UserMission[],  // missions-type parents that are not completed
}
emits: {
  generate: (config: ReportConfig) => void,
  close: () => void,
}
```

### Internal state

```ts
const budget = ref<number | "">("");
const objectives = ref<Set<string>>(new Set(["net-value", "most-missions"]));
const chainId = ref<number | null>(null);
```

State is not reset on open — persists the user's last choices so reopening the modal restores prior selections.

### Validation

Generate button disabled when:

- `objectives.size === 0`
- `objectives.has("complete-chain") && chainId.value === null`

When `complete-chain` is checked but no chain is selected, show an inline note "Select a chain above" next to the disabled Generate button.

### Layout

```
┌──────────────────────────────────────────┐
│ Generate Report                    [ X ] │
├──────────────────────────────────────────┤
│                                          │
│  Budget (PP)                             │
│  [ ___________________________ ]         │
│  Leave blank for no budget limit         │
│                                          │
│  Objectives                              │
│  [x] Best net value                      │
│      Maximize PP gained after costs      │
│  [x] Most missions                       │
│      Complete as many missions as        │
│      possible within budget              │
│  [ ] Best ROI                            │
│      Best reward-to-cost ratio           │
│  [ ] Complete a chain                    │
│      [ chain dropdown          v ]       │
│  [ ] All affordable wins                 │
│      Every positive-net mission in       │
│      budget                              │
│                                          │
│              [ Cancel ]  [ Generate ]    │
└──────────────────────────────────────────┘
```

Modal is rendered via a `<Teleport to="body">` so it escapes any overflow constraints. Backdrop click calls `$emit('close')`. ESC key also closes.

---

## Right Panel: MissionReport.vue

Replaces MissionDetails when `activeReport !== null`. The component receives:

```ts
props: {
  config: ReportConfig,
  allUserMissions: UserMission[],
}
```

Internally calls `runObjective` for each objective in `config.objectives` and renders results.

### Layout

```
Report                              [ Clear ]

Budget: 500,000 PP  (or "No budget limit")

━━━ Best Net Value ━━━━━━━━━━━━━━━━━━━━━━━━
14 missions  |  Cost: 320,000 PP  |  Reward: 520,000 PP  |  Net: +200,000 PP
[warning if budgetSufficient = false]

  Mission Name          Cost      Reward      Net
  ─────────────────────────────────────────────
  Some Mission          50,000    90,000    +40,000 PP
  Another Mission       30,000    60,000    +30,000 PP
  ...

━━━ Most Missions ━━━━━━━━━━━━━━━━━━━━━━━━━
22 missions  |  Cost: 280,000 PP

  Mission Name          Cost
  ─────────────────────────
  Cheap Mission         5,000
  ...
```

Each mission row in the report is clickable: calls `$emit('selectMission', mission)` which clears the report and opens MissionDetails for that mission.

Columns shown per objective:

- `net-value`: Cost, Reward, Net
- `most-missions`: Cost only
- `best-roi`: Cost, Reward, ROI %
- `complete-chain`: Cost, Reward, Net, status (Done / Needed)
- `affordable-wins`: Cost, Reward, Net

### Budget insufficient warning

When `budgetSufficient === false`:

```
Budget covers X of Y missions (Z PP short)
```

Shown in the objective section header, below the summary line.

---

## Interactions

- Sidebar "Generate Report" button: opens ReportModal
- Modal "Generate": emits config, modal closes, report renders in right panel
- Modal "Cancel" / backdrop / ESC: modal closes, no report change
- Clicking a mission row in the report: clears report, opens MissionDetails for that mission
- Clicking any mission card in the mission list while report is active: clears report, opens MissionDetails
- Clicking "Clear" in the report header: clears report, right panel goes blank
- Reopening modal while a report is active: modal restores prior selections; generating again replaces the active report

---

## Verification

1. `npm run dev` from `ootp-missions-27/app/`
2. Upload a CSV, calculate all missions.
3. Confirm "Generate Report" button is disabled before all missions are calculated; tooltip explains why.
4. Click "Generate Report" — confirm modal opens. Cancel → modal closes, no report.
5. Select multiple objectives, set a budget, click Generate. Confirm modal closes and report renders in right panel with one section per objective.
6. Reopen modal — confirm previous selections are preserved.
7. Check "Complete a chain" with no chain selected — confirm Generate is disabled with inline note.
8. Select a chain and generate — confirm only incomplete sub-missions are listed.
9. Confirm "Best ROI" skips missions with no reward value.
10. Confirm "All affordable wins" only includes positive-net missions.
11. Click a mission row in the report → report clears, MissionDetails opens.
12. Click a mission card in the list while report is active → same behavior.
13. Click "Clear" in report header → right panel goes blank.
14. `npm run lint && npm run type-check`
