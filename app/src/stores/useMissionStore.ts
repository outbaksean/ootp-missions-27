import { defineStore } from 'pinia'
import MissionHelper from '@/helpers/MissionHelper'
import type { Mission } from '@/models/Mission'
import type { UserMission } from '@/models/UserMission'
import { ref } from 'vue'
import type { PriceType } from '@/models/PriceType'
import db from '@/data/indexedDB'

export const useMissionStore = defineStore('mission', () => {
  const loading = ref<boolean>(true)
  const missions = ref<Array<Mission>>([]) // cached from CDN
  const userMissions = ref<Array<UserMission>>([])
  const selectedMission = ref<UserMission | null>(null)
  const selectedPriceType = ref<PriceType>({ sellPrice: false })

  async function calculateMissionDetails(missionId: number, isSubMission = false) {
    if (!isSubMission) {
      loading.value = true
    }
    const shopCards = await db.shopCards.toArray()
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

  async function buildUserMissions() {
    const shopCards = await db.shopCards.toArray()

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

  async function fetchAndCacheMissions(): Promise<Mission[]> {
    const res = await fetch('/ootp-missions-27/data/missions.json')
    const data: Mission[] = await res.json()
    await db.missionsCache.put({ id: 1, data })
    return data
  }

  async function initialize() {
    loading.value = true

    const cached = await db.missionsCache.get(1)
    if (cached) {
      missions.value = cached.data
      await buildUserMissions()
      loading.value = false
      // Refresh cache in background without blocking the UI
      fetchAndCacheMissions()
        .then((fresh) => {
          if (fresh.length !== missions.value.length) {
            missions.value = fresh
            buildUserMissions()
          }
        })
        .catch(() => {
          // Silently ignore — we already have cached data
        })
      return
    }

    try {
      missions.value = await fetchAndCacheMissions()
    } catch (e) {
      console.error('Failed to load missions', e)
      loading.value = false
      return
    }

    await buildUserMissions()
    loading.value = false
  }

  async function calculateAllNotCalculatedMissions(missionIds: number[]) {
    loading.value = true
    const notCalculated = userMissions.value.filter(
      (m) => m.progressText === 'Not Calculated' && missionIds.includes(m.id),
    )
    for (const mission of notCalculated) {
      await calculateMissionDetails(mission.id, true)
    }
    loading.value = false
  }

  return {
    userMissions,
    selectedMission,
    selectedPriceType,
    loading,
    initialize,
    calculateMissionDetails,
    calculateAllNotCalculatedMissions,
  }
})
