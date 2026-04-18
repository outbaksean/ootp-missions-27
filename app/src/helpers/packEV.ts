import type { ShopCard } from "@/models/ShopCard";

type Tier = "Iron" | "Bronze" | "Silver" | "Gold" | "Diamond" | "Perfect";

const TIERS: Tier[] = [
  "Iron",
  "Bronze",
  "Silver",
  "Gold",
  "Diamond",
  "Perfect",
];

const BRONZE_WEIGHT = 1 / 5;
const SILVER_WEIGHT = 1 / 10;
const GOLD_WEIGHT = 1 / 50;
const DIAMOND_WEIGHT = 1 / 150;
const PERFECT_WEIGHT = 1 / 1000;
const IRON_WEIGHT =
  1 -
  BRONZE_WEIGHT -
  SILVER_WEIGHT -
  GOLD_WEIGHT -
  DIAMOND_WEIGHT -
  PERFECT_WEIGHT;

const TIER_WEIGHTS: Record<Tier, number> = {
  Iron: IRON_WEIGHT,
  Bronze: BRONZE_WEIGHT,
  Silver: SILVER_WEIGHT,
  Gold: GOLD_WEIGHT,
  Diamond: DIAMOND_WEIGHT,
  Perfect: PERFECT_WEIGHT,
};

function getCardTier(cardValue: number): Tier {
  if (cardValue >= 100) return "Perfect";
  if (cardValue >= 90) return "Diamond";
  if (cardValue >= 80) return "Gold";
  if (cardValue >= 70) return "Silver";
  if (cardValue >= 60) return "Bronze";
  return "Iron";
}

function avgL10(cards: ShopCard[]): number {
  const priced = cards.filter((c) => c.lastPrice > 0);
  if (priced.length === 0) return 0;
  return priced.reduce((sum, c) => sum + c.lastPrice, 0) / priced.length;
}

const r = null;

// Maps each settings pack type key to its slot composition.
// Only covers packs whose odds are known; era-specific and special packs are omitted.
const PACK_SPECS: Record<
  string,
  { slots: Array<Tier | null>; historical: boolean }
> = {
  Standard: { slots: ["Bronze", r, r, r, r, r], historical: false },
  Silver: { slots: ["Silver", r, r, r, r, r], historical: false },
  Gold: { slots: ["Gold", r, r, r, r, r], historical: false },
  Diamond: { slots: ["Diamond", r, r, r, r, r], historical: false },
  Perfect: { slots: ["Perfect", r, r, r, r, r], historical: false },
  Rainbow: {
    slots: ["Iron", "Bronze", "Silver", "Gold", "Diamond", "Perfect"],
    historical: false,
  },
  HistSilver: { slots: ["Silver", r, r, r, r, r], historical: true },
  HistGold: { slots: ["Gold", r, r, r, r, r], historical: true },
  HistDiamond: { slots: ["Diamond", r, r, r, r, r], historical: true },
  HistPerfect: { slots: ["Perfect", r, r, r, r, r], historical: true },
  HistRainbow: {
    slots: ["Iron", "Bronze", "Silver", "Gold", "Diamond", "Perfect"],
    historical: true,
  },
  AllDiamond: {
    slots: ["Diamond", "Diamond", "Diamond", "Diamond", "Diamond", "Diamond"],
    historical: false,
  },
  AllPerfect: {
    slots: ["Perfect", "Perfect", "Perfect", "Perfect", "Perfect", "Perfect"],
    historical: false,
  },
  HistAllDiamond: {
    slots: ["Diamond", "Diamond", "Diamond", "Diamond", "Diamond", "Diamond"],
    historical: true,
  },
  HistAllPerfect: {
    slots: ["Perfect", "Perfect", "Perfect", "Perfect", "Perfect", "Perfect"],
    historical: true,
  },
};

export function computePackEVs(shopCards: ShopCard[]): Map<string, number> {
  const byTier = new Map<Tier, { live: ShopCard[]; historical: ShopCard[] }>();
  for (const tier of TIERS) byTier.set(tier, { live: [], historical: [] });

  for (const card of shopCards) {
    if (card.cardType === "nonpack" || card.cardType === "clubhouse") continue;
    const tier = getCardTier(card.cardValue);
    const bucket = byTier.get(tier)!;
    if (card.cardType === "live") bucket.live.push(card);
    else bucket.historical.push(card);
  }

  const liveAvg = {} as Record<Tier, number>;
  const histAvg = {} as Record<Tier, number>;
  for (const tier of TIERS) {
    const b = byTier.get(tier)!;
    liveAvg[tier] = avgL10(b.live);
    histAvg[tier] = avgL10(b.historical);
  }

  function slotEV(guaranteed: Tier | null, allHistorical: boolean): number {
    if (guaranteed !== null) {
      return allHistorical
        ? histAvg[guaranteed]
        : 0.55 * liveAvg[guaranteed] + 0.45 * histAvg[guaranteed];
    }
    let ev = 0;
    for (const tier of TIERS) {
      const avg = allHistorical
        ? histAvg[tier]
        : 0.55 * liveAvg[tier] + 0.45 * histAvg[tier];
      ev += TIER_WEIGHTS[tier] * avg;
    }
    return ev;
  }

  const result = new Map<string, number>();
  for (const [packType, spec] of Object.entries(PACK_SPECS)) {
    const ev = spec.slots.reduce(
      (sum, slot) => sum + slotEV(slot, spec.historical),
      0,
    );
    result.set(packType, Math.round(ev));
  }
  return result;
}
