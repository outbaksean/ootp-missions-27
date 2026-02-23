import { defineStore } from 'pinia'
import MissionHelper from '@/helpers/MissionHelper'
import type { Mission } from '@/models/Mission'
import type { MissionsData } from '@/models/MissionsData'
import type { UserMission } from '@/models/UserMission'
import { ref } from 'vue'
import type { PriceType } from '@/models/PriceType'
import db from '@/data/indexedDB'
import { useCardStore } from './useCardStore'

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
    const shopCards = useCardStore().shopCards
    const userMission = userMissions.value.find((m) => m.id === missionId)
    if (!userMission || userMission.progressText !== 'Not Calculated') {
      return
    }

    const mission = userMission.rawMission

    if (mission.type === 'points') {
      const remainingPrice = MissionHelper.calculateTotalPriceOfNonOwnedCards(
        mission,
        shopCards,
        selectedPriceType.value.sellPrice,
      )
      const completed = MissionHelper.isMissionComplete(mission, shopCards)
      const missionCards = mission.cards
        .map((card) => {
          const shopCard = shopCards.find((sc) => sc.cardId == card.cardId)
          if (!shopCard || shopCard.cardId === undefined) return null

          const price = selectedPriceType.value.sellPrice
            ? shopCard.sellOrderLow || shopCard.lastPrice
            : shopCard.lastPrice

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
          }
        })
        .filter((card) => card !== null)
        .sort((a, b) => {
          if (a.owned !== b.owned) return a.owned ? 1 : -1
          if (a.locked !== b.locked) return a.locked ? 1 : -1
          return a.price - b.price
        })

      const ownedPoints = shopCards.reduce((total, shopCard) => {
        const card = mission.cards.find(
          (mc) => mc.cardId == shopCard.cardId && shopCard.owned,
        )
        return total + (card?.points || 0)
      }, 0)

      const remainingCount = (mission.requiredCount ?? 0) - ownedPoints
      userMission.progressText =
        remainingCount <= 0
          ? `Completed with ${ownedPoints} points out of ${mission.requiredCount} of any ${mission.totalPoints} total`
          : `${ownedPoints} points out of ${mission.requiredCount} of any ${mission.totalPoints} total (${remainingCount} remaining)`
      userMission.completed = completed
      userMission.missionCards = missionCards
      userMission.remainingPrice = remainingPrice.totalPrice
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

      userMission.progressText = `${completedCount} out of ${mission.requiredCount} missions completed`
      userMission.remainingPrice = totalRemainingPrice
      userMission.completed = completedCount >= mission.requiredCount
    }

    if (!isSubMission) {
      loading.value = false
    }
  }

  function buildUserMissions() {
    const shopCards = useCardStore().shopCards

    userMissions.value = missions.value.map((mission) => {
      if (mission.type === 'missions' || mission.type === 'points') {
        return {
          id: mission.id,
          rawMission: mission,
          progressText: 'Not Calculated',
          completed: false,
          missionCards: [],
          remainingPrice: 0,
        }
      }

      const remainingPrice = MissionHelper.calculateTotalPriceOfNonOwnedCards(
        mission,
        shopCards,
        selectedPriceType.value.sellPrice,
      )
      const completed = MissionHelper.isMissionComplete(mission, shopCards)
      const missionCards = mission.cards
        .map((card) => {
          const shopCard = shopCards.find((sc) => sc.cardId == card.cardId)
          if (!shopCard || shopCard.cardId === undefined) return null

          const price = selectedPriceType.value.sellPrice
            ? shopCard.sellOrderLow || shopCard.lastPrice
            : shopCard.lastPrice

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
          }
        })
        .filter((card) => card !== null)
        .sort((a, b) => {
          if (a.owned !== b.owned) return a.owned ? 1 : -1
          if (a.locked !== b.locked) return a.locked ? 1 : -1
          return a.price - b.price
        })

      const ownedCount = shopCards.filter((sc) =>
        mission.cards.some((card) => card.cardId == sc.cardId && sc.owned),
      ).length

      return {
        id: mission.id,
        rawMission: mission,
        progressText: `${ownedCount} out of any ${mission.requiredCount} of ${mission.totalPoints} total`,
        completed,
        missionCards,
        remainingPrice: remainingPrice.totalPrice,
      }
    })
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
    calculateMissionDetails,
    calculateAllNotCalculatedMissions,
  }
})
