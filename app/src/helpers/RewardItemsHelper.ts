import type { UserMission } from "@/models/UserMission";
import type { ShopCard } from "@/models/ShopCard";

export type RewardItem = {
  label: string;
  count: number;
  type: "pack" | "card" | "park" | "artifact";
  cardId?: number;
};

type RewardItemOptions = {
  packPrices: Map<string, number>;
  packTypeLabels: Record<string, string>;
  shopCardsById: Map<number, ShopCard>;
};

function cardTitleShort(
  title: string,
  cardValue: number,
  price: number,
): string {
  const match = title.match(/\b(SP|RP|CL|1B|2B|3B|SS|LF|CF|RF|DH|C)\b/);
  const fromPosition =
    match?.index !== undefined ? title.slice(match.index) : title;
  const formattedPrice = price.toLocaleString();
  return `${cardValue} - ${fromPosition} - ${formattedPrice} PP`;
}

function packChipClass(label: string): string {
  const lower = label.toLowerCase();
  if (lower.includes("rainbow")) return "chip--rainbow";
  if (lower.includes("perfect")) return "chip--perfect";
  if (lower.includes("diamond")) return "chip--diamond";
  if (lower.includes("gold")) return "chip--gold";
  if (lower.includes("silver")) return "chip--silver";
  if (lower.includes("standard")) return "chip--standard";
  return "";
}

export function chipClass(item: RewardItem): string {
  if (item.type === "park") return "chip--park";
  if (item.type === "card") return "chip--card";
  if (item.type === "artifact") return "chip--artifact";
  return packChipClass(item.label);
}

export function collectRewardItems(
  missions: UserMission[],
  options: RewardItemOptions,
): RewardItem[] {
  const { packPrices, packTypeLabels, shopCardsById } = options;

  const packCounts = new Map<string, number>();
  const cardCounts = new Map<
    string,
    { count: number; value: number; cardId: number }
  >();
  const parkCounts = new Map<string, number>();
  const artifactCounts = new Map<string, number>();

  for (const mission of missions) {
    for (const reward of mission.rawMission.rewards ?? []) {
      const type = (reward.type as string).toLowerCase();
      if (type === "pack") {
        const packReward = reward as { packType: string; count: number };
        packCounts.set(
          packReward.packType,
          (packCounts.get(packReward.packType) ?? 0) + packReward.count,
        );
      } else if (type === "card") {
        const cardReward = reward as { cardId: number; count?: number };
        if (cardReward.cardId === 0) continue;
        const shopCard = shopCardsById.get(cardReward.cardId);
        const price = shopCard ? shopCard.lastPrice : 0;
        const title = shopCard
          ? cardTitleShort(shopCard.cardTitle, shopCard.cardValue, price)
          : `Card #${cardReward.cardId}`;
        const prev = cardCounts.get(title);
        cardCounts.set(title, {
          count: (prev?.count ?? 0) + (cardReward.count ?? 1),
          value: shopCard?.cardValue ?? prev?.value ?? 0,
          cardId: cardReward.cardId,
        });
      } else if (type === "park") {
        const parkReward = reward as unknown as { park: string };
        parkCounts.set(
          parkReward.park,
          (parkCounts.get(parkReward.park) ?? 0) + 1,
        );
      } else if (type === "artifact") {
        const artifactReward = reward as { artifact: string };
        artifactCounts.set(
          artifactReward.artifact,
          (artifactCounts.get(artifactReward.artifact) ?? 0) + 1,
        );
      }
    }
  }

  const packsRaw: { key: string; count: number }[] = [];
  for (const [packType, count] of packCounts) {
    packsRaw.push({ key: packType, count });
  }
  packsRaw.sort((a, b) => {
    const aVal = packPrices.get(a.key) ?? 0;
    const bVal = packPrices.get(b.key) ?? 0;
    return bVal - aVal;
  });

  const packs: RewardItem[] = packsRaw.map(({ key, count }) => {
    const packLabel = packTypeLabels[key] ?? key;
    const price = packPrices.get(key) ?? 0;
    const totalPrice = price * count;
    const formattedPrice = totalPrice.toLocaleString();
    const label = price > 0 ? `${packLabel} - ${formattedPrice} PP` : packLabel;
    return {
      label,
      count,
      type: "pack",
    };
  });

  const cards: RewardItem[] = Array.from(cardCounts.entries())
    .sort((a, b) => b[1].value - a[1].value)
    .map(([title, { count, cardId }]) => ({
      label: title,
      count,
      type: "card" as const,
      cardId,
    }));

  const parks: RewardItem[] = [];
  for (const [park, count] of parkCounts) {
    parks.push({ label: park, count, type: "park" });
  }

  const artifacts: RewardItem[] = [];
  for (const [artifact, count] of artifactCounts) {
    const price = packPrices.get("Artifact") ?? 0;
    const totalPrice = price * count;
    const label =
      price > 0
        ? `Artifact - ${artifact} - ${totalPrice.toLocaleString()} PP`
        : `Artifact - ${artifact}`;
    artifacts.push({ label, count, type: "artifact" });
  }

  return [...cards, ...packs, ...parks, ...artifacts];
}
