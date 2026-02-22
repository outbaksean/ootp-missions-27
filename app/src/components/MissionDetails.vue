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
          <span class="item-name">{{ missionCardDescription(card) }}</span>
          <div class="item-badges">
            <span v-if="card.highlighted && !card.owned" class="pill pill-buy">Buy</span>
            <span v-if="card.owned" class="pill pill-owned">Owned</span>
            <span v-if="card.locked" class="pill pill-locked">Locked</span>
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

const props = defineProps({
  selectedMission: Object as () => UserMission | null,
  missions: Array as () => UserMission[],
})

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

const missionCardDescription = (card: MissionCard) => {
  const price = card.price.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
  if (props.selectedMission?.rawMission.type === 'points') {
    return `${card.title} — ${card.points} pts — ${price} PP`
  }
  return `${card.title} — ${price} PP`
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

.pill-locked {
  background: #f1f5f9;
  color: #64748b;
}
</style>
