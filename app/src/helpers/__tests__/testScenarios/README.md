# Test Scenarios

This directory contains test scenarios for the Shopping List feature. Scenarios use real data extracted from `missions.json` and `shop_cards.csv` to make tests more realistic and maintainable.

## Structure

```
testScenarios/
├── README.md          # This file
├── types.ts           # TestScenario interface definition
├── loader.ts          # Scenario loader that transforms scenarios into UserMissions
├── scenario1.ts       # Simple chain mission scenario
└── index.ts           # Exports all scenarios and utilities
```

## Creating a New Scenario

### 1. Extract Real Data

Find missions and cards from the actual data files:

**Missions**: `app/public/data/missions.json`

```json
{
  "id": 6,
  "name": "Live Level 1 - Chicago (A)",
  "type": "count",
  "requiredCount": 20,
  ...
}
```

**Shop Cards**: `app/public/data/shop_cards.csv`

```csv
MLB 2025 Live 1B Tim Elko CWS,73701,40,1,,0,0,0
```

### 2. Create a Scenario File

Create a new file `scenarioN.ts`:

```typescript
import type { TestScenario } from "./types";

export const myScenario: TestScenario = {
  name: "My Test Scenario",
  description: "What this scenario tests",

  missions: [
    // Copy missions from missions.json
    // You can simplify by reducing card counts for testing
    {
      id: 6,
      name: "Live Level 1 - Chicago (A)",
      type: "count",
      requiredCount: 3, // Reduced from 20 for testing
      reward: "78 C Carlton Fisk, 1x Standard Pack",
      category: "Live Series",
      cards: [{ cardId: 73701 }, { cardId: 71945 }, { cardId: 75727 }],
      rewards: [
        { type: "Card", cardId: 71418 },
        { type: "Pack", packType: "Standard", count: 1 },
      ],
    },
  ],

  shopCards: [
    // Copy card data from shop_cards.csv
    // Convert CSV format to ShopCard objects
    {
      cardId: 73701,
      cardTitle: "MLB 2025 Live 1B Tim Elko CWS",
      cardValue: 40,
      sellOrderLow: 0,
      lastPrice: 100, // You can adjust prices for testing
      owned: false,
      locked: false,
      cardType: "live",
    },
  ],

  // Optional: Mark some cards as owned for testing
  ownedCardIds: [73701],

  // Optional: Mark some cards as locked
  lockedCardIds: [71945],

  // Optional: Override prices for testing
  priceOverrides: new Map([[73701, 50]]),
};
```

### 3. Export the Scenario

Add your scenario to `index.ts`:

```typescript
export * from "./scenarioN";
```

### 4. Use in Tests

```typescript
import { loadScenario, myScenario } from "./testScenarios";

describe("My test suite", () => {
  const { userMissions, shopCardsById, packPrices } = loadScenario(myScenario);

  it("tests something", () => {
    const mission = userMissions.find((m) => m.id === 6)!;
    expect(mission.remainingPrice).toBe(expected);
  });
});
```

## Loader Options

The `loadScenario` function accepts options:

```typescript
const scenario = loadScenario(myScenario, {
  useSellPrice: true, // Use sellOrderLow instead of lastPrice
  optimizeCardSelection: false, // Disable optimization
  discount: 0.1, // Apply 10% discount to all cards
});
```

## Benefits

- **Realistic Data**: Tests use actual mission and card data from the game
- **Maintainable**: When real data changes, update the scenario file once
- **Reusable**: Share scenarios across multiple test suites
- **Focused**: Include only the missions/cards needed for your test
- **Flexible**: Mark cards as owned/locked, override prices for edge cases

## Guidelines

- **Keep scenarios focused**: Only include missions and cards relevant to what you're testing
- **Document scenarios**: Use descriptive names and clear descriptions
- **Simplify when possible**: Reduce card counts in missions to make tests faster
- **Test edge cases**: Create scenarios for error conditions, zero prices, missing data, etc.
- **Group related tests**: One scenario can be used by multiple related test cases
