/**
 * Standalone vs Chain Ordering Scenario
 *
 * Tests value-strategy ordering when:
 * - One standalone mission has higher net value than a positive chain
 * - Two chain leaf missions are individually net-negative
 * - Chain mission is net-positive
 * - Another standalone mission has lower net value than the chain
 *
 * Expected mission order by priority:
 * 1) Higher-net standalone
 * 2) Chain group (leaf missions via propagated chain priority)
 * 3) Lower-net standalone
 */

import type { TestScenario } from "./types";

export const standaloneVsChainOrderingScenario: TestScenario = {
  name: "Standalone vs Chain Ordering",
  description:
    "Higher standalone net should rank above positive chain; lower standalone net should rank below it",

  missions: [
    // Standalone mission with HIGH net value
    // Net: 30,000 (HistPerfect) - 1,000 = +29,000
    {
      id: 1001,
      name: "Standalone High Net",
      type: "count",
      requiredCount: 1,
      reward: "1x Historical Perfect Pack",
      category: "Test",
      cards: [{ cardId: 51001 }],
      rewards: [{ type: "pack", packType: "HistPerfect", count: 1 }],
    },

    // Standalone mission with LOW net value
    // Net: 1,100 (Gold) - 900 = +200
    {
      id: 1002,
      name: "Standalone Low Net",
      type: "count",
      requiredCount: 1,
      reward: "1x Gold Pack",
      category: "Test",
      cards: [{ cardId: 51002 }],
      rewards: [{ type: "pack", packType: "Gold", count: 1 }],
    },

    // Chain leaf 1 (net-negative)
    // Net: 250 (Silver) - 600 = -350
    {
      id: 1003,
      name: "Chain Leaf A",
      type: "count",
      requiredCount: 1,
      reward: "1x Silver Pack",
      category: "Test",
      cards: [{ cardId: 51003 }],
      rewards: [{ type: "pack", packType: "Silver", count: 1 }],
    },

    // Chain leaf 2 (net-negative)
    // Net: 250 (Silver) - 700 = -450
    {
      id: 1004,
      name: "Chain Leaf B",
      type: "count",
      requiredCount: 1,
      reward: "1x Silver Pack",
      category: "Test",
      cards: [{ cardId: 51004 }],
      rewards: [{ type: "pack", packType: "Silver", count: 1 }],
    },

    // Positive chain mission requiring both leaves
    // Combined net: (250 + 250 + 2*1100) - (600 + 700) = 2700 - 1300 = +1400
    {
      id: 1005,
      name: "Positive Chain",
      type: "missions",
      requiredCount: 2,
      reward: "2x Gold Pack",
      category: "Test",
      cards: [],
      missionIds: [1003, 1004],
      rewards: [{ type: "pack", packType: "Gold", count: 2 }],
    },
  ],

  shopCards: [
    {
      cardId: 51001,
      cardTitle: "Standalone High Card",
      cardValue: 80,
      sellOrderLow: 0,
      lastPrice: 1000,
      owned: false,
      locked: false,
      cardType: "historical",
    },
    {
      cardId: 51002,
      cardTitle: "Standalone Low Card",
      cardValue: 50,
      sellOrderLow: 0,
      lastPrice: 900,
      owned: false,
      locked: false,
      cardType: "historical",
    },
    {
      cardId: 51003,
      cardTitle: "Chain Leaf Card A",
      cardValue: 45,
      sellOrderLow: 0,
      lastPrice: 600,
      owned: false,
      locked: false,
      cardType: "historical",
    },
    {
      cardId: 51004,
      cardTitle: "Chain Leaf Card B",
      cardValue: 45,
      sellOrderLow: 0,
      lastPrice: 700,
      owned: false,
      locked: false,
      cardType: "historical",
    },
  ],
};
