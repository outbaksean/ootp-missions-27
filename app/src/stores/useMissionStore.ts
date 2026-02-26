import { defineStore } from "pinia";
import MissionHelper from "@/helpers/MissionHelper";
import type { Mission } from "@/models/Mission";
import type { MissionsData } from "@/models/MissionsData";
import type { UserMission } from "@/models/UserMission";
import { readonly, ref } from "vue";
import type { MissionCard } from "@/models/MissionCard";
import type { PriceType } from "@/models/PriceType";
import type { ShopCard } from "@/models/ShopCard";
import db from "@/data/indexedDB";
import { useCardStore } from "./useCardStore";
import { useSettingsStore } from "./useSettingsStore";

function computeMissionCostInfo(
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
const MANUAL_COMPLETE_KEY = "ootp-manual-complete";

export const useMissionStore = defineStore("mission", () => {
  const loading = ref<boolean>(true);
  const missions = ref<Array<Mission>>([]); // cached from CDN
  const userMissions = ref<Array<UserMission>>([]);
  const selectedMission = ref<UserMission | null>(null);
  const selectedPriceType = ref<PriceType>({
    sellPrice: localStorage.getItem(USE_SELL_PRICE_KEY) === "true",
  });
  const missionsVersion = ref<string>("");

  function loadManualCompleteOverrides(): Set<number> {
    try {
      const stored = localStorage.getItem(MANUAL_COMPLETE_KEY);
      return stored ? new Set(JSON.parse(stored) as number[]) : new Set();
    } catch {
      return new Set();
    }
  }

  function saveManualCompleteOverrides() {
    localStorage.setItem(
      MANUAL_COMPLETE_KEY,
      JSON.stringify([...manualCompleteOverrides.value]),
    );
  }

  const manualCompleteOverrides = ref<Set<number>>(
    loadManualCompleteOverrides(),
  );

  function computeCompleted(
    missionId: number,
    rawMission: Mission,
    missionCards: MissionCard[],
  ): boolean {
    if (manualCompleteOverrides.value.has(missionId)) return true;
    if (rawMission.type === "count") {
      const lockedCount = missionCards.filter(
        (c) => c.owned && c.locked,
      ).length;
      return lockedCount >= rawMission.requiredCount;
    }
    if (rawMission.type === "points") {
      const lockedPoints = missionCards
        .filter((c) => c.owned && c.locked)
        .reduce((sum, c) => sum + (c.points ?? 0), 0);
      return lockedPoints >= rawMission.requiredCount;
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
      settingsStore.optimizeCardSelection,
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
    const lockedSuffix = lockedCount > 0 ? `, ${lockedCount} locked` : "";

    for (const mc of missionCards) {
      mc.shouldLock = costInfo.lockIds.has(mc.cardId);
    }

    const completed = computeCompleted(mission.id, mission, missionCards);
    const rewardValue = MissionHelper.calculateRewardValue(
      mission.rewards,
      settingsStore.packPrices,
      shopCardsById,
      selectedPriceType.value.sellPrice,
    );

    const unlockedDeduction = settingsStore.subtractUnlockedCards
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

    const subMissions = userMissions.value.filter(
      (um) =>
        mission.missionIds &&
        mission.missionIds.some((id) => id === um.rawMission.id),
    );
    const completedCount = subMissions.filter((m) => m.completed).length;
    const completableCount = subMissions.filter((m) => m.isCompletable).length;
    const remainingCount = mission.requiredCount - completedCount;
    const totalRemainingPrice = subMissions
      .filter((m) => !m.completed)
      .filter((m) => m.remainingPrice > 0)
      .map((m) => m.remainingPrice)
      .sort((a, b) => a - b)
      .slice(0, remainingCount)
      .reduce((sum, price) => sum + price, 0);

    const totalUnlockedCardsPrice = subMissions.reduce(
      (sum, m) => sum + m.unlockedCardsPrice,
      0,
    );
    userMission.progressText = `${completedCount} / ${mission.requiredCount} missions (${mission.missionIds?.length} total)`;
    userMission.remainingPrice = totalRemainingPrice;
    userMission.isCompletable = completableCount >= mission.requiredCount;
    userMission.unlockedCardsPrice = totalUnlockedCardsPrice;
    userMission.completed =
      manualCompleteOverrides.value.has(mission.id) ||
      completedCount >= mission.requiredCount;
    const rewardValueMissions = MissionHelper.calculateRewardValue(
      mission.rewards,
      settingsStore.packPrices,
      shopCardsById,
      selectedPriceType.value.sellPrice,
    );
    userMission.rewardValue = rewardValueMissions;
    const unlockedDeductionMissions = settingsStore.subtractUnlockedCards
      ? totalUnlockedCardsPrice
      : 0;
    userMission.missionValue =
      rewardValueMissions !== undefined
        ? rewardValueMissions - totalRemainingPrice - unlockedDeductionMissions
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
        settingsStore.optimizeCardSelection,
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
        lockedPoints > 0 ? `, ${lockedPoints.toLocaleString()} locked` : "";

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
        selectedPriceType.value.sellPrice,
      );
      userMission.rewardValue = rewardValuePoints;
      const unlockedDeductionPoints = settingsStore.subtractUnlockedCards
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
      um.completed =
        manualCompleteOverrides.value.has(um.id) ||
        completedCount >= um.rawMission.requiredCount;
    }
  }

  function recomputeMissionValues() {
    const cardStore = useCardStore();
    const settingsStore = useSettingsStore();
    for (const um of userMissions.value) {
      if (um.progressText === "Not Calculated") continue;
      const rewardValue = MissionHelper.calculateRewardValue(
        um.rawMission.rewards,
        settingsStore.packPrices,
        cardStore.shopCardsById,
        selectedPriceType.value.sellPrice,
      );
      um.rewardValue = rewardValue;
      const unlockedDeduction = settingsStore.subtractUnlockedCards
        ? um.unlockedCardsPrice
        : 0;
      um.missionValue =
        rewardValue !== undefined
          ? rewardValue - um.remainingPrice - unlockedDeduction
          : undefined;
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

  async function updateCardLockedState(cardId: number, _locked: boolean) {
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

  function recomputeCompletedForMission(missionId: number) {
    const mission = userMissions.value.find((m) => m.id === missionId);
    if (!mission) return;

    if (mission.rawMission.type === "missions") {
      const subs = userMissions.value.filter((um) =>
        mission.rawMission.missionIds?.includes(um.rawMission.id),
      );
      const count = subs.filter((m) => m.completed).length;
      mission.completed =
        manualCompleteOverrides.value.has(missionId) ||
        count >= mission.rawMission.requiredCount;
    } else {
      mission.completed = computeCompleted(
        missionId,
        mission.rawMission,
        mission.missionCards,
      );
    }

    // Propagate to any missions-type parents (including uncalculated ones)
    for (const parent of userMissions.value) {
      if (parent.rawMission.type !== "missions") continue;
      if (!parent.rawMission.missionIds?.includes(missionId)) continue;
      const subs = userMissions.value.filter((um) =>
        parent.rawMission.missionIds?.includes(um.rawMission.id),
      );
      const count = subs.filter((m) => m.completed).length;
      parent.completed =
        manualCompleteOverrides.value.has(parent.id) ||
        count >= parent.rawMission.requiredCount;
    }
  }

  function toggleMissionComplete(missionId: number) {
    const next = new Set(manualCompleteOverrides.value);
    if (next.has(missionId)) next.delete(missionId);
    else next.add(missionId);
    manualCompleteOverrides.value = next;
    saveManualCompleteOverrides();
    recomputeCompletedForMission(missionId);
  }

  function clearAllManualCompletions() {
    const affectedIds = [...manualCompleteOverrides.value];
    manualCompleteOverrides.value = new Set();
    saveManualCompleteOverrides();
    for (const id of affectedIds) {
      recomputeCompletedForMission(id);
    }
  }

  function missionCanMarkComplete(mission: UserMission): boolean {
    const rawMission = mission.rawMission;
    if (rawMission.type === "count") {
      if (mission.progressText === "Not Calculated") return false;
      const ownedCount = mission.missionCards.filter((c) => c.owned).length;
      return ownedCount >= rawMission.requiredCount;
    }
    if (rawMission.type === "points") {
      if (mission.progressText === "Not Calculated") return false;
      const ownedPoints = mission.missionCards
        .filter((c) => c.owned)
        .reduce((sum, c) => sum + (c.points ?? 0), 0);
      return ownedPoints >= rawMission.requiredCount;
    }
    if (rawMission.type === "missions") {
      const subs = userMissions.value.filter((um) =>
        rawMission.missionIds?.includes(um.rawMission.id),
      );
      return subs.filter((s) => s.completed).length >= rawMission.requiredCount;
    }
    return false;
  }

  return {
    userMissions,
    selectedMission,
    selectedPriceType,
    missionsVersion,
    loading,
    manualCompleteOverrides: readonly(manualCompleteOverrides),
    initialize,
    buildUserMissions,
    setUseSellPrice,
    updateCardLockedState,
    updateCardOwnedState,
    handlePriceOverrideChanged,
    calculateMissionDetails,
    calculateAllNotCalculatedMissions,
    recomputeMissionValues,
    toggleMissionComplete,
    clearAllManualCompletions,
    missionCanMarkComplete,
  };
});
