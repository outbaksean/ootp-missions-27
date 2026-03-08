/**
 * Scenario 3: Exclusion Tests
 *
 * Tests missions with zero-price / non-completable cards.
 * Includes missions with unpurchasable cards and chain missions with partial completability.
 */

import type { TestScenario } from "./types";

export const exclusionScenario: TestScenario = {
  name: "Exclusion Scenarios",
  description: "Missions with zero-price cards and non-completable missions",

  missions: [
    // Single mission with zero-price card (non-completable)
    {
      id: 1,
      name: "Blocked Mission",
      type: "count",
      requiredCount: 1,
      reward: "1x Gold Pack",
      category: "Test",
      cards: [{ cardId: 20001 }],
      rewards: [{ type: "pack", packType: "Gold", count: 1 }],
    },

    // Multiple missions with zero-price cards
    {
      id: 2,
      name: "Mission Alpha",
      type: "count",
      requiredCount: 1,
      reward: "1x Standard Pack",
      category: "Test",
      cards: [{ cardId: 20002 }],
      rewards: [{ type: "pack", packType: "Standard", count: 1 }],
    },
    {
      id: 3,
      name: "Mission Beta",
      type: "count",
      requiredCount: 1,
      reward: "1x Silver Pack",
      category: "Test",
      cards: [{ cardId: 20003 }],
      rewards: [{ type: "pack", packType: "Silver", count: 1 }],
    },

    // Mission with mix: one purchasable, one zero-price (non-completable)
    {
      id: 10,
      name: "Blocked Mission",
      type: "count",
      requiredCount: 2,
      reward: "1x Gold Pack",
      category: "Test",
      cards: [{ cardId: 20010 }, { cardId: 20011 }],
      rewards: [{ type: "pack", packType: "Gold", count: 1 }],
    },

    // Completable mission for comparison
    {
      id: 11,
      name: "Good Mission",
      type: "count",
      requiredCount: 1,
      reward: "1x Gold Pack",
      category: "Test",
      cards: [{ cardId: 20012 }],
      rewards: [{ type: "pack", packType: "Gold", count: 1 }],
    },

    // Chain mission with one blocked sub, one good sub (requiredCount = 1)
    {
      id: 101,
      name: "Good Sub",
      type: "count",
      requiredCount: 1,
      reward: "1x Gold Pack",
      category: "Test",
      cards: [{ cardId: 20101 }],
      rewards: [{ type: "pack", packType: "Gold", count: 1 }],
    },
    {
      id: 102,
      name: "Blocked Sub",
      type: "count",
      requiredCount: 1,
      reward: "1x Silver Pack",
      category: "Test",
      cards: [{ cardId: 20102 }],
      rewards: [{ type: "pack", packType: "Silver", count: 1 }],
    },
    {
      id: 200,
      name: "Chain Mission",
      type: "missions",
      requiredCount: 1,
      reward: "1x Silver Pack",
      category: "Test",
      cards: [],
      missionIds: [101, 102],
      rewards: [{ type: "pack", packType: "Silver", count: 1 }],
    },
  ],

  shopCards: [
    // Zero-price cards (unpurchasable)
    {
      cardId: 20001,
      cardTitle: "Zero Price Card 1",
      cardValue: 50,
      sellOrderLow: 0,
      lastPrice: 0,
      owned: false,
      locked: false,
      cardType: "live",
    },
    {
      cardId: 20002,
      cardTitle: "Zero Price Card 2",
      cardValue: 50,
      sellOrderLow: 0,
      lastPrice: 0,
      owned: false,
      locked: false,
      cardType: "live",
    },
    {
      cardId: 20003,
      cardTitle: "Zero Price Card 3",
      cardValue: 50,
      sellOrderLow: 0,
      lastPrice: 0,
      owned: false,
      locked: false,
      cardType: "live",
    },

    // Mixed: one purchasable, one zero-price
    {
      cardId: 20010,
      cardTitle: "Purchasable Card A",
      cardValue: 50,
      sellOrderLow: 0,
      lastPrice: 500,
      owned: false,
      locked: false,
      cardType: "live",
    },
    {
      cardId: 20011,
      cardTitle: "Zero Price Card B",
      cardValue: 50,
      sellOrderLow: 0,
      lastPrice: 0,
      owned: false,
      locked: false,
      cardType: "live",
    },

    // Completable mission card
    {
      cardId: 20012,
      cardTitle: "Good Card C",
      cardValue: 50,
      sellOrderLow: 0,
      lastPrice: 100,
      owned: false,
      locked: false,
      cardType: "live",
    },

    // Chain scenario cards
    {
      cardId: 20101,
      cardTitle: "Chain Good Card",
      cardValue: 50,
      sellOrderLow: 0,
      lastPrice: 100,
      owned: false,
      locked: false,
      cardType: "live",
    },
    {
      cardId: 20102,
      cardTitle: "Chain Blocked Card",
      cardValue: 50,
      sellOrderLow: 0,
      lastPrice: 0,
      owned: false,
      locked: false,
      cardType: "live",
    },
  ],
};
