import { ref, computed, toRaw } from 'vue'
import { defineStore } from 'pinia'
import type { CardType, ShopCard } from '@/models/ShopCard'
import db from '@/data/indexedDB'
import Papa from 'papaparse'

function parseCardType(row: any): CardType {
  if (parseInt(row['Card Type'], 10) === 1) return 'live'
  if (row['Card Badge'] === 'CS') return 'clubhouse'
  if (row['Card Badge'] === 'ME') return 'nonpack'
  return 'historical'
}

function parseShopCardRow(row: any): ShopCard {
  return {
    cardId: parseInt(row['Card ID'], 10) || 0,
    cardTitle: row['//Card Title'] || 'Unknown',
    cardValue: parseInt(row['Card Value'], 10) || 0,
    sellOrderLow: parseInt(row['Sell Order Low'], 10) || 0,
    lastPrice: parseInt(row['Last 10 Price'], 10) || 0,
    owned: parseInt(row['owned'], 10) > 0,
    locked: false,
    cardType: parseCardType(row),
  }
}

const CARDS_SOURCE_KEY = 'ootp-cards-source'
const OWNED_OVERRIDES_KEY = 'ootp-owned-overrides'

function loadOwnedOverrides(): Set<number> {
  try {
    const raw = localStorage.getItem(OWNED_OVERRIDES_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as number[])
  } catch {
    return new Set()
  }
}

function saveOwnedOverrides(ids: Set<number>): void {
  localStorage.setItem(OWNED_OVERRIDES_KEY, JSON.stringify([...ids]))
}

export const useCardStore = defineStore('card', () => {
  const shopCards = ref<Array<ShopCard>>([])
  const isDefaultData = ref(localStorage.getItem(CARDS_SOURCE_KEY) !== 'user')
  const cardPriceOverrides = ref<Map<number, number>>(new Map())
  const cardOwnedOverrides = ref<Set<number>>(loadOwnedOverrides())

  const hasShopCards = computed(() => shopCards.value.length > 0)
  const shopCardsById = computed(() => new Map(shopCards.value.map((c) => [c.cardId, c])))

  function applyOwnedOverrides(cards: ShopCard[]): void {
    for (const card of cards) {
      if (cardOwnedOverrides.value.has(card.cardId)) {
        card.owned = true
      }
    }
  }

  async function addShopCards(data: ShopCard[]) {
    await db.shopCards.bulkAdd(data)
    applyOwnedOverrides(data)
    // Always called on an empty array — assign directly to avoid spread call-stack limits
    shopCards.value = data
  }

  async function clearShopCards() {
    await db.shopCards.clear()
    shopCards.value = []
    isDefaultData.value = true
    localStorage.removeItem(CARDS_SOURCE_KEY)
    cardOwnedOverrides.value = new Set()
    localStorage.removeItem(OWNED_OVERRIDES_KEY)
  }

  function setCardPriceOverride(cardId: number, price: number) {
    cardPriceOverrides.value = new Map(cardPriceOverrides.value).set(cardId, price)
  }

  function clearCardPriceOverride(cardId: number) {
    const next = new Map(cardPriceOverrides.value)
    next.delete(cardId)
    cardPriceOverrides.value = next
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
          cardPriceOverrides.value = new Map()
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

          // Single pass: reset old locked flags and apply new ones
          const toWrite: ShopCard[] = []
          for (const card of shopCards.value) {
            const shouldBeLocked = lockedIds.has(card.cardId)
            if (card.locked !== shouldBeLocked) {
              card.locked = shouldBeLocked
              toWrite.push(card)
            }
          }

          if (toWrite.length > 0) {
            await db.shopCards.bulkPut(toWrite.map((c) => ({ ...toRaw(c) })))
          }

          resolve()
        },
      })
    })
  }

  async function loadFromCache() {
    const cards = await db.shopCards.toArray()
    applyOwnedOverrides(cards)
    shopCards.value = cards
    // If cards were loaded from IndexedDB but localStorage doesn't explicitly say
    // 'default', treat them as user-uploaded. This handles the case where localStorage
    // was cleared (e.g. browser session reset) while IndexedDB persisted.
    if (cards.length > 0 && localStorage.getItem(CARDS_SOURCE_KEY) !== 'default') {
      isDefaultData.value = false
      localStorage.setItem(CARDS_SOURCE_KEY, 'user')
    }
  }

  async function fetchDefaultCards() {
    if (shopCards.value.length > 0) return
    try {
      const response = await fetch('/ootp-missions-27/data/shop_cards.csv')
      const text = await response.text()
      await new Promise<void>((resolve) => {
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: async (results: { data: any[] }) => {
            const data = results.data.map(parseShopCardRow)
            // Skip clearShopCards — we know the array is empty (guarded above)
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

  async function toggleCardLocked(cardId: number) {
    const card = shopCardsById.value.get(cardId)
    if (!card) return
    const newLocked = !card.locked
    card.locked = newLocked
    await db.shopCards.update(cardId, { locked: newLocked })
  }

  function toggleCardOwnedOverride(cardId: number) {
    const card = shopCardsById.value.get(cardId)
    if (!card) return
    const next = new Set(cardOwnedOverrides.value)
    if (next.has(cardId)) {
      next.delete(cardId)
      card.owned = false
    } else {
      next.add(cardId)
      card.owned = true
    }
    cardOwnedOverrides.value = next
    saveOwnedOverrides(next)
  }

  async function initialize() {
    await loadFromCache()
    await fetchDefaultCards()
  }

  return {
    shopCards,
    shopCardsById,
    hasShopCards,
    isDefaultData,
    cardPriceOverrides,
    cardOwnedOverrides,
    clearShopCards,
    uploadShopFile,
    uploadUserFile,
    toggleCardLocked,
    toggleCardOwnedOverride,
    setCardPriceOverride,
    clearCardPriceOverride,
    loadFromCache,
    fetchDefaultCards,
    initialize,
  }
})
