import type { UserMission } from "@/models/UserMission";
import type { ShopCard } from "@/models/ShopCard";
import { PACK_TYPE_LABELS } from "@/stores/useSettingsStore";

export interface ShoppingItem {
  cardId: number;
  title: string;
  price: number;
  missionCount: number;
  completingMissions: UserMission[];
  usedInMissions: UserMission[];
  explanation: string;
}

// ─── Private helpers ─────────────────────────────────────────────────────────

function formatMissionReward(
  mission: UserMission,
  shopCardsById: Map<number, ShopCard>,
): string {
  const rewards = mission.rawMission.rewards ?? [];
  const parts: string[] = [];
  for (const reward of rewards) {
    const type = (reward.type as string).toLowerCase();
    if (type === "pack") {
      const r = reward as { packType: string; count: number };
      const label = PACK_TYPE_LABELS[r.packType] ?? r.packType;
      const packWord = r.count === 1 ? "Pack" : "Packs";
      parts.push(`${r.count} ${label} ${packWord}`);
    } else if (type === "card") {
      const r = reward as { cardId: number; count?: number };
      if (r.cardId > 0) {
        const shopCard = shopCardsById.get(r.cardId);
        const count = r.count ?? 1;
        const name = shopCard ? shopCard.cardTitle : `Card #${r.cardId}`;
        parts.push(count > 1 ? `${count}x ${name}` : name);
      }
    }
  }
  return parts.join(", ");
}

function buildExplanation(
  usedIn: UserMission[],
  completing: UserMission[],
  shopCardsById: Map<number, ShopCard>,
): string {
  const parts: string[] = [];
  if (usedIn.length > 0) {
    const names = usedIn.map((m) => `'${m.rawMission.name}'`).join(" and ");
    parts.push(`Used in ${names}`);
  }
  for (const m of completing) {
    const rewardStr = formatMissionReward(m, shopCardsById);
    if (rewardStr && m.rewardValue) {
      parts.push(
        `Completes '${m.rawMission.name}' for ${rewardStr} valued at ${m.rewardValue.toLocaleString()} PP`,
      );
    } else if (rewardStr) {
      parts.push(`Completes '${m.rawMission.name}' for ${rewardStr}`);
    } else {
      parts.push(`Completes '${m.rawMission.name}'`);
    }
  }
  return parts.join("; ");
}

function buildRewardSummaryParts(
  missions: UserMission[],
  packPrices: Map<string, number>,
  shopCardsById: Map<number, ShopCard>,
): string[] {
  const packCounts = new Map<string, number>();
  const cardItems: string[] = [];

  for (const mission of missions) {
    for (const reward of mission.rawMission.rewards ?? []) {
      const type = (reward.type as string).toLowerCase();
      if (type === "pack") {
        const r = reward as { packType: string; count: number };
        packCounts.set(r.packType, (packCounts.get(r.packType) ?? 0) + r.count);
      } else if (type === "card") {
        const r = reward as { cardId: number; count?: number };
        if (r.cardId > 0) {
          const shopCard = shopCardsById.get(r.cardId);
          const count = r.count ?? 1;
          const name = shopCard ? shopCard.cardTitle : `Card #${r.cardId}`;
          cardItems.push(count > 1 ? `${count}x ${name}` : name);
        }
      }
    }
  }

  const sortedPacks = Array.from(packCounts.entries()).sort(
    (a, b) => (packPrices.get(b[0]) ?? 0) - (packPrices.get(a[0]) ?? 0),
  );
  const parts: string[] = sortedPacks.map(([packType, count]) => {
    const label = PACK_TYPE_LABELS[packType] ?? packType;
    const packWord = count === 1 ? "Pack" : "Packs";
    return `${count} ${label} ${packWord}`;
  });
  parts.push(...cardItems);
  return parts;
}

function buildIncludedMissionsText(
  includedMissionIds: Set<number>,
  allMissions: UserMission[],
): string {
  if (includedMissionIds.size === 0) return "all missions";

  const missionById = new Map(allMissions.map((m) => [m.id, m]));
  const items: string[] = [];

  for (const id of includedMissionIds) {
    const mission = missionById.get(id);
    if (!mission) continue;
    if (
      mission.rawMission.type === "missions" &&
      mission.rawMission.missionIds?.length
    ) {
      const subNames = mission.rawMission.missionIds
        .map((sid) => missionById.get(sid))
        .filter((sub) => sub && !sub.completed)
        .map((sub) => `'${sub!.rawMission.name}'`);
      if (subNames.length > 0) {
        const subsStr =
          subNames.length === 1
            ? subNames[0]
            : subNames.slice(0, -1).join(", ") +
              " and " +
              subNames[subNames.length - 1];
        items.push(
          `'${mission.rawMission.name}' which includes sub missions ${subsStr}`,
        );
      } else {
        items.push(`'${mission.rawMission.name}'`);
      }
    } else {
      items.push(`'${mission.rawMission.name}'`);
    }
  }

  if (items.length === 0) return "all missions";
  if (items.length === 1) return items[0];
  return items.slice(0, -1).join(", ") + ", and " + items[items.length - 1];
}

function buildProgressText(
  shoppingItemCount: number,
  completed: UserMission[],
  partial: UserMission[],
  packPrices: Map<string, number>,
  shopCardsById: Map<number, ShopCard>,
): string {
  if (shoppingItemCount === 0) return "make no progress";

  let text = "";

  if (completed.length > 0) {
    const countText =
      completed.length === 1
        ? `'${completed[0].rawMission.name}'`
        : `${completed.length} missions`;
    const rewardParts = buildRewardSummaryParts(
      completed,
      packPrices,
      shopCardsById,
    );
    const totalValue = completed.reduce(
      (sum, m) => sum + (m.rewardValue ?? 0),
      0,
    );

    text = `complete ${countText}`;
    if (rewardParts.length > 0 && totalValue > 0) {
      text += ` giving ${rewardParts.join(", ")} for a combined value of ${totalValue.toLocaleString()} PP`;
    } else if (rewardParts.length > 0) {
      text += ` giving ${rewardParts.join(", ")}`;
    }
  }

  if (partial.length > 0) {
    const connector = text ? " and make progress on" : "make progress on";
    const countText =
      partial.length === 1
        ? `'${partial[0].rawMission.name}'`
        : `${partial.length} missions`;
    text += ` ${connector} ${countText}`;
  }

  if (!text) {
    text = "not complete any included missions (partial progress may occur)";
  }

  return text;
}

function computeCompletedByList(
  eligibleMissions: UserMission[],
  allMissions: UserMission[],
  shoppingCardIds: Set<number>,
): UserMission[] {
  const missionById = new Map(allMissions.map((m) => [m.id, m]));

  const willBeCompleted = new Set<number>(
    allMissions.filter((m) => m.completed).map((m) => m.id),
  );

  for (const m of eligibleMissions) {
    if (m.rawMission.type === "missions") continue;
    const needed = m.missionCards.filter((c) => c.highlighted && !c.owned);
    if (
      needed.length > 0 &&
      needed.every((c) => shoppingCardIds.has(c.cardId))
    ) {
      willBeCompleted.add(m.id);
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const m of allMissions) {
      if (willBeCompleted.has(m.id) || m.rawMission.type !== "missions")
        continue;
      const subIds = m.rawMission.missionIds ?? [];
      const doneCount = subIds.filter((sid) => willBeCompleted.has(sid)).length;
      if (doneCount >= m.rawMission.requiredCount) {
        willBeCompleted.add(m.id);
        changed = true;
      }
    }
  }

  // unused but needed for closure; suppress lint
  void missionById;

  return allMissions.filter((m) => willBeCompleted.has(m.id) && !m.completed);
}

function computePartialByList(
  eligibleMissions: UserMission[],
  shoppingCardIds: Set<number>,
): UserMission[] {
  return eligibleMissions.filter((m) => {
    if (m.rawMission.type === "missions") return false;
    const needed = m.missionCards.filter((c) => c.highlighted && !c.owned);
    if (needed.length === 0) return false;
    const hasAny = needed.some((c) => shoppingCardIds.has(c.cardId));
    const hasAll = needed.every((c) => shoppingCardIds.has(c.cardId));
    return hasAny && !hasAll;
  });
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Helper: Recursively collects all leaf mission IDs that are descendants of a given mission.
 */
function collectLeafDescendants(
  mission: UserMission,
  missionById: Map<number, UserMission>,
): Set<number> {
  const result = new Set<number>();

  if (mission.rawMission.type !== "missions") {
    // This is a leaf mission
    result.add(mission.id);
    return result;
  }

  // Recursively collect from sub-missions
  for (const subId of mission.rawMission.missionIds ?? []) {
    const subMission = missionById.get(subId);
    if (subMission) {
      const descendants = collectLeafDescendants(subMission, missionById);
      descendants.forEach((id) => result.add(id));
    }
  }

  return result;
}

/**
 * Sorts leaf missions by strategy priority and greedily selects those that fit
 * within `availablePP` (null = unlimited).
 *
 * Returns:
 *  - `selectedIds`              fast-lookup Set of selected mission IDs
 *  - `selectionOrder`           missions in the order they were selected (index 0 = highest
 *                               priority); used by Phase 4 for card ordering
 *  - `negativeValueExcluded`    missions excluded due to negative net value (value strategy only)
 *
 * Card costs are deduplicated: if two missions share a card, the card's price is
 * only counted once (against whichever mission picks it up first in greedy order).
 */
export function selectMissionsForBudget(
  leafMissions: UserMission[],
  strategy: "value" | "completion",
  availablePP: number | null,
  allMissions?: UserMission[],
): {
  selectedIds: Set<number>;
  selectionOrder: UserMission[];
  negativeValueExcluded: UserMission[];
} {
  // Filter out negative-value missions when using value strategy
  let negativeValueExcluded: UserMission[] = [];
  let filteredMissions = leafMissions;

  if (strategy === "value") {
    // Build set of leaf missions that are descendants of positive-net chain missions
    const positiveChainDescendants = new Set<number>();

    if (allMissions) {
      const missionById = new Map(allMissions.map((m) => [m.id, m]));

      for (const mission of allMissions) {
        // Only consider chain missions
        if (mission.rawMission.type !== "missions") continue;

        // Check if chain has positive net value (including unlockedCardsPrice)
        // For chains, missionValue = combinedRewardValue - remainingPrice - unlockedCardsPrice
        if (mission.missionValue !== undefined && mission.missionValue > 0) {
          // Collect all leaf descendants of this positive-net chain
          const descendants = collectLeafDescendants(mission, missionById);
          descendants.forEach((id) => positiveChainDescendants.add(id));
        }
      }
    }

    filteredMissions = leafMissions.filter((m) => {
      // Free missions always pass
      if (m.remainingPrice === 0) return true;
      // Missions with no rewardValue defined also pass (can't calculate net value)
      if (m.rewardValue === undefined) return true;
      // Mission has positive net value on its own
      if (m.rewardValue > m.remainingPrice) return true;
      // Mission is part of a positive-net chain
      if (positiveChainDescendants.has(m.id)) return true;
      // Otherwise exclude
      return false;
    });
    negativeValueExcluded = leafMissions.filter(
      (m) => !filteredMissions.includes(m),
    );
  }

  const sorted = [...filteredMissions].sort((a, b) => {
    if (strategy === "completion") {
      return a.remainingPrice - b.remainingPrice;
    }
    const aRatio = (a.rewardValue ?? 0) / Math.max(1, a.remainingPrice);
    const bRatio = (b.rewardValue ?? 0) / Math.max(1, b.remainingPrice);
    return bRatio - aRatio;
  });

  if (availablePP === null) {
    return {
      selectedIds: new Set(sorted.map((m) => m.id)),
      selectionOrder: sorted,
      negativeValueExcluded,
    };
  }

  let remainingBudget = availablePP;
  const selectionOrder: UserMission[] = [];
  const includedCardIds = new Set<number>();

  for (const mission of sorted) {
    if (mission.remainingPrice <= 0) {
      selectionOrder.push(mission);
      continue;
    }
    const newCards = mission.missionCards.filter(
      (c) => c.highlighted && !c.owned && !includedCardIds.has(c.cardId),
    );
    const newCost = newCards.reduce((sum, c) => sum + c.price, 0);
    if (newCost <= remainingBudget) {
      selectionOrder.push(mission);
      newCards.forEach((c) => includedCardIds.add(c.cardId));
      remainingBudget -= newCost;
    }
  }

  return {
    selectedIds: new Set(selectionOrder.map((m) => m.id)),
    selectionOrder,
    negativeValueExcluded,
  };
}

/**
 * Returns a human-readable warning sentence listing missions excluded from the
 * shopping list because they contain cards with no market price (`isCompletable = false`).
 * Returns an empty string when there are no excluded missions.
 */
export function buildExclusionText(excluded: UserMission[]): string {
  if (excluded.length === 0) return "";
  const names = excluded.map((m) => `'${m.rawMission.name}'`).join(", ");
  if (excluded.length === 1) {
    return `1 mission excluded because it requires a card with no market price: ${names}.`;
  }
  return `${excluded.length} missions excluded because they require cards with no market price: ${names}.`;
}

/**
 * Returns a human-readable warning sentence listing missions excluded from the
 * value-strategy shopping list because their cost exceeds their reward value.
 * Returns an empty string when there are no excluded missions.
 */
export function buildNegativeValueExclusionText(
  excluded: UserMission[],
): string {
  if (excluded.length === 0) return "";
  const names = excluded.map((m) => `'${m.rawMission.name}'`).join(", ");
  if (excluded.length === 1) {
    return `1 mission skipped because its cost exceeds its reward value: ${names}.`;
  }
  return `${excluded.length} missions skipped because their cost exceeds their reward value: ${names}.`;
}

/**
 * Builds the ordered shopping item list for the given selected missions.
 *
 * @param eligibleMissions  Incomplete, calculated missions in scope (leaf and missions-type).
 * @param selectedMissionIds  Subset of eligible leaf missions within budget.
 * @param allMissions  Full mission list (needed for parent-chain lookups).
 * @param shopCardsById  Card catalog for reward label formatting.
 */
export function buildShoppingItems(
  eligibleMissions: UserMission[],
  selectedMissionIds: Set<number>,
  allMissions: UserMission[],
  shopCardsById: Map<number, ShopCard>,
): ShoppingItem[] {
  // ── 1. Build card map ──
  const cardMap = new Map<
    number,
    { title: string; price: number; missions: UserMission[] }
  >();
  for (const mission of eligibleMissions) {
    if (!selectedMissionIds.has(mission.id)) continue;
    for (const card of mission.missionCards) {
      if (!card.highlighted || card.owned) continue;
      const existing = cardMap.get(card.cardId);
      if (existing) {
        existing.missions.push(mission);
      } else {
        cardMap.set(card.cardId, {
          title: card.title,
          price: card.price,
          missions: [mission],
        });
      }
    }
  }
  const shoppingCardIds = new Set(cardMap.keys());

  // ── 2. Compute leaf completions per card ──
  // A card "singly completes" a leaf mission when it is the only shopping-list
  // card needed — all other unowned highlighted cards for that mission are
  // already owned.
  const cardLeafCompletions = new Map<number, UserMission[]>();
  for (const [cardId, data] of cardMap) {
    const leaves = data.missions.filter((m) => {
      const needed = m.missionCards.filter((c) => c.highlighted && !c.owned);
      if (needed.length === 0) return false;
      const fromList = needed.filter((c) => shoppingCardIds.has(c.cardId));
      return fromList.length === 1 && fromList[0].cardId === cardId;
    });
    cardLeafCompletions.set(cardId, leaves);
  }

  // ── 3. Sort cards ──
  // Cards that complete more missions come first; ties broken by price (cheapest
  // first so the more expensive card — last in sequence — "seals" the chain).
  const sortedCardIds = Array.from(cardMap.keys()).sort((a, b) => {
    const aL = cardLeafCompletions.get(a)!.length;
    const bL = cardLeafCompletions.get(b)!.length;
    if (bL !== aL) return bL - aL;
    const aM = cardMap.get(a)!.missions.length;
    const bM = cardMap.get(b)!.missions.length;
    if (bM !== aM) return bM - aM;
    return cardMap.get(a)!.price - cardMap.get(b)!.price;
  });

  // ── 4. Two-pass parent attribution ──
  // Build direct-parent index: subMissionId → missions-type missions that require it
  const missionById = new Map(allMissions.map((m) => [m.id, m]));
  const directParentOf = new Map<number, UserMission[]>();
  for (const m of allMissions) {
    if (m.rawMission.type !== "missions") continue;
    for (const subId of m.rawMission.missionIds ?? []) {
      if (!directParentOf.has(subId)) directParentOf.set(subId, []);
      directParentOf.get(subId)!.push(m);
    }
  }

  // Seed triggered-sub counts with already-completed direct sub-missions
  const triggeredSubCount = new Map<number, number>();
  for (const m of allMissions) {
    if (m.rawMission.type !== "missions" || m.completed) continue;
    const count = (m.rawMission.missionIds ?? []).filter(
      (sid) => missionById.get(sid)?.completed,
    ).length;
    triggeredSubCount.set(m.id, count);
  }

  // Track which card triggered completion of each parent mission.
  const triggeredByCard = new Map<number, number>(); // missionId → cardId

  function triggerMission(missionId: number, cardId: number): void {
    for (const parent of directParentOf.get(missionId) ?? []) {
      if (parent.completed || triggeredByCard.has(parent.id)) continue;
      const newCount = (triggeredSubCount.get(parent.id) ?? 0) + 1;
      triggeredSubCount.set(parent.id, newCount);
      if (newCount >= parent.rawMission.requiredCount) {
        triggeredByCard.set(parent.id, cardId);
        triggerMission(parent.id, cardId);
      }
    }
  }

  for (const cardId of sortedCardIds) {
    for (const leaf of cardLeafCompletions.get(cardId)!) {
      triggerMission(leaf.id, cardId);
    }
  }

  // ── 5. Build final items in sorted order ──
  return sortedCardIds.map((cardId) => {
    const data = cardMap.get(cardId)!;
    const completingLeaf = cardLeafCompletions.get(cardId)!;
    const completingParents = allMissions.filter(
      (m) => triggeredByCard.get(m.id) === cardId,
    );
    const allCompleting = [...completingLeaf, ...completingParents];
    const usedInMissions = data.missions.filter(
      (m) => !completingLeaf.includes(m),
    );

    return {
      cardId,
      title: data.title,
      price: data.price,
      missionCount: data.missions.length,
      completingMissions: allCompleting,
      usedInMissions,
      explanation: buildExplanation(
        usedInMissions,
        allCompleting,
        shopCardsById,
      ),
    };
  });
}

/**
 * Builds the summary header text for the shopping list panel.
 *
 * Accepts pre-computed `shoppingItems` (from `buildShoppingItems`) to avoid
 * recomputing the card list when assembling the summary.
 */
export function buildSummaryText(params: {
  strategy: "value" | "completion";
  availablePP: number | null;
  includedMissionIds: Set<number>;
  eligibleMissions: UserMission[];
  allMissions: UserMission[];
  shoppingItems: ShoppingItem[];
  packPrices: Map<string, number>;
  shopCardsById: Map<number, ShopCard>;
}): string {
  const {
    strategy,
    availablePP,
    includedMissionIds,
    eligibleMissions,
    allMissions,
    shoppingItems,
    packPrices,
    shopCardsById,
  } = params;

  const shoppingCardIds = new Set(shoppingItems.map((i) => i.cardId));
  const completed = computeCompletedByList(
    eligibleMissions,
    allMissions,
    shoppingCardIds,
  );
  const partial = computePartialByList(eligibleMissions, shoppingCardIds);

  const strategyStr =
    strategy === "value" ? "maximize value" : "complete missions";
  const ppStr =
    availablePP === null
      ? "unlimited PP"
      : `${availablePP.toLocaleString()} PP`;
  const missionsStr = buildIncludedMissionsText(
    includedMissionIds,
    allMissions,
  );
  const progressStr = buildProgressText(
    shoppingItems.length,
    completed,
    partial,
    packPrices,
    shopCardsById,
  );

  return `Shopping List to ${strategyStr} with ${ppStr} for ${missionsStr}. Buy the following cards in order to ${progressStr}.`;
}
