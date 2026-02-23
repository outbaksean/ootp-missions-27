import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { ShopCard } from '@/models/ShopCard'
import db from '@/data/indexedDB'
import Papa from 'papaparse'

function parseShopCardRow(row: any): ShopCard {
  return {
    cardId: parseInt(row['Card ID'], 10) || 0,
    cardTitle: row['//Card Title'] || 'Unknown',
    cardValue: parseInt(row['Card Value'], 10) || 0,
    sellOrderLow: parseInt(row['Sell Order Low'], 10) || 0,
    lastPrice: parseInt(row['Last 10 Price'], 10) || 0,
    owned: parseInt(row['owned'], 10) > 0,
    locked: false,
  }
}

const CARDS_SOURCE_KEY = 'ootp-cards-source'

export const useCardStore = defineStore('card', () => {
  const shopCards = ref<Array<ShopCard>>([])
  const isDefaultData = ref(localStorage.getItem(CARDS_SOURCE_KEY) !== 'user')

  const hasShopCards = computed(() => shopCards.value.length > 0)
  const shopCardsById = computed(() => new Map(shopCards.value.map((c) => [c.cardId, c])))

  async function addShopCards(data: ShopCard[]) {
    await db.shopCards.bulkAdd(data)
    shopCards.value.push(...data)
  }

  async function clearShopCards() {
    await db.shopCards.clear()
    shopCards.value = []
    isDefaultData.value = true
    localStorage.removeItem(CARDS_SOURCE_KEY)
  }

  async function uploadShopFile(file: File) {
    const text = await file.text()
    await new Promise<void>((resolve) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: async (results: { data: any[] }) => {
          const data = results.data.map(parseShopCardRow)
          await clearShopCards()
          await addShopCards(data)
          isDefaultData.value = false
          localStorage.setItem(CARDS_SOURCE_KEY, 'user')
          resolve()
        },
      })
    })
  }

  async function uploadUserFile(file: File) {
    const text = await file.text()
    await new Promise<void>((resolve) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: async (results: { data: { CID: string; Lock: string }[] }) => {
          const lockedIds = new Set(
            results.data
              .filter((row) => row.Lock === 'Yes')
              .map((row) => parseInt(row.CID, 10)),
          )

          const toWrite: ShopCard[] = []
          for (const card of shopCards.value) {
            if (lockedIds.has(card.cardId) && !card.locked) {
              card.locked = true
              toWrite.push(card)
            }
          }

          if (toWrite.length > 0) {
            await db.shopCards.bulkPut(toWrite)
          }

          resolve()
        },
      })
    })
  }

  async function initialize() {
    const existingShopCards = await db.shopCards.toArray()
    shopCards.value = existingShopCards

    if (shopCards.value.length === 0) {
      try {
        const response = await fetch('/ootp-missions-27/data/shop_cards.csv')
        const text = await response.text()
        await new Promise<void>((resolve) => {
          Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            complete: async (results: { data: any[] }) => {
              const data = results.data.map(parseShopCardRow)
              await clearShopCards()
              await addShopCards(data)
              isDefaultData.value = true
              localStorage.setItem(CARDS_SOURCE_KEY, 'default')
              resolve()
            },
          })
        })
      } catch (e) {
        console.error('Failed to load default shop cards', e)
      }
    }
  }

  return {
    shopCards,
    shopCardsById,
    hasShopCards,
    isDefaultData,
    clearShopCards,
    uploadShopFile,
    uploadUserFile,
    initialize,
  }
})
