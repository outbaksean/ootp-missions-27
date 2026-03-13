import { defineStore } from "pinia";
import MissionHelper from "@/helpers/MissionHelper";
import type { Mission } from "@/models/Mission";
import type { MissionsData } from "@/models/MissionsData";
import type { UserMission } from "@/models/UserMission";
import { ref } from "vue";
import type { MissionCard } from "@/models/MissionCard";
import type { PriceType } from "@/models/PriceType";
import type { ShopCard } from "@/models/ShopCard";
import db from "@/data/indexedDB";
import { useCardStore } from "./useCardStore";
import { useSettingsStore } from "./useSettingsStore";

export function computeMissionCostInfo(
  mission: Mission,
  shopCardsById: Map<number, ShopCard>,
  sellPrice: boolean,
  overrides: Map<number, number>,
  optimize: boolean,
  discount: number,
): {
  remainingPrice: number;
  unlockedCardsPrice: number;
  highlightedIds: Set<number>;
  lockIds: Set<number>;
  isCompletable: boolean;
} {
  if (optimize) {
    const r = MissionHelper.calculateOptimalMissionCost(
      mission,
      shopCardsById,
      sellPrice,
      overrides,
      discount,
    );
    return {
      remainingPrice: r.remainingPrice,
      unlockedCardsPrice: r.unlockedCardsPrice,
      highlightedIds: r.buyCardIds,
      lockIds: r.lockCardIds,
      isCompletable: r.isCompletable,
    };
  }
  const rp = MissionHelper.calculateTotalPriceOfNonOwnedCards(
    mission,
    shopCardsById,
    sellPrice,
    overrides,
  );
  const { totalPrice: unlockedCardsPrice, includedCardIds } =
    MissionHelper.calculateUnlockedCardsPrice(
      mission,
      shopCardsById,
      sellPrice,
      overrides,
      discount,
    );
  return {
    remainingPrice: rp.totalPrice,
    unlockedCardsPrice,
    highlightedIds: new Set(rp.includedCards.map((c) => c.cardId)),
    lockIds: includedCardIds,
    isCompletable: rp.isCompletable,
  };
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const USE_SELL_PRICE_KEY = "ootp-use-sell-price";

export const useMissionStore = defineStore("mission", () => {
  const loading = ref<boolean>(true);
  const missions = ref<Array<Mission>>([]); // cached from CDN
  const userMissions = ref<Array<UserMission>>([]);
  const selectedMission = ref<UserMission | null>(null);
  const selectedPriceType = ref<PriceType>({
    sellPrice: localStorage.getItem(USE_SELL_PRICE_KEY) === "true",
  });
  const missionsVersion = ref<string>("");

  type MissionChainContribution = {
    leafTotals: Map<
      number,
      { remainingPrice: number; unlockedCardsPrice: number }
    >;
    rewardByMissionId: Map<number, number>;
    hasAnyRewardData: boolean;
    isCompletable: boolean;
    // Maps each selected direct-child sub-mission raw ID to the set of leaf raw IDs it contributes.
    selectedSubMissionLeafIds: Map<number, Set<number>>;
  };

  function sumLeafTotals(
    leafTotals: Map<
      number,
      { remainingPrice: number; unlockedCardsPrice: number }
    >,
  ): { remainingPrice: number; unlockedCardsPrice: number } {
    let remainingPrice = 0;
    let unlockedCardsPrice = 0;
    for (const value of leafTotals.values()) {
      remainingPrice += value.remainingPrice;
      unlockedCardsPrice += value.unlockedCardsPrice;
    }
    return { remainingPrice, unlockedCardsPrice };
  }

  function aggregateMissionChainContribution(
    userMission: UserMission,
    missionsByRawId: Map<number, UserMission>,
    visiting = new Set<number>(),
  ): MissionChainContribution {
    const raw = userMission.rawMission;

    if (visiting.has(raw.id)) {
      return {
        leafTotals: new Map(),
        rewardByMissionId: new Map(),
        hasAnyRewardData: false,
        isCompletable: false,
        selectedSubMissionLeafIds: new Map(),
      };
    }

    if (raw.type !== "missions") {
      const leafTotals = new Map<
        number,
        { remainingPrice: number; unlockedCardsPrice: number }
      >();
      const rewardByMissionId = new Map<number, number>();

      if (!userMission.completed) {
        leafTotals.set(raw.id, {
          remainingPrice: userMission.remainingPrice,
          unlockedCardsPrice: userMission.unlockedCardsPrice,
        });
        if (userMission.rewardValue !== undefined) {
          rewardByMissionId.set(raw.id, userMission.rewardValue);
        }
      }

      return {
        leafTotals,
        rewardByMissionId,
        hasAnyRewardData:
          !userMission.completed && userMission.rewardValue !== undefined,
        isCompletable: userMission.completed || userMission.isCompletable,
        selectedSubMissionLeafIds: new Map(),
      };
    }

    const missionIds = raw.missionIds ?? [];
    const subMissions = missionIds
      .map((id) => missionsByRawId.get(id))
      .filter((m): m is UserMission => Boolean(m));

    const completedCount = subMissions.filter((m) => m.completed).length;
    const completableCount = subMissions.filter(
      (m) => m.completed || m.isCompletable,
    ).length;
    const remainingCount = Math.max(raw.requiredCount - completedCount, 0);

    visiting.add(raw.id);

    const candidates = subMissions
      .filter((m) => !m.completed)
      .map((m) => {
        const contribution = aggregateMissionChainContribution(
          m,
          missionsByRawId,
          visiting,
        );
        const totals = sumLeafTotals(contribution.leafTotals);
        return {
          mission: m,
          contribution,
          selectionCost: totals.remainingPrice,
        };
      })
      .sort((a, b) => a.selectionCost - b.selectionCost)
      .slice(0, remainingCount);

    const leafTotals = new Map<
      number,
      { remainingPrice: number; unlockedCardsPrice: number }
    >();
    const rewardByMissionId = new Map<number, number>();
    let hasAnyRewardData = false;

    for (const candidate of candidates) {
      for (const [leafId, totals] of candidate.contribution.leafTotals) {
        if (!leafTotals.has(leafId)) {
          leafTotals.set(leafId, totals);
        }
      }
      for (const [missionId, rewardValue] of candidate.contribution
        .rewardByMissionId) {
        if (!rewardByMissionId.has(missionId)) {
          rewardByMissionId.set(missionId, rewardValue);
        }
      }
      hasAnyRewardData =
        hasAnyRewardData || candidate.contribution.hasAnyRewardData;
    }

    if (!userMission.completed && userMission.rewardValue !== undefined) {
      rewardByMissionId.set(raw.id, userMission.rewardValue);
      hasAnyRewardData = true;
    }

    const selectedSubMissionLeafIds = new Map<number, Set<number>>();
    for (const candidate of candidates) {
      selectedSubMissionLeafIds.set(
        candidate.mission.rawMission.id,
        new Set(candidate.contribution.leafTotals.keys()),
      );
    }

    visiting.delete(raw.id);

    return {
      leafTotals,
      rewardByMissionId,
      hasAnyRewardData,
      isCompletable: completableCount >= raw.requiredCount,
      selectedSubMissionLeafIds,
    };
  }

  function computeCompleted(
    _missionId: number,
    rawMission: Mission,
    missionCards: MissionCard[],
  ): boolean {
    const settingsStore = useSettingsStore();
    if (rawMission.type === "count") {
      if (settingsStore.optimizedMode) {
        const lockedCount = missionCards.filter(
          (c) => c.owned && c.locked,
        ).length;
        return lockedCount >= rawMission.requiredCount;
      } else {
        const ownedCount = missionCards.filter((c) => c.owned).length;
        return ownedCount >= rawMission.requiredCount;
      }
    }
    if (rawMission.type === "points") {
      if (settingsStore.optimizedMode) {
        const lockedPoints = missionCards
          .filter((c) => c.owned && c.locked)
          .reduce((sum, c) => sum + (c.points ?? 0), 0);
        return lockedPoints >= rawMission.requiredCount;
      } else {
        const ownedPoints = missionCards
          .filter((c) => c.owned)
          .reduce((sum, c) => sum + (c.points ?? 0), 0);
        return ownedPoints >= rawMission.requiredCount;
      }
    }
    return false; // missions-type handled separately
  }

  function rebuildCountMission(userMission: UserMission) {
    const cardStore = useCardStore();
    const settingsStore = useSettingsStore();
    const mission = userMission.rawMission;
    const shopCardsById = cardStore.shopCardsById;
    const overrides = cardStore.cardPriceOverrides;

    const costInfo = computeMissionCostInfo(
      mission,
      shopCardsById,
      selectedPriceType.value.sellPrice,
      overrides,
      settingsStore.optimizedMode,
      settingsStore.unlockedCardDiscount,
    );

    const missionCards = mission.cards
      .map((card) => {
        const shopCard = shopCardsById.get(card.cardId);
        if (!shopCard || shopCard.cardId === undefined) {
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

        const basePrice = selectedPriceType.value.sellPrice
          ? shopCard.sellOrderLow > 0
            ? shopCard.sellOrderLow
            : shopCard.lastPrice
          : shopCard.lastPrice;
        const price = overrides.get(card.cardId) ?? basePrice;

        const highlighted =
          costInfo.remainingPrice > 0 &&
          costInfo.highlightedIds.has(card.cardId);

        return {
          cardId: shopCard.cardId,
          title: shopCard.cardTitle,
          owned: shopCard.owned,
          locked: shopCard.locked,
          available: shopCard.owned || price > 0,
          price,
          highlighted,
          points: card.points || 0,
          shouldLock: false,
          cardType: shopCard.cardType,
        };
      })
      .filter((card) => card !== null)
      .sort((a, b) => {
        if (a.owned !== b.owned) return a.owned ? 1 : -1;
        if (a.locked !== b.locked) return a.locked ? 1 : -1;
        return a.price - b.price;
      });

    const ownedCount = mission.cards.filter(
      (card) => shopCardsById.get(card.cardId)?.owned,
    ).length;
    const lockedCount = missionCards.filter((c) => c.owned && c.locked).length;
    const lockedSuffix =
      settingsStore.optimizedMode && lockedCount > 0
        ? `, ${lockedCount} locked`
        : "";

    for (const mc of missionCards) {
      mc.shouldLock = costInfo.lockIds.has(mc.cardId);
    }

    const completed = computeCompleted(mission.id, mission, missionCards);
    const rewardValue = MissionHelper.calculateRewardValue(
      mission.rewards,
      settingsStore.packPrices,
      shopCardsById,
      settingsStore.includeCardRewardsInValue,
    );

    const unlockedDeduction = settingsStore.optimizedMode
      ? costInfo.unlockedCardsPrice
      : 0;

    userMission.progressText = `${ownedCount} / ${mission.requiredCount} owned (${mission.cards.length} total${lockedSuffix})`;
    userMission.completed = completed;
    userMission.isCompletable = costInfo.isCompletable;
    userMission.missionCards = missionCards;
    userMission.remainingPrice = costInfo.remainingPrice;
    userMission.unlockedCardsPrice = costInfo.unlockedCardsPrice;
    userMission.rewardValue = rewardValue;
    userMission.missionValue =
      rewardValue !== undefined
        ? rewardValue - costInfo.remainingPrice - unlockedDeduction
        : undefined;
  }

  function rebuildMissionsTypeMission(userMission: UserMission) {
    const cardStore = useCardStore();
    const settingsStore = useSettingsStore();
    const mission = userMission.rawMission;
    const shopCardsById = cardStore.shopCardsById;

    if (!mission.missionIds || mission.missionIds.length === 0) {
      return;
    }

    const missionsByRawId = new Map(
      userMissions.value.map((um) => [um.rawMission.id, um]),
    );
    const subMissions = mission.missionIds
      .map((id) => missionsByRawId.get(id))
      .filter((um): um is UserMission => Boolean(um));
    const completedCount = subMissions.filter((m) => m.completed).length;

    const rewardValueMissions = MissionHelper.calculateRewardValue(
      mission.rewards,
      settingsStore.packPrices,
      shopCardsById,
      settingsStore.includeCardRewardsInValue,
    );
    userMission.rewardValue = rewardValueMissions;

    const chainContribution = aggregateMissionChainContribution(
      userMission,
      missionsByRawId,
    );
    const totals = sumLeafTotals(chainContribution.leafTotals);

    // Card-level deduplication across selected leaf missions
    const cardSeenInLeaves = new Map<
      number,
      { price: number; title: string; count: number }
    >();
    for (const leafRawId of chainContribution.leafTotals.keys()) {
      const leaf = missionsByRawId.get(leafRawId);
      if (!leaf) continue;
      for (const card of leaf.missionCards) {
        if (card.highlighted && !card.owned) {
          const existing = cardSeenInLeaves.get(card.cardId);
          if (existing) {
            existing.count++;
          } else {
            cardSeenInLeaves.set(card.cardId, {
              price: card.price,
              title: card.title,
              count: 1,
            });
          }
        }
      }
    }

    const sharedMissionCards: Array<{
      cardId: number;
      title: string;
      price: number;
    }> = [];
    let cardSharedSavings = 0;
    for (const [cardId, info] of cardSeenInLeaves) {
      if (info.count >= 2) {
        cardSharedSavings += info.price * (info.count - 1);
        sharedMissionCards.push({
          cardId,
          title: info.title,
          price: info.price,
        });
      }
    }

    userMission.sharedMissionCards = sharedMissionCards.length
      ? sharedMissionCards
      : undefined;
    userMission.cardSharedSavings =
      cardSharedSavings > 0 ? cardSharedSavings : undefined;

    // Leaf-mission deduplication: detect leaf missions shared across selected sub-missions.
    // Clear stale data first, then repopulate for sub-missions that have shared leaves.
    for (const subMission of subMissions) {
      subMission.sharedLeafSubMissions = undefined;
    }
    const leafIdToSubMissionRawIds = new Map<number, number[]>();
    for (const [
      subMissionRawId,
      leafIds,
    ] of chainContribution.selectedSubMissionLeafIds) {
      for (const leafId of leafIds) {
        const list = leafIdToSubMissionRawIds.get(leafId) ?? [];
        list.push(subMissionRawId);
        leafIdToSubMissionRawIds.set(leafId, list);
      }
    }
    for (const [
      subMissionRawId,
      leafIds,
    ] of chainContribution.selectedSubMissionLeafIds) {
      const subMission = missionsByRawId.get(subMissionRawId);
      if (!subMission) continue;
      const sharedLeaves: Array<{
        id: number;
        name: string;
        remainingPrice: number;
      }> = [];
      for (const leafId of leafIds) {
        const sharingIds = leafIdToSubMissionRawIds.get(leafId);
        if (sharingIds && sharingIds.length >= 2) {
          const leaf = missionsByRawId.get(leafId);
          if (leaf) {
            sharedLeaves.push({
              id: leafId,
              name: leaf.rawMission.name,
              remainingPrice: leaf.remainingPrice,
            });
          }
        }
      }
      subMission.sharedLeafSubMissions = sharedLeaves.length
        ? sharedLeaves
        : undefined;
    }

    userMission.progressText = `${completedCount} / ${mission.requiredCount} missions (${mission.missionIds?.length} total)`;
    userMission.remainingPrice = totals.remainingPrice - cardSharedSavings;
    userMission.isCompletable = chainContribution.isCompletable;
    userMission.unlockedCardsPrice = totals.unlockedCardsPrice;
    userMission.completed = completedCount >= mission.requiredCount;

    const combinedRewardValue = chainContribution.hasAnyRewardData
      ? Array.from(chainContribution.rewardByMissionId.values()).reduce(
          (sum, reward) => sum + reward,
          0,
        )
      : undefined;
    userMission.combinedRewardValue = combinedRewardValue;

    const unlockedDeductionMissions = settingsStore.optimizedMode
      ? totals.unlockedCardsPrice
      : 0;
    // Use combinedRewardValue for Net so it reflects the full reward from the chain.
    userMission.missionValue =
      combinedRewardValue !== undefined
        ? combinedRewardValue -
          userMission.remainingPrice -
          unlockedDeductionMissions
        : undefined;
  }

  async function calculateMissionDetails(
    missionId: number,
    isSubMission = false,
    force = false,
  ) {
    if (!isSubMission) {
      loading.value = true;
    }
    const cardStore = useCardStore();
    const settingsStore = useSettingsStore();
    const shopCardsById = cardStore.shopCardsById;
    const overrides = cardStore.cardPriceOverrides;
    const userMission = userMissions.value.find((m) => m.id === missionId);
    if (
      !userMission ||
      (!force && userMission.progressText !== "Not Calculated")
    ) {
      return;
    }

    const mission = userMission.rawMission;

    if (mission.type === "points") {
      const costInfo = computeMissionCostInfo(
        mission,
        shopCardsById,
        selectedPriceType.value.sellPrice,
        overrides,
        settingsStore.optimizedMode,
        settingsStore.unlockedCardDiscount,
      );
      const missionCards = mission.cards
        .map((card) => {
          const shopCard = shopCardsById.get(card.cardId);
          if (!shopCard || shopCard.cardId === undefined) {
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

          const basePrice = selectedPriceType.value.sellPrice
            ? shopCard.sellOrderLow > 0
              ? shopCard.sellOrderLow
              : shopCard.lastPrice
            : shopCard.lastPrice;
          const price = overrides.get(card.cardId) ?? basePrice;

          const highlighted =
            costInfo.remainingPrice > 0 &&
            costInfo.highlightedIds.has(card.cardId);

          return {
            cardId: shopCard.cardId,
            title: shopCard.cardTitle,
            owned: shopCard.owned,
            locked: shopCard.locked,
            available: shopCard.owned || price > 0,
            price,
            highlighted,
            points: card.points || 0,
            shouldLock: false,
            cardType: shopCard.cardType,
          };
        })
        .filter((card) => card !== null)
        .sort((a, b) => {
          if (a.owned !== b.owned) return a.owned ? 1 : -1;
          if (a.locked !== b.locked) return a.locked ? 1 : -1;
          return a.price - b.price;
        });

      const ownedPoints = mission.cards.reduce((total, mc) => {
        const shopCard = shopCardsById.get(mc.cardId);
        return total + (shopCard?.owned ? mc.points || 0 : 0);
      }, 0);
      const lockedPoints = missionCards
        .filter((c) => c.owned && c.locked)
        .reduce((sum, c) => sum + (c.points ?? 0), 0);
      const lockedPointsSuffix =
        settingsStore.optimizedMode && lockedPoints > 0
          ? `, ${lockedPoints.toLocaleString()} locked`
          : "";

      const remainingPoints = mission.requiredCount - ownedPoints;
      userMission.progressText = `${ownedPoints.toLocaleString()} / ${mission.requiredCount.toLocaleString()} pts (${remainingPoints.toLocaleString()} remaining, ${mission.totalPoints?.toLocaleString()} total${lockedPointsSuffix})`;
      for (const mc of missionCards) {
        mc.shouldLock = costInfo.lockIds.has(mc.cardId);
      }
      const completed = computeCompleted(mission.id, mission, missionCards);
      userMission.completed = completed;
      userMission.isCompletable = costInfo.isCompletable;
      userMission.missionCards = missionCards;
      userMission.remainingPrice = costInfo.remainingPrice;
      userMission.unlockedCardsPrice = costInfo.unlockedCardsPrice;
      const rewardValuePoints = MissionHelper.calculateRewardValue(
        mission.rewards,
        settingsStore.packPrices,
        shopCardsById,
        settingsStore.includeCardRewardsInValue,
      );
      userMission.rewardValue = rewardValuePoints;
      const unlockedDeductionPoints = settingsStore.optimizedMode
        ? costInfo.unlockedCardsPrice
        : 0;
      userMission.missionValue =
        rewardValuePoints !== undefined
          ? rewardValuePoints -
            costInfo.remainingPrice -
            unlockedDeductionPoints
          : undefined;
    }

    if (mission.type === "missions") {
      if (!mission.missionIds || mission.missionIds.length === 0) {
        loading.value = false;
        return;
      }
      await Promise.all(
        mission.missionIds.map((id) =>
          calculateMissionDetails(id, true, force),
        ),
      );

      rebuildMissionsTypeMission(userMission);
    }

    if (!isSubMission) {
      loading.value = false;
    }
  }

  function buildUserMissions() {
    userMissions.value = missions.value.map((mission) => {
      if (mission.type === "missions" || mission.type === "points") {
        return {
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
      }

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

      rebuildCountMission(userMission);
      return userMission;
    });

    // Propagate sub-mission completion up to missions-type parents.
    // Missions are in ascending ID order so children are always visited before parents.
    for (const um of userMissions.value) {
      if (um.rawMission.type !== "missions") continue;
      const subs = userMissions.value.filter((sub) =>
        um.rawMission.missionIds?.includes(sub.rawMission.id),
      );
      const completedCount = subs.filter((s) => s.completed).length;
      um.completed = completedCount >= um.rawMission.requiredCount;
    }
  }

  function recomputeMissionValues() {
    const cardStore = useCardStore();
    const settingsStore = useSettingsStore();
    for (const um of userMissions.value) {
      if (um.progressText === "Not Calculated") continue;
      if (um.rawMission.type === "missions") continue;
      const rewardValue = MissionHelper.calculateRewardValue(
        um.rawMission.rewards,
        settingsStore.packPrices,
        cardStore.shopCardsById,
        settingsStore.includeCardRewardsInValue,
      );
      um.rewardValue = rewardValue;
      const unlockedDeduction = settingsStore.optimizedMode
        ? um.unlockedCardsPrice
        : 0;
      um.missionValue =
        rewardValue !== undefined
          ? rewardValue - um.remainingPrice - unlockedDeduction
          : undefined;
    }

    const missionsType = userMissions.value
      .filter(
        (um) =>
          um.progressText !== "Not Calculated" &&
          um.rawMission.type === "missions",
      )
      .sort((a, b) => a.id - b.id);

    for (const missionType of missionsType) {
      rebuildMissionsTypeMission(missionType);
    }
  }

  async function fetchAndCacheMissions(): Promise<MissionsData> {
    const res = await fetch("/ootp-missions-27/data/missions.json");
    const data: MissionsData = await res.json();
    await db.missionsCache.put({
      id: 1,
      version: data.version,
      cachedAt: Date.now(),
      data: data.missions,
    });
    return data;
  }

  async function initialize() {
    loading.value = true;

    const cached = await db.missionsCache.get(1);
    // Array.isArray guards against a corrupted entry where the envelope object
    // { version, missions } was accidentally stored as `data` instead of the array.
    const cacheUsable =
      cached !== null && cached !== undefined && Array.isArray(cached.data);
    const cacheExpired =
      !cacheUsable ||
      (cached.cachedAt !== null &&
        cached.cachedAt !== undefined &&
        Date.now() - cached.cachedAt > CACHE_TTL_MS);

    if (cacheUsable && !cacheExpired) {
      missions.value = cached.data;
      missionsVersion.value = cached.version;
      buildUserMissions();
      await calculateAllNotCalculatedMissions(
        missions.value.map((mission) => mission.id),
      );
      loading.value = false;
      // Refresh cache in background without blocking the UI
      fetchAndCacheMissions()
        .then((fresh) => {
          if (fresh.version !== missionsVersion.value) {
            missions.value = fresh.missions;
            missionsVersion.value = fresh.version;
            buildUserMissions();
            calculateAllNotCalculatedMissions(
              missions.value.map((mission) => mission.id),
            );
          }
        })
        .catch(() => {
          // Silently ignore — we already have cached data
        });
      return;
    }

    try {
      const fresh = await fetchAndCacheMissions();
      missions.value = fresh.missions;
      missionsVersion.value = fresh.version;
    } catch (e) {
      console.error("Failed to load missions", e);
      // Fall back to stale cache if available
      if (cached) {
        missions.value = cached.data;
        missionsVersion.value = cached.version;
      } else {
        loading.value = false;
        return;
      }
    }

    buildUserMissions();
    await calculateAllNotCalculatedMissions(
      missions.value.map((mission) => mission.id),
    );
    loading.value = false;
  }

  async function recalculateMissionsForCardIds(cardIds: Set<number>) {
    if (cardIds.size === 0) return;

    loading.value = true;

    const modifiedIds = new Set<number>();
    const pointsToRecalculate: number[] = [];

    for (const mission of userMissions.value) {
      if (mission.rawMission.type === "missions") continue;
      const hasCard = mission.rawMission.cards.some((c) =>
        cardIds.has(c.cardId),
      );
      if (!hasCard) continue;

      modifiedIds.add(mission.id);

      if (mission.rawMission.type === "count") {
        rebuildCountMission(mission);
      } else if (mission.rawMission.type === "points") {
        pointsToRecalculate.push(mission.id);
      }
    }

    await Promise.all(
      pointsToRecalculate.map((id) => calculateMissionDetails(id, true, true)),
    );

    if (modifiedIds.size > 0) {
      for (const mission of userMissions.value) {
        if (mission.rawMission.type !== "missions") continue;
        const subIds = mission.rawMission.missionIds ?? [];
        if (!subIds.some((id) => modifiedIds.has(id))) continue;
        rebuildMissionsTypeMission(mission);
      }
    }

    loading.value = false;
  }

  async function updateCardLockedState(cardId: number) {
    await recalculateMissionsForCardIds(new Set([cardId]));
  }

  async function updateCardOwnedState(cardId: number) {
    await recalculateMissionsForCardIds(new Set([cardId]));
  }

  async function handlePriceOverrideChanged(
    missionId?: number,
    cardIds?: number[],
  ) {
    const cardStore = useCardStore();
    const overriddenIds = new Set([
      ...cardStore.cardPriceOverrides.keys(),
      ...cardStore.cardOwnedOverrides,
      ...(cardIds ?? []),
    ]);

    if (overriddenIds.size === 0 && missionId) {
      const selected = userMissions.value.find((um) => um.id === missionId);
      for (const card of selected?.rawMission.cards ?? []) {
        overriddenIds.add(card.cardId);
      }
    }

    await recalculateMissionsForCardIds(overriddenIds);
  }

  async function calculateAllNotCalculatedMissions(missionIds: number[]) {
    loading.value = true;
    const notCalculated = userMissions.value.filter(
      (m) => m.progressText === "Not Calculated" && missionIds.includes(m.id),
    );
    // Calculate leaf missions (count/points) first so parents aggregate
    // from real values rather than the initial zeros.
    const leaves = notCalculated.filter(
      (m) => m.rawMission.type !== "missions",
    );
    const parents = notCalculated.filter(
      (m) => m.rawMission.type === "missions",
    );
    await Promise.all(leaves.map((m) => calculateMissionDetails(m.id, true)));
    // Parents must be processed in ascending ID order: the data guarantees
    // parent IDs are always higher than their children, so sorting ascending
    // ensures each aggregation reads from already-completed sub-missions.
    parents.sort((a, b) => a.id - b.id);
    for (const parent of parents) {
      await calculateMissionDetails(parent.id, true);
    }
    loading.value = false;
  }

  function setUseSellPrice(value: boolean) {
    selectedPriceType.value.sellPrice = value;
    localStorage.setItem(USE_SELL_PRICE_KEY, String(value));
  }

  function setLoading(value: boolean) {
    loading.value = value;
  }

  return {
    userMissions,
    selectedMission,
    selectedPriceType,
    missionsVersion,
    loading,
    initialize,
    buildUserMissions,
    setUseSellPrice,
    setLoading,
    updateCardLockedState,
    updateCardOwnedState,
    handlePriceOverrideChanged,
    calculateMissionDetails,
    calculateAllNotCalculatedMissions,
    recomputeMissionValues,
  };
});
