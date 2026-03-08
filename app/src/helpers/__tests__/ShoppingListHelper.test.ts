/**
 * Unit tests for ShoppingListHelper
 *
 * HOW TO ADD A NEW SCENARIO
 * ─────────────────────────
 * 1. Add a `describe` block (or a new `it` inside an existing one) below.
 *
 * 2. Build fixtures with the factory helpers at the top of this file:
 *      makeCard(cardId, price, owned?)         — a MissionCard
 *      makeLeafMission(id, name, cards, opts?) — count-type UserMission
 *        opts: { rewards?, rewardValue?, completed? }
 *      makeChainMission(id, name, subIds, required, opts?)
 *        opts: { rewards?, rewardValue?, completed? }
 *
 * 3. Call the helpers under test:
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
 *      shopCardsById      — pass new Map() unless you need card-reward label text
 *      packPrices         — pass PACK_TYPE_DEFAULTS map (from useSettingsStore) for realistic
 *                           pack sorting, or new Map() to skip pack-price sorting
 *
 * 4. Assert on:
 *      item.explanation          — full explanation string for a card
 *      item.completingMissions   — array of missions the card completes
 *      item.usedInMissions       — array of missions the card is used in (not completing)
 *      summaryText               — the full header sentence
 */

import { describe, it, expect } from "vitest";
import { buildShoppingItems, buildSummaryText, buildExclusionText, selectMissionsForBudget } from "../ShoppingListHelper";
import { PACK_TYPE_DEFAULTS } from "@/stores/useSettingsStore";
import type { UserMission } from "@/models/UserMission";
import type { MissionCard } from "@/models/MissionCard";
import type { MissionReward } from "@/models/MissionReward";

// ─── Factory helpers ─────────────────────────────────────────────────────────

function makeCard(
  cardId: number,
  price: number,
  owned = false,
): MissionCard {
  return {
    cardId,
    title: `Card ${cardId}`,
    owned,
    locked: false,
    available: true,
    price,
    highlighted: true,
    shouldLock: false,
  };
}

function makeLeafMission(
  id: number,
  name: string,
  cards: MissionCard[],
  opts: { rewards?: MissionReward[]; rewardValue?: number; completed?: boolean } = {},
): UserMission {
  const { rewards = [], rewardValue, completed = false } = opts;
  const isCompletable = !cards.some((c) => !c.owned && c.price === 0);
  return {
    id,
    rawMission: {
      id,
      name,
      type: "count",
      requiredCount: cards.length,
      cards: cards.map((c) => ({ cardId: c.cardId })),
      reward: "",
      rewards,
      category: "",
    },
    progressText: "Calculated",
    completed,
    isCompletable,
    missionCards: cards,
    remainingPrice: cards
      .filter((c) => !c.owned)
      .reduce((s, c) => s + c.price, 0),
    unlockedCardsPrice: 0,
    rewardValue,
  };
}

function makeChainMission(
  id: number,
  name: string,
  subIds: number[],
  required: number,
  opts: { rewards?: MissionReward[]; rewardValue?: number; completed?: boolean } = {},
): UserMission {
  const { rewards = [], rewardValue, completed = false } = opts;
  return {
    id,
    rawMission: {
      id,
      name,
      type: "missions",
      requiredCount: required,
      cards: [],
      missionIds: subIds,
      reward: "",
      rewards,
      category: "",
    },
    progressText: "Calculated",
    completed,
    isCompletable: false,
    missionCards: [],
    remainingPrice: 0,
    unlockedCardsPrice: 0,
    rewardValue,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("buildShoppingItems + buildSummaryText — chain mission scenario", () => {
  /**
   * Setup:
   *   Sub Mission 1 — needs Card A (100 PP) — rewards: 1x Historical Perfect
   *   Sub Mission 2 — needs Card B (200 PP) — rewards: 1x Rainbow
   *   Chain Mission — missions-type, requires both sub-missions — rewards: 2x Gold
   *
   * Chain is the only included mission (triggering expansion to both subs).
   * Strategy: maximize value, PP: unlimited.
   *
   * Expected card order: Card A first (cheaper), Card B second (seals chain).
   */

  const cardA = makeCard(1, 100);
  const cardB = makeCard(2, 200);

  const sub1 = makeLeafMission(101, "Sub Mission 1", [cardA], {
    rewards: [{ type: "pack", packType: "HistPerfect", count: 1 }],
    rewardValue: 30_000,
  });
  const sub2 = makeLeafMission(102, "Sub Mission 2", [cardB], {
    rewards: [{ type: "pack", packType: "Rainbow", count: 1 }],
    rewardValue: 24_100,
  });
  const chain = makeChainMission(200, "Chain Mission", [101, 102], 2, {
    rewards: [{ type: "pack", packType: "Gold", count: 2 }],
    rewardValue: 2_200,
  });

  const allMissions = [sub1, sub2, chain];
  const eligibleMissions = [sub1, sub2]; // chain is missions-type — no buyable cards
  const selectedMissionIds = new Set([101, 102]);
  const packPrices = new Map(Object.entries(PACK_TYPE_DEFAULTS));
  const shopCardsById = new Map();

  const items = buildShoppingItems(
    eligibleMissions,
    selectedMissionIds,
    allMissions,
    shopCardsById,
  );

  it("returns two items ordered cheapest first", () => {
    expect(items).toHaveLength(2);
    expect(items[0].cardId).toBe(1); // Card A — 100 PP
    expect(items[1].cardId).toBe(2); // Card B — 200 PP
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

describe("buildExclusionText — zero-price / non-completable missions", () => {
  /**
   * `buildExclusionText` is called in ShoppingList.vue with the set of
   * missions that were in scope but had `isCompletable = false` (typically
   * because a required card has no market price).
   *
   * These missions are filtered OUT of `eligibleMissions` before being passed
   * to `buildShoppingItems`, so they never appear in the shopping list or
   * completion counts. The exclusion text is shown as a separate warning.
   */

  it("returns empty string when no missions are excluded", () => {
    expect(buildExclusionText([])).toBe("");
  });

  it("uses singular form for one excluded mission", () => {
    const m = makeLeafMission(1, "Blocked Mission", [makeCard(1, 0)]);
    expect(buildExclusionText([m])).toBe(
      "1 mission excluded because it requires a card with no market price: 'Blocked Mission'.",
    );
  });

  it("uses plural form and lists all names for multiple excluded missions", () => {
    const m1 = makeLeafMission(1, "Mission Alpha", [makeCard(1, 0)]);
    const m2 = makeLeafMission(2, "Mission Beta", [makeCard(2, 0)]);
    expect(buildExclusionText([m1, m2])).toBe(
      "2 missions excluded because they require cards with no market price: 'Mission Alpha', 'Mission Beta'.",
    );
  });

  /**
   * Regression: before the fix, a mission with isCompletable = false would
   * still enter buildShoppingItems (via eligibleMissions) and its purchasable
   * cards would be included. computeCompletedByList would then mark it as
   * "completed" in the summary even though the 0-price card was never bought.
   *
   * The fix is in ShoppingList.vue's eligibleMissions filter (adds m.isCompletable).
   * The test below demonstrates correct behaviour by manually applying the
   * filter before calling buildShoppingItems — the non-completable mission's
   * cards do not appear and it is not counted as completed.
   */
  it("non-completable mission excluded from shopping items and summary when filtered correctly", () => {
    // Card A is purchasable; Card B has price 0 (unpurchasable).
    // The mission needs both, so isCompletable = false (set by factory).
    const cardA = makeCard(1, 500);
    const cardBFree = makeCard(2, 0);
    const blockedMission = makeLeafMission(10, "Blocked Mission", [cardA, cardBFree]);

    // Confirm the factory correctly sets isCompletable = false
    expect(blockedMission.isCompletable).toBe(false);

    // A normal completable mission in the same scope
    const cardC = makeCard(3, 100);
    const goodMission = makeLeafMission(11, "Good Mission", [cardC], {
      rewards: [{ type: "pack", packType: "Gold", count: 1 }],
      rewardValue: 1_100,
    });

    const allMissions = [blockedMission, goodMission];

    // Simulate what ShoppingList.vue's eligibleMissions does:
    // only pass completable missions to buildShoppingItems
    const eligibleMissions = allMissions.filter((m) => m.isCompletable);
    const selectedIds = new Set(eligibleMissions.map((m) => m.id));

    const items = buildShoppingItems(eligibleMissions, selectedIds, allMissions, new Map());

    // Only Card C appears — Card A and the blocked mission are excluded
    expect(items).toHaveLength(1);
    expect(items[0].cardId).toBe(3);

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

  /**
   * Chain scenario: one sub-mission is blocked (isCompletable = false),
   * but the chain requires only 1 of 2 subs (requiredCount = 1).
   * The good sub's card should still seal the chain.
   */
  it("chain still seals when enough subs are completable despite one blocked sub", () => {
    const cardA = makeCard(1, 100);
    const goodSub = makeLeafMission(101, "Good Sub", [cardA], {
      rewards: [{ type: "pack", packType: "Gold", count: 1 }],
      rewardValue: 1_100,
    });

    const blockedSub = makeLeafMission(102, "Blocked Sub", [makeCard(2, 0)]);
    expect(blockedSub.isCompletable).toBe(false);

    const chain = makeChainMission(200, "Chain Mission", [101, 102], 1, {
      rewards: [{ type: "pack", packType: "Silver", count: 1 }],
      rewardValue: 250,
    });

    const allMissions = [goodSub, blockedSub, chain];

    // Filter as the component would: exclude non-completable leaves
    const eligibleMissions = allMissions.filter((m) => m.isCompletable);
    const selectedIds = new Set(eligibleMissions.map((m) => m.id));

    const items = buildShoppingItems(eligibleMissions, selectedIds, allMissions, new Map());

    expect(items).toHaveLength(1);
    expect(items[0].cardId).toBe(1);

    // Card A seals the chain (requiredCount = 1, good sub completes it)
    const completingIds = items[0].completingMissions.map((m) => m.id);
    expect(completingIds).toContain(101); // Good Sub
    expect(completingIds).toContain(200); // Chain Mission
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("selectMissionsForBudget — greedy mission selection", () => {
  /**
   * Helpers for building minimal leaf missions suitable for budget tests.
   * The key fields for selectMissionsForBudget are:
   *   mission.id, mission.remainingPrice, mission.rewardValue,
   *   mission.missionCards (highlighted, owned, cardId, price)
   */

  // ── 2a. Exact budget fit ──────────────────────────────────────────────────
  it("2a: mission whose cost equals the remaining budget is included", () => {
    const m = makeLeafMission(1, "Exact Fit", [makeCard(1, 500)]);
    const { selectedIds } = selectMissionsForBudget([m], "completion", 500);
    expect(selectedIds.has(1)).toBe(true);
  });

  // ── 2b. Skip expensive, keep cheaper ─────────────────────────────────────
  it("2b: expensive mission skipped but cheaper later mission still selected", () => {
    // Completion strategy: sorted cheapest first, so cheap fits after budget check
    const expensive = makeLeafMission(1, "Expensive", [makeCard(1, 800)]);
    const cheap     = makeLeafMission(2, "Cheap",     [makeCard(2, 200)]);
    // Budget 300 — expensive doesn't fit, cheap does
    const { selectedIds } = selectMissionsForBudget(
      [expensive, cheap],
      "completion",
      300,
    );
    expect(selectedIds.has(1)).toBe(false);
    expect(selectedIds.has(2)).toBe(true);
  });

  // ── 2c. Card sharing reduces effective cost ───────────────────────────────
  it("2c: shared card counted only once, allowing both missions to fit in budget", () => {
    const shared  = makeCard(99, 300);
    const cardA   = makeCard(1,  200);
    const cardB   = makeCard(2,  100);

    // Mission A: needs shared + cardA = 500 PP face value
    // Mission B: needs shared + cardB = 400 PP face value
    // Budget: 600 PP — neither fits alone at full face value, but
    // completion order picks B first (cheapest remaining price):
    //   B selected for 400 PP (shared + cardB)
    //   A's new cost = only cardA = 200 PP → fits in remaining 200 PP
    const missionA = makeLeafMission(1, "Mission A", [shared, cardA]);
    const missionB = makeLeafMission(2, "Mission B", [shared, cardB]);

    const { selectedIds, selectionOrder } = selectMissionsForBudget(
      [missionA, missionB],
      "completion",
      600,
    );

    expect(selectedIds.has(1)).toBe(true);
    expect(selectedIds.has(2)).toBe(true);
    // B selected first (cheaper overall price)
    expect(selectionOrder[0].id).toBe(2);
    expect(selectionOrder[1].id).toBe(1);
  });

  // ── 2d. Free missions always included ────────────────────────────────────
  it("2d: mission with remainingPrice = 0 is always included regardless of budget", () => {
    const free = makeLeafMission(1, "Free Mission", [makeCard(1, 0, true)]); // card owned
    free.remainingPrice = 0;
    const { selectedIds } = selectMissionsForBudget([free], "completion", 0);
    expect(selectedIds.has(1)).toBe(true);
  });

  // ── 1b. Value strategy selects highest-ratio missions first ──────────────
  it("1b: value strategy with budget selects highest rewardValue/cost ratio first", () => {
    // High ratio: 5000 reward / 100 cost = 50
    const highRatio = makeLeafMission(1, "High Ratio", [makeCard(1, 100)], {
      rewardValue: 5_000,
    });
    // Low ratio: 1000 reward / 500 cost = 2
    const lowRatio = makeLeafMission(2, "Low Ratio", [makeCard(2, 500)], {
      rewardValue: 1_000,
    });

    // Budget 200: only room for one non-shared mission
    const { selectedIds, selectionOrder } = selectMissionsForBudget(
      [highRatio, lowRatio],
      "value",
      200,
    );

    expect(selectedIds.has(1)).toBe(true);  // high ratio selected
    expect(selectedIds.has(2)).toBe(false); // low ratio skipped
    expect(selectionOrder[0].id).toBe(1);   // high ratio first in order
  });

  // ── 1c. Completion strategy selects cheapest missions first ──────────────
  it("1c: completion strategy with budget selects cheapest missions first", () => {
    const cheap     = makeLeafMission(1, "Cheap",     [makeCard(1, 100)], { rewardValue: 50 });
    const expensive = makeLeafMission(2, "Expensive", [makeCard(2, 900)], { rewardValue: 9_000 });

    // Budget 500: expensive has much better ratio but completion ignores that
    const { selectedIds, selectionOrder } = selectMissionsForBudget(
      [cheap, expensive],
      "completion",
      500,
    );

    expect(selectedIds.has(1)).toBe(true);  // cheap selected
    expect(selectedIds.has(2)).toBe(false); // expensive skipped despite better ratio
    expect(selectionOrder[0].id).toBe(1);   // cheap first
  });

  // ── Unlimited PP: all missions selected in sort order ────────────────────
  it("unlimited PP: all missions selected; selectionOrder reflects strategy sort", () => {
    const m1 = makeLeafMission(1, "M1", [makeCard(1, 900)], { rewardValue: 100 }); // ratio ~0.11
    const m2 = makeLeafMission(2, "M2", [makeCard(2, 100)], { rewardValue: 900 }); // ratio 9

    const { selectedIds, selectionOrder } = selectMissionsForBudget(
      [m1, m2],
      "value",
      null,
    );

    expect(selectedIds.has(1)).toBe(true);
    expect(selectedIds.has(2)).toBe(true);
    // Value strategy: m2 (ratio 9) before m1 (ratio ~0.11)
    expect(selectionOrder[0].id).toBe(2);
    expect(selectionOrder[1].id).toBe(1);
  });
});
