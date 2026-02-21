<template>
  <div class="mission-cards">
    <template v-if="selectedMission && selectedMission.rawMission.type === 'missions'">
      <h3>Sub-Missions for {{ selectedMission.rawMission.name }}</h3>
      <ul class="list-group">
        <li
          v-for="subMission in selectedMissionSubMissions"
          :key="subMission.id"
          class="list-group-item d-flex justify-content-between align-items-center"
        >
          <span><strong>{{ subMission.rawMission.name }}</strong></span>
          <span
            :class="{
              'text-success': isMissionComplete(subMission),
              'text-danger': !isMissionComplete(subMission),
            }"
          >
            {{ subMission.progressText }}
          </span>
          <span class="progress-text">{{ remainingPriceText(subMission) }}</span>
        </li>
      </ul>
    </template>
    <template v-else-if="selectedMission">
      <h3>Mission Cards for {{ selectedMission.rawMission.name }}</h3>
      <h4 class="progress-text">{{ remainingPriceText(selectedMission) }}</h4>
      <h4 class="text-muted">{{ selectedMission.rawMission.reward }}</h4>
      <ul class="list-group">
        <li
          v-for="card in selectedMission.missionCards"
          :key="card.cardId"
          class="list-group-item"
          :style="{ backgroundColor: card.highlighted ? '#ffeb3b' : '' }"
        >
          <span :class="{ 'text-muted': card.locked }">
            {{ missionCardDescription(card) }}
          </span>
          <span v-if="card.owned" class="badge bg-success">Owned</span>
          <span v-if="card.locked" class="badge bg-secondary">Locked</span>
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
  if (mission.completed) return 'Mission Completed'
  if (mission.remainingPrice <= 0) return 'Remaining Price: Unknown'
  return `Remaining Price: ${mission.remainingPrice.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })} PP`
}

const missionCardDescription = (card: MissionCard) => {
  const price = card.price.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
  if (props.selectedMission?.rawMission.type === 'points') {
    return `${card.title} - ${card.points} Points - ${price} PP`
  }
  return `${card.title} - ${price} PP`
}

const isMissionComplete = (mission: UserMission) => mission.completed
</script>

<style scoped>
.mission-cards {
  flex: 1;
  margin: 20px;
}
</style>
