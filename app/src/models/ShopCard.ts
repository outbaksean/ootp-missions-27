export type CardType = 'live' | 'historical' | 'clubhouse' | 'nonpack'

export type ShopCard = {
  cardId: number
  cardTitle: string
  cardValue: number
  sellOrderLow: number
  lastPrice: number
  owned: boolean
  locked: boolean
  cardType?: CardType
}
