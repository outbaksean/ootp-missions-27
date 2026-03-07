<template>
  <div class="shopping-list-panel">
    <!-- Header -->
    <div class="sl-header">
      <h3 class="sl-title">Shopping List</h3>
      <select v-model="sortBy" class="sl-sort-select">
        <option value="missions">Most Missions</option>
        <option value="price">Cheapest</option>
        <option value="efficiency">Best Value</option>
      </select>
    </div>

    <!-- Chain filter chips -->
    <div class="sl-chain-filter">
      <button
        class="sl-chip"
        :class="{ 'sl-chip--active': selectedChainLabels.size === 0 }"
        @click="selectedChainLabels = new Set()"
      >
        All
      </button>
      <button
        v-for="chain in availableChains"
        :key="chain.label"
        class="sl-chip"
        :class="{ 'sl-chip--active': selectedChainLabels.has(chain.label) }"
        @click="toggleChain(chain.label)"
      >
        {{ chain.label }}
      </button>
    </div>

    <!-- Empty state -->
    <p v-if="shoppingItems.length === 0" class="sl-empty">
      No cards to buy. Calculate missions first to see shopping suggestions.
    </p>

    <!-- Card rows -->
    <div
      v-for="item in shoppingItems"
      :key="item.cardId"
      class="sl-item"
    >
      <div class="sl-item-main">
        <span class="sl-card-title">{{ item.title }}</span>
        <span class="sl-mission-badge">{{ item.missionCount }}x</span>
      </div>
      <div class="sl-item-sub">
        <span class="sl-price">{{ item.price.toLocaleString() }} PP</span>
        <span class="sl-missions">{{ item.missions.map((m) => m.rawMission.name).join(", ") }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { UserMission } from "../models/UserMission";

const props = defineProps<{ missions: UserMission[] }>();

interface ShoppingItem {
  cardId: number;
  title: string;
  price: number;
  missionCount: number;
  missions: UserMission[];
}

const selectedChainLabels = ref<Set<string>>(new Set());
const sortBy = ref<"missions" | "price" | "efficiency">("missions");

function collectDescendantIds(
  rootId: number,
  missionById: Map<number, UserMission>,
): Set<number> {
  const result = new Set<number>();
  const queue = [rootId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const subId of missionById.get(id)?.rawMission.missionIds ?? []) {
      if (!result.has(subId)) {
        result.add(subId);
        queue.push(subId);
      }
    }
  }
  return result;
}

const availableChains = computed(() => {
  const allSubIds = new Set<number>();
  for (const m of props.missions) {
    if (m.rawMission.type === "missions" && m.rawMission.missionIds) {
      m.rawMission.missionIds.forEach((id) => allSubIds.add(id));
    }
  }
  const missionById = new Map(props.missions.map((m) => [m.id, m]));
  const incompleteCalculatedIds = new Set(
    props.missions
      .filter((m) => !m.completed && m.progressText !== "Not Calculated")
      .map((m) => m.id),
  );
  const chainRoots = props.missions.filter(
    (m) => m.rawMission.type === "missions" && !allSubIds.has(m.id),
  );
  return chainRoots
    .map((root) => {
      const descendantIds = collectDescendantIds(root.id, missionById);
      const memberIds = new Set([root.id, ...descendantIds]);
      return { label: root.rawMission.name, memberIds };
    })
    .filter((chain) =>
      [...chain.memberIds].some((id) => incompleteCalculatedIds.has(id)),
    );
});

function toggleChain(label: string) {
  const next = new Set(selectedChainLabels.value);
  if (next.has(label)) {
    next.delete(label);
  } else {
    next.add(label);
  }
  selectedChainLabels.value = next;
}

const shoppingItems = computed((): ShoppingItem[] => {
  // Filter to incomplete missions that have been calculated
  let eligibleMissions = props.missions.filter(
    (m) => !m.completed && m.progressText !== "Not Calculated",
  );

  // Apply chain filter
  if (selectedChainLabels.value.size > 0) {
    const allowedIds = new Set<number>();
    for (const chain of availableChains.value) {
      if (selectedChainLabels.value.has(chain.label)) {
        chain.memberIds.forEach((id) => allowedIds.add(id));
      }
    }
    eligibleMissions = eligibleMissions.filter((m) => allowedIds.has(m.id));
  }

  // Aggregate highlighted unowned cards across missions
  const cardMap = new Map<
    number,
    { title: string; price: number; missions: UserMission[] }
  >();
  for (const mission of eligibleMissions) {
    for (const card of mission.missionCards) {
      if (!card.highlighted || card.owned) continue;
      const existing = cardMap.get(card.cardId);
      if (existing) {
        existing.missions.push(mission);
      } else {
        cardMap.set(card.cardId, {
          title: card.title,
          price: card.price,
          missions: [mission],
        });
      }
    }
  }

  const items: ShoppingItem[] = Array.from(cardMap.entries()).map(
    ([cardId, data]) => ({
      cardId,
      title: data.title,
      price: data.price,
      missionCount: data.missions.length,
      missions: data.missions,
    }),
  );

  if (sortBy.value === "missions") {
    items.sort((a, b) => b.missionCount - a.missionCount || a.price - b.price);
  } else if (sortBy.value === "price") {
    items.sort((a, b) => a.price - b.price);
  } else {
    // efficiency: cheapest per mission helped
    items.sort(
      (a, b) => a.price / a.missionCount - b.price / b.missionCount,
    );
  }

  return items;
});
</script>

<style scoped>
.shopping-list-panel {
  height: 100%;
  overflow-y: auto;
  background: var(--detail-bg);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.sl-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--card-border);
  flex-shrink: 0;
}

.sl-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary, #1e293b);
}

.sl-sort-select {
  font-size: 0.78rem;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid var(--card-border);
  background: var(--detail-bg);
  color: var(--text-primary, #1e293b);
  cursor: pointer;
}

.sl-chain-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  flex-shrink: 0;
}

.sl-chip {
  padding: 3px 10px;
  border-radius: 9999px;
  border: 1px solid var(--card-border);
  background: transparent;
  color: #64748b;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s;
  white-space: nowrap;
}

.sl-chip:hover {
  background: rgba(99, 102, 241, 0.08);
  border-color: var(--accent);
  color: var(--accent);
}

.sl-chip--active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.sl-chip--active:hover {
  background: var(--accent);
  color: #fff;
}

.sl-empty {
  color: #94a3b8;
  font-size: 0.85rem;
  text-align: center;
  padding: 2rem 1rem;
  margin: 0;
}

.sl-item {
  border: 1px solid var(--card-border);
  border-radius: 8px;
  padding: 0.6rem 0.8rem;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  transition: box-shadow 0.15s;
  flex-shrink: 0;
}

.sl-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.sl-item-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.sl-card-title {
  font-size: 0.88rem;
  font-weight: 600;
  color: #1e293b;
  flex: 1;
  min-width: 0;
}

.sl-mission-badge {
  font-size: 0.72rem;
  font-weight: 700;
  background: var(--accent);
  color: #fff;
  border-radius: 9999px;
  padding: 2px 8px;
  flex-shrink: 0;
}

.sl-item-sub {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  min-width: 0;
}

.sl-price {
  font-size: 0.8rem;
  font-weight: 600;
  color: #16a34a;
  flex-shrink: 0;
}

.sl-missions {
  font-size: 0.72rem;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
</style>
