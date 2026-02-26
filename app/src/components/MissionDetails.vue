<template>
  <div class="mission-details-panel">
    <!-- Sub-missions type -->
    <template
      v-if="selectedMission && selectedMission.rawMission.type === 'missions'"
    >
      <div class="detail-mission-header">
        <div v-if="parentMissions.length" class="parent-missions">
          <span class="parent-label">Part of</span>
          <button
            v-for="parent in parentMissions"
            :key="parent.id"
            class="parent-link"
            @click="$emit('selectMission', parent)"
          >
            {{ parent.rawMission.name }}
          </button>
        </div>
        <div class="detail-mission-title-row">
          <h3 class="detail-mission-name">
            {{ selectedMission.rawMission.name }}
          </h3>
          <button
            class="detail-close-btn"
            type="button"
            aria-label="Close"
            @click="$emit('close')"
          >
            ✕
          </button>
        </div>
        <p class="detail-reward">{{ selectedMission.rawMission.reward }}</p>
        <p
          class="detail-meta"
          :class="{ 'meta-complete': selectedMission.completed }"
        >
          {{ selectedMission.progressText }}
        </p>
        <div class="detail-stats">
          <div v-if="remainingPriceText(selectedMission)" class="stat-row">
            <span class="stat-label">Cost</span>
            <span class="stat-value">{{ remainingPriceText(selectedMission) }}</span>
          </div>
          <div v-if="selectedMission.unlockedCardsPrice > 0" class="stat-row">
            <span class="stat-label">Unlocked</span>
            <span class="stat-value">{{ selectedMission.unlockedCardsPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }} PP</span>
          </div>
          <div v-if="selectedMission.rewardValue !== undefined" class="stat-row">
            <span class="stat-label">Reward</span>
            <span class="stat-value">{{ selectedMission.rewardValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }} PP</span>
          </div>
          <div v-if="selectedMission.missionValue !== undefined && !selectedMission.completed" class="stat-row">
            <span class="stat-label">Net</span>
            <span class="stat-value" :class="selectedMission.missionValue >= 0 ? 'stat-positive' : 'stat-negative'">{{ selectedMission.missionValue >= 0 ? "+" : "" }}{{ selectedMission.missionValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }} PP</span>
          </div>
        </div>
        <button
          v-if="isManuallyComplete || canMarkComplete"
          class="btn-manual-complete"
          :class="{ 'btn-manual-complete--active': isManuallyComplete }"
          @click="onToggleMissionComplete"
        >
          {{ isManuallyComplete ? "Set Not Completed" : "Set Completed" }}
        </button>
      </div>
      <ul class="detail-list">
        <li
          v-for="subMission in selectedMissionSubMissions"
          :key="subMission.id"
          class="detail-item detail-item--sub detail-item--clickable"
          @click="$emit('selectMission', subMission)"
        >
          <div class="sub-mission-info">
            <span class="item-name">{{ subMission.rawMission.name }}</span>
            <span
              class="item-status"
              :class="
                isMissionComplete(subMission) ? 'status-done' : 'status-pending'
              "
            >
              {{ subMission.progressText }}
            </span>
          </div>
          <span v-if="remainingPriceText(subMission)" class="item-price-inline">
            {{ remainingPriceText(subMission) }}
          </span>
        </li>
      </ul>
    </template>

    <!-- Cards type -->
    <template v-else-if="selectedMission">
      <div class="detail-mission-header">
        <div v-if="parentMissions.length" class="parent-missions">
          <span class="parent-label">Part of</span>
          <button
            v-for="parent in parentMissions"
            :key="parent.id"
            class="parent-link"
            @click="$emit('selectMission', parent)"
          >
            {{ parent.rawMission.name }}
          </button>
        </div>
        <div class="detail-mission-title-row">
          <h3 class="detail-mission-name">
            {{ selectedMission.rawMission.name }}
          </h3>
          <button
            class="detail-close-btn"
            type="button"
            aria-label="Close"
            @click="$emit('close')"
          >
            ✕
          </button>
        </div>
        <p class="detail-reward">{{ selectedMission.rawMission.reward }}</p>
        <p v-if="selectedMission.completed" class="detail-meta meta-complete">
          Completed
        </p>
        <p v-else-if="remainingPriceText(selectedMission)" class="detail-price">
          {{ remainingPriceText(selectedMission) }} remaining
        </p>
        <div class="detail-stats">
          <div v-if="remainingPriceText(selectedMission)" class="stat-row">
            <span class="stat-label">Cost</span>
            <span class="stat-value">{{ remainingPriceText(selectedMission) }}</span>
          </div>
          <div v-if="selectedMission.unlockedCardsPrice > 0" class="stat-row">
            <span class="stat-label">Unlocked</span>
            <span class="stat-value">{{ selectedMission.unlockedCardsPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }} PP</span>
          </div>
          <div v-if="selectedMission.rewardValue !== undefined" class="stat-row">
            <span class="stat-label">Reward</span>
            <span class="stat-value">{{ selectedMission.rewardValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }} PP</span>
          </div>
          <div v-if="selectedMission.missionValue !== undefined && !selectedMission.completed" class="stat-row">
            <span class="stat-label">Net</span>
            <span class="stat-value" :class="selectedMission.missionValue >= 0 ? 'stat-positive' : 'stat-negative'">{{ selectedMission.missionValue >= 0 ? "+" : "" }}{{ selectedMission.missionValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }} PP</span>
          </div>
        </div>
        <button
          v-if="isManuallyComplete || canMarkComplete"
          class="btn-manual-complete"
          :class="{ 'btn-manual-complete--active': isManuallyComplete }"
          @click="onToggleMissionComplete"
        >
          {{ isManuallyComplete ? "Set Not Completed" : "Set Completed" }}
        </button>
      </div>
      <ul class="detail-list">
        <li
          v-for="card in selectedMission.missionCards"
          :key="card.cardId"
          class="detail-item"
          :class="{
            'item-highlighted': card.highlighted,
            'item-owned': card.owned,
            'item-locked': card.locked,
            'item-unavailable': !card.available,
          }"
        >
          <span class="item-name">{{ missionCardTitle(card) }}</span>
          <div class="item-price-area">
            <template v-if="!card.owned">
              <div class="price-input-wrap">
                <input
                  class="price-input"
                  :class="{
                    'price-overridden': cardStore.cardPriceOverrides.has(
                      card.cardId,
                    ),
                  }"
                  type="number"
                  min="0"
                  :value="
                    cardStore.cardPriceOverrides.get(card.cardId) ?? card.price
                  "
                  @focus="($event.target as HTMLInputElement).select()"
                  @blur="onPriceChange(card, $event)"
                  @keydown.enter="($event.target as HTMLInputElement).blur()"
                />
                <button
                  v-if="cardStore.cardPriceOverrides.has(card.cardId)"
                  class="btn-clear-override"
                  title="Revert to CSV price"
                  @click="clearOverride(card.cardId)"
                >
                  ×
                </button>
              </div>
              <span
                v-if="
                  !card.available &&
                  !cardStore.cardPriceOverrides.has(card.cardId)
                "
                class="price-unavailable"
              >
                Set price to include
              </span>
            </template>
            <span v-else class="price-display"
              >{{ formatPrice(card.price) }} PP</span
            >
          </div>
          <div class="item-badges">
            <span v-if="card.highlighted && !card.owned" class="pill pill-buy"
              >Buy</span
            >
            <span v-if="card.owned" class="pill pill-owned">Owned</span>
            <span v-if="card.shouldLock && !card.locked" class="pill pill-use"
              >Use</span
            >
            <button
              v-if="card.owned"
              class="btn-lock"
              :class="{ 'btn-lock--active': card.locked }"
              @click="toggleLock(card.cardId)"
            >
              {{ card.locked ? "Locked" : "Lock" }}
            </button>
            <button
              v-if="card.owned && cardStore.cardOwnedOverrides.has(card.cardId)"
              class="btn-own btn-own--active"
              @click="toggleOwn(card.cardId)"
            >
              Unown
            </button>
            <button
              v-if="!card.owned && card.available"
              class="btn-own"
              @click="toggleOwn(card.cardId)"
            >
              Own
            </button>
            <button
              v-if="otherMissionsForCard(card.cardId).length > 0"
              class="shared-badge"
              @click.stop="toggleSharedMissions(card.cardId)"
            >
              {{ otherMissionsForCard(card.cardId).length }}
              {{
                otherMissionsForCard(card.cardId).length === 1
                  ? "other mission"
                  : "other missions"
              }}
            </button>
          </div>
          <div
            v-if="expandedSharedCardId === card.cardId"
            class="shared-missions-list"
          >
            <button
              v-for="mission in otherMissionsForCard(card.cardId)"
              :key="mission.id"
              class="shared-mission-link"
              @click="$emit('selectMission', mission)"
            >
              {{ mission.rawMission.name }}
            </button>
          </div>
        </li>
      </ul>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { UserMission } from "../models/UserMission";
import type { MissionCard } from "@/models/MissionCard";
import { useCardStore } from "@/stores/useCardStore";
import { useMissionStore } from "@/stores/useMissionStore";

const props = defineProps({
  selectedMission: Object as () => UserMission | null,
  missions: Array as () => UserMission[],
});

const cardStore = useCardStore();
const missionStore = useMissionStore();

defineEmits<{
  (e: "selectMission", mission: UserMission): void;
  (e: "close"): void;
}>();

const pendingRecalcCardIds = ref<Set<number>>(new Set());
const expandedSharedCardId = ref<number | null>(null);

const isManuallyComplete = computed(() =>
  props.selectedMission
    ? missionStore.manualCompleteOverrides.has(props.selectedMission.id)
    : false,
);

const canMarkComplete = computed(() => {
  if (!props.selectedMission) return false;
  const mission = props.selectedMission;
  if (mission.progressText === "Not Calculated") return false;
  const rawMission = mission.rawMission;
  if (rawMission.type === "count") {
    const ownedCount = mission.missionCards.filter((c) => c.owned).length;
    return ownedCount >= rawMission.requiredCount;
  }
  if (rawMission.type === "points") {
    const ownedPoints = mission.missionCards
      .filter((c) => c.owned)
      .reduce((sum, c) => sum + (c.points ?? 0), 0);
    return ownedPoints >= rawMission.requiredCount;
  }
  if (rawMission.type === "missions") {
    const completedCount = selectedMissionSubMissions.value.filter(
      (m) => m.completed,
    ).length;
    return completedCount >= rawMission.requiredCount;
  }
  return false;
});

function onToggleMissionComplete() {
  if (props.selectedMission) {
    missionStore.toggleMissionComplete(props.selectedMission.id);
  }
}

const cardMissionMap = computed((): Map<number, UserMission[]> => {
  const map = new Map<number, UserMission[]>();
  for (const mission of props.missions ?? []) {
    for (const card of mission.rawMission.cards ?? []) {
      if (!map.has(card.cardId)) map.set(card.cardId, []);
      map.get(card.cardId)!.push(mission);
    }
  }
  return map;
});

function otherMissionsForCard(cardId: number): UserMission[] {
  const all = cardMissionMap.value.get(cardId) ?? [];
  return all.filter((m) => m.id !== props.selectedMission?.id);
}

function toggleSharedMissions(cardId: number) {
  expandedSharedCardId.value =
    expandedSharedCardId.value === cardId ? null : cardId;
}

watch(
  () => props.selectedMission?.id,
  () => {
    expandedSharedCardId.value = null;
  },
);

async function toggleLock(cardId: number) {
  await cardStore.toggleCardLocked(cardId);
  const locked = cardStore.shopCardsById.get(cardId)?.locked ?? false;
  await missionStore.updateCardLockedState(cardId, locked);
}

async function toggleOwn(cardId: number) {
  cardStore.toggleCardOwnedOverride(cardId);
  await missionStore.updateCardOwnedState(cardId);
}

async function onPriceChange(card: MissionCard, event: Event) {
  const input = event.target as HTMLInputElement;
  const raw = parseInt(input.value, 10);
  if (!isNaN(raw) && raw > 0) {
    cardStore.setCardPriceOverride(card.cardId, raw);
  } else {
    cardStore.clearCardPriceOverride(card.cardId);
  }
  const next = new Set(pendingRecalcCardIds.value);
  next.add(card.cardId);
  pendingRecalcCardIds.value = next;
  await recalculate();
}

async function clearOverride(cardId: number) {
  cardStore.clearCardPriceOverride(cardId);
  const next = new Set(pendingRecalcCardIds.value);
  next.add(cardId);
  pendingRecalcCardIds.value = next;
  await recalculate();
}

async function recalculate() {
  await missionStore.handlePriceOverrideChanged(
    props.selectedMission?.id,
    [...pendingRecalcCardIds.value],
  );
  pendingRecalcCardIds.value = new Set();
}

const formatPrice = (price: number) =>
  price.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const selectedMissionSubMissions = computed(() => {
  if (props.selectedMission?.rawMission.type === "missions" && props.missions) {
    const missionIds = props.selectedMission.rawMission.missionIds || [];
    return props.missions.filter((mission: UserMission) =>
      missionIds.includes(mission.id),
    );
  }
  return [];
});

const parentMissions = computed(() => {
  if (!props.selectedMission || !props.missions) return [];
  const id = props.selectedMission.id;
  return props.missions.filter(
    (m) =>
      m.rawMission.type === "missions" &&
      (m.rawMission.missionIds ?? []).includes(id),
  );
});

const remainingPriceText = (mission: UserMission) => {
  if (mission.completed) return "";
  if (mission.remainingPrice <= 0) return "";
  return (
    mission.remainingPrice.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }) + " PP"
  );
};

const missionCardTitle = (card: MissionCard) => {
  if (props.selectedMission?.rawMission.type === "points") {
    return `${card.title} — ${card.points} pts`;
  }
  return card.title;
};

const isMissionComplete = (mission: UserMission) => mission.completed;
</script>

<style scoped>
.mission-details-panel {
  padding: 1rem;
}

.detail-mission-header {
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--card-border);
}

.parent-missions {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.25rem;
  margin-bottom: 0.4rem;
}

.parent-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  font-weight: 600;
  flex-shrink: 0;
}

.parent-link {
  background: none;
  border: none;
  padding: 0;
  font-size: 0.72rem;
  color: #3b82f6;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
  text-decoration-color: rgba(59, 130, 246, 0.4);
  transition: color 0.15s;
}

.parent-link:hover {
  color: #2563eb;
}

.detail-mission-name {
  font-size: 0.97rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
  line-height: 1.35;
}

.detail-mission-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  position: sticky;
  top: 0;
  background: var(--detail-bg);
  z-index: 2;
}

.detail-close-btn {
  background: none;
  border: none;
  font-size: 0.9rem;
  color: #94a3b8;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  line-height: 1;
  transition:
    background 0.15s,
    color 0.15s;
}

.detail-close-btn:hover {
  background: #e2e8f0;
  color: #1e293b;
}

.detail-reward {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-bottom: 0.3rem;
}

.detail-price {
  font-size: 0.83rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.detail-meta {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin: 0;
}

.meta-complete {
  color: var(--success-text);
  font-weight: 500;
}

.detail-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  margin: 0.5rem 0;
  padding: 0.5rem 0;
  border-top: 1px solid var(--card-border);
  border-bottom: 1px solid var(--card-border);
}

.stat-row {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.stat-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  font-weight: 600;
}

.stat-value {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
}

.stat-positive {
  color: #4ade80;
}

.stat-negative {
  color: #f87171;
}

/* List */
.btn-recalculate {
  margin-top: 0.5rem;
  padding: 3px 10px;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 4px;
  cursor: pointer;
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fcd34d;
  transition: background 0.15s;
}

.btn-recalculate:hover {
  background: #fde68a;
}

.btn-manual-complete {
  margin-top: 0.5rem;
  padding: 3px 10px;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 4px;
  cursor: pointer;
  background: transparent;
  color: #64748b;
  border: 1px solid #cbd5e1;
  transition:
    background 0.15s,
    color 0.15s;
}

.btn-manual-complete:hover {
  background: #f0fdf4;
  color: #16a34a;
  border-color: #86efac;
}

.btn-manual-complete--active {
  background: #f0fdf4;
  color: #16a34a;
  border-color: #86efac;
}

.btn-manual-complete--active:hover {
  background: #fee2e2;
  color: #dc2626;
  border-color: #fca5a5;
}

.detail-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.detail-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.45rem 0.65rem;
  border-radius: 6px;
  background: #fff;
  border: 1px solid var(--card-border);
  flex-wrap: wrap;
}

.item-highlighted {
  background: #fefce8;
  border-color: #fde047;
}

.item-owned {
  opacity: 0.55;
}

.item-locked {
  opacity: 0.45;
}

.item-unavailable {
  opacity: 0.5;
  background: #f8fafc;
}

.price-unavailable {
  font-size: 0.7rem;
  color: #94a3b8;
  font-style: italic;
}

.item-name {
  flex: 1;
  font-size: 0.78rem;
  color: var(--text-primary);
  word-break: break-word;
  min-width: 0;
}

.detail-item--sub {
  align-items: center;
}

.detail-item--clickable {
  cursor: pointer;
  transition: background 0.12s;
}

.detail-item--clickable:hover {
  background: #f1f5f9;
}

.sub-mission-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.item-status {
  font-size: 0.72rem;
  font-weight: 500;
  flex-shrink: 0;
}

.sub-mission-info .item-status {
  font-weight: 400;
}

.status-done {
  color: var(--success-text);
}

.status-pending {
  color: #dc2626;
}

.item-price-inline {
  font-size: 0.72rem;
  color: var(--text-muted);
  font-weight: 500;
  flex-shrink: 0;
}

.item-price-area {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.15rem;
  flex-shrink: 0;
}

.price-input-wrap {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.price-display {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.price-input {
  width: 5.5rem;
  font-size: 0.75rem;
  padding: 1px 4px;
  border: 1px solid var(--card-border);
  border-radius: 4px;
  background: #fff;
  color: var(--text-primary);
  text-align: right;
}

.price-input:focus {
  outline: none;
  border-color: #94a3b8;
}

.price-input::-webkit-outer-spin-button,
.price-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.price-input[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}

.price-overridden {
  border-color: #f59e0b;
  color: #b45309;
}

.btn-clear-override {
  font-size: 0.7rem;
  line-height: 1;
  padding: 1px 4px;
  border-radius: 4px;
  cursor: pointer;
  background: transparent;
  color: #94a3b8;
  border: 1px solid #cbd5e1;
}

.btn-clear-override:hover {
  background: #fee2e2;
  color: #dc2626;
  border-color: #fca5a5;
}

.item-badges {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}

.pill {
  font-size: 0.62rem;
  padding: 1px 6px;
  border-radius: 999px;
  font-weight: 600;
}

.pill-buy {
  background: #fef9c3;
  color: #854d0e;
}

.pill-owned {
  background: #dcfce7;
  color: #166534;
}

.pill-use {
  background: #dbeafe;
  color: #1e40af;
}

.btn-lock {
  font-size: 0.62rem;
  padding: 1px 6px;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
  background: transparent;
  color: #94a3b8;
  border: 1px solid #cbd5e1;
  transition:
    background 0.15s,
    color 0.15s;
}

.btn-lock:hover {
  background: #f1f5f9;
  color: #475569;
}

.btn-lock--active {
  background: #f1f5f9;
  color: #64748b;
  border-color: #cbd5e1;
}

.btn-lock--active:hover {
  background: #fee2e2;
  color: #dc2626;
  border-color: #fca5a5;
}

.btn-own {
  font-size: 0.62rem;
  padding: 1px 6px;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
  background: transparent;
  color: #94a3b8;
  border: 1px solid #cbd5e1;
  transition:
    background 0.15s,
    color 0.15s;
}

.btn-own:hover {
  background: #dcfce7;
  color: #166534;
  border-color: #86efac;
}

.btn-own--active {
  background: #f0fdf4;
  color: #16a34a;
  border-color: #86efac;
}

.btn-own--active:hover {
  background: #fee2e2;
  color: #dc2626;
  border-color: #fca5a5;
}

.shared-badge {
  font-size: 0.65rem;
  padding: 1px 7px;
  border-radius: 999px;
  background: #eff6ff;
  color: #3b82f6;
  border: 1px solid #bfdbfe;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background 0.15s;
}

.shared-badge:hover {
  background: #dbeafe;
}

.shared-missions-list {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.4rem 0.75rem 0.4rem 1rem;
  background: #f8fafc;
  border-left: 2px solid #bfdbfe;
  margin: 0 0 0.25rem 0;
  flex-basis: 100%;
}

.shared-mission-link {
  font-size: 0.73rem;
  color: #3b82f6;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-align: left;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.shared-mission-link:hover {
  color: #1d4ed8;
}
</style>
