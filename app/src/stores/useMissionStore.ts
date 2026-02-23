import { defineStore } from 'pinia'
import MissionHelper from '@/helpers/MissionHelper'
import type { Mission } from '@/models/Mission'
import type { MissionsData } from '@/models/MissionsData'
import type { UserMission } from '@/models/UserMission'
import { ref } from 'vue'
import type { PriceType } from '@/models/PriceType'
import db from '@/data/indexedDB'
import { useCardStore } from './useCardStore'
import { useSettingsStore } from './useSettingsStore'

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export const useMissionStore = defineStore('mission', () => {
  const loading = ref<boolean>(true)
  const missions = ref<Array<Mission>>([]) // cached from CDN
  const userMissions = ref<Array<UserMission>>([])
  const selectedMission = ref<UserMission | null>(null)
  const selectedPriceType = ref<PriceType>({ sellPrice: false })
  const missionsVersion = ref<string>('')

  async function calculateMissionDetails(missionId: number, isSubMission = false) {
    if (!isSubMission) {
      loading.value = true
    }
    const cardStore = useCardStore()
    const settingsStore = useSettingsStore()
    const shopCardsById = cardStore.shopCardsById
    const overrides = cardStore.cardPriceOverrides
    const userMission = userMissions.value.find((m) => m.id === missionId)
    if (!userMission || userMission.progressText !== 'Not Calculated') {
      return
    }

    const mission = userMission.rawMission

    if (mission.type === 'points') {
      const remainingPrice = MissionHelper.calculateTotalPriceOfNonOwnedCards(
        mission,
        shopCardsById,
        selectedPriceType.value.sellPrice,
        overrides,
      )
      const completed = MissionHelper.isMissionComplete(mission, shopCardsById)
      const missionCards = mission.cards
        .map((card) => {
          const shopCard = shopCardsById.get(card.cardId)
          if (!shopCard || shopCard.cardId === undefined) return null

          const basePrice = selectedPriceType.value.sellPrice
            ? shopCard.sellOrderLow || shopCard.lastPrice
            : shopCard.lastPrice
          const price = overrides.get(card.cardId) ?? basePrice

          const highlighted =
            remainingPrice.totalPrice > 0 &&
            remainingPrice.includedCards.some((c) => c.cardId == card.cardId)

          return {
            cardId: shopCard.cardId,
            title: shopCard.cardTitle,
            owned: shopCard.owned,
            locked: shopCard.locked,
            price,
            highlighted,
            points: card.points || 0,
            shouldLock: false,
          }
        })
        .filter((card) => card !== null)
        .sort((a, b) => {
          if (a.owned !== b.owned) return a.owned ? 1 : -1
          if (a.locked !== b.locked) return a.locked ? 1 : -1
          return a.price - b.price
        })

      const ownedPoints = mission.cards.reduce((total, mc) => {
        const shopCard = shopCardsById.get(mc.cardId)
        return total + (shopCard?.owned ? mc.points || 0 : 0)
      }, 0)

      const remainingCount = (mission.requiredCount ?? 0) - ownedPoints
      userMission.progressText =
        remainingCount <= 0
          ? `Completed with ${ownedPoints} points out of ${mission.requiredCount} of any ${mission.totalPoints} total`
          : `${ownedPoints} points out of ${mission.requiredCount} of any ${mission.totalPoints} total (${remainingCount} remaining)`
      const { totalPrice: unlockedCardsPricePoints, includedCardIds: unlockedIds } =
        MissionHelper.calculateUnlockedCardsPrice(
          mission,
          shopCardsById,
          selectedPriceType.value.sellPrice,
          overrides,
        )
      for (const mc of missionCards) {
        mc.shouldLock = unlockedIds.has(mc.cardId)
      }
      userMission.completed = completed
      userMission.missionCards = missionCards
      userMission.remainingPrice = remainingPrice.totalPrice
      userMission.unlockedCardsPrice = unlockedCardsPricePoints
      const rewardValuePoints = MissionHelper.calculateRewardValue(
        mission.rewards,
        settingsStore.packPrices,
        shopCardsById,
        selectedPriceType.value.sellPrice,
      )
      userMission.rewardValue = rewardValuePoints
      const unlockedDeductionPoints = settingsStore.subtractUnlockedCards ? unlockedCardsPricePoints : 0
      userMission.missionValue =
        rewardValuePoints !== undefined
          ? rewardValuePoints - remainingPrice.totalPrice - unlockedDeductionPoints
          : undefined
    }

    if (mission.type === 'missions') {
      if (!mission.missionIds || mission.missionIds.length === 0) {
        loading.value = false
        return
      }
      await Promise.all(mission.missionIds.map((id) => calculateMissionDetails(id, true)))

      const subMissions = userMissions.value.filter(
        (um) => mission.missionIds && mission.missionIds.some((id) => id == um.rawMission.id),
      )
      const completedCount = subMissions.filter((m) => m.completed).length
      const remainingCount = mission.requiredCount - completedCount
      const totalRemainingPrice = subMissions
        .filter((m) => !m.completed)
        .filter((m) => m.remainingPrice > 0)
        .map((m) => m.remainingPrice)
        .sort((a, b) => a - b)
        .slice(0, remainingCount)
        .reduce((sum, price) => sum + price, 0)

      const totalUnlockedCardsPrice = subMissions.reduce((sum, m) => sum + m.unlockedCardsPrice, 0)
      userMission.progressText = `${completedCount} out of ${mission.requiredCount} missions completed`
      userMission.remainingPrice = totalRemainingPrice
      userMission.unlockedCardsPrice = totalUnlockedCardsPrice
      userMission.completed = completedCount >= mission.requiredCount
      const rewardValueMissions = MissionHelper.calculateRewardValue(
        mission.rewards,
        settingsStore.packPrices,
        shopCardsById,
        selectedPriceType.value.sellPrice,
      )
      userMission.rewardValue = rewardValueMissions
      const unlockedDeductionMissions = settingsStore.subtractUnlockedCards ? totalUnlockedCardsPrice : 0
      userMission.missionValue =
        rewardValueMissions !== undefined
          ? rewardValueMissions - totalRemainingPrice - unlockedDeductionMissions
          : undefined
    }

    if (!isSubMission) {
      loading.value = false
    }
  }

  function buildUserMissions() {
    const cardStore = useCardStore()
    const settingsStore = useSettingsStore()
    const shopCardsById = cardStore.shopCardsById
    const overrides = cardStore.cardPriceOverrides

    userMissions.value = missions.value.map((mission) => {
      if (mission.type === 'missions' || mission.type === 'points') {
        return {
          id: mission.id,
          rawMission: mission,
          progressText: 'Not Calculated',
          completed: false,
          missionCards: [],
          remainingPrice: 0,
          unlockedCardsPrice: 0,
          rewardValue: undefined,
          missionValue: undefined,
        }
      }

      const remainingPrice = MissionHelper.calculateTotalPriceOfNonOwnedCards(
        mission,
        shopCardsById,
        selectedPriceType.value.sellPrice,
        overrides,
      )
      const completed = MissionHelper.isMissionComplete(mission, shopCardsById)
      const missionCards = mission.cards
        .map((card) => {
          const shopCard = shopCardsById.get(card.cardId)
          if (!shopCard || shopCard.cardId === undefined) return null

          const basePrice = selectedPriceType.value.sellPrice
            ? shopCard.sellOrderLow || shopCard.lastPrice
            : shopCard.lastPrice
          const price = overrides.get(card.cardId) ?? basePrice

          const highlighted =
            remainingPrice.totalPrice > 0 &&
            remainingPrice.includedCards.some((c) => c.cardId == card.cardId)

          return {
            cardId: shopCard.cardId,
            title: shopCard.cardTitle,
            owned: shopCard.owned,
            locked: shopCard.locked,
            price,
            highlighted,
            points: card.points || 0,
            shouldLock: false,
          }
        })
        .filter((card) => card !== null)
        .sort((a, b) => {
          if (a.owned !== b.owned) return a.owned ? 1 : -1
          if (a.locked !== b.locked) return a.locked ? 1 : -1
          return a.price - b.price
        })

      const ownedCount = mission.cards.filter((card) => shopCardsById.get(card.cardId)?.owned).length

      const { totalPrice: unlockedCardsPrice, includedCardIds } =
        MissionHelper.calculateUnlockedCardsPrice(
          mission,
          shopCardsById,
          selectedPriceType.value.sellPrice,
          overrides,
        )
      for (const mc of missionCards) {
        mc.shouldLock = includedCardIds.has(mc.cardId)
      }

      const rewardValue = MissionHelper.calculateRewardValue(
        mission.rewards,
        settingsStore.packPrices,
        shopCardsById,
        selectedPriceType.value.sellPrice,
      )

      const unlockedDeduction = settingsStore.subtractUnlockedCards ? unlockedCardsPrice : 0

      return {
        id: mission.id,
        rawMission: mission,
        progressText: `${ownedCount} out of any ${mission.requiredCount} of ${mission.totalPoints} total`,
        completed,
        missionCards,
        remainingPrice: remainingPrice.totalPrice,
        unlockedCardsPrice,
        rewardValue,
        missionValue: rewardValue !== undefined ? rewardValue - remainingPrice.totalPrice - unlockedDeduction : undefined,
      }
    })
  }

  function recomputeMissionValues() {
    const cardStore = useCardStore()
    const settingsStore = useSettingsStore()
    for (const um of userMissions.value) {
      if (um.progressText === 'Not Calculated') continue
      const rewardValue = MissionHelper.calculateRewardValue(
        um.rawMission.rewards,
        settingsStore.packPrices,
        cardStore.shopCardsById,
        selectedPriceType.value.sellPrice,
      )
      um.rewardValue = rewardValue
      const unlockedDeduction = settingsStore.subtractUnlockedCards ? um.unlockedCardsPrice : 0
      um.missionValue =
        rewardValue !== undefined ? rewardValue - um.remainingPrice - unlockedDeduction : undefined
    }
  }

  async function fetchAndCacheMissions(): Promise<MissionsData> {
    const res = await fetch('/ootp-missions-27/data/missions.json')
    const data: MissionsData = await res.json()
    await db.missionsCache.put({ id: 1, version: data.version, cachedAt: Date.now(), data: data.missions })
    return data
  }

  async function initialize() {
    loading.value = true

    const cached = await db.missionsCache.get(1)
    // Array.isArray guards against a corrupted entry where the envelope object
    // { version, missions } was accidentally stored as `data` instead of the array.
    const cacheUsable = cached != null && Array.isArray(cached.data)
    const cacheExpired = !cacheUsable || (cached.cachedAt != null && Date.now() - cached.cachedAt > CACHE_TTL_MS)

    if (cacheUsable && !cacheExpired) {
      missions.value = cached.data
      missionsVersion.value = cached.version
      buildUserMissions()
      loading.value = false
      // Refresh cache in background without blocking the UI
      fetchAndCacheMissions()
        .then((fresh) => {
          if (fresh.version !== missionsVersion.value) {
            missions.value = fresh.missions
            missionsVersion.value = fresh.version
            buildUserMissions()
          }
        })
        .catch(() => {
          // Silently ignore — we already have cached data
        })
      return
    }

    try {
      const fresh = await fetchAndCacheMissions()
      missions.value = fresh.missions
      missionsVersion.value = fresh.version
    } catch (e) {
      console.error('Failed to load missions', e)
      // Fall back to stale cache if available
      if (cached) {
        missions.value = cached.data
        missionsVersion.value = cached.version
      } else {
        loading.value = false
        return
      }
    }

    buildUserMissions()
    loading.value = false
  }

  function updateCardLockedState(cardId: number, locked: boolean) {
    const cardStore = useCardStore()
    const settingsStore = useSettingsStore()

    // Update missionCards locked flag everywhere
    for (const mission of userMissions.value) {
      for (const card of mission.missionCards) {
        if (card.cardId === cardId) {
          card.locked = locked
        }
      }
    }

    // Recompute unlockedCardsPrice + missionValue for count/points missions
    // that contain this card and have already been calculated.
    for (const mission of userMissions.value) {
      if (mission.progressText === 'Not Calculated') continue
      if (mission.rawMission.type === 'missions') continue
      if (!mission.rawMission.cards.some((c) => c.cardId === cardId)) continue

      const { totalPrice: ulPrice, includedCardIds: ulIds } =
        MissionHelper.calculateUnlockedCardsPrice(
          mission.rawMission,
          cardStore.shopCardsById,
          selectedPriceType.value.sellPrice,
          cardStore.cardPriceOverrides,
        )
      mission.unlockedCardsPrice = ulPrice
      for (const mc of mission.missionCards) {
        mc.shouldLock = ulIds.has(mc.cardId)
      }
      const rewardValue = MissionHelper.calculateRewardValue(
        mission.rawMission.rewards,
        settingsStore.packPrices,
        cardStore.shopCardsById,
        selectedPriceType.value.sellPrice,
      )
      mission.rewardValue = rewardValue
      const unlockedDeduction = settingsStore.subtractUnlockedCards ? mission.unlockedCardsPrice : 0
      mission.missionValue =
        rewardValue !== undefined ? rewardValue - mission.remainingPrice - unlockedDeduction : undefined
    }

    // Re-aggregate missions-type missions from their updated sub-missions.
    for (const mission of userMissions.value) {
      if (mission.progressText === 'Not Calculated') continue
      if (mission.rawMission.type !== 'missions') continue

      const subMissions = userMissions.value.filter(
        (um) => mission.rawMission.missionIds?.some((id) => id === um.rawMission.id),
      )
      mission.unlockedCardsPrice = subMissions.reduce((sum, m) => sum + m.unlockedCardsPrice, 0)
      const rewardValue = MissionHelper.calculateRewardValue(
        mission.rawMission.rewards,
        settingsStore.packPrices,
        cardStore.shopCardsById,
        selectedPriceType.value.sellPrice,
      )
      mission.rewardValue = rewardValue
      const unlockedDeduction = settingsStore.subtractUnlockedCards ? mission.unlockedCardsPrice : 0
      mission.missionValue =
        rewardValue !== undefined ? rewardValue - mission.remainingPrice - unlockedDeduction : undefined
    }
  }

  function updateCardOwnedState(cardId: number) {
    const cardStore = useCardStore()
    const settingsStore = useSettingsStore()
    const shopCardsById = cardStore.shopCardsById
    const overrides = cardStore.cardPriceOverrides

    // Update missionCards owned flag and re-sort in all missions
    for (const mission of userMissions.value) {
      const idx = mission.missionCards.findIndex((c) => c.cardId === cardId)
      if (idx === -1) continue
      const shopCard = shopCardsById.get(cardId)
      if (shopCard) mission.missionCards[idx].owned = shopCard.owned
      mission.missionCards.sort((a, b) => {
        if (a.owned !== b.owned) return a.owned ? 1 : -1
        if (a.locked !== b.locked) return a.locked ? 1 : -1
        return a.price - b.price
      })
    }

    // Rebuild count missions containing this card
    for (const mission of userMissions.value) {
      if (mission.progressText === 'Not Calculated') continue
      if (mission.rawMission.type === 'missions') continue
      if (!mission.rawMission.cards.some((c) => c.cardId === cardId)) continue

      if (mission.rawMission.type === 'count') {
        const rp = MissionHelper.calculateTotalPriceOfNonOwnedCards(
          mission.rawMission,
          shopCardsById,
          selectedPriceType.value.sellPrice,
          overrides,
        )
        mission.missionCards = mission.rawMission.cards
          .map((card) => {
            const shopCard = shopCardsById.get(card.cardId)
            if (!shopCard || shopCard.cardId === undefined) return null
            const basePrice = selectedPriceType.value.sellPrice
              ? shopCard.sellOrderLow || shopCard.lastPrice
              : shopCard.lastPrice
            const price = overrides.get(card.cardId) ?? basePrice
            const highlighted =
              rp.totalPrice > 0 && rp.includedCards.some((c) => c.cardId === card.cardId)
            return {
              cardId: shopCard.cardId,
              title: shopCard.cardTitle,
              owned: shopCard.owned,
              locked: shopCard.locked,
              price,
              highlighted,
              points: card.points || 0,
              shouldLock: false,
            }
          })
          .filter((c) => c !== null)
          .sort((a, b) => {
            if (a.owned !== b.owned) return a.owned ? 1 : -1
            if (a.locked !== b.locked) return a.locked ? 1 : -1
            return a.price - b.price
          })
        const ownedCount = mission.rawMission.cards.filter(
          (c) => shopCardsById.get(c.cardId)?.owned,
        ).length
        mission.remainingPrice = rp.totalPrice
        mission.completed = MissionHelper.isMissionComplete(mission.rawMission, shopCardsById)
        mission.progressText = `${ownedCount} out of any ${mission.rawMission.requiredCount} of ${mission.rawMission.totalPoints} total`
        const { totalPrice: ownedUlPrice, includedCardIds: ownedUlIds } =
          MissionHelper.calculateUnlockedCardsPrice(
            mission.rawMission,
            shopCardsById,
            selectedPriceType.value.sellPrice,
            overrides,
          )
        mission.unlockedCardsPrice = ownedUlPrice
        for (const mc of mission.missionCards) {
          mc.shouldLock = ownedUlIds.has(mc.cardId)
        }
        const rewardValue = MissionHelper.calculateRewardValue(
          mission.rawMission.rewards,
          settingsStore.packPrices,
          shopCardsById,
          selectedPriceType.value.sellPrice,
        )
        mission.rewardValue = rewardValue
        const unlockedDeduction = settingsStore.subtractUnlockedCards
          ? mission.unlockedCardsPrice
          : 0
        mission.missionValue =
          rewardValue !== undefined
            ? rewardValue - mission.remainingPrice - unlockedDeduction
            : undefined
      } else {
        // points: reset to Not Calculated so user can recalculate
        mission.progressText = 'Not Calculated'
        mission.completed = false
        mission.missionCards = []
        mission.remainingPrice = 0
        mission.unlockedCardsPrice = 0
        mission.rewardValue = undefined
        mission.missionValue = undefined
      }
    }

    // Re-aggregate missions-type missions
    for (const mission of userMissions.value) {
      if (mission.progressText === 'Not Calculated') continue
      if (mission.rawMission.type !== 'missions') continue
      const subMissions = userMissions.value.filter(
        (um) => mission.rawMission.missionIds?.some((id) => id === um.rawMission.id),
      )
      mission.unlockedCardsPrice = subMissions.reduce((sum, m) => sum + m.unlockedCardsPrice, 0)
      const completedCount = subMissions.filter((m) => m.completed).length
      mission.completed = completedCount >= mission.rawMission.requiredCount
      const remainingCount = mission.rawMission.requiredCount - completedCount
      mission.remainingPrice = subMissions
        .filter((m) => !m.completed)
        .filter((m) => m.remainingPrice > 0)
        .map((m) => m.remainingPrice)
        .sort((a, b) => a - b)
        .slice(0, remainingCount)
        .reduce((sum, price) => sum + price, 0)
      const rewardValue = MissionHelper.calculateRewardValue(
        mission.rawMission.rewards,
        settingsStore.packPrices,
        shopCardsById,
        selectedPriceType.value.sellPrice,
      )
      mission.rewardValue = rewardValue
      const unlockedDeduction = settingsStore.subtractUnlockedCards
        ? mission.unlockedCardsPrice
        : 0
      mission.missionValue =
        rewardValue !== undefined
          ? rewardValue - mission.remainingPrice - unlockedDeduction
          : undefined
    }
  }

  async function handlePriceOverrideChanged(missionId?: number) {
    const cardStore = useCardStore()
    const settingsStore = useSettingsStore()
    const shopCardsById = cardStore.shopCardsById
    const overrides = cardStore.cardPriceOverrides
    const overriddenIds = new Set([...overrides.keys(), ...cardStore.cardOwnedOverrides])

    loading.value = true

    const modifiedIds = new Set<number>()
    const toRecalculate: number[] = []

    for (const um of userMissions.value) {
      const mission = um.rawMission
      if (mission.type === 'missions') continue

      const isSelected = um.id === missionId
      const hasOverriddenCard = mission.cards?.some((c) => overriddenIds.has(c.cardId)) ?? false
      if (!isSelected && !hasOverriddenCard) continue

      modifiedIds.add(um.id)

      if (mission.type === 'count') {
        const rp = MissionHelper.calculateTotalPriceOfNonOwnedCards(
          mission,
          shopCardsById,
          selectedPriceType.value.sellPrice,
          overrides,
        )
        um.missionCards = mission.cards
          .map((card) => {
            const shopCard = shopCardsById.get(card.cardId)
            if (!shopCard || shopCard.cardId === undefined) return null
            const basePrice = selectedPriceType.value.sellPrice
              ? shopCard.sellOrderLow || shopCard.lastPrice
              : shopCard.lastPrice
            const price = overrides.get(card.cardId) ?? basePrice
            const highlighted =
              rp.totalPrice > 0 && rp.includedCards.some((c) => c.cardId === card.cardId)
            return {
              cardId: shopCard.cardId,
              title: shopCard.cardTitle,
              owned: shopCard.owned,
              locked: shopCard.locked,
              price,
              highlighted,
              points: card.points || 0,
              shouldLock: false,
            }
          })
          .filter((c) => c !== null)
          .sort((a, b) => {
            if (a.owned !== b.owned) return a.owned ? 1 : -1
            if (a.locked !== b.locked) return a.locked ? 1 : -1
            return a.price - b.price
          })
        um.remainingPrice = rp.totalPrice
        const { totalPrice: priceUl, includedCardIds: priceUlIds } =
          MissionHelper.calculateUnlockedCardsPrice(
            mission,
            shopCardsById,
            selectedPriceType.value.sellPrice,
            overrides,
          )
        um.unlockedCardsPrice = priceUl
        for (const mc of um.missionCards) {
          mc.shouldLock = priceUlIds.has(mc.cardId)
        }
        const rewardValue = MissionHelper.calculateRewardValue(
          mission.rewards,
          settingsStore.packPrices,
          shopCardsById,
          selectedPriceType.value.sellPrice,
        )
        um.rewardValue = rewardValue
        const unlockedDeduction = settingsStore.subtractUnlockedCards ? um.unlockedCardsPrice : 0
        um.missionValue =
          rewardValue !== undefined ? rewardValue - um.remainingPrice - unlockedDeduction : undefined
      } else {
        // points: reset and queue for recalculation
        um.progressText = 'Not Calculated'
        um.completed = false
        um.missionCards = []
        um.remainingPrice = 0
        um.unlockedCardsPrice = 0
        um.rewardValue = undefined
        um.missionValue = undefined
        toRecalculate.push(um.id)
      }
    }

    await Promise.all(toRecalculate.map((id) => calculateMissionDetails(id, true)))

    // Re-aggregate missions-type parents whose sub-missions were modified
    for (const um of userMissions.value) {
      if (um.progressText === 'Not Calculated') continue
      if (um.rawMission.type !== 'missions') continue
      const subIds = um.rawMission.missionIds ?? []
      if (!subIds.some((id) => modifiedIds.has(id))) continue

      const subMissions = userMissions.value.filter((sub) =>
        subIds.some((id) => id === sub.rawMission.id),
      )
      const completedCount = subMissions.filter((m) => m.completed).length
      const remainingCount = um.rawMission.requiredCount - completedCount
      um.remainingPrice = subMissions
        .filter((m) => !m.completed)
        .filter((m) => m.remainingPrice > 0)
        .map((m) => m.remainingPrice)
        .sort((a, b) => a - b)
        .slice(0, remainingCount)
        .reduce((sum, price) => sum + price, 0)
      um.unlockedCardsPrice = subMissions.reduce((sum, m) => sum + m.unlockedCardsPrice, 0)
      um.completed = completedCount >= um.rawMission.requiredCount
      const rewardValue = MissionHelper.calculateRewardValue(
        um.rawMission.rewards,
        settingsStore.packPrices,
        shopCardsById,
        selectedPriceType.value.sellPrice,
      )
      um.rewardValue = rewardValue
      const unlockedDeduction = settingsStore.subtractUnlockedCards ? um.unlockedCardsPrice : 0
      um.missionValue =
        rewardValue !== undefined ? rewardValue - um.remainingPrice - unlockedDeduction : undefined
    }

    loading.value = false
  }

  async function calculateAllNotCalculatedMissions(missionIds: number[]) {
    loading.value = true
    const notCalculated = userMissions.value.filter(
      (m) => m.progressText === 'Not Calculated' && missionIds.includes(m.id),
    )
    await Promise.all(notCalculated.map((m) => calculateMissionDetails(m.id, true)))
    loading.value = false
  }

  return {
    userMissions,
    selectedMission,
    selectedPriceType,
    missionsVersion,
    loading,
    initialize,
    buildUserMissions,
    updateCardLockedState,
    updateCardOwnedState,
    handlePriceOverrideChanged,
    calculateMissionDetails,
    calculateAllNotCalculatedMissions,
    recomputeMissionValues,
  }
})
