/**
 * Scenario 6: Negative Leaves + Positive Chain with Owned Cards
 *
 * Tests that leaf mission cards are included in shopping list when:
 * - Each leaf mission has negative net value (cost > reward)
 * - The chain mission has positive net value (chain rewards compensate)
 * - Some cards are already owned (unlockedCardsPrice is factored into the decision)
 *
 * This verifies Phase 3 behavior where leaf missions should be included
 * in the shopping list if the parent chain has positive net value, even when
 * accounting for the cost of unlocking owned cards.
 *
 * Net calculations include unlockedCardsPrice:
 * - Leaf 1: reward (250) - remainingPrice (600) - unlockedCardsPrice (200, card 71945) = -550 (NEGATIVE)
 * - Leaf 2: reward (250) - remainingPrice (680) - unlockedCardsPrice (220, card 75718) = -650 (NEGATIVE)
 * - Chain: combinedReward (120,850) - remainingPrice (1280) - unlockedCardsPrice (420) = +119,150 (POSITIVE)
 * - Combined: All leaves still included because chain net is positive
 */

import type { TestScenario } from "./types";

export const negativeLeavesPosChainScenario: TestScenario = {
  name: "Negative Leaves, Positive Chain",
  description:
    "Leaf missions with negative net, but chain parent with positive net (with owned cards)",

  missions: [
    // Leaf Mission 1: Requires 4 cards
    // Purchased: cards 73701 (100) + 75727 (150) + 73702 (300) = 550 PP
    // Owned (unlocked): card 71945 (200 PP cost to lock)
    // Total remainingPrice (to buy): 550 PP
    // UnlockedCardsPrice (to lock): 200 PP
    // Reward: 1x Silver Pack = 250 PP
    // Net: 250 - 550 - 200 = -500 PP (NEGATIVE)
    {
      id: 6,
      name: "Live Level 1 - Chicago (A)",
      type: "count",
      requiredCount: 4,
      reward: "1x Silver Pack",
      category: "Live Series",
      cards: [
        { cardId: 73701 },
        { cardId: 71945 }, // This one is owned
        { cardId: 75727 },
        { cardId: 73702 },
      ],
      rewards: [{ type: "pack", packType: "Silver", count: 1 }],
    },

    // Leaf Mission 2: Requires 4 cards
    // Purchased: cards 73379 (180) + 73153 (190) + 73380 (280) = 650 PP
    // Owned (unlocked): card 75718 (220 PP cost to lock)
    // Total remainingPrice (to buy): 650 PP
    // UnlockedCardsPrice (to lock): 220 PP
    // Reward: 1x Silver Pack = 250 PP
    // Net: 250 - 650 - 220 = -620 PP (NEGATIVE)
    {
      id: 9,
      name: "Live Level 1 - Cleveland",
      type: "count",
      requiredCount: 4,
      reward: "1x Silver Pack",
      category: "Live Series",
      cards: [
        { cardId: 73379 },
        { cardId: 75718 }, // This one is owned
        { cardId: 73153 },
        { cardId: 73380 },
      ],
      rewards: [{ type: "pack", packType: "Silver", count: 1 }],
    },

    // Chain Mission: Requires both leaf missions
    // Cost: remainingPrice (550 + 650 = 1200) + unlockedCardsPrice (200 + 220 = 420) = 1620 PP total
    // Reward: 5x Rainbow Packs = 5 × 24100 = 120,500 PP (chain only)
    // Combined reward: 250 + 250 + 120,500 = 120,850 PP
    // Net: 120,850 - 1200 - 420 = +119,230 PP (POSITIVE)
    {
      id: 61,
      name: "Live Level 1 - AL Central",
      type: "missions",
      requiredCount: 2,
      reward: "5x Rainbow Pack",
      category: "Live Series",
      cards: [],
      missionIds: [6, 9],
      rewards: [{ type: "pack", packType: "Rainbow", count: 5 }],
    },
  ],

  shopCards: [
    // Cards for Mission 6 (Chicago)
    {
      cardId: 73701,
      cardTitle: "MLB 2025 Live 1B Tim Elko CWS",
      cardValue: 40,
      sellOrderLow: 0,
      lastPrice: 100,
      owned: false,
      locked: false,
      cardType: "live",
    },
    {
      cardId: 71945,
      cardTitle: "MLB 2025 Live RF Dominic Fletcher CWS",
      cardValue: 40,
      sellOrderLow: 0,
      lastPrice: 200,
      owned: true, // OWNED — must be locked to complete mission
      locked: false,
      cardType: "live",
    },
    {
      cardId: 75727,
      cardTitle: "MLB 2025 Live SP Ky Bush CWS",
      cardValue: 40,
      sellOrderLow: 0,
      lastPrice: 150,
      owned: false,
      locked: false,
      cardType: "live",
    },
    // 4th card for Mission 6
    {
      cardId: 73702,
      cardTitle: "MLB 2025 Live 2B Ozzie Albies ATL",
      cardValue: 50,
      sellOrderLow: 0,
      lastPrice: 300,
      owned: false,
      locked: false,
      cardType: "live",
    },

    // Cards for Mission 9 (Cleveland)
    {
      cardId: 73379,
      cardTitle: "MLB 2025 Live C Bo Naylor CLE",
      cardValue: 41,
      sellOrderLow: 0,
      lastPrice: 180,
      owned: false,
      locked: false,
      cardType: "live",
    },
    {
      cardId: 75718,
      cardTitle: "MLB 2025 Live 1B Josh Naylor CLE",
      cardValue: 54,
      sellOrderLow: 0,
      lastPrice: 220,
      owned: true, // OWNED — must be locked to complete mission
      locked: false,
      cardType: "live",
    },
    {
      cardId: 73153,
      cardTitle: "MLB 2025 Live CF Lane Thomas CLE",
      cardValue: 59,
      sellOrderLow: 0,
      lastPrice: 190,
      owned: false,
      locked: false,
      cardType: "live",
    },
    // 4th card for Mission 9
    {
      cardId: 73380,
      cardTitle: "MLB 2025 Live DH Corey Seager TEX",
      cardValue: 48,
      sellOrderLow: 0,
      lastPrice: 280,
      owned: false,
      locked: false,
      cardType: "live",
    },
  ],

  // Mark the owned cards so they calculate unlockedCardsPrice
  ownedCardIds: [71945, 75718],
};
