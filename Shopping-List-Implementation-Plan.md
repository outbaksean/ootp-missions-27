# Shopping List Implementation Plan

Implements all scenarios from `Shopping-List-Test-Scenarios.md`.
Phases are ordered by dependency — each phase should be complete and
tested before starting the next.

---

## Phase 1 — Fix zero-price bug (Scenario 6) ✅

**Priority: High.** Currently causes the header to report missions as completed
when they cannot actually be completed.

### 1.1 Filter non-completable missions from `eligibleMissions`

**File:** `app/src/components/ShoppingList.vue`

In the `eligibleMissions` computed, add `m.isCompletable` to the filter:

```typescript
const incomplete = props.missions.filter(
  (m) => !m.completed && m.progressText !== "Not Calculated" && m.isCompletable,
);
```

`isCompletable` is already correctly propagated by the store:
- Leaf missions: set directly by `MissionHelper.calculateOptimalMissionCost`
- Chain missions: set to `completableCount >= requiredCount` where `completableCount`
  counts completed or completable sub-missions

This single change fixes the core bug. Non-completable missions are removed from
eligible missions and can no longer pollute `computeCompletedByList`.

### 1.2 Track and display excluded missions in the header

**Files:** `ShoppingListHelper.ts`, `ShoppingList.vue`

Expose the excluded missions so `buildSummaryText` can note them.

**`ShoppingListHelper.ts` — new export:**
```typescript
export function buildExclusionText(excludedMissions: UserMission[]): string
// Returns: "1 mission excluded because it requires cards with no market price:
//           'Mission Name'." or "" if none.
```

**`ShoppingList.vue` — new computed:**
```typescript
const incompletableMissions = computed(() =>
  props.missions.filter(
    (m) => !m.completed
        && m.progressText !== "Not Calculated"
        && !m.isCompletable,
  ),
);
```

Pass to `buildSummaryText` and render the exclusion clause after the main
summary sentence, or as a separate line under the summary box.

### 1.3 Tests to add

- Mission with a 0-price required card → not in `eligibleMissions` → not in
  `shoppingItems` → not counted as completed in summary text
- Mission with one 0-price card and one priced card → same exclusion
- Chain sub-mission is non-completable; chain still has enough other completable
  subs → chain still sealable, blocked sub absent from shopping list
- Chain sub-mission is non-completable; chain cannot meet `requiredCount` →
  chain also excluded

---

## Phase 2 — Extract `selectMissionsForBudget` helper (Scenario 2) ✅

Currently `selectedMissionIds` is a Vue computed inside `ShoppingList.vue`.
Extracting it makes budget behaviour unit-testable and sets up Phase 4.

### 2.1 New export in `ShoppingListHelper.ts`

```typescript
export function selectMissionsForBudget(
  leafMissions: UserMission[],
  strategy: "value" | "completion",
  availablePP: number | null,
): { selectedIds: Set<number>; selectionOrder: UserMission[] }
```

- `selectedIds` — fast-lookup Set for existing callers
- `selectionOrder` — the greedy pick order (index 0 = highest priority);
  needed for Phase 4 card ordering

When `availablePP === null`: return all leaf missions in strategy sort order
(sort still matters for Phase 4 even with unlimited PP).

Sort keys by strategy:
- `"completion"`: `remainingPrice` ascending
- `"value"`: `rewardValue / max(1, remainingPrice)` descending

### 2.2 Update `ShoppingList.vue`

Replace the inline `selectedMissionIds` computed with:
```typescript
const { selectedIds, selectionOrder } = selectMissionsForBudget(
  leafMissions,
  strategy.value,
  availablePP.value,
);
```

### 2.3 Tests to add

Using `selectMissionsForBudget` directly:

- **2a** — mission cost equals remaining budget exactly → included
- **2b** — expensive mission skipped; cheaper later mission still fits
- **2c** — card sharing: shared card cost counted only once, enabling both
  missions to fit within budget that would otherwise only cover one
- **2d** — mission with `remainingPrice = 0` always included regardless of budget
- **1b** — value strategy with budget: missions sorted by ratio, higher-ratio
  missions selected first
- **1c** — completion strategy with budget: cheapest missions selected first

---

## Phase 3 — Value strategy negative-value exclusion (Scenario 1a)

### 3.1 Filter missions in `selectMissionsForBudget`

When `strategy === "value"`, exclude leaf missions where the cost outweighs
the reward even before budget is applied:

```typescript
// Before the greedy loop (applied to unlimited and limited PP alike):
if (strategy === "value") {
  leafMissions = leafMissions.filter(
    (m) => m.remainingPrice === 0
         || (m.rewardValue !== undefined && m.rewardValue > m.remainingPrice),
  );
  // free missions always pass; missions with no rewardValue defined also pass
  // (rewardValue undefined means "not calculable" not "zero")
}
```

Return the excluded missions for header display:
```typescript
export function selectMissionsForBudget(
  leafMissions: UserMission[],
  strategy: "value" | "completion",
  availablePP: number | null,
): {
  selectedIds: Set<number>;
  selectionOrder: UserMission[];
  negativeValueExcluded: UserMission[];  // new
}
```

### 3.2 Header text for negative-value exclusions

**`ShoppingListHelper.ts`** — extend `buildExclusionText` (from Phase 1) or
add a second exclusion clause:

```
"2 missions skipped because their cost exceeds their reward value:
 'Mission A', 'Mission B'."
```

When every eligible mission is excluded for negative value:
```
"No missions with positive net value found."
```

### 3.3 Tests to add

- Value strategy, unlimited PP: mission with `rewardValue < remainingPrice`
  excluded; mission with `rewardValue > remainingPrice` included
- Value strategy, unlimited PP: all missions negative value → header says
  "No missions with positive net value found."
- Value strategy, limited PP: negative-value missions excluded before budget
  greedy runs (so budget is not wasted on them)
- Completion strategy: missions with negative value are NOT excluded
  (strategy doesn't filter by value)
- Mission with `rewardValue === undefined` (rewards not structured): included
  regardless of strategy (can't calculate net value)

---

## Phase 4 — Card ordering by mission priority (Scenarios 3d, 3e)

The most complex phase. Cards should appear in mission-priority order so the
user buys one mission's cards as a block before moving to the next.

### 4.1 Assign priority scores to missions

After `selectMissionsForBudget` returns `selectionOrder`, build a priority map:

```typescript
const missionPriority = new Map<number, number>();
selectionOrder.forEach((m, index) => missionPriority.set(m.id, index));
```

Index 0 = best priority. Missions not in `selectionOrder` (e.g. out-of-budget)
get no entry.

### 4.2 Propagate chain priority to leaf sub-missions

A leaf's effective priority should be the best (lowest index) among its own
priority and the priority of any chain that contains it. This ensures that a
cheap leaf that unlocks a high-value chain is ordered with the chain group.

Build a `leafEffectivePriority` map by walking `allMissions`:

```typescript
// For each missions-type parent, if it has a priority score, every
// leaf descendant gets that score as a candidate effective priority.
// Each leaf takes the minimum (best) candidate.
const effectivePriority = new Map<number, number>(missionPriority);
for (const m of allMissions) {
  if (m.rawMission.type !== "missions") continue;
  const parentPriority = missionPriority.get(m.id);
  if (parentPriority === undefined) continue;
  for (const leafId of collectAllLeafDescendants(m, missionById)) {
    const current = effectivePriority.get(leafId) ?? Infinity;
    if (parentPriority < current) effectivePriority.set(leafId, parentPriority);
  }
}
```

### 4.3 Update sort in `buildShoppingItems`

**Signature change:**
```typescript
export function buildShoppingItems(
  eligibleMissions: UserMission[],
  selectedMissionIds: Set<number>,
  allMissions: UserMission[],
  shopCardsById: Map<number, ShopCard>,
  missionPriority?: Map<number, number>,  // new, optional for backwards compat
): ShoppingItem[]
```

**New sort (replacing the current 3-key sort):**

```typescript
const sortedCardIds = Array.from(cardMap.keys()).sort((a, b) => {
  // 1. Mission priority: card's best (lowest) effective priority among its missions
  const aPriority = Math.min(
    ...cardMap.get(a)!.missions.map(
      (m) => effectivePriority.get(m.id) ?? Infinity
    )
  );
  const bPriority = Math.min(
    ...cardMap.get(b)!.missions.map(
      (m) => effectivePriority.get(m.id) ?? Infinity
    )
  );
  if (aPriority !== bPriority) return aPriority - bPriority;

  // 2. Price: cheapest first within same priority group (so expensive card seals)
  return cardMap.get(a)!.price - cardMap.get(b)!.price;
});
```

Note: removing the leaf-completions and mission-count tiebreakers — priority
replaces them as the primary ordering signal.

### 4.4 Pass priority through `ShoppingList.vue`

```typescript
const shoppingItems = computed(() =>
  buildShoppingItems(
    eligibleMissions.value,
    selectedIds,
    props.missions,
    props.shopCardsById,
    missionPriority,  // new
  )
);
```

### 4.5 Tests to add

- **3d completion:** Mission A costs 300 PP, Mission B costs 100 PP.
  Completion strategy → B has priority 0, A has priority 1.
  B's card appears before A's card in the list even if A's card is cheaper.

- **3d value:** Mission A ratio = 10, Mission B ratio = 2.
  Value strategy → A has priority 0.
  A's cards appear before B's cards.

- **3e chain priority:** Leaf L has low ratio (priority 5 alone), but is a
  sub-mission of Chain C (priority 0 due to high chain reward).
  L's card gets effective priority 0 and appears at the start of the list.

---

## Phase 5 — Additional unit tests for existing correct behaviour

No code changes required. These tests verify already-implemented logic and
serve as regression coverage.

Add to `ShoppingListHelper.test.ts` in new `describe` blocks:

### Budget / selection tests (after Phase 2)

Once `selectMissionsForBudget` is extracted, add tests from Section 2 above
directly against that function.

### Chain scenarios

- **4a (N-of-M):** Chain requires 2 of 3 subs. Third sub's card has no chain
  attribution even though all 3 subs are bought.
- **4b (seeded count):** Chain requires 3 subs, 1 already completed.
  `triggeredSubCount` starts at 1. First shopping-list card pushes to 2, second
  seals at 3 and gets chain credit.
- **4c (grandparent):** Leaf → Parent → Grandparent. Single card completing the
  leaf explanation includes all three missions.
- **4d (partial chain):** Chain requires 2 subs but only 1 sub is in eligible
  missions. Chain never seals; partial progress reflected in summary text.

### Ownership

- **5b:** Mission needs 2 cards, one owned. Only unowned card in shopping list;
  it singly completes the mission.

### Summary text variations

Using `buildSummaryText`:

- **7a:** `includedMissionIds` empty → "...for all missions."
- **7c completed sub:** Chain included with one sub already completed →
  included-missions text omits the completed sub name.
- **7d single mission:** Only one mission completes → uses mission name not count.
- **7e partial only:** Shopping list covers some but not all cards for a mission →
  "make progress on 'Mission Name'".
- **7f both:** Some missions complete, one partially → combined progress text.
- **7h custom PP:** `availablePP = 200000` → "...with 200,000 PP for..."

### Card multi-mission explanation (3c)

- Card 1 singly completes Mission A; also used in Mission B (which needs Card 1
  and Card 2). Explanation: `"Completes 'Mission A'; Used in 'Mission B'"`.
- Card 2 explanation: `"Completes 'Mission B'"`.

---

## Phase 6 — Export tests (Scenarios 8a, 8b)

Export functions use `Blob` and `URL.createObjectURL` which aren't available
in the Node test environment. Options:

**Option A — Mock approach:** Set Vitest environment to `jsdom` for export
tests only (via a separate test file with a `@vitest-environment jsdom`
comment). Mock `URL.createObjectURL` and `document.createElement`.
Assert the generated CSV/HTML string content before the blob is created by
extracting the string-building logic into its own testable function.

**Option B — Extract string builders:** Move the CSV and HTML string generation
out of `exportCsv`/`exportHtml` into exported pure functions:
```typescript
export function buildCsvContent(items: ShoppingItem[]): string
export function buildHtmlContent(items: ShoppingItem[], summaryText: string): string
```
Test these directly in Node; leave the `Blob`/download wiring untested.

**Recommendation: Option B.** The string content is what matters for
correctness; the download wiring is trivially thin and browser-native.

### Tests to add (after extraction)

- CSV: header row present; card row has quoted title, cost, explanation;
  double-quotes in explanation escaped as `""`
- HTML: `<div class="summary">` contains `summaryText`; table has one `<tr>`
  per card; price cell contains formatted number; explanation cell is escaped

---

## Summary of file changes by phase

| Phase | Files changed |
|-------|--------------|
| 1 | `ShoppingList.vue`, `ShoppingListHelper.ts`, `ShoppingListHelper.test.ts` |
| 2 | `ShoppingListHelper.ts`, `ShoppingList.vue`, `ShoppingListHelper.test.ts` |
| 3 | `ShoppingListHelper.ts`, `ShoppingList.vue`, `ShoppingListHelper.test.ts` |
| 4 | `ShoppingListHelper.ts`, `ShoppingList.vue`, `ShoppingListHelper.test.ts` |
| 5 | `ShoppingListHelper.test.ts` only |
| 6 | `ShoppingListHelper.ts`, `ShoppingListHelper.test.ts` |
