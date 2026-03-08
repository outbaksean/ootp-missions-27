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
import { buildShoppingItems, buildSummaryText } from "../ShoppingListHelper";
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
    isCompletable: false,
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
