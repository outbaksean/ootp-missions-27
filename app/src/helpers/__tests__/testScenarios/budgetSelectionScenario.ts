/**
 * Scenario 4: Budget Selection Tests
 *
 * Tests greedy mission selection with various budget constraints.
 * Includes missions with different costs, shared cards, and value ratios.
 */

import type { TestScenario } from "./types";

export const budgetSelectionScenario: TestScenario = {
  name: "Budget Selection",
  description:
    "Various missions for testing budget-constrained greedy selection",

  missions: [
    // Exact budget fit
    {
      id: 1,
      name: "Exact Fit",
      type: "count",
      requiredCount: 1,
      reward: "1x Gold Pack",
      category: "Test",
      cards: [{ cardId: 30001 }],
      rewards: [{ type: "pack", packType: "Gold", count: 1 }],
    },

    // Expensive mission
    {
      id: 2,
      name: "Expensive",
      type: "count",
      requiredCount: 1,
      reward: "1x Gold Pack",
      category: "Test",
      cards: [{ cardId: 30002 }],
      rewards: [{ type: "pack", packType: "Gold", count: 1 }],
    },

    // Cheap mission
    {
      id: 3,
      name: "Cheap",
      type: "count",
      requiredCount: 1,
      reward: "1x Standard Pack",
      category: "Test",
      cards: [{ cardId: 30003 }],
      rewards: [{ type: "pack", packType: "Standard", count: 1 }],
    },

    // Missions with shared cards
    {
      id: 4,
      name: "Mission A",
      type: "count",
      requiredCount: 2,
      reward: "1x Gold Pack",
      category: "Test",
      cards: [{ cardId: 30099 }, { cardId: 30004 }],
      rewards: [{ type: "pack", packType: "Gold", count: 1 }],
    },
    {
      id: 5,
      name: "Mission B",
      type: "count",
      requiredCount: 2,
      reward: "1x Gold Pack",
      category: "Test",
      cards: [{ cardId: 30099 }, { cardId: 30005 }],
      rewards: [{ type: "pack", packType: "Gold", count: 1 }],
    },

    // Free mission (all cards owned)
    {
      id: 6,
      name: "Free Mission",
      type: "count",
      requiredCount: 1,
      reward: "1x Standard Pack",
      category: "Test",
      cards: [{ cardId: 30006 }],
      rewards: [{ type: "pack", packType: "Standard", count: 1 }],
    },

    // High ratio (value strategy)
    {
      id: 7,
      name: "High Ratio",
      type: "count",
      requiredCount: 1,
      reward: "1x Historical Perfect Pack",
      category: "Test",
      cards: [{ cardId: 30007 }],
      rewards: [{ type: "pack", packType: "HistPerfect", count: 1 }],
    },

    // Low ratio (value strategy)
    {
      id: 8,
      name: "Low Ratio",
      type: "count",
      requiredCount: 1,
      reward: "1x Standard Pack",
      category: "Test",
      cards: [{ cardId: 30008 }],
      rewards: [{ type: "pack", packType: "Standard", count: 1 }],
    },

    // Completion vs Value strategy comparison
    {
      id: 9,
      name: "Cheap",
      type: "count",
      requiredCount: 1,
      reward: "1x Standard Pack",
      category: "Test",
      cards: [{ cardId: 30009 }],
      rewards: [{ type: "pack", packType: "Standard", count: 1 }],
    },
    {
      id: 10,
      name: "Expensive",
      type: "count",
      requiredCount: 1,
      reward: "5x Historical Perfect Pack",
      category: "Test",
      cards: [{ cardId: 30010 }],
      rewards: [{ type: "pack", packType: "HistPerfect", count: 5 }],
    },

    // Unlimited PP sorting test
    {
      id: 11,
      name: "M1",
      type: "count",
      requiredCount: 1,
      reward: "1x Gold Pack",
      category: "Test",
      cards: [{ cardId: 30011 }],
      rewards: [{ type: "pack", packType: "Gold", count: 1 }],
    },
    {
      id: 12,
      name: "M2",
      type: "count",
      requiredCount: 1,
      reward: "5x Standard Pack",
      category: "Test",
      cards: [{ cardId: 30012 }],
      rewards: [{ type: "pack", packType: "Standard", count: 5 }],
    },
  ],

  shopCards: [
    // Exact fit: 500 PP
    {
      cardId: 30001,
      cardTitle: "Exact Fit Card",
      cardValue: 50,
      sellOrderLow: 0,
      lastPrice: 500,
      owned: false,
      locked: false,
      cardType: "live",
    },

    // Expensive: 800 PP
    {
      cardId: 30002,
      cardTitle: "Expensive Card",
      cardValue: 50,
      sellOrderLow: 0,
      lastPrice: 800,
      owned: false,
      locked: false,
      cardType: "live",
    },

    // Cheap: 200 PP
    {
      cardId: 30003,
      cardTitle: "Cheap Card",
      cardValue: 50,
      sellOrderLow: 0,
      lastPrice: 200,
      owned: false,
      locked: false,
      cardType: "live",
    },

    // Shared card: 300 PP
    {
      cardId: 30099,
      cardTitle: "Shared Card",
      cardValue: 50,
      sellOrderLow: 0,
      lastPrice: 300,
      owned: false,
      locked: false,
      cardType: "live",
    },

    // Mission A unique card: 200 PP
    {
      cardId: 30004,
      cardTitle: "Mission A Card",
      cardValue: 50,
      sellOrderLow: 0,
      lastPrice: 200,
      owned: false,
      locked: false,
      cardType: "live",
    },

    // Mission B unique card: 100 PP
    {
      cardId: 30005,
      cardTitle: "Mission B Card",
      cardValue: 50,
      sellOrderLow: 0,
      lastPrice: 100,
      owned: false,
      locked: false,
      cardType: "live",
    },

    // Free mission card (owned)
    {
      cardId: 30006,
      cardTitle: "Owned Card",
      cardValue: 50,
      sellOrderLow: 0,
      lastPrice: 100,
      owned: true,
      locked: false,
      cardType: "live",
    },

    // High ratio: 100 PP card
    {
      cardId: 30007,
      cardTitle: "High Ratio Card",
      cardValue: 50,
      sellOrderLow: 0,
      lastPrice: 100,
      owned: false,
      locked: false,
      cardType: "live",
    },

    // Low ratio: 500 PP card
    {
      cardId: 30008,
      cardTitle: "Low Ratio Card",
      cardValue: 50,
      sellOrderLow: 0,
      lastPrice: 500,
      owned: false,
      locked: false,
      cardType: "live",
    },

    // Completion vs Value: cheap 100 PP
    {
      cardId: 30009,
      cardTitle: "Cheap Strategy Card",
      cardValue: 50,
      sellOrderLow: 0,
      lastPrice: 100,
      owned: false,
      locked: false,
      cardType: "live",
    },

    // Completion vs Value: expensive 900 PP
    {
      cardId: 30010,
      cardTitle: "Expensive Strategy Card",
      cardValue: 50,
      sellOrderLow: 0,
      lastPrice: 900,
      owned: false,
      locked: false,
      cardType: "live",
    },

    // Unlimited PP test: 900 PP
    {
      cardId: 30011,
      cardTitle: "M1 Card",
      cardValue: 50,
      sellOrderLow: 0,
      lastPrice: 900,
      owned: false,
      locked: false,
      cardType: "live",
    },

    // Unlimited PP test: 100 PP
    {
      cardId: 30012,
      cardTitle: "M2 Card",
      cardValue: 50,
      sellOrderLow: 0,
      lastPrice: 100,
      owned: false,
      locked: false,
      cardType: "live",
    },
  ],

  // Mark card 30006 as owned to make mission 6 free
  ownedCardIds: [30006],
};
