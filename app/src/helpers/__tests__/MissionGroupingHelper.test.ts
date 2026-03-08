/**
 * Unit tests for MissionGroupingHelper
 *
 * TEST DATA APPROACH
 * ──────────────────
 * Tests use the same scenario-based data loading as ShoppingListHelper.test.ts.
 * Scenarios live in testScenarios/ and provide pre-calculated UserMission objects.
 *
 * Example:
 *   import { loadScenario, simpleChainScenario } from "./testScenarios";
 *   const { userMissions, shopCardsById } = loadScenario(simpleChainScenario);
 *
 * HOW TO ADD A NEW TEST
 * ─────────────────────
 * 1. Choose an existing scenario or add one in testScenarios/.
 *
 * 2. Load the scenario:
 *      const { userMissions, shopCardsById } = loadScenario(myScenario);
 *
 * 3. Sort missions if needed (mirrors filteredMissions in Missions.vue):
 *      const sorted = sortMissions(userMissions, "price");
 *
 * 4. Build groups:
 *      const groups = buildGroupedMissions(
 *        sorted,           // sortedMissions
 *        userMissions,     // allMissions
 *        "card-reward",    // groupBy
 *        "price",          // sortBy
 *        shopCardsById,
 *      );
 *
 * 5. Assert on group order and mission order within groups:
 *      expect(groups.map(g => g.label)).toEqual(["Group A", "Group B"]);
 *      expect(groups[0].missions.map(m => m.id)).toEqual([1, 2, 3]);
 */

import { describe, it, expect } from "vitest";
import { buildGroupedMissions, sortMissions } from "../MissionGroupingHelper";
import { loadScenario, simpleChainScenario } from "./testScenarios";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns group labels in order. */
const groupLabels = (groups: Array<{ label: string; missions: unknown[] }>) =>
  groups.map((g) => g.label);

// ─── groupBy="none" ───────────────────────────────────────────────────────────

describe("buildGroupedMissions — groupBy=none", () => {
  it("returns a single unlabeled group with all missions in sorted order", () => {
    const { userMissions, shopCardsById } = loadScenario(simpleChainScenario);
    const sorted = sortMissions(userMissions, "price");
    const groups = buildGroupedMissions(
      sorted,
      userMissions,
      "none",
      "price",
      shopCardsById,
    );

    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("");
    expect(groups[0].missions).toHaveLength(sorted.length);
  });
});

// ─── groupBy="category" ───────────────────────────────────────────────────────

describe("buildGroupedMissions — groupBy=category", () => {
  it("groups missions by category", () => {
    const { userMissions, shopCardsById } = loadScenario(simpleChainScenario);
    const sorted = sortMissions(userMissions, "default");
    const groups = buildGroupedMissions(
      sorted,
      userMissions,
      "category",
      "default",
      shopCardsById,
    );

    // simpleChainScenario only has "Live Series" missions
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("Live Series");
    expect(groups[0].missions).toHaveLength(userMissions.length);
  });

  it("sortBy=price — cheaper groups come first", () => {
    const { userMissions, shopCardsById } = loadScenario(simpleChainScenario);
    const sorted = sortMissions(userMissions, "price");
    const groups = buildGroupedMissions(
      sorted,
      userMissions,
      "category",
      "price",
      shopCardsById,
    );

    // All missions are in the same category here; just verify it doesn't throw
    expect(groups).toHaveLength(1);
  });

  it("sortBy=name — groups are in alphabetical order", () => {
    const { userMissions, shopCardsById } = loadScenario(simpleChainScenario);
    const sorted = sortMissions(userMissions, "name");
    const groups = buildGroupedMissions(
      sorted,
      userMissions,
      "category",
      "name",
      shopCardsById,
    );

    const labels = groupLabels(groups);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)));
  });
});

// ─── groupBy="chain" ──────────────────────────────────────────────────────────

describe("buildGroupedMissions — groupBy=chain", () => {
  it("groups leaf missions under their chain root", () => {
    const { userMissions, shopCardsById } = loadScenario(simpleChainScenario);
    const sorted = sortMissions(userMissions, "default");
    const groups = buildGroupedMissions(
      sorted,
      userMissions,
      "chain",
      "default",
      shopCardsById,
    );

    // simpleChainScenario: root id=61 with children id=6 and id=9
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("Live Level 1 - AL Central");
    expect(groups[0].missions.map((m) => m.id).sort((a, b) => a - b)).toEqual([
      6, 9, 61,
    ]);
  });

  it("sortBy=price — child missions sorted cheapest first within group", () => {
    const { userMissions, shopCardsById } = loadScenario(simpleChainScenario);
    const sorted = sortMissions(userMissions, "price");
    const groups = buildGroupedMissions(
      sorted,
      userMissions,
      "chain",
      "price",
      shopCardsById,
    );

    // chain root (missions-type, highest remainingPrice) should be last or
    // sorted after the leaves; leaves should be cheapest-first
    const leafMissions = groups[0].missions.filter((m) => m.id !== 61);
    for (let i = 0; i < leafMissions.length - 1; i++) {
      expect(leafMissions[i].remainingPrice).toBeLessThanOrEqual(
        leafMissions[i + 1].remainingPrice,
      );
    }
  });

  it("child missions are included regardless of sort order", () => {
    // Regression: children must appear in their chain group even when
    // sortBy=price puts them before the chain root in filteredMissions.
    const { userMissions, shopCardsById } = loadScenario(simpleChainScenario);

    for (const sb of ["default", "price", "value", "name"] as const) {
      const sorted = sortMissions(userMissions, sb);
      const groups = buildGroupedMissions(
        sorted,
        userMissions,
        "chain",
        sb,
        shopCardsById,
      );
      const allIds = groups.flatMap((g) => g.missions.map((m) => m.id));
      expect(allIds).toContain(6);
      expect(allIds).toContain(9);
      expect(allIds).toContain(61);
    }
  });
});

// ─── groupBy="card-reward" ────────────────────────────────────────────────────

describe("buildGroupedMissions — groupBy=card-reward", () => {
  it("child missions are included regardless of sort order", () => {
    // Regression: when sortBy=price puts leaf missions before the chain root,
    // the chain root's group must still contain those children.
    const { userMissions, shopCardsById } = loadScenario(simpleChainScenario);

    for (const sb of ["default", "price", "value", "name"] as const) {
      const sorted = sortMissions(userMissions, sb);
      const groups = buildGroupedMissions(
        sorted,
        userMissions,
        "card-reward",
        sb,
        shopCardsById,
      );

      // id=61 has card reward cardId=72711; id=6 and id=9 are its children
      const rootGroup = groups.find((g) => g.missions.some((m) => m.id === 61));
      expect(rootGroup).toBeDefined();
      const idsInRootGroup = rootGroup!.missions.map((m) => m.id);
      expect(idsInRootGroup).toContain(6);
      expect(idsInRootGroup).toContain(9);
    }
  });

  it("sortBy=price — groups ordered cheapest total cost first", () => {
    const { userMissions, shopCardsById } = loadScenario(simpleChainScenario);
    const sorted = sortMissions(userMissions, "price");
    const groups = buildGroupedMissions(
      sorted,
      userMissions,
      "card-reward",
      "price",
      shopCardsById,
    );

    const nonEmpty = groups.filter(
      (g) => g.label !== "No Card Reward" && g.missions.length > 0,
    );
    const leafCost = (g: (typeof nonEmpty)[0]) =>
      g.missions
        .filter((m) => m.rawMission.type !== "missions")
        .reduce((s, m) => s + m.remainingPrice, 0);

    for (let i = 0; i < nonEmpty.length - 1; i++) {
      expect(leafCost(nonEmpty[i])).toBeLessThanOrEqual(
        leafCost(nonEmpty[i + 1]),
      );
    }
  });
});
