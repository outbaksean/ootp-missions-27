<template>
  <ul class="list-group">
    <li
      v-for="mission in filteredMissions"
      :key="mission.id"
      class="list-group-item d-flex flex-column align-items-start"
    >
      <div class="d-flex justify-content-between w-100">
        <div class="col text-start">
          <strong>{{ mission.rawMission.name }}</strong>
        </div>
        <div class="col text-start">
          <span
            :class="{
              'text-success': isMissionComplete(mission),
              'text-danger': !isMissionComplete(mission),
            }"
          >
            {{ mission.progressText }}
          </span>
        </div>
        <div class="col text-start">
          <span class="progress-text">{{ remainingPriceText(mission) }}</span>
        </div>
        <div class="col-auto">
          <button
            v-if="mission.progressText === 'Not Calculated'"
            class="btn btn-secondary btn-sm"
            @click="$emit('calculateMission', mission.id)"
          >
            Calculate
          </button>
          <button v-else class="btn btn-primary btn-sm" @click="selectMission(mission)">
            Select
          </button>
        </div>
      </div>
      <div class="reward-text">{{ mission.rawMission.reward }}</div>
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import type { UserMission } from '../models/UserMission'

defineProps({
  filteredMissions: {
    type: Array as PropType<UserMission[]>,
    required: true,
  },
  isMissionComplete: {
    type: Function as PropType<(mission: UserMission) => boolean>,
    required: true,
  },
  remainingPriceText: {
    type: Function as PropType<(mission: UserMission) => string>,
    required: true,
  },
  selectMission: {
    type: Function as PropType<(mission: UserMission) => void>,
    required: true,
  },
})
</script>

<style scoped>
.list-group-item {
  font-size: 1.2rem;
}

.reward-text {
  margin-top: 5px;
  font-size: 0.9rem;
  color: #6c757d;
}
</style>
