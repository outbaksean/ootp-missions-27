import type { ShopCard } from '@/models/ShopCard'
import type { Mission } from '@/models/Mission'
import Dexie from 'dexie'

export interface MissionsCache {
  id: 1
  data: Mission[]
}

export class OOTPMissions27DB extends Dexie {
  shopCards: Dexie.Table<ShopCard, number>
  missionsCache: Dexie.Table<MissionsCache, number>

  constructor() {
    super('OOTPMissions27DB')

    this.version(1).stores({
      shopCards: '++cardId, cardTitle, cardValue, sellOrderLow, lastPrice, owned, lock',
    })

    this.version(2).stores({
      missionsCache: 'id',
    })

    this.shopCards = this.table('shopCards')
    this.missionsCache = this.table('missionsCache')
  }
}

const db = new OOTPMissions27DB()
export default db
