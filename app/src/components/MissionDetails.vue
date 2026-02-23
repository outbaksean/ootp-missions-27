<template>
  <div class="mission-details-panel">
    <!-- Sub-missions type -->
    <template v-if="selectedMission && selectedMission.rawMission.type === 'missions'">
      <div class="detail-mission-header">
        <h3 class="detail-mission-name">{{ selectedMission.rawMission.name }}</h3>
        <p class="detail-reward">{{ selectedMission.rawMission.reward }}</p>
        <p class="detail-meta" :class="{ 'meta-complete': selectedMission.completed }">
          {{ selectedMission.progressText }}
        </p>
      </div>
      <ul class="detail-list">
        <li
          v-for="subMission in selectedMissionSubMissions"
          :key="subMission.id"
          class="detail-item"
        >
          <span class="item-name">{{ subMission.rawMission.name }}</span>
          <span
            class="item-status"
            :class="isMissionComplete(subMission) ? 'status-done' : 'status-pending'"
          >
            {{ subMission.progressText }}
          </span>
          <span v-if="remainingPriceText(subMission)" class="item-price">
            {{ remainingPriceText(subMission) }}
          </span>
        </li>
      </ul>
    </template>

    <!-- Cards type -->
    <template v-else-if="selectedMission">
      <div class="detail-mission-header">
        <h3 class="detail-mission-name">{{ selectedMission.rawMission.name }}</h3>
        <p class="detail-reward">{{ selectedMission.rawMission.reward }}</p>
        <p v-if="selectedMission.completed" class="detail-meta meta-complete">Completed</p>
        <p v-else-if="remainingPriceText(selectedMission)" class="detail-price">
          {{ remainingPriceText(selectedMission) }} remaining
        </p>
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
          }"
        >
          <span class="item-name">{{ missionCardTitle(card) }}</span>
          <div class="item-price-area">
            <template v-if="!card.owned">
              <input
                class="price-input"
                :class="{ 'price-overridden': cardStore.cardPriceOverrides.has(card.cardId) }"
                type="number"
                min="0"
                :value="card.price"
                @focus="($event.target as HTMLInputElement).select()"
                @blur="onPriceChange(card, $event)"
                @keydown.enter="($event.target as HTMLInputElement).blur()"
              />
              <button
                v-if="cardStore.cardPriceOverrides.has(card.cardId)"
                class="btn-clear-override"
                title="Revert to CSV price"
                @click="clearOverride(card.cardId)"
              >×</button>
            </template>
            <span v-else class="price-display">{{ formatPrice(card.price) }} PP</span>
          </div>
          <div class="item-badges">
            <span v-if="card.highlighted && !card.owned" class="pill pill-buy">Buy</span>
            <span v-if="card.owned" class="pill pill-owned">Owned</span>
            <button v-if="card.owned" class="btn-lock" :class="{ 'btn-lock--active': card.locked }" @click="toggleLock(card.cardId)">
              {{ card.locked ? 'Locked' : 'Lock' }}
            </button>
          </div>
        </li>
      </ul>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { UserMission } from '../models/UserMission'
import type { MissionCard } from '@/models/MissionCard'
import { useCardStore } from '@/stores/useCardStore'
import { useMissionStore } from '@/stores/useMissionStore'

const props = defineProps({
  selectedMission: Object as () => UserMission | null,
  missions: Array as () => UserMission[],
})

const cardStore = useCardStore()
const missionStore = useMissionStore()

async function toggleLock(cardId: number) {
  await cardStore.toggleCardLocked(cardId)
  const locked = cardStore.shopCardsById.get(cardId)?.locked ?? false
  missionStore.updateCardLockedState(cardId, locked)
}

async function onPriceChange(card: MissionCard, event: Event) {
  const input = event.target as HTMLInputElement
  const raw = parseInt(input.value, 10)
  if (!isNaN(raw) && raw > 0) {
    cardStore.setCardPriceOverride(card.cardId, raw)
  } else {
    cardStore.clearCardPriceOverride(card.cardId)
  }
  await missionStore.handlePriceOverrideChanged()
}

async function clearOverride(cardId: number) {
  cardStore.clearCardPriceOverride(cardId)
  await missionStore.handlePriceOverrideChanged()
}

const formatPrice = (price: number) =>
  price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const selectedMissionSubMissions = computed(() => {
  if (props.selectedMission?.rawMission.type === 'missions' && props.missions) {
    const missionIds = props.selectedMission.rawMission.missionIds || []
    return props.missions.filter((mission: UserMission) => missionIds.includes(mission.id))
  }
  return []
})

const remainingPriceText = (mission: UserMission) => {
  if (mission.completed) return ''
  if (mission.remainingPrice <= 0) return ''
  return mission.remainingPrice.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }) + ' PP'
}

const missionCardTitle = (card: MissionCard) => {
  if (props.selectedMission?.rawMission.type === 'points') {
    return `${card.title} — ${card.points} pts`
  }
  return card.title
}

const isMissionComplete = (mission: UserMission) => mission.completed
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

.detail-mission-name {
  font-size: 0.97rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
  line-height: 1.35;
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

/* List */
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

.item-name {
  flex: 1;
  font-size: 0.78rem;
  color: var(--text-primary);
  word-break: break-word;
  min-width: 0;
}

.item-status {
  font-size: 0.72rem;
  font-weight: 500;
  flex-shrink: 0;
}

.status-done {
  color: var(--success-text);
}

.status-pending {
  color: #dc2626;
}

.item-price {
  font-size: 0.7rem;
  color: var(--text-muted);
  width: 100%;
}

.item-price-area {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
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

.btn-lock {
  font-size: 0.62rem;
  padding: 1px 6px;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
  background: transparent;
  color: #94a3b8;
  border: 1px solid #cbd5e1;
  transition: background 0.15s, color 0.15s;
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
</style>
