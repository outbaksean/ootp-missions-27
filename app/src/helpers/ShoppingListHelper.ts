import type { UserMission } from "@/models/UserMission";
import type { ShopCard } from "@/models/ShopCard";
import { PACK_TYPE_LABELS } from "@/stores/useSettingsStore";
import {
  type ShoppingScope,
  emptyScopeIsAll,
} from "@/models/ShoppingWizardConfig";

export interface ShoppingItem {
  cardId: number;
  title: string;
  price: number;
  missionCount: number;
  completingMissions: UserMission[];
  usedInMissions: UserMission[];
  explanation: string;
  isRewardItem?: boolean;
  rewardFromMission?: UserMission;
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

export function buildRewardSummaryParts(
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

export function computeCompletedByList(
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
 * Resolves the effective set of missions for a given shopping scope.
 * When all scope arrays are empty, returns all missions (no filter).
 * Chain and mission selections recursively include all descendants.
 */
export function resolveScopedMissions(
  allMissions: UserMission[],
  scope: ShoppingScope,
): UserMission[] {
  if (emptyScopeIsAll(scope)) return allMissions;

  const missionById = new Map(allMissions.map((m) => [m.id, m]));

  function collectDescendants(rootId: number): Set<number> {
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

  const resultIds = new Set<number>();

  for (const cat of scope.categories) {
    for (const m of allMissions) {
      if (m.rawMission.category === cat) resultIds.add(m.id);
    }
  }

  for (const chainId of scope.chainIds) {
    resultIds.add(chainId);
    collectDescendants(chainId).forEach((id) => resultIds.add(id));
  }

  for (const cardId of scope.rewardCardIds) {
    for (const m of allMissions) {
      const hasCard = (m.rawMission.rewards ?? []).some(
        (r) =>
          (r.type as string).toLowerCase() === "card" &&
          (r as { cardId: number }).cardId === cardId,
      );
      if (hasCard) {
        resultIds.add(m.id);
        collectDescendants(m.id).forEach((id) => resultIds.add(id));
      }
    }
  }

  for (const missionId of scope.missionIds) {
    resultIds.add(missionId);
    collectDescendants(missionId).forEach((id) => resultIds.add(id));
  }

  return allMissions.filter((m) => resultIds.has(m.id));
}

/**
 * Builds a human-readable description of a shopping scope for use in summary text.
 */
export function buildScopeText(
  scope: ShoppingScope,
  allMissions: UserMission[],
  shopCardsById: Map<number, ShopCard>,
): string {
  if (emptyScopeIsAll(scope)) return "all missions";

  const parts: string[] = [];
  const missionById = new Map(allMissions.map((m) => [m.id, m]));

  if (scope.categories.length > 0) {
    parts.push(scope.categories.map((c) => `'${c}'`).join(", "));
  }
  if (scope.chainIds.length > 0) {
    const names = scope.chainIds
      .map((id) => missionById.get(id)?.rawMission.name ?? `#${id}`)
      .map((n) => `'${n}'`);
    parts.push(names.join(", "));
  }
  if (scope.rewardCardIds.length > 0) {
    const names = scope.rewardCardIds.map((id) => {
      const card = shopCardsById.get(id);
      return `'${card ? card.cardTitle : `Card #${id}`}'`;
    });
    parts.push(names.join(", "));
  }
  if (scope.missionIds.length > 0) {
    const names = scope.missionIds
      .map((id) => missionById.get(id)?.rawMission.name ?? `#${id}`)
      .map((n) => `'${n}'`);
    parts.push(names.join(", "));
  }

  if (parts.length === 0) return "all missions";
  return parts.join(", ");
}

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
  strategy: "completion" | "value" | "value-optimized",
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

  if (strategy === "value" || strategy === "value-optimized") {
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
    if (strategy !== "value" && strategy !== "value-optimized") {
      return a.remainingPrice - b.remainingPrice;
    }
    const aNet =
      a.missionValue ??
      (a.rewardValue !== undefined
        ? a.rewardValue - a.remainingPrice
        : Number.NEGATIVE_INFINITY);
    const bNet =
      b.missionValue ??
      (b.rewardValue !== undefined
        ? b.rewardValue - b.remainingPrice
        : Number.NEGATIVE_INFINITY);

    if (bNet !== aNet) return bNet - aNet;
    return a.remainingPrice - b.remainingPrice;
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
 * Formats warning text for missions excluded due to insufficient budget.
 * Returns an empty string when there are no excluded missions.
 */
export function buildOutOfBudgetText(excluded: UserMission[]): string {
  if (excluded.length === 0) return "";
  const names = excluded.map((m) => `'${m.rawMission.name}'`).join(", ");
  if (excluded.length === 1) {
    return `1 mission not included due to insufficient budget: ${names}.`;
  }
  return `${excluded.length} missions not included due to insufficient budget: ${names}.`;
}

/**
 * Builds mission priority map used to order shopping-list cards.
 *
 * Value strategy: rank selected leaf missions + chain missions by net value.
 * Completion strategy: use greedy leaf selection order directly.
 */
export function buildMissionPriority(
  eligibleMissions: UserMission[],
  selectionOrder: UserMission[],
  strategy: "completion" | "value" | "value-optimized",
  selectedIds: Set<number>,
): Map<number, number> {
  const map = new Map<number, number>();

  if (strategy === "completion") {
    selectionOrder.forEach((mission, index) => {
      map.set(mission.id, index);
    });
    return map;
  }

  const candidates = eligibleMissions.filter(
    (mission) =>
      mission.rawMission.type === "missions" || selectedIds.has(mission.id),
  );

  const sorted = [...candidates].sort((a, b) => {
    const aNet =
      a.missionValue ??
      (a.rewardValue !== undefined
        ? a.rewardValue - a.remainingPrice
        : Number.NEGATIVE_INFINITY);
    const bNet =
      b.missionValue ??
      (b.rewardValue !== undefined
        ? b.rewardValue - b.remainingPrice
        : Number.NEGATIVE_INFINITY);

    if (bNet !== aNet) return bNet - aNet;
    return a.remainingPrice - b.remainingPrice;
  });

  sorted.forEach((mission, index) => {
    map.set(mission.id, index);
  });

  return map;
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
  missionPriority?: Map<number, number>,
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
  // ── 2. Compute leaf completions per card ──
  // Determine which card actually completes each leaf mission by simulating the
  // purchase sequence in sorted order. This ensures mission completion appears in
  // explanations even for multi-card missions.
  const cardLeafCompletions = new Map<number, UserMission[]>();
  for (const cardId of cardMap.keys()) {
    cardLeafCompletions.set(cardId, []);
  }

  // ── 3. Sort cards ──
  // Phase 4: Sort by mission priority first, then by price within each priority group.
  // If missionPriority is not provided, all cards default to Infinity priority and
  // this naturally falls back to price ordering.

  const effectivePriority = new Map<number, number>(missionPriority ?? []);
  if (missionPriority && missionPriority.size > 0) {
    const missionById = new Map(allMissions.map((m) => [m.id, m]));

    // Propagate chain mission priority to all leaf descendants.
    for (const mission of allMissions) {
      if (mission.rawMission.type !== "missions") continue;
      const parentPriority = missionPriority.get(mission.id);
      if (parentPriority === undefined) continue;

      const leafDescendants = collectLeafDescendants(mission, missionById);
      for (const leafId of leafDescendants) {
        const current = effectivePriority.get(leafId) ?? Infinity;
        if (parentPriority < current) {
          effectivePriority.set(leafId, parentPriority);
        }
      }
    }
  }

  function getCardPriority(cardId: number): number {
    const missions = cardMap.get(cardId)?.missions ?? [];
    if (missions.length === 0) return Infinity;
    return Math.min(
      ...missions.map((m) => effectivePriority.get(m.id) ?? Infinity),
    );
  }

  const sortedCardIds = Array.from(cardMap.keys()).sort((a, b) => {
    const aPriority = getCardPriority(a);
    const bPriority = getCardPriority(b);
    if (aPriority !== bPriority) return aPriority - bPriority;
    return cardMap.get(a)!.price - cardMap.get(b)!.price;
  });

  // ── 4. Simulation with reward propagation ──
  type BuyEvent = { type: "buy"; cardId: number };
  type RewardEvent = {
    type: "reward";
    cardId: number;
    fromMission: UserMission;
  };
  type SimEvent = BuyEvent | RewardEvent;
  const simEvents: SimEvent[] = [];
  const purchasedCardIds = new Set<number>();
  const completedLeafMissionIds = new Set<number>();

  function checkLeafCompletions(cardId: number): UserMission[] {
    const justCompleted: UserMission[] = [];
    for (const mission of cardMap.get(cardId)?.missions ?? []) {
      if (completedLeafMissionIds.has(mission.id)) continue;
      const needed = mission.missionCards.filter(
        (c) => c.highlighted && !c.owned,
      );
      if (needed.length === 0) continue;
      if (needed.every((c) => purchasedCardIds.has(c.cardId))) {
        completedLeafMissionIds.add(mission.id);
        cardLeafCompletions.get(cardId)!.push(mission);
        justCompleted.push(mission);
      }
    }
    return justCompleted;
  }

  function processRewards(justCompleted: UserMission[]): void {
    const queue = [...justCompleted];
    while (queue.length > 0) {
      const mission = queue.shift()!;
      for (const reward of mission.rawMission.rewards ?? []) {
        if ((reward.type as string).toLowerCase() !== "card") continue;
        const r = reward as { cardId: number };
        if (r.cardId <= 0 || purchasedCardIds.has(r.cardId)) continue;
        if (!cardMap.has(r.cardId)) continue;
        purchasedCardIds.add(r.cardId);
        simEvents.push({
          type: "reward",
          cardId: r.cardId,
          fromMission: mission,
        });
        queue.push(...checkLeafCompletions(r.cardId));
      }
    }
  }

  for (const cardId of sortedCardIds) {
    if (purchasedCardIds.has(cardId)) continue;
    purchasedCardIds.add(cardId);
    simEvents.push({ type: "buy", cardId });
    processRewards(checkLeafCompletions(cardId));
  }

  // ── 5. Two-pass parent attribution ──
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

  for (const event of simEvents) {
    for (const leaf of cardLeafCompletions.get(event.cardId) ?? []) {
      triggerMission(leaf.id, event.cardId);
    }
  }

  // ── 6. Build final items from simulation events ──
  return simEvents.map((event) => {
    const data = cardMap.get(event.cardId)!;
    const completingLeaf = cardLeafCompletions.get(event.cardId) ?? [];
    const completingParents = allMissions.filter(
      (m) => triggeredByCard.get(m.id) === event.cardId,
    );
    const allCompleting = [...completingLeaf, ...completingParents];
    const usedInMissions = data.missions.filter(
      (m) => !completingLeaf.includes(m),
    );

    if (event.type === "reward") {
      return {
        cardId: event.cardId,
        title: data.title,
        price: 0,
        missionCount: data.missions.length,
        completingMissions: allCompleting,
        usedInMissions,
        explanation: buildExplanation(
          usedInMissions,
          allCompleting,
          shopCardsById,
        ),
        isRewardItem: true as const,
        rewardFromMission: event.fromMission,
      };
    }

    return {
      cardId: event.cardId,
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
  strategy: "completion" | "value" | "value-optimized";
  availablePP: number | null;
  scopeText: string;
  eligibleMissions: UserMission[];
  allMissions: UserMission[];
  shoppingItems: ShoppingItem[];
  packPrices: Map<string, number>;
  shopCardsById: Map<number, ShopCard>;
}): string {
  const {
    strategy,
    availablePP,
    scopeText,
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
    strategy === "completion" ? "complete missions" : "maximize value";
  const ppStr =
    availablePP === null
      ? "unlimited PP"
      : `${availablePP.toLocaleString()} PP`;
  const progressStr = buildProgressText(
    shoppingItems.length,
    completed,
    partial,
    packPrices,
    shopCardsById,
  );

  return `Shopping List to ${strategyStr} with ${ppStr} for ${scopeText}. Buy the following cards in order to ${progressStr}.`;
}

/**
 * Escapes HTML special characters for safe inclusion in HTML text.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Generates CSV content for the shopping list.
 *
 * Format: quoted cells with double-quotes escaped as "".
 * Header row: "Card Title", "Cost (PP)", "Explanation"
 */
export function buildCsvContent(items: ShoppingItem[]): string {
  const rows = [["Card Title", "Cost (PP)", "Explanation"]];
  for (const item of items) {
    const cost = item.isRewardItem ? "Reward" : item.price.toString();
    rows.push([item.title, cost, item.explanation]);
  }
  return rows
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

/**
 * Generates HTML content for the shopping list report.
 *
 * Includes a structured summary header and a table of cards.
 */
export function buildHtmlContent(params: {
  items: ShoppingItem[];
  headerHtml: string;
}): string {
  const { items, headerHtml } = params;

  const rows = items
    .map(
      (item) => `
      <tr${item.isRewardItem ? ' class="reward-row"' : ""}>
        <td>${escapeHtml(item.title)}</td>
        <td class="${item.isRewardItem ? "reward" : "price"}">${item.isRewardItem ? "Reward" : item.price.toLocaleString()}</td>
        <td>${escapeHtml(item.explanation)}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>OOTP Shopping List</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 960px; margin: 0 auto; padding: 2rem; color: #1e293b; }
    h1 { font-size: 1.4rem; margin-bottom: 1rem; }
    .header { background: #eff6ff; border: 1px solid #c7d2fe; border-left: 3px solid #6366f1; border-radius: 6px; margin-bottom: 1.5rem; overflow: hidden; }
    .hdr-row { padding: 0.5rem 0.75rem; display: flex; flex-direction: column; gap: 0.35rem; border-bottom: 1px solid #dde4fb; }
    .hdr-row:last-child { border-bottom: none; }
    .hdr-total-row { flex-direction: row; align-items: center; justify-content: space-between; }
    .hdr-label { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #4338ca; display: flex; align-items: center; gap: 0.4rem; }
    .hdr-label--excl { color: #92400e; }
    .hdr-badge { background: #4338ca; color: #fff; border-radius: 9999px; font-size: 0.65rem; font-weight: 700; padding: 1px 6px; line-height: 1.4; }
    .hdr-badge--excl { background: #92400e; }
    .hdr-scope-tags { display: flex; flex-wrap: wrap; gap: 0.3rem; }
    .hdr-scope-tag { display: inline-block; background: #e0e7ff; color: #3730a3; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; padding: 2px 10px; }
    .hdr-scope-tag--all { background: #f0f9ff; color: #0369a1; border: 1px solid #bae6fd; }
    .hdr-mission-rows { display: flex; flex-direction: column; gap: 0.2rem; }
    .hdr-mission-row { display: flex; align-items: baseline; justify-content: space-between; gap: 0.5rem; }
    .hdr-mission-name { font-size: 0.8rem; color: #1e293b; flex: 1; }
    .hdr-cost { font-size: 0.78rem; font-weight: 600; color: #16a34a; white-space: nowrap; }
    .hdr-free { font-size: 0.78rem; color: #94a3b8; }
    .hdr-excl-label { font-size: 0.75rem; color: #92400e; font-style: italic; white-space: nowrap; }
    .hdr-total-label { font-size: 0.8rem; font-weight: 700; color: #1e293b; }
    .hdr-total-value { font-size: 0.9rem; font-weight: 700; color: #1e293b; }
    .hdr-reward-value { font-size: 0.75rem; font-weight: 500; color: #4338ca; text-transform: none; letter-spacing: normal; font-style: normal; }
    .hdr-chips { display: flex; flex-wrap: wrap; gap: 0.3rem; }
    .hdr-chip { font-size: 0.65rem; padding: 1px 8px; border-radius: 999px; font-weight: 500; white-space: nowrap; }
    .hdr-none { font-size: 0.8rem; color: #94a3b8; }
    table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    th { background: #1e293b; color: #f8fafc; padding: 10px 14px; text-align: left; font-weight: 600; }
    td { padding: 9px 14px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    tr:hover td { background: #f8fafc; }
    .price { font-weight: 600; color: #16a34a; white-space: nowrap; }
    .reward { font-weight: 600; color: #6366f1; white-space: nowrap; }
    .reward-row td { background: #f5f3ff; }
  </style>
</head>
<body>
  <h1>OOTP Shopping List</h1>
  <div class="header">${headerHtml}</div>
  <table>
    <thead><tr><th>Card</th><th>Cost (PP)</th><th>Explanation</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}
