/**
 * Test scenario structure for shopping list unit tests.
 *
 * Scenarios contain subsets of real data from missions.json and shop_cards.csv
 * to make tests more realistic and maintainable.
 */

import type { Mission } from "@/models/Mission";
import type { ShopCard } from "@/models/ShopCard";

export interface TestScenario {
  /** Scenario name for documentation */
  name: string;
  /** Description of what this scenario tests */
  description: string;
  /** Missions to include (from real missions.json data) */
  missions: Mission[];
  /** Shop cards used by the missions (from real shop_cards.csv data) */
  shopCards: ShopCard[];
  /** Optional: Cards that should be marked as owned in the test */
  ownedCardIds?: number[];
  /** Optional: Cards that should be marked as locked in the test */
  lockedCardIds?: number[];
  /** Optional: Price overrides for specific cards */
  priceOverrides?: Map<number, number>;
}
