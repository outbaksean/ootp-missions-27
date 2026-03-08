# Shopping List Test Scenarios

Scenarios marked **[NOT IMPLEMENTED]** describe intended behaviour that doesn't
currently exist in the code. All others reflect how the app behaves today.

---

## 1. Strategy — Value vs. Completion

### 1a. Value strategy, unlimited PP
With unlimited PP the strategy setting has **no effect on which missions are
selected** — all eligible leaf missions are always included. Strategy only
affects the greedy sort order when a PP budget is set.

**[NOT IMPLEMENTED]** When strategy is value and unlimited PP, missions with a
negative net value (cost > rewardValue) should be excluded and listed in the
header as "excluded due to negative net value". The header should say
"none of these missions have a positive net value" when every eligible mission
has negative net value.

### 1b. Value strategy, limited PP
Missions are sorted by `rewardValue / remainingPrice` ratio, highest first.
Missions are greedily added to the list until the budget is exhausted.
Card costs are shared across missions — if Mission A and Mission B both need
Card X, Card X's price is only counted once (against whichever mission picks it
up first in greedy order).

**[NOT IMPLEMENTED]** The header should list which missions were excluded because
they didn't fit the budget.

### 1c. Completion strategy, limited PP
Missions are sorted by `remainingPrice` ascending (cheapest first), then greedily
added until the budget is exhausted. Otherwise identical to value strategy with
a budget.

### 1d. Completion strategy, unlimited PP
All eligible leaf missions are included. Strategy setting has no effect since
there is no budget constraint. Same behaviour as value + unlimited PP.

---

## 2. Budget / PP Cutoff

### 2a. Mission fits exactly within budget
A mission whose new-card cost equals the remaining budget should be included.
Edge: `newCost <= remainingBudget` so equality passes.

### 2b. Mission doesn't fit; remaining budget is non-zero
After skipping a mission that's too expensive, the remaining budget should
be tested against subsequent (cheaper) missions. Earlier skips don't consume
budget, so cheaper later missions may still fit.

### 2c. Card sharing reduces effective cost
- Mission A needs [Card 1, Card 2], total 500 PP
- Mission B needs [Card 2, Card 3], total 300 PP
- Budget: 700 PP

In completion order (B first, then A):
- B selected for 300 PP (Cards 2 & 3)
- A's new cost is only Card 1 = 200 PP → fits in remaining 400 PP → A selected
- Both missions included; total spend 500 PP despite 800 PP face value

### 2d. Free missions (remainingPrice ≤ 0)
Missions where all needed cards are already owned (remainingPrice = 0) are
always included regardless of budget. They contribute no cost and may contribute
cards to the shared pool used for deduplication.

---

## 3. Card Ordering

### 3a. Cheapest card first within a single mission
When a mission needs multiple cards, the sorting within `buildShoppingItems` is
by price ascending (cheapest first) — the more expensive card "seals" the
mission and gets the completion credit.

### 3b. Chain sealing — the expensive card gets parent credit
*This is the scenario covered by the unit test.*

- Sub Mission 1 needs Card A (100 PP)
- Sub Mission 2 needs Card B (200 PP)
- Chain Mission requires both subs

Card A comes first (100 PP < 200 PP). Card B, processed last, pushes the chain's
triggered-sub count to `requiredCount` and is attributed the chain completion.

**Expected explanations:**
- Card A: `Completes 'Sub Mission 1' for 1 Historical Perfect Pack valued at 30,000 PP`
- Card B: `Completes 'Sub Mission 2' for 1 Rainbow Pack valued at 24,100 PP; Completes 'Chain Mission' for 2 Gold Packs valued at 2,200 PP`

### 3c. Card used in multiple missions, completing one
- Mission A needs only Card 1 (Card 1 is the sole unowned card)
- Mission B needs Card 1 and Card 2 (Card 1 is one of two unowned cards)

Card 1 singly completes Mission A but only partially contributes to Mission B.

**Expected explanation for Card 1:** `Completes 'Mission A'; Used in 'Mission B'`
**Expected explanation for Card 2:** `Completes 'Mission B'`

### 3d. Card ordering for multi-mission grouping
**[NOT IMPLEMENTED]** Cards should be grouped so that one mission's cards are
bought consecutively before moving to the next mission. For completion strategy
this means cheapest mission's cards appear first as a block; for value strategy,
highest-ratio mission's cards first. Currently cards are sorted by leaf-completion
count then price, which does not guarantee per-mission grouping.

### 3e. Value strategy card ordering respects chain priority
**[NOT IMPLEMENTED]** When a low-net-value leaf mission is a sub-mission of a
high-net-value chain, the leaf's cards should be ordered as part of the chain
group rather than deprioritised by the leaf's own net value.

---

## 4. Chain Missions (missions-type)

### 4a. Chain with requiredCount < total subs (N-of-M)
- Chain requires 2 of 3 sub-missions
- All 3 subs are eligible and included

The greedy in `selectedMissionIds` selects all 3 leaves. The two cheapest leaves
(processed first in sorted card order) will each increment the chain's
triggered-sub count. When count reaches 2 (`requiredCount`), the sealing card
gets chain credit. Cards from the third sub have no chain attribution.

**Expected:** chain attributed to the card that pushes count to exactly 2, not to
the third card even though it is also bought.

### 4b. Chain where some subs are already completed
- Chain requires 3 sub-missions
- 1 sub already completed before opening shopping list

`triggeredSubCount` is seeded with 1 (the already-completed sub). The first
shopping-list card to complete a remaining sub pushes count to 2; the second
pushes it to 3 and seals the chain. Only the second card gets chain credit.

### 4c. Deeply nested chain (grandparent)
- Leaf → Parent Chain → Grandparent Chain
- Leaf needs Card A; Parent requires the Leaf; Grandparent requires the Parent

When Card A completes the Leaf, `triggerMission` propagates: Leaf → Parent
(seals if threshold met) → Grandparent (seals if threshold met).

**Expected:** Card A explanation includes all three completions in order:
`Completes 'Leaf'; Completes 'Parent Chain'; Completes 'Grandparent Chain'`

### 4d. Chain not fully completable from shopping list
- Chain requires 2 of 3 subs
- Shopping list only covers 1 sub (the other is not in eligible missions)

The chain's triggered-sub count never reaches `requiredCount`. Chain is not
attributed to any card. The sub's card explanation mentions only the sub.
Chain appears in `partialByList` and the header says "make progress on 'Chain'".

---

## 5. Owned Cards / Partial Missions

### 5a. All mission cards already owned
Mission has `remainingPrice = 0`. Included in the list as a free mission.
No cards added to the shopping card list. Mission appears in `completedByList`
(via the `needed.length === 0` path is skipped — only missions where
`needed.length > 0` and all needed cards are in the shopping set are counted;
missions with all owned cards complete via `progressText = 'Calculated'` but
their `missionCards` would have all `owned = true`, so `needed` would be empty
and they wouldn't enter `completedByList` via leaf path).

Actually: `completedByList` only adds a leaf when `needed.length > 0` — so a
mission where every card is owned (needed = []) is **not** added by the shopping
list computation. It was already counted as completable before the shopping list.

### 5b. One card owned, one card needed
- Mission needs [Card 1 (owned), Card 2 (not owned)]
- Card 2 is the sole shopping-list card needed

Card 2 singly completes the mission. Explanation:
`Completes 'Mission' for [rewards]`

---

## 6. Zero-Price (Unpurchasable) Cards

Some cards have `lastPrice = 0`, meaning they have no market price and cannot be
purchased. `MissionHelper.calculateOptimalMissionCost` silently excludes these
cards from the purchasable pool (`else if (price > 0)`), so they are never added
to `buyCardIds` and never set as `highlighted` on a `MissionCard`.

A mission that requires a 0-price card to reach `requiredCount` will have
`isCompletable = false` after calculation, but **will still appear in
`eligibleMissions`** because the filter only checks
`progressText !== "Not Calculated"`.

### 6a. Mission blocked by a 0-price card — current (incorrect) behaviour

**[NOT IMPLEMENTED / BUG]** Consider a count mission needing 3 cards where
Card C has price 0:

- Cards A and B are highlighted (in `buyCardIds`) and priced at 100 and 200 PP
- Card C is not highlighted (`highlighted = false`) because it's not in `buyCardIds`
- The mission has `isCompletable = false`

Current behaviour:
- The mission passes the `eligibleMissions` filter and enters the shopping list
- Cards A and B appear in the shopping list (highlighted, not owned)
- `computeCompletedByList` checks `missionCards.filter(c => c.highlighted && !c.owned)`,
  which returns only [A, B] — Card C is invisible to this check
- Since A and B are both in `shoppingCardIds`, the mission is added to
  `willBeCompleted` and counted as a **completed** mission in the header
- **The user buys A and B but still cannot complete the mission** because Card C
  is required but has no purchase price

### 6b. Intended behaviour

**[NOT IMPLEMENTED]** Missions where `isCompletable = false` should be excluded
from `eligibleMissions` entirely. The header should note:

> "N missions excluded because they require cards with no market price:
> 'Mission Name', ..."

This requires either:
- Filtering `eligibleMissions` by `m.isCompletable` (or propagating
  `isCompletable` correctly through chain parents), or
- Fixing `computeCompletedByList` to check `isCompletable` before marking a
  mission as completed by the list.

### 6c. Zero-price card in a chain sub-mission

If a chain sub-mission is blocked by a 0-price card, the chain itself is also
non-completable (or at minimum partially blocked). The expected behaviour is:
- The blocked sub-mission is excluded from eligible missions
- If the chain still has enough other completable subs to meet `requiredCount`,
  it can still be sealed by the remaining subs' cards
- If it does not have enough, the chain should also be excluded

---

## 7. Summary Header Text

### 7a. All missions scope (no missions explicitly included)
`includedMissionsText` returns "all missions".

**Expected header prefix:** `Shopping List to maximize value with unlimited PP for all missions.`

### 7b. Single leaf mission included
`includedMissionsText` returns just the mission name.

**Expected:** `...for 'Mission Name'.`

### 7c. Chain mission included — expands to non-completed sub-missions
Sub-missions that are already completed are filtered out of the expansion.

**Expected for a chain with 2 incomplete subs:**
`...for 'Chain' which includes sub missions 'Sub 1' and 'Sub 2'.`

**Expected if one sub is already completed:**
`...for 'Chain' which includes sub missions 'Sub 2'.`

### 7d. Progress text — full completion with rewards
Completing missions produces:
`complete N missions giving [reward list] for a combined value of X PP`

When only one mission completes, uses the mission name instead of count:
`complete 'Mission Name' giving ...`

### 7e. Progress text — partial progress only
When the shopping list includes some but not all cards for a mission:
`make progress on 'Mission Name'` or `make progress on N missions`

### 7f. Progress text — both completed and partial
`complete N missions giving [rewards] and make progress on M missions`

### 7g. No cards to buy (all missions free)
`make no progress` — currently triggered when `shoppingItems.length === 0`.
(Free missions still appear in `completedByList` only if they have unowned cards
covered by the shopping set; fully-owned missions don't appear — see 5a.)

### 7h. Custom PP — header shows formatted amount
When PP mode is custom and value is 200000:
`...with 200,000 PP for...`

---

## 8. Export

### 8a. CSV contains card title, cost, and explanation
One row per card. Quoted cells. Double-quotes escaped as `""`.

### 8b. HTML contains summary text and full card table
The `<div class="summary">` block contains the full `summaryText` string.
Each card row has title, formatted cost, and explanation.
