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
  HistSilver: 500,
  HistGold: 1200,
  HistDiamond: 4500,
  HistPerfect: 30000,
  HistRainbow: 35000,
  AllDiamond: 6000,
  AllPerfect: 126000,
  HistAllDiamond: 36000,
  HistAllPerfect: 180000,
  MoneyballDiamond: 4500,
  AnalyticsDiamond: 4500,
  PowerDiamond: 4500,
  DefensiveDiamond: 4500,
  SpotlightImmortals: 4500,
};

/** Human-readable label for each pack type key. */
export const PACK_TYPE_LABELS: Record<string, string> = {
  Standard: "Standard",
  Silver: "Silver",
  Gold: "Gold",
  Diamond: "Diamond",
  Perfect: "Perfect",
  Rainbow: "Rainbow",
  HistSilver: "Historical Silver",
  HistGold: "Historical Gold",
  HistDiamond: "Historical Diamond",
  HistPerfect: "Historical Perfect",
  HistRainbow: "Historical Rainbow",
  AllDiamond: "All-Diamond",
  AllPerfect: "All-Perfect",
  HistAllDiamond: "Historical All-Diamond",
  HistAllPerfect: "Historical All-Perfect",
  MoneyballDiamond: "Moneyball Era Diamond",
  AnalyticsDiamond: "Analytics Era Diamond",
  PowerDiamond: "Power Era Diamond",
  DefensiveDiamond: "Defensive Era Diamond",
  SpotlightImmortals: "Spotlight #Immortals",
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
  } catch {
    return new Map(Object.entries(PACK_TYPE_DEFAULTS));
  }
}

function saveToStorage(prices: Map<string, number>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(prices)));
}

const OPTIMIZED_MODE_KEY = "ootp-optimized-mode";
const UNLOCK_DISCOUNT_KEY = "ootp-unlocked-card-discount";
const INCLUDE_CARD_REWARDS_KEY = "ootp-include-card-rewards";

export const useSettingsStore = defineStore("settings", () => {
  const packPrices = ref<Map<string, number>>(loadFromStorage());
  const optimizedMode = ref<boolean>(
    localStorage.getItem(OPTIMIZED_MODE_KEY) === "true",
  );
  const unlockedCardDiscount = ref<number>(
    (() => {
      const raw = localStorage.getItem(UNLOCK_DISCOUNT_KEY);
      if (raw === null) return 0.1;
      const val = parseFloat(raw);
      // Cap at 0.99 to prevent zero-price edge cases
      return isNaN(val) ? 0.1 : Math.min(0.99, Math.max(0, val));
    })(),
  );
  const includeCardRewardsInValue = ref<boolean>(
    localStorage.getItem(INCLUDE_CARD_REWARDS_KEY) !== "false",
  );

  function setPackPrice(packType: string, value: number) {
    const next = new Map(packPrices.value);
    next.set(packType, value);
    packPrices.value = next;
    saveToStorage(next);
  }

  function getPackPrice(packType: string): number {
    return packPrices.value.get(packType) ?? 0;
  }

  function setOptimizedMode(value: boolean) {
    optimizedMode.value = value;
    localStorage.setItem(OPTIMIZED_MODE_KEY, String(value));
  }

  function resetPackPrices() {
    const defaults = new Map(Object.entries(PACK_TYPE_DEFAULTS));
    packPrices.value = defaults;
    saveToStorage(defaults);
  }

  function setUnlockedCardDiscount(value: number) {
    // Cap discount at 0.99 (99%) to prevent zero-price edge cases
    const capped = Math.min(0.99, Math.max(0, value));
    unlockedCardDiscount.value = capped;
    localStorage.setItem(UNLOCK_DISCOUNT_KEY, String(capped));
  }

  function setIncludeCardRewardsInValue(value: boolean) {
    includeCardRewardsInValue.value = value;
    localStorage.setItem(INCLUDE_CARD_REWARDS_KEY, String(value));
  }

  return {
    packPrices,
    setPackPrice,
    getPackPrice,
    resetPackPrices,
    optimizedMode,
    setOptimizedMode,
    unlockedCardDiscount,
    setUnlockedCardDiscount,
    includeCardRewardsInValue,
    setIncludeCardRewardsInValue,
  };
});
