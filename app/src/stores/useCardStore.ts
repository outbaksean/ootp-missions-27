import { ref, computed, toRaw } from "vue";
import { defineStore } from "pinia";
import type { CardType, ShopCard } from "@/models/ShopCard";
import db from "@/data/indexedDB";
import Papa from "papaparse";

type ShopCardRow = {
  "Card ID": string;
  "//Card Title": string;
  "Card Value": string;
  "Sell Order Low": string;
  "Last 10 Price": string;
  owned: string;
  "Card Type": string;
  "Card Badge": string;
};

function parseCardType(row: ShopCardRow): CardType {
  if (parseInt(row["Card Type"], 10) === 1) return "live";
  if (row["Card Badge"] === "CS") return "clubhouse";
  if (row["Card Badge"] === "ME") return "nonpack";
  return "historical";
}

function parseShopCardRow(row: ShopCardRow): ShopCard {
  return {
    cardId: parseInt(row["Card ID"], 10) || 0,
    cardTitle: row["//Card Title"] || "Unknown",
    cardValue: parseInt(row["Card Value"], 10) || 0,
    sellOrderLow: parseInt(row["Sell Order Low"], 10) || 0,
    lastPrice: parseInt(row["Last 10 Price"], 10) || 0,
    owned: parseInt(row["owned"], 10) > 0,
    locked: false,
    cardType: parseCardType(row),
  };
}

const CARDS_SOURCE_KEY = "ootp-cards-source";
const OWNED_OVERRIDES_KEY = "ootp-owned-overrides";
const CARDS_UPLOADED_AT_KEY = "ootp-cards-uploaded-at";
const PRICE_OVERRIDES_KEY = "ootp-price-overrides";

function loadPriceOverrides(): Map<number, number> {
  try {
    const raw = localStorage.getItem(PRICE_OVERRIDES_KEY);
    if (!raw) return new Map();
    return new Map(JSON.parse(raw) as [number, number][]);
  } catch {
    return new Map();
  }
}

function savePriceOverrides(overrides: Map<number, number>): void {
  localStorage.setItem(
    PRICE_OVERRIDES_KEY,
    JSON.stringify([...overrides.entries()]),
  );
}

function loadOwnedOverrides(): Set<number> {
  try {
    const raw = localStorage.getItem(OWNED_OVERRIDES_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as number[]);
  } catch {
    return new Set();
  }
}

function saveOwnedOverrides(ids: Set<number>): void {
  localStorage.setItem(OWNED_OVERRIDES_KEY, JSON.stringify([...ids]));
}

export const useCardStore = defineStore("card", () => {
  const shopCards = ref<Array<ShopCard>>([]);
  const isDefaultData = ref(localStorage.getItem(CARDS_SOURCE_KEY) !== "user");
  const lastUploadedAt = ref<string | null>(
    localStorage.getItem(CARDS_UPLOADED_AT_KEY),
  );
  const cardPriceOverrides = ref<Map<number, number>>(loadPriceOverrides());
  const cardOwnedOverrides = ref<Set<number>>(loadOwnedOverrides());

  const hasShopCards = computed(() => shopCards.value.length > 0);
  const shopCardsById = computed(
    () => new Map(shopCards.value.map((c) => [c.cardId, c])),
  );

  function applyOwnedOverrides(cards: ShopCard[]): void {
    for (const card of cards) {
      if (cardOwnedOverrides.value.has(card.cardId)) {
        card.owned = true;
      }
    }
  }

  async function addShopCards(data: ShopCard[]) {
    await db.shopCards.bulkAdd(data);
    applyOwnedOverrides(data);
    // Always called on an empty array — assign directly to avoid spread call-stack limits
    shopCards.value = data;
  }

  async function clearShopCards() {
    await db.shopCards.clear();
    shopCards.value = [];
    isDefaultData.value = true;
    localStorage.removeItem(CARDS_SOURCE_KEY);
    lastUploadedAt.value = null;
    localStorage.removeItem(CARDS_UPLOADED_AT_KEY);
    cardOwnedOverrides.value = new Set();
    localStorage.removeItem(OWNED_OVERRIDES_KEY);
    cardPriceOverrides.value = new Map();
    localStorage.removeItem(PRICE_OVERRIDES_KEY);
  }

  function setCardPriceOverride(cardId: number, price: number) {
    const next = new Map(cardPriceOverrides.value).set(cardId, price);
    cardPriceOverrides.value = next;
    savePriceOverrides(next);
  }

  function clearCardPriceOverride(cardId: number) {
    const next = new Map(cardPriceOverrides.value);
    next.delete(cardId);
    cardPriceOverrides.value = next;
    savePriceOverrides(next);
  }

  async function uploadShopFile(file: File) {
    const text = await file.text();
    await new Promise<void>((resolve) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: async (results: { data: ShopCardRow[] }) => {
          const uploadedCards = results.data.map(parseShopCardRow);
          const uploadedById = new Map(uploadedCards.map((c) => [c.cardId, c]));

          // Read existing DB records so we can preserve titles and lock state
          const existingCards = await db.shopCards.toArray();
          const existingById = new Map(existingCards.map((c) => [c.cardId, c]));

          const toWrite: ShopCard[] = [];

          // Cards in the user's CSV: update data, preserve locked from DB
          for (const card of uploadedCards) {
            toWrite.push({
              ...card,
              locked: existingById.get(card.cardId)?.locked ?? false,
            });
          }

          // Cards not in the user's CSV: keep record with base title,
          // zero prices so they appear as unavailable
          for (const existing of existingCards) {
            if (!uploadedById.has(existing.cardId)) {
              toWrite.push({
                ...existing,
                lastPrice: 0,
                sellOrderLow: 0,
                cardValue: 0,
                owned: false,
              });
            }
          }

          await db.shopCards.bulkPut(toWrite);
          applyOwnedOverrides(toWrite);
          shopCards.value = toWrite;

          cardPriceOverrides.value = new Map();
          localStorage.removeItem(PRICE_OVERRIDES_KEY);
          cardOwnedOverrides.value = new Set();
          localStorage.removeItem(OWNED_OVERRIDES_KEY);
          const uploadedAt = new Date().toISOString();
          isDefaultData.value = false;
          localStorage.setItem(CARDS_SOURCE_KEY, "user");
          lastUploadedAt.value = uploadedAt;
          localStorage.setItem(CARDS_UPLOADED_AT_KEY, uploadedAt);
          resolve();
        },
      });
    });
  }

  async function uploadUserFile(file: File) {
    const text = await file.text();
    await new Promise<void>((resolve) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: async (results: {
          data: { CID: string; Lock: string }[];
        }) => {
          const lockedIds = new Set(
            results.data
              .filter((row) => row.Lock === "Yes")
              .map((row) => parseInt(row.CID, 10)),
          );

          // Single pass: reset old locked flags and apply new ones
          const toWrite: ShopCard[] = [];
          for (const card of shopCards.value) {
            const shouldBeLocked = lockedIds.has(card.cardId);
            if (card.locked !== shouldBeLocked) {
              card.locked = shouldBeLocked;
              toWrite.push(card);
            }
          }

          if (toWrite.length > 0) {
            await db.shopCards.bulkPut(toWrite.map((c) => ({ ...toRaw(c) })));
          }

          resolve();
        },
      });
    });
  }

  async function loadFromCache() {
    const cards = await db.shopCards.toArray();
    applyOwnedOverrides(cards);
    shopCards.value = cards;
    // If cards were loaded from IndexedDB but localStorage doesn't explicitly say
    // 'default', treat them as user-uploaded. This handles the case where localStorage
    // was cleared (e.g. browser session reset) while IndexedDB persisted.
    if (
      cards.length > 0 &&
      localStorage.getItem(CARDS_SOURCE_KEY) !== "default"
    ) {
      isDefaultData.value = false;
      localStorage.setItem(CARDS_SOURCE_KEY, "user");
    }
  }

  async function fetchDefaultCards() {
    if (shopCards.value.length > 0) return;
    try {
      const response = await fetch("/ootp-missions-27/data/shop_cards.csv");
      const text = await response.text();
      await new Promise<void>((resolve) => {
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: async (results: { data: ShopCardRow[] }) => {
            const data = results.data.map(parseShopCardRow);
            // Skip clearShopCards — we know the array is empty (guarded above)
            await addShopCards(data);
            isDefaultData.value = true;
            localStorage.setItem(CARDS_SOURCE_KEY, "default");
            resolve();
          },
        });
      });
    } catch (e) {
      console.error("Failed to load default shop cards", e);
    }
  }

  async function toggleCardLocked(cardId: number) {
    const card = shopCardsById.value.get(cardId);
    if (!card) return;
    const newLocked = !card.locked;
    card.locked = newLocked;
    await db.shopCards.update(cardId, { locked: newLocked });
  }

  function toggleCardOwnedOverride(cardId: number) {
    const card = shopCardsById.value.get(cardId);
    if (!card) return;
    const next = new Set(cardOwnedOverrides.value);
    if (next.has(cardId)) {
      next.delete(cardId);
      card.owned = false;
    } else {
      next.add(cardId);
      card.owned = true;
    }
    cardOwnedOverrides.value = next;
    saveOwnedOverrides(next);
  }

  async function initialize() {
    await loadFromCache();
    await fetchDefaultCards();
  }

  return {
    shopCards,
    shopCardsById,
    hasShopCards,
    isDefaultData,
    lastUploadedAt,
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
  };
});
