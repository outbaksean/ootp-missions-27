/**
 * Scenario loader for test suites.
 *
 * Transforms TestScenario data into UserMission objects suitable for unit tests,
 * simulating the mission calculation process without requiring the full store.
 */

import type { TestScenario } from "./types";
import type { UserMission } from "@/models/UserMission";
import type { MissionCard } from "@/models/MissionCard";
import type { ShopCard } from "@/models/ShopCard";
import MissionHelper from "@/helpers/MissionHelper";
import { PACK_TYPE_DEFAULTS } from "@/stores/useSettingsStore";

/**
 * Loads a test scenario and returns UserMissions ready for testing.
 *
 * @param scenario The test scenario to load
 * @param options Optional configuration for the load
 * @returns UserMissions with calculations applied
 */
export function loadScenario(
  scenario: TestScenario,
  options: {
    useSellPrice?: boolean;
    discount?: number;
  } = {},
): {
  userMissions: UserMission[];
  shopCardsById: Map<number, ShopCard>;
  packPrices: Map<string, number>;
} {
  const { useSellPrice = false, discount = 0 } = options;

  // Build shop cards map
  const shopCardsById = new Map<number, ShopCard>();
  const ownedSet = new Set(scenario.ownedCardIds ?? []);
  const lockedSet = new Set(scenario.lockedCardIds ?? []);

  for (const card of scenario.shopCards) {
    const isOwned = ownedSet.has(card.cardId);
    const isLocked = lockedSet.has(card.cardId);

    shopCardsById.set(card.cardId, {
      ...card,
      owned: isOwned,
      locked: isLocked,
    });
  }

  // Convert PACK_TYPE_DEFAULTS to Map
  const packPrices = new Map(Object.entries(PACK_TYPE_DEFAULTS));

  // Sort missions so leaf missions are processed before chain missions
  const sortedMissions = [...scenario.missions].sort((a, b) => {
    if (a.type === "missions" && b.type !== "missions") return 1;
    if (a.type !== "missions" && b.type === "missions") return -1;
    return 0;
  });

  // Create UserMissions map to track processed missions
  const processedMissions = new Map<number, UserMission>();

  // Create UserMissions
  const userMissions: UserMission[] = sortedMissions.map((mission) => {
    const userMission: UserMission = {
      id: mission.id,
      rawMission: mission,
      progressText: "Not Calculated",
      completed: false,
      isCompletable: true,
      missionCards: [],
      remainingPrice: 0,
      unlockedCardsPrice: 0,
      rewardValue: undefined,
      missionValue: undefined,
    };

    // Calculate for leaf missions (count/points)
    if (mission.type === "count" || mission.type === "points") {
      const costInfo = MissionHelper.calculateOptimalMissionCost(
        mission,
        shopCardsById,
        useSellPrice,
        scenario.priceOverrides,
        discount,
      );

      // Build mission cards
      const missionCards: MissionCard[] = mission.cards.map((card) => {
        const shopCard = shopCardsById.get(card.cardId);
        if (!shopCard) {
          return {
            cardId: card.cardId,
            title: `Card #${card.cardId}`,
            owned: false,
            locked: false,
            available: false,
            price: 0,
            points: card.points || 0,
            highlighted: false,
            shouldLock: false,
          };
        }

        const effectivePrice =
          useSellPrice && shopCard.sellOrderLow > 0
            ? shopCard.sellOrderLow
            : shopCard.lastPrice;
        const overridePrice = scenario.priceOverrides?.get(card.cardId);
        const price = overridePrice ?? effectivePrice;

        return {
          cardId: card.cardId,
          title: shopCard.cardTitle,
          owned: shopCard.owned,
          locked: shopCard.locked,
          available: true,
          price: Math.max(1, price * (1 - discount)),
          points: card.points || 0,
          highlighted: costInfo.buyCardIds.has(card.cardId),
          shouldLock: costInfo.lockCardIds.has(card.cardId),
        };
      });

      userMission.missionCards = missionCards;
      userMission.remainingPrice = costInfo.remainingPrice;
      userMission.unlockedCardsPrice = costInfo.unlockedCardsPrice;
      userMission.isCompletable = costInfo.isCompletable;

      // Calculate completion status for count missions
      if (mission.type === "count") {
        const ownedCount = missionCards.filter((c) => c.owned).length;
        const lockedCount = missionCards.filter((c) => c.locked).length;
        userMission.completed = ownedCount >= mission.requiredCount;
        userMission.progressText = `${ownedCount} / ${mission.requiredCount} owned (${mission.cards.length} total${lockedCount > 0 ? `, ${lockedCount} locked` : ""})`;
      } else {
        // Points mission
        const ownedPoints = missionCards
          .filter((c) => c.owned)
          .reduce((sum, c) => sum + (c.points || 0), 0);
        userMission.completed = ownedPoints >= mission.requiredCount;
        userMission.progressText = `${ownedPoints} / ${mission.requiredCount} points`;
      }

      // Calculate reward value
      userMission.rewardValue = MissionHelper.calculateRewardValue(
        mission.rewards,
        packPrices,
        shopCardsById,
      );

      // Calculate mission value (net)
      if (userMission.rewardValue !== undefined) {
        userMission.missionValue =
          userMission.rewardValue -
          userMission.remainingPrice -
          userMission.unlockedCardsPrice;
      }
    }
    // Handle missions-type missions
    else if (mission.type === "missions") {
      const subMissions = (mission.missionIds ?? [])
        .map((id) => processedMissions.get(id))
        .filter((m): m is UserMission => Boolean(m));

      const completedCount = subMissions.filter((m) => m.completed).length;
      userMission.completed = completedCount >= mission.requiredCount;
      userMission.progressText = `${completedCount} / ${mission.requiredCount} missions (${mission.missionIds?.length} total)`;

      // Sum up leaf mission costs
      const leafMissions = subMissions.filter(
        (m) => m.rawMission.type !== "missions",
      );
      userMission.remainingPrice = leafMissions.reduce(
        (sum, m) => sum + m.remainingPrice,
        0,
      );
      userMission.unlockedCardsPrice = leafMissions.reduce(
        (sum, m) => sum + m.unlockedCardsPrice,
        0,
      );
      userMission.isCompletable = leafMissions.every(
        (m) => m.completed || m.isCompletable,
      );

      // Calculate reward value for the chain
      userMission.rewardValue = MissionHelper.calculateRewardValue(
        mission.rewards,
        packPrices,
        shopCardsById,
      );

      // Combined reward value includes sub-missions
      const subRewards = subMissions
        .filter((m) => m.rewardValue !== undefined)
        .reduce((sum, m) => sum + m.rewardValue!, 0);
      userMission.combinedRewardValue =
        (userMission.rewardValue ?? 0) + subRewards;

      // Calculate mission value using combined rewards
      if (userMission.combinedRewardValue !== undefined) {
        userMission.missionValue =
          userMission.combinedRewardValue -
          userMission.remainingPrice -
          userMission.unlockedCardsPrice;
      }
    }

    // Store the processed mission
    processedMissions.set(mission.id, userMission);

    return userMission;
  });

  return {
    userMissions,
    shopCardsById,
    packPrices,
  };
}
