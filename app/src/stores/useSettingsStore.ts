import { defineStore } from "pinia";
import { ref } from "vue";

const STORAGE_KEY = "ootp-pack-prices";

/** All pack types that appear in missions.json, with their default PP values. */
export const PACK_TYPE_DEFAULTS: Record<string, number> = {
  Standard: 100,
  Silver: 250,
  Gold: 1100,
  Diamond: 4100,
  Perfect: 21000,
  Rainbow: 24100,
  "Historical Silver": 500,
  "Historical Gold": 1200,
  "Historical Diamond": 4500,
  "Historical Perfect": 30000,
  "Historical Rainbow": 35000,
  "Spotlight #Immortals": 4500,
};

/** Ordered list of pack type keys for display. */
export const PACK_TYPES = Object.keys(PACK_TYPE_DEFAULTS);

function loadFromStorage(): Map<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map(Object.entries(PACK_TYPE_DEFAULTS));
    const stored = JSON.parse(raw) as Record<string, number>;
    // Merge: stored values override defaults; any new pack types get their default
    const merged = new Map(Object.entries(PACK_TYPE_DEFAULTS));
    for (const [k, v] of Object.entries(stored)) {
      merged.set(k, v);
    }
    return merged;
  } catch (_) {
    return new Map(Object.entries(PACK_TYPE_DEFAULTS));
  }
}

function saveToStorage(prices: Map<string, number>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(prices)));
}

export const useSettingsStore = defineStore("settings", () => {
  const packPrices = ref<Map<string, number>>(loadFromStorage());

  function setPackPrice(packType: string, value: number) {
    const next = new Map(packPrices.value);
    next.set(packType, value);
    packPrices.value = next;
    saveToStorage(next);
  }

  function getPackPrice(packType: string): number {
    return packPrices.value.get(packType) ?? 0;
  }

  return { packPrices, setPackPrice, getPackPrice };
});
