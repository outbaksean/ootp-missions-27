/**
 * Scenario 2: Chain Mission with Pack Rewards
 *
 * Tests chain mission completion with specific pack rewards.
 * Two sub-missions with different pack rewards, and a chain mission requiring both.
 */

import type { TestScenario } from "./types";

export const chainWithPackRewardsScenario: TestScenario = {
  name: "Chain with Pack Rewards",
  description:
    "Chain mission with two sub-missions having different pack rewards",

  missions: [
    // Sub Mission 1: High-value pack (Historical Perfect)
    {
      id: 101,
      name: "Sub Mission 1",
      type: "count",
      requiredCount: 1,
      reward: "1x Historical Perfect Pack",
      category: "Test",
      cards: [{ cardId: 10001 }],
      rewards: [{ type: "pack", packType: "HistPerfect", count: 1 }],
    },

    // Sub Mission 2: Medium-value pack (Rainbow)
    {
      id: 102,
      name: "Sub Mission 2",
      type: "count",
      requiredCount: 1,
      reward: "1x Rainbow Pack",
      category: "Test",
      cards: [{ cardId: 10002 }],
      rewards: [{ type: "pack", packType: "Rainbow", count: 1 }],
    },

    // Chain Mission: Two Gold Packs
    {
      id: 200,
      name: "Chain Mission",
      type: "missions",
      requiredCount: 2,
      reward: "2x Gold Pack",
      category: "Test",
      cards: [],
      missionIds: [101, 102],
      rewards: [{ type: "pack", packType: "Gold", count: 2 }],
    },
  ],

  shopCards: [
    {
      cardId: 10001,
      cardTitle: "Card A",
      cardValue: 50,
      sellOrderLow: 0,
      lastPrice: 100,
      owned: false,
      locked: false,
      cardType: "live",
    },
    {
      cardId: 10002,
      cardTitle: "Card B",
      cardValue: 50,
      sellOrderLow: 0,
      lastPrice: 200,
      owned: false,
      locked: false,
      cardType: "live",
    },
  ],
};
