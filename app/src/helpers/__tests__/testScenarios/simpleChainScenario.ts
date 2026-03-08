/**
 * Simple Chain Scenario
 *
 * Tests basic chain mission functionality with 2 leaf missions and 1 chain parent.
 * Based on real data from missions.json and shop_cards.csv.
 */

import type { TestScenario } from "./types";

export const simpleChainScenario: TestScenario = {
  name: "Simple Chain",
  description:
    "Two incomplete leaf missions with one chain parent requiring both",

  missions: [
    // Leaf Mission 1: Live Level 1 - Chicago (A) - Simplified to 3 cards
    {
      id: 6,
      name: "Live Level 1 - Chicago (A)",
      type: "count",
      requiredCount: 3,
      reward: "78 C Carlton Fisk, 1x Standard Pack",
      category: "Live Series",
      cards: [{ cardId: 73701 }, { cardId: 71945 }, { cardId: 75727 }],
      rewards: [
        { type: "card", cardId: 71418 },
        { type: "pack", packType: "Standard", count: 1 },
      ],
    },

    // Leaf Mission 2: Live Level 1 - Cleveland - Simplified to 3 cards
    {
      id: 9,
      name: "Live Level 1 - Cleveland",
      type: "count",
      requiredCount: 3,
      reward: "76 SP Bartolo Colon, 1x Standard Pack",
      category: "Live Series",
      cards: [{ cardId: 73379 }, { cardId: 75718 }, { cardId: 73153 }],
      rewards: [
        { type: "card", cardId: 71345 },
        { type: "pack", packType: "Standard", count: 1 },
      ],
    },

    // Chain Mission: Requires both leaf missions
    {
      id: 61,
      name: "Live Level 1 - AL Central",
      type: "missions",
      requiredCount: 2,
      reward:
        "AL Central 1 - All-Time Legend CF Torii Hunter MIN Peak, 1x Gold Pack",
      category: "Live Series",
      cards: [],
      missionIds: [6, 9],
      rewards: [
        { type: "card", cardId: 72711 },
        { type: "pack", packType: "Gold", count: 1 },
      ],
    },
  ],

  shopCards: [
    // Cards for Mission 6 (Chicago White Sox)
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
      owned: false,
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
      owned: false,
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

    // Reward cards (needed for reward value calculation)
    {
      cardId: 71418,
      cardTitle: "All-Time Legend 2B Rollie Zeider CWS Peak",
      cardValue: 56,
      sellOrderLow: 0,
      lastPrice: 5000,
      owned: false,
      locked: false,
      cardType: "historical",
    },
    {
      cardId: 71345,
      cardTitle: "All-Time Legend SP Matt Young SEA Peak",
      cardValue: 69,
      sellOrderLow: 0,
      lastPrice: 4800,
      owned: false,
      locked: false,
      cardType: "historical",
    },
    {
      cardId: 72711,
      cardTitle: "All-Time Legend CF Torii Hunter MIN Peak",
      cardValue: 92,
      sellOrderLow: 0,
      lastPrice: 15000,
      owned: false,
      locked: false,
      cardType: "historical",
    },
  ],
};
