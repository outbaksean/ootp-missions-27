import type { ShopCard } from '@/models/ShopCard'
import type { Mission } from '@/models/Mission'
import Dexie from 'dexie'

export interface MissionsCache {
  id: 1
  version: string
  cachedAt: number
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

    // Fix typo: index was named 'lock' but the model field is 'locked'
    this.version(3).stores({
      shopCards: '++cardId, cardTitle, cardValue, sellOrderLow, lastPrice, owned, locked',
    })

    this.shopCards = this.table('shopCards')
    this.missionsCache = this.table('missionsCache')
  }
}

const db = new OOTPMissions27DB()
export default db
