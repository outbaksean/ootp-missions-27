/**
 * Scenario 5: Negative Value Tests
 *
 * Tests Phase 3 negative value exclusion logic.
 * Includes missions with negative net value, positive net chains, and edge cases.
 */

import type { TestScenario } from "./types";

export const negativeValueScenario: TestScenario = {
  name: "Negative Value Tests",
  description:
    "Missions with various cost/reward ratios for testing negative value exclusion",

  missions: [
    // Basic negative value mission
    {
      id: 1,
      name: "Negative",
      type: "count",
      requiredCount: 1,
      reward: "1x Standard Pack",
      category: "Test",
      cards: [{ cardId: 40001 }],
      rewards: [{ type: "pack", packType: "Standard", count: 1 }],
    },

    // Basic positive value mission
    {
      id: 2,
      name: "Positive",
      type: "count",
      requiredCount: 1,
      reward: "5x Standard Pack",
      category: "Test",
      cards: [{ cardId: 40002 }],
      rewards: [{ type: "pack", packType: "Standard", count: 5 }],
    },

    // Multiple negative value missions
    {
      id: 3,
      name: "M1",
      type: "count",
      requiredCount: 1,
      reward: "1x Standard Pack",
      category: "Test",
      cards: [{ cardId: 40003 }],
      rewards: [{ type: "pack", packType: "Standard", count: 1 }],
    },
    {
      id: 4,
      name: "M2",
      type: "count",
      requiredCount: 1,
      reward: "1x Silver Pack",
      category: "Test",
      cards: [{ cardId: 40004 }],
      rewards: [{ type: "pack", packType: "Silver", count: 1 }],
    },

    // Free mission (zero cost)
    {
      id: 5,
      name: "Free",
      type: "count",
      requiredCount: 1,
      reward: "Nothing",
      category: "Test",
      cards: [{ cardId: 40005 }],
      rewards: [],
    },

    // Mission with undefined reward value (no rewards)
    {
      id: 6,
      name: "NoReward",
      type: "count",
      requiredCount: 1,
      reward: "Nothing",
      category: "Test",
      cards: [{ cardId: 40006 }],
      rewards: [],
    },

    // Limited PP test: negative
    {
      id: 7,
      name: "Negative",
      type: "count",
      requiredCount: 1,
      reward: "1x Silver Pack",
      category: "Test",
      cards: [{ cardId: 40007 }],
      rewards: [{ type: "pack", packType: "Silver", count: 1 }],
    },

    // Limited PP test: positive
    {
      id: 8,
      name: "Positive",
      type: "count",
      requiredCount: 1,
      reward: "5x Standard Pack",
      category: "Test",
      cards: [{ cardId: 40008 }],
      rewards: [{ type: "pack", packType: "Standard", count: 5 }],
    },

    // Completion strategy test: negative value
    {
      id: 9,
      name: "Negative",
      type: "count",
      requiredCount: 1,
      reward: "1x Standard Pack",
      category: "Test",
      cards: [{ cardId: 40009 }],
      rewards: [{ type: "pack", packType: "Standard", count: 1 }],
    },

    // Completion strategy test: positive value
    {
      id: 10,
      name: "Positive",
      type: "count",
      requiredCount: 1,
      reward: "5x Standard Pack",
      category: "Test",
      cards: [{ cardId: 40010 }],
      rewards: [{ type: "pack", packType: "Standard", count: 5 }],
    },

    // Positive-net chain with negative-net leaves
    {
      id: 11,
      name: "Leaf 1",
      type: "count",
      requiredCount: 1,
      reward: "1x Standard Pack",
      category: "Test",
      cards: [{ cardId: 40011 }],
      rewards: [{ type: "pack", packType: "Standard", count: 1 }],
    },
    {
      id: 12,
      name: "Leaf 2",
      type: "count",
      requiredCount: 1,
      reward: "1x Silver Pack",
      category: "Test",
      cards: [{ cardId: 40012 }],
      rewards: [{ type: "pack", packType: "Silver", count: 1 }],
    },
    {
      id: 13,
      name: "Chain Mission",
      type: "missions",
      requiredCount: 2,
      reward: "5x Rainbow Pack",
      category: "Test",
      cards: [],
      missionIds: [11, 12],
      rewards: [{ type: "pack", packType: "Rainbow", count: 5 }],
    },

    // Negative-net chain with negative-net leaves
    {
      id: 14,
      name: "Leaf 1",
      type: "count",
      requiredCount: 1,
      reward: "1x Standard Pack",
      category: "Test",
      cards: [{ cardId: 40014 }],
      rewards: [{ type: "pack", packType: "Standard", count: 1 }],
    },
    {
      id: 15,
      name: "Leaf 2",
      type: "count",
      requiredCount: 1,
      reward: "1x Silver Pack",
      category: "Test",
      cards: [{ cardId: 40015 }],
      rewards: [{ type: "pack", packType: "Silver", count: 1 }],
    },
    {
      id: 16,
      name: "Chain Mission",
      type: "missions",
      requiredCount: 2,
      reward: "Nothing",
      category: "Test",
      cards: [],
      missionIds: [14, 15],
      rewards: [], // No rewards to ensure negative net: 1000 + 750 = 1750 reward < 1900 cost
    },

    // buildNegativeValueExclusionText tests
    {
      id: 17,
      name: "Bad Mission",
      type: "count",
      requiredCount: 1,
      reward: "1x Standard Pack",
      category: "Test",
      cards: [{ cardId: 40017 }],
      rewards: [{ type: "pack", packType: "Standard", count: 1 }],
    },
    {
      id: 18,
      name: "Mission A",
      type: "count",
      requiredCount: 1,
      reward: "1x Standard Pack",
      category: "Test",
      cards: [{ cardId: 40018 }],
      rewards: [{ type: "pack", packType: "Standard", count: 1 }],
    },
    {
      id: 19,
      name: "Mission B",
      type: "count",
      requiredCount: 1,
      reward: "1x Silver Pack",
      category: "Test",
      cards: [{ cardId: 40019 }],
      rewards: [{ type: "pack", packType: "Silver", count: 1 }],
    },
  ],

  shopCards: [
    // Negative: 1000 PP cost, 750 PP reward (Standard pack)
    {
      cardId: 40001,
      cardTitle: "Negative Value Card",
      cardValue: 50,
      sellOrderLow: 0,
      lastPrice: 1000,
      owned: false,
      locked: false,
      cardType: "live",
    },

    // Positive: 100 PP cost, 3750 PP reward (5x Standard pack)
    {
      cardId: 40002,
      cardTitle: "Positive Value Card",
      cardValue: 50,
      sellOrderLow: 0,
      lastPrice: 100,
      owned: false,
      locked: false,
      cardType: "live",
    },

    // M1: 1000 PP cost, 750 PP reward
    {
      cardId: 40003,
      cardTitle: "M1 Card",
      cardValue: 50,
      sellOrderLow: 0,
      lastPrice: 1000,
      owned: false,
      locked: false,
      cardType: "live",
    },

    // M2: 900 PP cost, 250 PP reward (Silver pack)
    {
      cardId: 40004,
      cardTitle: "M2 Card",
      cardValue: 50,
      sellOrderLow: 0,
      lastPrice: 900,
      owned: false,
      locked: false,
      cardType: "live",
    },

    // Free: owned card
    {
      cardId: 40005,
      cardTitle: "Free Card",
      cardValue: 50,
      sellOrderLow: 0,
      lastPrice: 100,
      owned: true,
      locked: false,
      cardType: "live",
    },

    // NoReward: 1000 PP cost
    {
      cardId: 40006,
      cardTitle: "No Reward Card",
      cardValue: 50,
      sellOrderLow: 0,
      lastPrice: 1000,
      owned: false,
      locked: false,
      cardType: "live",
    },

    // Limited PP negative: 100 PP cost, 250 PP reward (Silver pack = 250)
    {
      cardId: 40007,
      cardTitle: "Limited PP Negative Card",
      cardValue: 50,
      sellOrderLow: 0,
      lastPrice: 100,
      owned: false,
      locked: false,
      cardType: "live",
    },

    // Limited PP positive: 200 PP cost, 3750 PP reward
    {
      cardId: 40008,
      cardTitle: "Limited PP Positive Card",
      cardValue: 50,
      sellOrderLow: 0,
      lastPrice: 200,
      owned: false,
      locked: false,
      cardType: "live",
    },

    // Completion negative: 1000 PP
    {
      cardId: 40009,
      cardTitle: "Completion Negative Card",
      cardValue: 50,
      sellOrderLow: 0,
      lastPrice: 1000,
      owned: false,
      locked: false,
      cardType: "live",
    },

    // Completion positive: 100 PP
    {
      cardId: 40010,
      cardTitle: "Completion Positive Card",
      cardValue: 50,
      sellOrderLow: 0,
      lastPrice: 100,
      owned: false,
      locked: false,
      cardType: "live",
    },

    // Positive-net chain: Leaf 1 (1000 PP, 100 PP reward = -900)
    {
      cardId: 40011,
      cardTitle: "PosChain Leaf 1 Card",
      cardValue: 50,
      sellOrderLow: 0,
      lastPrice: 1000,
      owned: false,
      locked: false,
      cardType: "live",
    },

    // Positive-net chain: Leaf 2 (900 PP, 250 PP reward = -650)
    {
      cardId: 40012,
      cardTitle: "PosChain Leaf 2 Card",
      cardValue: 50,
      sellOrderLow: 0,
      lastPrice: 900,
      owned: false,
      locked: false,
      cardType: "live",
    },
    // Chain rewards 5x Rainbow = 120,500 PP
    // Total cost: 1900, total reward: 100 + 250 + 120,500 = 120,850, net: +118,950 (positive)

    // Negative-net chain: Leaf 1 (1000 PP, 100 PP reward = -900)
    {
      cardId: 40014,
      cardTitle: "NegChain Leaf 1 Card",
      cardValue: 50,
      sellOrderLow: 0,
      lastPrice: 1000,
      owned: false,
      locked: false,
      cardType: "live",
    },

    // Negative-net chain: Leaf 2 (900 PP, 250 PP reward = -650)
    {
      cardId: 40015,
      cardTitle: "NegChain Leaf 2 Card",
      cardValue: 50,
      sellOrderLow: 0,
      lastPrice: 900,
      owned: false,
      locked: false,
      cardType: "live",
    },
    // Chain rewards: none (0 PP)
    // Total cost: 1900, total reward: 100 + 250 = 350 (from leaves only), net: -1550 (negative)

    // Text builder tests
    {
      cardId: 40017,
      cardTitle: "Bad Mission Card",
      cardValue: 50,
      sellOrderLow: 0,
      lastPrice: 1000,
      owned: false,
      locked: false,
      cardType: "live",
    },
    {
      cardId: 40018,
      cardTitle: "Mission A Card",
      cardValue: 50,
      sellOrderLow: 0,
      lastPrice: 1000,
      owned: false,
      locked: false,
      cardType: "live",
    },
    {
      cardId: 40019,
      cardTitle: "Mission B Card",
      cardValue: 50,
      sellOrderLow: 0,
      lastPrice: 900,
      owned: false,
      locked: false,
      cardType: "live",
    },
  ],

  // Mark card 40005 as owned to make mission 5 free
  ownedCardIds: [40005],
};
