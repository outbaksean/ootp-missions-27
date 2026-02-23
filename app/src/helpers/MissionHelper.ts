import type { ShopCard } from '../models/ShopCard'
import type { Mission } from '../models/Mission'

interface PriceCalculationResult {
  totalPrice: number
  includedCards: Array<{ cardId: number; price: number }>
}

export default class MissionHelper {
  private static calculatePriceDetailsPointsTypeDP(
    unownedCardsWithPoints: Array<{ cardId: number; price: number; points: number }>,
    requiredPoints: number,
  ): PriceCalculationResult {
    if (requiredPoints <= 0) return { totalPrice: 0, includedCards: [] }
    if (unownedCardsWithPoints.length === 0) return { totalPrice: 0, includedCards: [] }

    const n = unownedCardsWithPoints.length
    const maxPoints = unownedCardsWithPoints.reduce((sum, c) => sum + c.points, 0)

    if (maxPoints < requiredPoints) {
      // Can't reach target — return all available cards
      return {
        totalPrice: unownedCardsWithPoints.reduce((sum, c) => sum + c.price, 0),
        includedCards: unownedCardsWithPoints.map((c) => ({ cardId: c.cardId, price: c.price })),
      }
    }

    // 2D DP: dp[i][j] = min cost to get exactly j points using cards 0..i-1.
    // The extra row allows reconstruction to check whether card i was included
    // by comparing dp[i][j - card.points] + card.price === dp[i+1][j].
    // A 1D rolling array produces correct DP values but not correct reconstruction
    // because a card can update both dp[j] and dp[j - card.points] in the same pass,
    // making backtracking ambiguous (the same card appears to be used twice).
    const dp: number[][] = Array.from({ length: n + 1 }, () =>
      new Array(maxPoints + 1).fill(Infinity),
    )
    dp[0][0] = 0

    for (let i = 0; i < n; i++) {
      const card = unownedCardsWithPoints[i]
      for (let j = 0; j <= maxPoints; j++) {
        // Option 1: skip card i
        if (dp[i][j] < dp[i + 1][j]) dp[i + 1][j] = dp[i][j]
        // Option 2: include card i
        if (j >= card.points && dp[i][j - card.points] !== Infinity) {
          const cost = dp[i][j - card.points] + card.price
          if (cost < dp[i + 1][j]) dp[i + 1][j] = cost
        }
      }
    }

    // Find minimum cost to reach >= requiredPoints
    let minCost = Infinity
    let targetPoints = -1
    for (let p = requiredPoints; p <= maxPoints; p++) {
      if (dp[n][p] < minCost) {
        minCost = dp[n][p]
        targetPoints = p
      }
    }

    if (targetPoints === -1) return { totalPrice: 0, includedCards: [] }

    // Reconstruct: card i was included if skipping it would have left dp[i+1][p] unchanged
    const includedCards: Array<{ cardId: number; price: number }> = []
    let p = targetPoints
    for (let i = n - 1; i >= 0 && p > 0; i--) {
      const card = unownedCardsWithPoints[i]
      if (
        p >= card.points &&
        dp[i][p - card.points] !== Infinity &&
        dp[i][p - card.points] + card.price === dp[i + 1][p]
      ) {
        includedCards.push({ cardId: card.cardId, price: card.price })
        p -= card.points
      }
    }

    return { totalPrice: minCost, includedCards }
  }

  private static calculatePriceDetailsCardType(
    sortedCards: Array<{ cardId: number; price: number }>,
    mission: Mission,
    shopCardsById: Map<number, ShopCard>,
  ): PriceCalculationResult {
    const ownedCount = mission.cards.filter((card) => shopCardsById.get(card.cardId)?.owned).length
    const requiredCount = Math.max(mission.requiredCount - ownedCount, 0)

    const includedCards = sortedCards.slice(0, requiredCount)
    const totalPrice = includedCards.reduce((total, card) => total + card.price, 0)

    return { totalPrice, includedCards }
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
        const shopCard = shopCardsById.get(card.cardId)
        if (!shopCard) return null

        const basePrice =
          useSellPrice && shopCard.sellOrderLow > 0 ? shopCard.sellOrderLow : shopCard.lastPrice
        const price = overrides?.get(card.cardId) ?? basePrice

        return { cardId: card.cardId, price }
      })
      .filter((card) => card !== null && card.price > 0) as Array<{
      cardId: number
      price: number
    }>

    const sortedCards = nonOwnedCards.sort((a, b) => a.price - b.price)

    if (mission.type === 'count') {
      return this.calculatePriceDetailsCardType(sortedCards, mission, shopCardsById)
    }

    if (mission.type === 'points') {
      const ownedPoints = mission.cards.reduce((sum, card) => {
        const shopCard = shopCardsById.get(card.cardId)
        return sum + (shopCard?.owned ? card.points || 0 : 0)
      }, 0)
      const requiredPoints = Math.max(mission.requiredCount - ownedPoints, 0)

      const unownedWithPoints = sortedCards
        .map((card) => ({
          ...card,
          points: mission.cards.find((mc) => mc.cardId == card.cardId)?.points || 0,
        }))
        .filter((c) => c.points > 0)

      return this.calculatePriceDetailsPointsTypeDP(unownedWithPoints, requiredPoints)
    }

    return { totalPrice: 0, includedCards: [] }
  }

  static isMissionComplete(mission: Mission, shopCardsById: Map<number, ShopCard>): boolean {
    if (mission.type === 'count') {
      const ownedCount = mission.cards.filter((card) => shopCardsById.get(card.cardId)?.owned).length
      return ownedCount >= mission.requiredCount
    }

    if (mission.type === 'points') {
      const ownedPoints = mission.cards.reduce((sum, card) => {
        const shopCard = shopCardsById.get(card.cardId)
        return sum + (shopCard?.owned ? card.points || 0 : 0)
      }, 0)
      return ownedPoints >= mission.requiredCount
    }

    return false
  }
}
