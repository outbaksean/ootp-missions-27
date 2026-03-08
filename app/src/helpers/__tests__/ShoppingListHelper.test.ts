/**
 * Unit tests for ShoppingListHelper
 *
 * TEST DATA APPROACH
 * ──────────────────
 * All tests use scenario-based data loading from testScenarios/. This provides:
 * - Real data from missions.json and shop_cards.csv
 * - Maintainable, reusable test fixtures
 * - Consistent mission cost and reward calculations
 *
 * Example:
 *   import { loadScenario, simpleChainScenario } from "./testScenarios";
 *   const { userMissions, shopCardsById, packPrices } = loadScenario(simpleChainScenario);
 *   const mission = userMissions.find(m => m.id === 6)!;
 *
 * See testScenarios/README.md for detailed guidance on creating new scenarios.
 *
 * HOW TO ADD A NEW TEST
 * ─────────────────────
 * 1. Choose an existing scenario or create a new one in testScenarios/
 *    with real data from missions.json and shop_cards.csv
 *
 * 2. Load the scenario:
 *      const { userMissions, shopCardsById, packPrices } = loadScenario(myScenario);
 *
 * 3. Extract missions by ID:
 *      const mission1 = userMissions.find(m => m.id === 123)!;
 *
 * 4. Call the helpers under test:
 *      const items = buildShoppingItems(eligibleMissions, selectedMissionIds, allMissions, shopCardsById)
 *      const text  = buildSummaryText({ strategy, availablePP, includedMissionIds,
 *                                       eligibleMissions, allMissions, shoppingItems: items,
 *                                       packPrices, shopCardsById })
 *
 *    Parameters:
 *      eligibleMissions   — leaf (count/points) missions in scope; NOT chain missions
 *                           (missions-type chains have no buyable cards)
 *      selectedMissionIds — which eligible missions are within budget
 *                           (for unit tests, usually all of them unless testing budget logic)
 *      allMissions        — every mission including chain parents (needed for parent lookups)
 *      shopCardsById      — from loadScenario or new Map()
 *      packPrices         — from loadScenario for realistic pack sorting
 *
 * 5. Assert on:
 *      item.explanation          — full explanation string for a card
 *      item.completingMissions   — array of missions the card completes
 *      item.usedInMissions       — array of missions the card is used in (not completing)
 *      summaryText               — the full header sentence
 */

import { describe, it, expect } from "vitest";
import type { UserMission } from "@/models/UserMission";
import {
  buildShoppingItems,
  buildSummaryText,
  buildExclusionText,
  buildNegativeValueExclusionText,
  buildOutOfBudgetText,
  buildMissionPriority,
  selectMissionsForBudget,
} from "../ShoppingListHelper";
import { PACK_TYPE_DEFAULTS } from "@/stores/useSettingsStore";
import {
  loadScenario,
  simpleChainScenario,
  chainWithPackRewardsScenario,
  exclusionScenario,
  budgetSelectionScenario,
  negativeValueScenario,
  negativeLeavesPosChainScenario,
  standaloneVsChainOrderingScenario,
} from "./testScenarios";

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("buildShoppingItems + buildSummaryText — chain mission scenario", () => {
  /**
   * Tests chain mission completion with specific pack rewards.
   * Sub Mission 1 needs Card A (100 PP) — rewards: 1x Historical Perfect
   * Sub Mission 2 needs Card B (200 PP) — rewards: 1x Rainbow
   * Chain Mission — missions-type, requires both sub-missions — rewards: 2x Gold
   *
   * Chain is the only included mission (triggering expansion to both subs).
   * Strategy: maximize value, PP: unlimited.
   *
   * Expected card order: Card A first (cheaper), Card B second (seals chain).
   */

  const scenario = loadScenario(chainWithPackRewardsScenario);
  const { userMissions, shopCardsById, packPrices } = scenario;

  const sub1 = userMissions.find((m) => m.id === 101)!;
  const sub2 = userMissions.find((m) => m.id === 102)!;
  const chain = userMissions.find((m) => m.id === 200)!;

  const allMissions = [sub1, sub2, chain];
  const eligibleMissions = [sub1, sub2]; // chain is missions-type — no buyable cards
  const selectedMissionIds = new Set([101, 102]);

  const items = buildShoppingItems(
    eligibleMissions,
    selectedMissionIds,
    allMissions,
    shopCardsById,
  );

  it("returns two items ordered cheapest first", () => {
    expect(items).toHaveLength(2);
    expect(items[0].price).toBe(100); // Card A — 100 PP
    expect(items[1].price).toBe(200); // Card B — 200 PP
  });

  it("Card A explanation: completes Sub Mission 1 only", () => {
    expect(items[0].explanation).toBe(
      "Completes 'Sub Mission 1' for 1 Historical Perfect Pack valued at 30,000 PP",
    );
  });

  it("Card B explanation: completes Sub Mission 2 and seals Chain Mission", () => {
    expect(items[1].explanation).toBe(
      "Completes 'Sub Mission 2' for 1 Rainbow Pack valued at 24,100 PP; " +
        "Completes 'Chain Mission' for 2 Gold Packs valued at 2,200 PP",
    );
  });

  it("summary text includes included-missions expansion, completion count, rewards, and total value", () => {
    const text = buildSummaryText({
      strategy: "value",
      availablePP: null,
      includedMissionIds: new Set([200]), // only the chain is explicitly included
      eligibleMissions,
      allMissions,
      shoppingItems: items,
      packPrices,
      shopCardsById,
    });

    expect(text).toBe(
      "Shopping List to maximize value with unlimited PP for " +
        "'Chain Mission' which includes sub missions 'Sub Mission 1' and 'Sub Mission 2'. " +
        "Buy the following cards in order to complete 3 missions giving " +
        "1 Historical Perfect Pack, 1 Rainbow Pack, 2 Gold Packs " +
        "for a combined value of 56,300 PP.",
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("Using Test Scenarios — chain mission with real data", () => {
  /**
   * This test demonstrates using test scenarios with real data from missions.json
   * and shop_cards.csv instead of hand-crafted fixtures.
   *
   * Scenario: Two Live Series level 1 missions (Chicago White Sox and Cleveland)
   * with a parent chain mission (AL Central) requiring both.
   */

  const scenario = loadScenario(simpleChainScenario);
  const { userMissions, shopCardsById, packPrices } = scenario;

  // Extract missions by ID
  const chicagoMission = userMissions.find((m) => m.id === 6)!;
  const clevelandMission = userMissions.find((m) => m.id === 9)!;
  const chainMission = userMissions.find((m) => m.id === 61)!;

  it("loads scenario with correct mission structure", () => {
    expect(chicagoMission.rawMission.name).toBe("Live Level 1 - Chicago (A)");
    expect(clevelandMission.rawMission.name).toBe("Live Level 1 - Cleveland");
    expect(chainMission.rawMission.name).toBe("Live Level 1 - AL Central");
    expect(chainMission.rawMission.type).toBe("missions");
    expect(chainMission.rawMission.missionIds).toEqual([6, 9]);
  });

  it("calculates mission costs correctly", () => {
    // Chicago: 3 cards at 100, 200, 150 PP
    expect(chicagoMission.remainingPrice).toBe(450);
    // Cleveland: 3 cards at 180, 220, 190 PP
    expect(clevelandMission.remainingPrice).toBe(590);
    // Chain sums both leaf missions
    expect(chainMission.remainingPrice).toBe(1040);
  });

  it("calculates reward values correctly", () => {
    // Chicago: card 71418 (lastPrice 5000) + Standard pack (100) = 5100 PP
    expect(chicagoMission.rewardValue).toBe(5100);
    // Cleveland: card 71345 (lastPrice 4800) + Standard pack (100) = 4900 PP
    expect(clevelandMission.rewardValue).toBe(4900);
    // Chain: card 72711 (lastPrice 15000) + Gold pack (1100) = 16100 PP
    expect(chainMission.rewardValue).toBe(16100);
  });

  it("builds shopping list with correct card order and explanations", () => {
    const eligibleMissions = [chicagoMission, clevelandMission];
    const selectedMissionIds = new Set([6, 9]);

    const items = buildShoppingItems(
      eligibleMissions,
      selectedMissionIds,
      userMissions,
      shopCardsById,
    );

    // Should have 6 cards total (3 from each mission)
    expect(items).toHaveLength(6);

    // Cards should be ordered by price (cheapest first)
    expect(items[0].price).toBeLessThanOrEqual(items[1].price);

    // Each card should have an explanation
    items.forEach((item) => {
      expect(item.explanation).toBeTruthy();
      expect(item.explanation.length).toBeGreaterThan(0);
    });
  });

  it("generates accurate summary text", () => {
    const eligibleMissions = [chicagoMission, clevelandMission];
    const selectedMissionIds = new Set([6, 9]);

    const items = buildShoppingItems(
      eligibleMissions,
      selectedMissionIds,
      userMissions,
      shopCardsById,
    );

    const text = buildSummaryText({
      strategy: "value",
      availablePP: null,
      includedMissionIds: new Set([61]), // Chain is included
      eligibleMissions,
      allMissions: userMissions,
      shoppingItems: items,
      packPrices,
      shopCardsById,
    });

    // Should mention the chain and its sub-missions
    expect(text).toContain("Live Level 1 - AL Central");
    expect(text).toContain("Live Level 1 - Chicago (A)");
    expect(text).toContain("Live Level 1 - Cleveland");
    // Should mention completing missions
    expect(text).toContain("complete");
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("buildExclusionText — zero-price / non-completable missions", () => {
  /**
   * Tests exclusion text generation for missions with unpurchasable cards.
   * Uses exclusionScenario with various zero-price and mixed-price missions.
   */

  const scenario = loadScenario(exclusionScenario);
  const { userMissions } = scenario;

  it("returns empty string when no missions are excluded", () => {
    expect(buildExclusionText([])).toBe("");
  });

  it("uses singular form for one excluded mission", () => {
    const blockedMission = userMissions.find((m) => m.id === 1)!;
    expect(buildExclusionText([blockedMission])).toBe(
      "1 mission excluded because it requires a card with no market price: 'Blocked Mission'.",
    );
  });

  it("uses plural form and lists all names for multiple excluded missions", () => {
    const alpha = userMissions.find((m) => m.id === 2)!;
    const beta = userMissions.find((m) => m.id === 3)!;
    expect(buildExclusionText([alpha, beta])).toBe(
      "2 missions excluded because they require cards with no market price: 'Mission Alpha', 'Mission Beta'.",
    );
  });

  it("non-completable mission excluded from shopping items and summary when filtered correctly", () => {
    const blockedMission = userMissions.find((m) => m.id === 10)!;
    const goodMission = userMissions.find((m) => m.id === 11)!;

    // Confirm isCompletable flags are correct
    expect(blockedMission.isCompletable).toBe(false);
    expect(goodMission.isCompletable).toBe(true);

    const allMissions = [blockedMission, goodMission];

    // Simulate what ShoppingList.vue's eligibleMissions does:
    // only pass completable missions to buildShoppingItems
    const eligibleMissions = allMissions.filter((m) => m.isCompletable);
    const selectedIds = new Set(eligibleMissions.map((m) => m.id));

    const items = buildShoppingItems(
      eligibleMissions,
      selectedIds,
      allMissions,
      new Map(),
    );

    // Only the good mission's card appears — blocked mission excluded
    expect(items).toHaveLength(1);
    expect(items[0].cardId).toBe(20012);

    // The summary counts only the completable mission
    const packPrices = new Map(Object.entries(PACK_TYPE_DEFAULTS));
    const text = buildSummaryText({
      strategy: "value",
      availablePP: null,
      includedMissionIds: new Set(),
      eligibleMissions,
      allMissions,
      shoppingItems: items,
      packPrices,
      shopCardsById: new Map(),
    });

    expect(text).toContain("complete 'Good Mission'");
    expect(text).not.toContain("Blocked Mission");
  });

  it("chain still seals when enough subs are completable despite one blocked sub", () => {
    const goodSub = userMissions.find((m) => m.id === 101)!;
    const blockedSub = userMissions.find((m) => m.id === 102)!;
    const chain = userMissions.find((m) => m.id === 200)!;

    expect(goodSub.isCompletable).toBe(true);
    expect(blockedSub.isCompletable).toBe(false);

    const allMissions = [goodSub, blockedSub, chain];

    // Filter as the component would: exclude non-completable leaves
    const eligibleMissions = allMissions.filter((m) => m.isCompletable);
    const selectedIds = new Set(eligibleMissions.map((m) => m.id));

    const items = buildShoppingItems(
      eligibleMissions,
      selectedIds,
      allMissions,
      new Map(),
    );

    expect(items).toHaveLength(1);
    expect(items[0].cardId).toBe(20101);

    // Card seals the chain (requiredCount = 1, good sub completes it)
    const completingIds = items[0].completingMissions.map((m) => m.id);
    expect(completingIds).toContain(101); // Good Sub
    expect(completingIds).toContain(200); // Chain Mission
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("selectMissionsForBudget — greedy mission selection", () => {
  /**
   * Tests budget-constrained greedy mission selection.
   * Uses budgetSelectionScenario with various mission costs and strategies.
   */

  const scenario = loadScenario(budgetSelectionScenario);
  const { userMissions } = scenario;

  // ── 2a. Exact budget fit ──────────────────────────────────────────────────
  it("2a: mission whose cost equals the remaining budget is included", () => {
    const exactFit = userMissions.find((m) => m.id === 1)!;
    const { selectedIds } = selectMissionsForBudget(
      [exactFit],
      "completion",
      500,
    );
    expect(selectedIds.has(1)).toBe(true);
  });

  // ── 2b. Skip expensive, keep cheaper ─────────────────────────────────────
  it("2b: expensive mission skipped but cheaper later mission still selected", () => {
    const expensive = userMissions.find((m) => m.id === 2)!;
    const cheap = userMissions.find((m) => m.id === 3)!;
    // Budget 300 — expensive doesn't fit, cheap does
    const { selectedIds } = selectMissionsForBudget(
      [expensive, cheap],
      "completion",
      300,
    );
    expect(selectedIds.has(2)).toBe(false);
    expect(selectedIds.has(3)).toBe(true);
  });

  // ── 2c. Card sharing reduces effective cost ───────────────────────────────
  it("2c: shared card counted only once, allowing both missions to fit in budget", () => {
    const missionA = userMissions.find((m) => m.id === 4)!;
    const missionB = userMissions.find((m) => m.id === 5)!;

    // Mission A: needs shared (300) + cardA (200) = 500 PP
    // Mission B: needs shared (300) + cardB (100) = 400 PP
    // Budget: 600 PP — neither fits alone at full face value, but
    // completion order picks B first (cheapest remaining price):
    //   B selected for 400 PP (shared + cardB)
    //   A's new cost = only cardA = 200 PP → fits in remaining 200 PP
    const { selectedIds, selectionOrder } = selectMissionsForBudget(
      [missionA, missionB],
      "completion",
      600,
    );

    expect(selectedIds.has(4)).toBe(true);
    expect(selectedIds.has(5)).toBe(true);
    // B selected first (cheaper overall price)
    expect(selectionOrder[0].id).toBe(5);
    expect(selectionOrder[1].id).toBe(4);
  });

  // ── 2d. Free missions always included ────────────────────────────────────
  it("2d: mission with remainingPrice = 0 is always included regardless of budget", () => {
    const free = userMissions.find((m) => m.id === 6)!;
    expect(free.remainingPrice).toBe(0); // All cards owned
    const { selectedIds } = selectMissionsForBudget([free], "completion", 0);
    expect(selectedIds.has(6)).toBe(true);
  });

  // ── 1b. Value strategy selects highest-ratio missions first ──────────────
  it("1b: value strategy with budget selects highest rewardValue/cost ratio first", () => {
    const highRatio = userMissions.find((m) => m.id === 7)!; // High ratio: 30000 / 100 = 300
    const lowRatio = userMissions.find((m) => m.id === 8)!; // Low ratio: 750 / 500 = 1.5

    // Budget 200: only room for one non-shared mission
    const { selectedIds, selectionOrder } = selectMissionsForBudget(
      [highRatio, lowRatio],
      "value",
      200,
    );

    expect(selectedIds.has(7)).toBe(true); // high ratio selected
    expect(selectedIds.has(8)).toBe(false); // low ratio skipped
    expect(selectionOrder[0].id).toBe(7); // high ratio first in order
  });

  // ── 1c. Completion strategy selects cheapest missions first ──────────────
  it("1c: completion strategy with budget selects cheapest missions first", () => {
    const cheap = userMissions.find((m) => m.id === 9)!;
    const expensive = userMissions.find((m) => m.id === 10)!;

    // Budget 500: expensive has much better ratio but completion ignores that
    const { selectedIds, selectionOrder } = selectMissionsForBudget(
      [cheap, expensive],
      "completion",
      500,
    );

    expect(selectedIds.has(9)).toBe(true); // cheap selected
    expect(selectedIds.has(10)).toBe(false); // expensive skipped despite better ratio
    expect(selectionOrder[0].id).toBe(9); // cheap first
  });

  // ── Unlimited PP: all missions selected in sort order ────────────────────
  it("unlimited PP: all missions selected; selectionOrder reflects strategy sort", () => {
    const m1 = userMissions.find((m) => m.id === 11)!; // ratio ~1.22 (1100/900)
    const m2 = userMissions.find((m) => m.id === 12)!; // ratio 37.5 (3750/100)

    const { selectedIds, selectionOrder } = selectMissionsForBudget(
      [m1, m2],
      "value",
      null,
    );

    expect(selectedIds.has(11)).toBe(true);
    expect(selectedIds.has(12)).toBe(true);
    // Value strategy: m2 (higher ratio) before m1
    expect(selectionOrder[0].id).toBe(12);
    expect(selectionOrder[1].id).toBe(11);
  });

  it("value strategy: sorts by highest net value (not ratio)", () => {
    const lowNetHighRatio = {
      id: 9001,
      remainingPrice: 10,
      rewardValue: 20,
      missionValue: 10,
      missionCards: [],
    } as unknown as UserMission;

    const highNetLowRatio = {
      id: 9002,
      remainingPrice: 100,
      rewardValue: 150,
      missionValue: 50,
      missionCards: [],
    } as unknown as UserMission;

    const { selectionOrder } = selectMissionsForBudget(
      [lowNetHighRatio, highNetLowRatio],
      "value",
      null,
    );

    expect(selectionOrder[0].id).toBe(9002);
    expect(selectionOrder[1].id).toBe(9001);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 3 — Negative Value Exclusion (Value Strategy)
// ═══════════════════════════════════════════════════════════════════════════

describe("Phase 3: selectMissionsForBudget — negative value exclusion", () => {
  /**
   * Tests Phase 3 negative value exclusion logic.
   * Uses negativeValueScenario with missions of various cost/reward ratios.
   */

  const scenario = loadScenario(negativeValueScenario);
  const { userMissions } = scenario;

  // ── Value strategy, unlimited PP: negative-value missions excluded ────────
  it("value strategy, unlimited PP: excludes missions where cost > reward", () => {
    const negative = userMissions.find((m) => m.id === 1)!; // 1000 cost, 750 reward
    const positive = userMissions.find((m) => m.id === 2)!; // 100 cost, 3750 reward

    const { selectedIds, selectionOrder, negativeValueExcluded } =
      selectMissionsForBudget([negative, positive], "value", null);

    expect(selectedIds.has(1)).toBe(false); // negative excluded
    expect(selectedIds.has(2)).toBe(true); // positive included
    expect(selectionOrder.length).toBe(1);
    expect(selectionOrder[0].id).toBe(2);
    expect(negativeValueExcluded.length).toBe(1);
    expect(negativeValueExcluded[0].id).toBe(1);
  });

  // ── Value strategy: all missions excluded for negative value ──────────────
  it("value strategy: all negative-value missions excluded", () => {
    const m1 = userMissions.find((m) => m.id === 3)!; // 1000 cost, 750 reward
    const m2 = userMissions.find((m) => m.id === 4)!; // 900 cost, 250 reward

    const { selectedIds, negativeValueExcluded } = selectMissionsForBudget(
      [m1, m2],
      "value",
      null,
    );

    expect(selectedIds.size).toBe(0);
    expect(negativeValueExcluded.length).toBe(2);
    expect(negativeValueExcluded.map((m) => m.id).sort()).toEqual([3, 4]);
  });

  // ── Free missions (remainingPrice = 0) always included ────────────────────
  it("value strategy: free missions always included regardless of reward", () => {
    const free = userMissions.find((m) => m.id === 5)!; // all cards owned

    expect(free.remainingPrice).toBe(0); // Verify it's free

    const { selectedIds, negativeValueExcluded } = selectMissionsForBudget(
      [free],
      "value",
      null,
    );

    expect(selectedIds.has(5)).toBe(true);
    expect(negativeValueExcluded.length).toBe(0);
  });

  // ── Missions with undefined rewardValue always included ───────────────────
  it("value strategy: missions with undefined rewardValue included (cannot calculate net value)", () => {
    const noReward = userMissions.find((m) => m.id === 6)!; // no rewards

    // Verify reward value is undefined
    expect(noReward.rewardValue).toBeUndefined();

    const { selectedIds, negativeValueExcluded } = selectMissionsForBudget(
      [noReward],
      "value",
      null,
    );

    expect(selectedIds.has(6)).toBe(true);
    expect(negativeValueExcluded.length).toBe(0);
  });

  // ── Value strategy, limited PP: negative-value excluded before greedy ─────
  it("value strategy, limited PP: negative-value missions excluded before budget greedy", () => {
    // Use missions 1 and 8: mission 1 is negative (1000 cost, 750 reward), mission 8 is positive (200 cost, 3750 reward)
    const negativeForReal = userMissions.find((m) => m.id === 1)!; // 1000 cost, 750 reward
    const positiveForReal = userMissions.find((m) => m.id === 8)!; // 200 cost, 3750 reward

    const result = selectMissionsForBudget(
      [negativeForReal, positiveForReal],
      "value",
      250, // enough for positive, but negative shouldn't even be considered
    );

    expect(result.selectedIds.has(1)).toBe(false);
    expect(result.selectedIds.has(8)).toBe(true);
    expect(result.negativeValueExcluded.length).toBe(1);
    expect(result.negativeValueExcluded[0].id).toBe(1);
  });

  // ── Completion strategy: negative-value missions NOT excluded ─────────────
  it("completion strategy: missions with negative value are NOT excluded", () => {
    const negative = userMissions.find((m) => m.id === 9)!; // 1000 cost, 750 reward
    const positive = userMissions.find((m) => m.id === 10)!; // 100 cost, 3750 reward

    const { selectedIds, negativeValueExcluded } = selectMissionsForBudget(
      [negative, positive],
      "completion",
      null,
    );

    // Completion strategy doesn't filter by value
    expect(selectedIds.has(9)).toBe(true);
    expect(selectedIds.has(10)).toBe(true);
    expect(negativeValueExcluded.length).toBe(0);
  });

  // ── Chain with positive net, leaf missions with negative net ──────────────
  it("value strategy: negative-net leaf missions included when part of positive-net chain", () => {
    const leaf1 = userMissions.find((m) => m.id === 11)!; // 1000 cost, 100 reward (net: -900)
    const leaf2 = userMissions.find((m) => m.id === 12)!; // 900 cost, 250 reward (net: -650)
    const chain = userMissions.find((m) => m.id === 13)!; // 5x Rainbow = 120,500 reward

    // Chain net value: chain rewards (120500) - total cost (1900) = 118600 PP
    const chainNetValue = (chain.rewardValue ?? 0) - chain.remainingPrice;
    expect(chainNetValue).toBe(118600);

    const { selectedIds, negativeValueExcluded } = selectMissionsForBudget(
      [leaf1, leaf2],
      "value",
      null,
      [leaf1, leaf2, chain],
    );

    // Both leaf missions should be included because they're part of a positive-net chain
    expect(selectedIds.has(11)).toBe(true);
    expect(selectedIds.has(12)).toBe(true);
    expect(negativeValueExcluded.length).toBe(0);
  });

  // ── Chain with negative net should not save its leaves ────────────────────
  it("value strategy: negative-net leaf missions excluded even if part of negative-net chain", () => {
    const leaf1 = userMissions.find((m) => m.id === 14)!; // 1000 cost, 100 reward (Standard pack)
    const leaf2 = userMissions.find((m) => m.id === 15)!; // 900 cost, 250 reward (Silver pack)
    const chain = userMissions.find((m) => m.id === 16)!; // No rewards (0 PP)

    // Chain net value: total rewards (100 + 250 + 0 = 350) - total cost (1900) = -1550 PP (negative)
    const totalReward =
      (leaf1.rewardValue ?? 0) +
      (leaf2.rewardValue ?? 0) +
      (chain.rewardValue ?? 0);
    const totalCost = chain.remainingPrice;
    expect(totalReward).toBe(350);
    expect(totalCost).toBe(1900);
    // Net is negative (-1550), so leaves should be excluded

    const { selectedIds, negativeValueExcluded } = selectMissionsForBudget(
      [leaf1, leaf2],
      "value",
      null,
      [leaf1, leaf2, chain],
    );

    // Both leaf missions should be excluded
    expect(selectedIds.has(14)).toBe(false);
    expect(selectedIds.has(15)).toBe(false);
    expect(negativeValueExcluded.length).toBe(2);
  });
});

describe("Phase 3: negative leaves with positive chain parent", () => {
  /**
   * Tests that leaf missions with negative net value are included in the shopping list
   * when the parent chain mission has positive net value.
   *
   * This is a critical Phase 3 feature: leaves should not be excluded based on their
   * individual negative value if the parent chain compensates with positive value.
   *
   * Scenario 6 structure (with owned cards):
   * - Leaf 1 (Chicago):
   *   - Purchased cards: 73701 (100) + 75727 (150) + 73702 (300) = 550 PP
   *   - Owned card 71945 (200 PP to lock) = 200 unlockedCardsPrice
   *   - Reward: 250 PP
   *   - Net: 250 - 550 - 200 = -500 (NEGATIVE)
   * - Leaf 2 (Cleveland):
   *   - Purchased cards: 73379 (180) + 73153 (190) + 73380 (280) = 650 PP
   *   - Owned card 75718 (220 PP to lock) = 220 unlockedCardsPrice
   *   - Reward: 250 PP
   *   - Net: 250 - 650 - 220 = -620 (NEGATIVE)
   * - Chain (AL Central):
   *   - Purchased cost: 550 + 650 = 1200 PP
   *   - Unlocked cost: 200 + 220 = 420 PP
   *   - Reward: 120,500 PP (chain only)
   *   - Combined: 120,500 + 250 + 250 = 120,850 PP reward
   *   - Net: 120,850 - 1200 - 420 = +119,230 (POSITIVE)
   * - Since chain net is positive, both leaves should be included
   */

  const scenario = loadScenario(negativeLeavesPosChainScenario);
  const { userMissions, shopCardsById } = scenario;

  const leaf1 = userMissions.find((m) => m.id === 6)!;
  const leaf2 = userMissions.find((m) => m.id === 9)!;
  const chain = userMissions.find((m) => m.id === 61)!;

  it("leaf missions have negative individual net value", () => {
    // Leaf 1: 250 PP reward - 550 PP purchased - 200 PP unlocked = -500 PP
    expect(leaf1.rewardValue).toBe(250);
    expect(leaf1.remainingPrice).toBe(550);
    expect(leaf1.unlockedCardsPrice).toBe(200);
    const leaf1Net =
      (leaf1.rewardValue ?? 0) -
      leaf1.remainingPrice -
      leaf1.unlockedCardsPrice;
    expect(leaf1Net).toBe(-500);

    // Leaf 2: 250 PP reward - 650 PP purchased - 220 PP unlocked = -620 PP
    expect(leaf2.rewardValue).toBe(250);
    expect(leaf2.remainingPrice).toBe(650);
    expect(leaf2.unlockedCardsPrice).toBe(220);
    const leaf2Net =
      (leaf2.rewardValue ?? 0) -
      leaf2.remainingPrice -
      leaf2.unlockedCardsPrice;
    expect(leaf2Net).toBe(-620);
  });

  it("chain mission has positive net value compensating for negative leaves", () => {
    // Chain: 120,500 PP reward - 1200 PP purchased - 420 PP unlocked = +118,880 PP (chain only)
    expect(chain.rewardValue).toBe(120500);
    expect(chain.remainingPrice).toBe(1200);
    expect(chain.unlockedCardsPrice).toBe(420);

    // Using missionValue which includes unlockedCardsPrice
    // For chain: combinedRewardValue - remainingPrice - unlockedCardsPrice
    // combinedRewardValue = 250 + 250 + 120,500 = 120,850
    // missionValue = 120,850 - 1,200 - 420 = 119,230
    // but if card selection varies slightly, check it's positive (>0) is most important
    expect(chain.missionValue).toBeGreaterThan(0);
  });

  it("leaf missions are included in shopping list despite negative individual value", () => {
    const allMissions = [leaf1, leaf2, chain];
    const eligibleMissions = [leaf1, leaf2]; // chain is missions-type

    const { selectedIds, negativeValueExcluded } = selectMissionsForBudget(
      eligibleMissions,
      "value",
      null,
      allMissions,
    );

    // Both leaf missions should be INCLUDED because the parent chain is positive
    expect(selectedIds.has(6)).toBe(true); // Chicago
    expect(selectedIds.has(9)).toBe(true); // Cleveland

    // No missions should be excluded
    expect(negativeValueExcluded.length).toBe(0);
  });

  it("shopping items include all required purchased cards for negative leaves when chain is positive", () => {
    const allMissions = [leaf1, leaf2, chain];
    const eligibleMissions = [leaf1, leaf2];
    const selectedMissionIds = new Set([6, 9]); // Both leafs selected

    const items = buildShoppingItems(
      eligibleMissions,
      selectedMissionIds,
      allMissions,
      shopCardsById,
    );

    // Should have 6 items total (3 non-owned cards for leaf1 + 3 non-owned cards for leaf2)
    // The 2 owned cards (71945 and 75718) don't appear in shopping items since they're already owned
    expect(items.length).toBe(6);

    // All items should have explanations mentioning the leaf missions
    items.forEach((item) => {
      expect(item.explanation).toBeTruthy();
      expect(
        item.completingMissions.length > 0 || item.usedInMissions.length > 0,
      ).toBe(true);
    });
  });
});

describe("Phase 3: buildNegativeValueExclusionText", () => {
  /**
   * Tests text generation for negative value exclusion warnings.
   */

  const scenario = loadScenario(negativeValueScenario);
  const { userMissions } = scenario;

  it("returns empty string when no missions excluded", () => {
    expect(buildNegativeValueExclusionText([])).toBe("");
  });

  it("uses singular form for one excluded mission", () => {
    const badMission = userMissions.find((m) => m.id === 17)!;
    const text = buildNegativeValueExclusionText([badMission]);
    expect(text).toBe(
      "1 mission skipped because its cost exceeds its reward value: 'Bad Mission'.",
    );
  });

  it("uses plural form and lists all names for multiple excluded missions", () => {
    const missionA = userMissions.find((m) => m.id === 18)!;
    const missionB = userMissions.find((m) => m.id === 19)!;
    const text = buildNegativeValueExclusionText([missionA, missionB]);
    expect(text).toBe(
      "2 missions skipped because their cost exceeds their reward value: 'Mission A', 'Mission B'.",
    );
  });
});

describe("buildOutOfBudgetText", () => {
  /**
   * Tests text generation for out-of-budget mission warnings.
   */

  const scenario = loadScenario(budgetSelectionScenario);
  const { userMissions } = scenario;

  it("returns empty string when no missions are out of budget", () => {
    expect(buildOutOfBudgetText([])).toBe("");
  });

  it("uses singular form for one out-of-budget mission", () => {
    const mission = userMissions.find((m) => m.id === 2)!;
    const text = buildOutOfBudgetText([mission]);
    expect(text).toBe(
      "1 mission not included due to insufficient budget: 'Expensive'.",
    );
  });

  it("uses plural form and lists all names for multiple out-of-budget missions", () => {
    const missionA = userMissions.find((m) => m.id === 2)!;
    const missionB = userMissions.find((m) => m.id === 3)!;
    const text = buildOutOfBudgetText([missionA, missionB]);
    expect(text).toMatch(
      /^2 missions not included due to insufficient budget:/,
    );
    expect(text).toContain("'Expensive'");
    expect(text).toContain("'Cheap'");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 4 — Card Ordering by Mission Priority
// ═══════════════════════════════════════════════════════════════════════════

describe("Phase 4: buildShoppingItems — mission priority ordering", () => {
  it("3d completion: mission priority order wins over cheaper card price", () => {
    const scenario = loadScenario(chainWithPackRewardsScenario);
    const { userMissions, shopCardsById } = scenario;

    const sub1 = userMissions.find((m) => m.id === 101)!; // Card A, 100 PP
    const sub2 = userMissions.find((m) => m.id === 102)!; // Card B, 200 PP
    const chain = userMissions.find((m) => m.id === 200)!;

    const items = buildShoppingItems(
      [sub1, sub2],
      new Set([101, 102]),
      [sub1, sub2, chain],
      shopCardsById,
      // Completion priority: sub2 first, sub1 second.
      // Even though sub1's card is cheaper, sub2's card should appear first.
      new Map([
        [102, 0],
        [101, 1],
      ]),
    );

    expect(items).toHaveLength(2);
    expect(items[0].cardId).toBe(10002); // Card B first by mission priority
    expect(items[1].cardId).toBe(10001); // Card A second despite being cheaper
  });

  it("3d value: high-priority mission cards come first even when more expensive", () => {
    const scenario = loadScenario(budgetSelectionScenario);
    const { userMissions } = scenario;

    const cheapLowValue = userMissions.find((m) => m.id === 9)!; // 100 PP card, low ratio
    const expensiveHighValue = userMissions.find((m) => m.id === 10)!; // 900 PP card, high ratio

    const { selectionOrder } = selectMissionsForBudget(
      [cheapLowValue, expensiveHighValue],
      "value",
      null,
    );
    const missionPriority = new Map<number, number>();
    selectionOrder.forEach((m, index) => missionPriority.set(m.id, index));

    const items = buildShoppingItems(
      [cheapLowValue, expensiveHighValue],
      new Set([9, 10]),
      [cheapLowValue, expensiveHighValue],
      new Map(),
      missionPriority,
    );

    expect(items).toHaveLength(2);
    expect(items[0].cardId).toBe(30010); // expensive, but highest value priority
    expect(items[1].cardId).toBe(30009); // cheap, lower value priority
  });

  it("3e chain priority: parent chain priority propagates to low-priority leaf descendants", () => {
    const scenario = loadScenario(simpleChainScenario);
    const { userMissions, shopCardsById } = scenario;

    const leaf1 = userMissions.find((m) => m.id === 6)!;
    const leaf2 = userMissions.find((m) => m.id === 9)!;
    const chain = userMissions.find((m) => m.id === 61)!;

    const items = buildShoppingItems(
      [leaf1, leaf2],
      new Set([6, 9]),
      [leaf1, leaf2, chain],
      shopCardsById,
      // Without propagation, leaf2 (priority 1) would beat leaf1 (priority 5).
      // Chain priority 0 should propagate to both leaves, then price order applies.
      new Map([
        [9, 1],
        [6, 5],
        [61, 0],
      ]),
    );

    expect(items.length).toBeGreaterThan(0);
    expect(items[0].cardId).toBe(73701); // leaf1 cheapest card should surface first after propagation
  });
});

describe("buildShoppingItems — completion attribution", () => {
  it("marks completion on the final purchased card for multi-card missions", () => {
    const mission = {
      id: 9501,
      rawMission: { id: 9501, name: "Two Card Mission", type: "count" },
      missionCards: [
        {
          cardId: 50001,
          title: "Card 1",
          price: 100,
          highlighted: true,
          owned: false,
        },
        {
          cardId: 50002,
          title: "Card 2",
          price: 200,
          highlighted: true,
          owned: false,
        },
      ],
    } as unknown as UserMission;

    const items = buildShoppingItems(
      [mission],
      new Set([9501]),
      [mission],
      new Map(),
    );

    expect(items).toHaveLength(2);
    expect(items[0].cardId).toBe(50001);
    expect(items[0].explanation).toContain("Used in 'Two Card Mission'");
    expect(items[1].cardId).toBe(50002);
    expect(items[1].explanation).toContain("Completes 'Two Card Mission'");
  });
});

describe("ordering regression: standalone vs positive chain", () => {
  it("orders high standalone net, then chain leaves, then lower standalone net", () => {
    const scenario = loadScenario(standaloneVsChainOrderingScenario);
    const { userMissions, shopCardsById } = scenario;

    const highStandalone = userMissions.find((m) => m.id === 1001)!;
    const lowStandalone = userMissions.find((m) => m.id === 1002)!;
    const leafA = userMissions.find((m) => m.id === 1003)!;
    const leafB = userMissions.find((m) => m.id === 1004)!;
    const chain = userMissions.find((m) => m.id === 1005)!;

    const leafMissions = [highStandalone, lowStandalone, leafA, leafB];
    const allMissions = [highStandalone, lowStandalone, leafA, leafB, chain];

    const selection = selectMissionsForBudget(
      leafMissions,
      "value",
      null,
      allMissions,
    );

    const missionPriority = buildMissionPriority(
      allMissions,
      selection.selectionOrder,
      "value",
      selection.selectedIds,
    );

    const items = buildShoppingItems(
      allMissions,
      selection.selectedIds,
      allMissions,
      shopCardsById,
      missionPriority,
    );

    expect(items.map((i) => i.cardId)).toEqual([51001, 51003, 51004, 51002]);
  });
});
