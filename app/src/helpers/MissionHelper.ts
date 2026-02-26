import type { ShopCard } from "../models/ShopCard";
import type { Mission } from "../models/Mission";
import type { MissionReward } from "../models/MissionReward";

interface PriceCalculationResult {
  totalPrice: number;
  includedCards: Array<{ cardId: number; price: number }>;
  isCompletable: boolean;
}

export default class MissionHelper {
  private static calculatePriceDetailsPointsTypeDP(
    unownedCardsWithPoints: Array<{
      cardId: number;
      price: number;
      points: number;
    }>,
    requiredPoints: number,
  ): PriceCalculationResult {
    if (requiredPoints <= 0) return { totalPrice: 0, includedCards: [], isCompletable: true };
    if (unownedCardsWithPoints.length === 0)
      return { totalPrice: 0, includedCards: [], isCompletable: false };

    const n = unownedCardsWithPoints.length;
    const maxPoints = unownedCardsWithPoints.reduce(
      (sum, c) => sum + c.points,
      0,
    );

    if (maxPoints < requiredPoints) {
      // Can't reach target — return all available cards
      return {
        totalPrice: unownedCardsWithPoints.reduce((sum, c) => sum + c.price, 0),
        includedCards: unownedCardsWithPoints.map((c) => ({
          cardId: c.cardId,
          price: c.price,
        })),
        isCompletable: false,
      };
    }

    // 2D DP: dp[i][j] = min cost to get exactly j points using cards 0..i-1.
    // The extra row allows reconstruction to check whether card i was included
    // by comparing dp[i][j - card.points] + card.price === dp[i+1][j].
    // A 1D rolling array produces correct DP values but not correct reconstruction
    // because a card can update both dp[j] and dp[j - card.points] in the same pass,
    // making backtracking ambiguous (the same card appears to be used twice).
    const dp: number[][] = Array.from({ length: n + 1 }, () =>
      new Array(maxPoints + 1).fill(Infinity),
    );
    dp[0][0] = 0;

    for (let i = 0; i < n; i++) {
      const card = unownedCardsWithPoints[i];
      for (let j = 0; j <= maxPoints; j++) {
        // Option 1: skip card i
        if (dp[i][j] < dp[i + 1][j]) dp[i + 1][j] = dp[i][j];
        // Option 2: include card i
        if (j >= card.points && dp[i][j - card.points] !== Infinity) {
          const cost = dp[i][j - card.points] + card.price;
          if (cost < dp[i + 1][j]) dp[i + 1][j] = cost;
        }
      }
    }

    // Find minimum cost to reach >= requiredPoints
    let minCost = Infinity;
    let targetPoints = -1;
    for (let p = requiredPoints; p <= maxPoints; p++) {
      if (dp[n][p] < minCost) {
        minCost = dp[n][p];
        targetPoints = p;
      }
    }

    if (targetPoints === -1) return { totalPrice: 0, includedCards: [], isCompletable: false };

    // Reconstruct: card i was included if skipping it would have left dp[i+1][p] unchanged
    const includedCards: Array<{ cardId: number; price: number }> = [];
    let p = targetPoints;
    for (let i = n - 1; i >= 0 && p > 0; i--) {
      const card = unownedCardsWithPoints[i];
      if (
        p >= card.points &&
        dp[i][p - card.points] !== Infinity &&
        dp[i][p - card.points] + card.price === dp[i + 1][p]
      ) {
        includedCards.push({ cardId: card.cardId, price: card.price });
        p -= card.points;
      }
    }

    return { totalPrice: minCost, includedCards, isCompletable: true };
  }

  private static calculatePriceDetailsCardType(
    sortedCards: Array<{ cardId: number; price: number }>,
    mission: Mission,
    shopCardsById: Map<number, ShopCard>,
  ): PriceCalculationResult {
    const ownedCount = mission.cards.filter(
      (card) => shopCardsById.get(card.cardId)?.owned,
    ).length;
    const requiredCount = Math.max(mission.requiredCount - ownedCount, 0);

    const includedCards = sortedCards.slice(0, requiredCount);
    const totalPrice = includedCards.reduce(
      (total, card) => total + card.price,
      0,
    );
    const isCompletable = includedCards.length >= requiredCount;

    return { totalPrice, includedCards, isCompletable };
  }

  static calculateTotalPriceOfNonOwnedCards(
    mission: Mission,
    shopCardsById: Map<number, ShopCard>,
    useSellPrice: boolean,
    overrides?: Map<number, number>,
  ): PriceCalculationResult {
    const nonOwnedCards = mission.cards
      .filter((card) => !shopCardsById.get(card.cardId)?.owned)
      .map((card) => {
        const shopCard = shopCardsById.get(card.cardId);
        if (!shopCard) return null;

        const basePrice =
          useSellPrice && shopCard.sellOrderLow > 0
            ? shopCard.sellOrderLow
            : shopCard.lastPrice;
        const price = overrides?.get(card.cardId) ?? basePrice;

        return { cardId: card.cardId, price };
      })
      .filter((card) => card !== null && card.price > 0) as Array<{
        cardId: number;
        price: number;
      }>;

    const sortedCards = nonOwnedCards.sort((a, b) => a.price - b.price);

    if (mission.type === "count") {
      return this.calculatePriceDetailsCardType(
        sortedCards,
        mission,
        shopCardsById,
      );
    }

    if (mission.type === "points") {
      const ownedPoints = mission.cards.reduce((sum, card) => {
        const shopCard = shopCardsById.get(card.cardId);
        return sum + (shopCard?.owned ? card.points || 0 : 0);
      }, 0);
      const requiredPoints = Math.max(mission.requiredCount - ownedPoints, 0);

      const unownedWithPoints = sortedCards
        .map((card) => ({
          ...card,
          points:
            mission.cards.find((mc) => mc.cardId == card.cardId)?.points || 0,
        }))
        .filter((c) => c.points > 0);

      return this.calculatePriceDetailsPointsTypeDP(
        unownedWithPoints,
        requiredPoints,
      );
    }

    return { totalPrice: 0, includedCards: [], isCompletable: true };
  }

  /**
   * Returns the total PP value of a mission's structured rewards.
   * Returns undefined when no rewards array is present (unstructured data → show "—").
   * Pack rewards with no price set contribute 0 (user hasn't configured pack prices yet).
   * Card rewards with cardId === 0 (not yet mapped) contribute 0.
   */
  static calculateRewardValue(
    rewards: MissionReward[] | undefined,
    packPrices: Map<string, number>,
    shopCardsById: Map<number, ShopCard>,
    useSellPrice: boolean,
  ): number | undefined {
    if (!rewards || rewards.length === 0) return undefined;

    let total = 0;
    for (const reward of rewards) {
      if (reward.type === "pack") {
        total += (packPrices.get(reward.packType) ?? 0) * reward.count;
      } else if (reward.type === "card") {
        if (reward.cardId === 0) continue; // Needs manual cardId — treat as 0
        const card = shopCardsById.get(reward.cardId);
        if (!card) continue;
        const price =
          useSellPrice && card.sellOrderLow > 0
            ? card.sellOrderLow
            : card.lastPrice;
        total += price * (reward.count ?? 1);
      }
      // type:'other' → 0, no contribution
    }
    return total;
  }

  /**
   * Returns the opportunity cost of the owned, unlocked cards that would
   * actually need to be locked to complete this mission — not necessarily
   * all owned cards, just the minimum required subset.
   *
   * Count missions: cheapest min(ownedCount, requiredCount) owned+unlocked cards.
   * Points missions: if owned points already exceed the target, use the DP to
   *   find the minimum-cost subset that covers requiredCount points; otherwise
   *   all owned cards are needed and their full price is returned.
   */
  static calculateUnlockedCardsPrice(
    mission: Mission,
    shopCardsById: Map<number, ShopCard>,
    useSellPrice: boolean,
    overrides?: Map<number, number>,
    discount = 0,
  ): { totalPrice: number; includedCardIds: Set<number> } {
    const ownedUnlocked = mission.cards
      .map((card) => {
        const shopCard = shopCardsById.get(card.cardId);
        if (!shopCard || !shopCard.owned || shopCard.locked) return null;
        const basePrice =
          useSellPrice && shopCard.sellOrderLow > 0
            ? shopCard.sellOrderLow
            : shopCard.lastPrice;
        const rawPrice = overrides?.get(card.cardId) ?? basePrice;
        // Apply discount, but ensure price is at least 1 PP to prevent division by zero
        const price = Math.max(1, rawPrice * (1 - discount));
        return { cardId: card.cardId, price, points: card.points || 0 };
      })
      .filter((c) => c !== null);

    if (ownedUnlocked.length === 0)
      return { totalPrice: 0, includedCardIds: new Set() };

    if (mission.type === "count") {
      const take = Math.min(ownedUnlocked.length, mission.requiredCount);
      const included = ownedUnlocked
        .sort((a, b) => a.price - b.price)
        .slice(0, take);
      return {
        totalPrice: included.reduce((sum, c) => sum + c.price, 0),
        includedCardIds: new Set(included.map((c) => c.cardId)),
      };
    }

    if (mission.type === "points") {
      const ownedPoints = ownedUnlocked.reduce((sum, c) => sum + c.points, 0);
      if (ownedPoints <= mission.requiredCount) {
        return {
          totalPrice: ownedUnlocked.reduce((sum, c) => sum + c.price, 0),
          includedCardIds: new Set(ownedUnlocked.map((c) => c.cardId)),
        };
      }
      const result = this.calculatePriceDetailsPointsTypeDP(
        ownedUnlocked,
        mission.requiredCount,
      );
      return {
        totalPrice: result.totalPrice,
        includedCardIds: new Set(result.includedCards.map((c) => c.cardId)),
      };
    }

    return { totalPrice: 0, includedCardIds: new Set() };
  }

  /**
   * Finds the minimum-cost assignment by letting owned+unlocked cards compete with
   * unowned cards. Locked owned cards contribute their count/points for free.
   * Returns separate buy cost (unowned cards) and opportunity cost (owned+unlocked cards).
   */
  static calculateOptimalMissionCost(
    mission: Mission,
    shopCardsById: Map<number, ShopCard>,
    useSellPrice: boolean,
    overrides?: Map<number, number>,
    discount = 0,
  ): {
    remainingPrice: number;
    unlockedCardsPrice: number;
    buyCardIds: Set<number>;
    lockCardIds: Set<number>;
    isCompletable: boolean;
  } {
    if (mission.type !== "count" && mission.type !== "points") {
      return {
        remainingPrice: 0,
        unlockedCardsPrice: 0,
        buyCardIds: new Set(),
        lockCardIds: new Set(),
        isCompletable: true,
      };
    }

    const getEffectivePrice = (cardId: number, shopCard: ShopCard): number => {
      const base =
        useSellPrice && shopCard.sellOrderLow > 0
          ? shopCard.sellOrderLow
          : shopCard.lastPrice;
      return overrides?.get(cardId) ?? base;
    };

    const lockedOwned: Array<{
      cardId: number;
      price: number;
      points: number;
    }> = [];
    const unlockedOwned: Array<{
      cardId: number;
      price: number;
      points: number;
    }> = [];
    const unowned: Array<{ cardId: number; price: number; points: number }> =
      [];

    for (const card of mission.cards) {
      const shopCard = shopCardsById.get(card.cardId);
      if (!shopCard) continue;
      const price = getEffectivePrice(card.cardId, shopCard);
      const points = card.points || 0;
      if (shopCard.owned && shopCard.locked) {
        lockedOwned.push({ cardId: card.cardId, price, points });
      } else if (shopCard.owned) {
        unlockedOwned.push({ cardId: card.cardId, price, points });
      } else if (price > 0) {
        unowned.push({ cardId: card.cardId, price, points });
      }
    }

    if (mission.type === "count") {
      const freeCount = Math.min(lockedOwned.length, mission.requiredCount);
      const needed = Math.max(0, mission.requiredCount - freeCount);
      if (needed === 0) {
        return {
          remainingPrice: 0,
          unlockedCardsPrice: 0,
          buyCardIds: new Set(),
          lockCardIds: new Set(),
          isCompletable: true,
        };
      }
      const pool = [
        ...unlockedOwned.map((c) => ({
          ...c,
          // Apply discount, but ensure price is at least 1 PP
          price: Math.max(1, c.price * (1 - discount)),
        })),
        ...unowned,
      ].sort((a, b) => a.price - b.price);
      const chosen = pool.slice(0, needed);
      const unownedIdSet = new Set(unowned.map((c) => c.cardId));
      const buyCardIds = new Set(
        chosen.filter((c) => unownedIdSet.has(c.cardId)).map((c) => c.cardId),
      );
      const lockCardIds = new Set(
        chosen.filter((c) => !unownedIdSet.has(c.cardId)).map((c) => c.cardId),
      );
      const remainingPrice = chosen.reduce(
        (sum, c) => (buyCardIds.has(c.cardId) ? sum + c.price : sum),
        0,
      );
      const unlockedCardsPrice = chosen.reduce(
        (sum, c) => (lockCardIds.has(c.cardId) ? sum + c.price : sum),
        0,
      );
      const isCompletable = chosen.length >= needed;
      return { remainingPrice, unlockedCardsPrice, buyCardIds, lockCardIds, isCompletable };
    }

    // mission.type === 'points'
    const lockedPoints = lockedOwned.reduce((sum, c) => sum + c.points, 0);
    const needed = Math.max(0, mission.requiredCount - lockedPoints);
    if (needed === 0) {
      return {
        remainingPrice: 0,
        unlockedCardsPrice: 0,
        buyCardIds: new Set(),
        lockCardIds: new Set(),
        isCompletable: true,
      };
    }

    const pool = [
      ...unlockedOwned.map((c) => ({
        ...c,
        // Apply discount, but ensure price is at least 1 PP
        price: Math.max(1, c.price * (1 - discount)),
      })),
      ...unowned,
    ].filter((c) => c.points > 0);
    if (pool.length === 0) {
      return {
        remainingPrice: 0,
        unlockedCardsPrice: 0,
        buyCardIds: new Set(),
        lockCardIds: new Set(),
        isCompletable: false,
      };
    }

    const result = this.calculatePriceDetailsPointsTypeDP(pool, needed);
    const unownedIdSet = new Set(unowned.map((c) => c.cardId));
    const chosenIds = new Set(result.includedCards.map((c) => c.cardId));
    const buyCardIds = new Set(
      [...chosenIds].filter((id) => unownedIdSet.has(id)),
    );
    const lockCardIds = new Set(
      [...chosenIds].filter((id) => !unownedIdSet.has(id)),
    );
    const remainingPrice = result.includedCards.reduce(
      (sum, c) => (buyCardIds.has(c.cardId) ? sum + c.price : sum),
      0,
    );
    const unlockedCardsPrice = result.includedCards.reduce(
      (sum, c) => (lockCardIds.has(c.cardId) ? sum + c.price : sum),
      0,
    );
    return { remainingPrice, unlockedCardsPrice, buyCardIds, lockCardIds, isCompletable: result.isCompletable };
  }
}
