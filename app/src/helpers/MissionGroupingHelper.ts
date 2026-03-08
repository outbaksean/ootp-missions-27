/**
 * Pure functions for filtering, sorting, and grouping UserMissions.
 *
 * Extracted from Missions.vue so the logic can be unit-tested without a Vue
 * environment.  Missions.vue delegates its filteredMissions / groupedMissions
 * computeds to these helpers.
 */

import type { UserMission } from "@/models/UserMission";
import type { ShopCard } from "@/models/ShopCard";

// ─── Category ordering ────────────────────────────────────────────────────────

export const CATEGORY_ORDER = [
  "Live Series",
  "Pack Rewards",
  "Launch Deck",
  "Bonus Rewards",
  "Immortal Seasons",
  "Negro Leagues",
  "Hall of Fame",
  "Baseball Reference",
  "Future Legends",
  "Launch Plus",
  "PT Elite",
  "Playoff Moments",
  "World Series Start",
  "Holiday Times",
  "Final Mission Set",
];

export function categoryPriority(cat: string): number {
  const i = CATEGORY_ORDER.indexOf(cat);
  return i === -1 ? CATEGORY_ORDER.length : i;
}

// ─── Hierarchy helpers ────────────────────────────────────────────────────────

export function collectDescendantIds(
  rootId: number,
  missionById: Map<number, UserMission>,
): Set<number> {
  const result = new Set<number>();
  const queue = [rootId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const subId of missionById.get(id)?.rawMission.missionIds ?? []) {
      if (!result.has(subId)) {
        result.add(subId);
        queue.push(subId);
      }
    }
  }
  return result;
}

// ─── Group net value (matches the "Net" stat shown in group headers) ──────────

/**
 * Computes the aggregate net value for a collection of missions.
 * Sums rewardValue across ALL missions, but only subtracts remainingPrice
 * from leaf (non-missions-type) missions to avoid double-counting chain costs.
 */
export function groupNetValue(
  missions: UserMission[],
  subtractUnlockedCards = false,
): number {
  const incomplete = missions.filter((m) => !m.completed);
  const rewardTotal = incomplete.reduce((s, m) => s + (m.rewardValue ?? 0), 0);
  const leafMissions = incomplete.filter(
    (m) => m.rawMission.type !== "missions",
  );
  const costTotal = leafMissions.reduce((s, m) => s + m.remainingPrice, 0);
  const unlockedTotal = subtractUnlockedCards
    ? leafMissions.reduce((s, m) => s + m.unlockedCardsPrice, 0)
    : 0;
  return rewardTotal - costTotal - unlockedTotal;
}

// ─── Sorting ──────────────────────────────────────────────────────────────────

/** Applies sortBy to a flat mission list (used for within-group ordering). */
export function sortMissions(
  missions: UserMission[],
  sortBy: "default" | "price" | "value" | "name",
): UserMission[] {
  if (sortBy === "price") {
    return [...missions].sort((a, b) => a.remainingPrice - b.remainingPrice);
  }
  if (sortBy === "value") {
    return [...missions].sort((a, b) => {
      if (a.missionValue === undefined && b.missionValue === undefined)
        return 0;
      if (a.missionValue === undefined) return 1;
      if (b.missionValue === undefined) return -1;
      return b.missionValue - a.missionValue;
    });
  }
  if (sortBy === "name") {
    return [...missions].sort((a, b) =>
      a.rawMission.name.localeCompare(b.rawMission.name),
    );
  }
  return missions;
}

// ─── Grouping ─────────────────────────────────────────────────────────────────

/**
 * Groups and sorts a pre-filtered, pre-sorted list of missions.
 *
 * @param sortedMissions  Already-filtered and already-sorted missions
 *                        (output of sortMissions / filteredMissions computed).
 * @param allMissions     Every mission in the store — used to build the
 *                        hierarchy map for chain / card-reward grouping.
 * @param groupBy         Grouping strategy.
 * @param sortBy          Sort key — used to order groups relative to each other.
 * @param shopCardsById   Card catalog — used for card-reward group labels.
 * @param subtractUnlockedCards  Whether to deduct unlocked card prices from
 *                        group net value when sorting by value.
 */
export function buildGroupedMissions(
  sortedMissions: UserMission[],
  allMissions: UserMission[],
  groupBy: "none" | "chain" | "category" | "card-reward",
  sortBy: "default" | "price" | "value" | "name",
  shopCardsById: Map<number, ShopCard>,
  subtractUnlockedCards = false,
): Array<{ label: string; missions: UserMission[] }> {
  // ── none ──────────────────────────────────────────────────────────────────
  if (groupBy === "none") {
    return [{ label: "", missions: sortedMissions }];
  }

  const missionById = new Map(allMissions.map((m) => [m.id, m]));

  // Helper: leaf-only remaining price sum (avoids double-counting chain costs)
  const leafPrice = (missions: UserMission[]) =>
    missions
      .filter((m) => m.rawMission.type !== "missions")
      .reduce((s, m) => s + m.remainingPrice, 0);

  // ── category ──────────────────────────────────────────────────────────────
  if (groupBy === "category") {
    const groupMap = new Map<string, UserMission[]>();
    for (const m of sortedMissions) {
      const label = m.rawMission.category || "Other";
      if (!groupMap.has(label)) groupMap.set(label, []);
      groupMap.get(label)!.push(m);
    }
    const groups = Array.from(groupMap.entries()).map(([label, missions]) => ({
      label,
      missions,
    }));

    if (sortBy === "price") {
      groups.sort((a, b) => leafPrice(a.missions) - leafPrice(b.missions));
    } else if (sortBy === "value") {
      groups.sort(
        (a, b) =>
          groupNetValue(b.missions, subtractUnlockedCards) -
          groupNetValue(a.missions, subtractUnlockedCards),
      );
    } else if (sortBy === "name") {
      groups.sort((a, b) => a.label.localeCompare(b.label));
    } else {
      groups.sort(
        (a, b) => categoryPriority(a.label) - categoryPriority(b.label),
      );
    }
    return groups;
  }

  // ── chain ─────────────────────────────────────────────────────────────────
  if (groupBy === "chain") {
    const allSubIds = new Set<number>();
    for (const m of allMissions) {
      if (m.rawMission.type === "missions" && m.rawMission.missionIds) {
        m.rawMission.missionIds.forEach((id) => allSubIds.add(id));
      }
    }

    const chainRoots = sortedMissions.filter(
      (m) => m.rawMission.type === "missions" && !allSubIds.has(m.id),
    );

    const chainGroups: Array<{
      label: string;
      missions: UserMission[];
      rootCategory: string;
    }> = [];
    const assignedIds = new Set<number>();

    for (const root of chainRoots) {
      const subIds = collectDescendantIds(root.id, missionById);
      const members = sortedMissions.filter(
        (m) => m.id === root.id || subIds.has(m.id),
      );
      members.forEach((m) => assignedIds.add(m.id));
      chainGroups.push({
        label: root.rawMission.name,
        missions: members,
        rootCategory: root.rawMission.category,
      });
    }

    if (sortBy === "price") {
      chainGroups.sort((a, b) => leafPrice(a.missions) - leafPrice(b.missions));
    } else if (sortBy === "value") {
      chainGroups.sort(
        (a, b) =>
          groupNetValue(b.missions, subtractUnlockedCards) -
          groupNetValue(a.missions, subtractUnlockedCards),
      );
    } else if (sortBy === "name") {
      chainGroups.sort((a, b) => a.label.localeCompare(b.label));
    } else {
      chainGroups.sort((a, b) => {
        const catDiff =
          categoryPriority(a.rootCategory) - categoryPriority(b.rootCategory);
        return catDiff !== 0 ? catDiff : a.label.localeCompare(b.label);
      });
    }

    const result: Array<{ label: string; missions: UserMission[] }> =
      chainGroups.map(({ label, missions }) => ({ label, missions }));

    const standalone = sortedMissions.filter((m) => !assignedIds.has(m.id));
    if (standalone.length > 0) {
      result.push({ label: "Standalone", missions: standalone });
    }
    return result;
  }

  // ── card-reward ───────────────────────────────────────────────────────────
  if (groupBy === "card-reward") {
    const allSubIds = new Set<number>();
    for (const m of allMissions) {
      if (m.rawMission.type === "missions" && m.rawMission.missionIds) {
        m.rawMission.missionIds.forEach((id) => allSubIds.add(id));
      }
    }

    const cardGroupMap = new Map<
      number,
      { label: string; missions: UserMission[] }
    >();
    const assignedIds = new Set<number>();

    // Process non-sub-missions (roots) first so parent chains claim their
    // descendants before individual child missions can create their own groups.
    const orderedForGrouping = [
      ...sortedMissions.filter((m) => !allSubIds.has(m.id)),
      ...sortedMissions.filter((m) => allSubIds.has(m.id)),
    ];

    for (const m of orderedForGrouping) {
      const rewards = m.rawMission.rewards ?? [];
      const cardReward = rewards.find(
        (r) =>
          (r.type as string).toLowerCase() === "card" &&
          (r as unknown as { cardId: number }).cardId !== 0,
      ) as { cardId: number } | undefined;
      if (!cardReward) continue;

      const { cardId } = cardReward;
      if (!cardGroupMap.has(cardId)) {
        const shopCard = shopCardsById.get(cardId);
        const label = shopCard ? shopCard.cardTitle : `Card #${cardId}`;
        cardGroupMap.set(cardId, { label, missions: [] });
      }

      const group = cardGroupMap.get(cardId)!;
      const descendantIds = collectDescendantIds(m.id, missionById);
      const members = sortedMissions.filter(
        (fm) => fm.id === m.id || descendantIds.has(fm.id),
      );
      members.forEach((fm) => {
        if (!assignedIds.has(fm.id)) {
          group.missions.push(fm);
          assignedIds.add(fm.id);
        }
      });
    }

    const groups = Array.from(cardGroupMap.values());

    if (sortBy === "price") {
      groups.sort((a, b) => leafPrice(a.missions) - leafPrice(b.missions));
    } else if (sortBy === "value") {
      groups.sort(
        (a, b) =>
          groupNetValue(b.missions, subtractUnlockedCards) -
          groupNetValue(a.missions, subtractUnlockedCards),
      );
    } else {
      groups.sort((a, b) => a.label.localeCompare(b.label));
    }

    const noCardGroup = sortedMissions.filter((m) => !assignedIds.has(m.id));
    if (noCardGroup.length > 0) {
      groups.push({ label: "No Card Reward", missions: noCardGroup });
    }
    return groups;
  }

  return [{ label: "", missions: sortedMissions }];
}
