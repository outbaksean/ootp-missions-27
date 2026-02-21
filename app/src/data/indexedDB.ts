import type { ShopCard } from '@/models/ShopCard'
import Dexie from 'dexie'

export class OOTPMissions27DB extends Dexie {
  shopCards: Dexie.Table<ShopCard, number>

  constructor() {
    super('OOTPMissions27DB')

    this.version(1).stores({
      shopCards: '++cardId, cardTitle, cardValue, sellOrderLow, lastPrice, owned, lock',
    })

    this.shopCards = this.table('shopCards')
  }
}

const db = new OOTPMissions27DB()
export default db
