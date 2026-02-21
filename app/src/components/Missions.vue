<template>
  <div class="mission-container">
    <div v-if="isLoading" class="spinner-container">
      <div class="spinner"></div>
    </div>
    <div v-else>
      <div class="mission-header">
        <h2>Missions</h2>
        <div class="form-check form-switch price-toggle">
          <input
            type="checkbox"
            class="form-check-input"
            role="switch"
            v-model="useSellPrice"
            @change="updatePriceType"
          />
          <span>Use Sell Price</span>
        </div>
        <div class="form-check form-switch price-toggle">
          <input type="checkbox" class="form-check-input" role="switch" v-model="hideCompleted" />
          <span>Hide Completed</span>
        </div>
      </div>
      <div class="mission-header">
        <MissionSearch v-model="searchQuery" />
        <div class="form-check form-switch price-toggle">
          <label for="target-mission-dropdown">Target Mission</label>
          <select
            id="target-mission-dropdown"
            v-model="selectedMissionFilter"
            class="mission-dropdown"
          >
            <option value="">All Missions</option>
            <option v-for="mission in missionsOfTypeMissions" :key="mission.id" :value="mission.id">
              {{ mission.rawMission.name }} - {{ mission.rawMission.reward }}
            </option>
          </select>
        </div>
        <div class="form-check form-switch price-toggle">
          <label for="category-dropdown">Category</label>
          <select id="category-dropdown" v-model="selectedCategoryFilter" class="mission-dropdown">
            <option value="">All Categories</option>
            <option v-for="category in missionCategories" :key="category" :value="category">
              {{ category }}
            </option>
          </select>
        </div>
        <div class="form-check form-switch price-toggle">
          <button
            @click="missionStore.calculateAllNotCalculatedMissions(filteredMissions.map((m) => m.id))"
            class="btn btn-primary"
          >
            Calculate All (may take a while)
          </button>
        </div>
      </div>
      <div v-show="!isMissionListCollapsed" class="mission-list">
        <MissionList
          :filteredMissions="filteredMissions"
          :isMissionComplete="isMissionComplete"
          :remainingPriceText="remainingPriceText"
          :selectMission="selectMission"
          @calculateMission="missionStore.calculateMissionDetails"
        />
      </div>
      <div v-if="selectedMission" class="toggle-icon" @click="toggleMissionList">
        {{ isMissionListCollapsed ? '▼' : '▲' }}
      </div>
      <div v-if="selectedMission !== null" class="mission-details">
        <MissionDetails :selectedMission="selectedMission" :missions="missions" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMissionStore } from '../stores/useMissionStore'
import MissionDetails from './MissionDetails.vue'
import MissionList from './MissionList.vue'
import MissionSearch from './MissionSearch.vue'
import type { UserMission } from '../models/UserMission'

const missionStore = useMissionStore()
const missions = computed(() => missionStore.userMissions)
const missionsOfTypeMissions = computed(() =>
  missionStore.userMissions.filter((m) => m.rawMission.type === 'missions'),
)
const selectedMission = ref<UserMission | null>(null)
const useSellPrice = ref(false)
const searchQuery = ref('')
const selectedMissionFilter = ref<string | null>(null)
const hideCompleted = ref(false)
const selectedCategoryFilter = ref<string | null>(null)
const isMissionListCollapsed = ref(false)

const isLoading = computed(() => missionStore.loading)

const toggleMissionList = () => {
  isMissionListCollapsed.value = !isMissionListCollapsed.value
}

const updatePriceType = () => {
  missionStore.selectedPriceType.sellPrice = useSellPrice.value
  missionStore.initialize()
}

const filteredMissions = computed(() => {
  let result = missions.value

  if (selectedMissionFilter.value) {
    const filteredMission = missions.value.find(
      (m) => m.id === Number(selectedMissionFilter.value),
    )
    if (filteredMission) {
      const missionIds = filteredMission.rawMission.missionIds || []
      result = missions.value.filter(
        (m) => missionIds.includes(m.id) || m.id === filteredMission.id,
      )
    } else {
      result = []
    }
  }

  if (hideCompleted.value) {
    result = result.filter((m) => !m.completed)
  }

  if (selectedCategoryFilter.value) {
    result = result.filter((m) => m.rawMission.category === selectedCategoryFilter.value)
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    result = result.filter(
      (m) =>
        m.rawMission.name.toLowerCase().includes(q) ||
        m.rawMission.category.toLowerCase().includes(q),
    )
  }

  return result
})

const remainingPriceText = (mission: UserMission) => {
  if (mission.completed) return 'Mission Completed'
  if (mission.remainingPrice <= 0) return 'Remaining Price: Unknown'
  return `Remaining Price: ${mission.remainingPrice.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })} PP`
}

const isMissionComplete = (mission: UserMission) => mission.completed

const selectMission = (mission: UserMission) => {
  selectedMission.value = mission
  isMissionListCollapsed.value = true
}

const missionCategories = computed(() => {
  const categories = new Set<string>()
  missions.value.forEach((m) => {
    if (m.rawMission.category) categories.add(m.rawMission.category)
  })
  return Array.from(categories)
})

watch(
  () => missionStore.userMissions,
  () => {
    selectedMission.value = null
  },
  { deep: true },
)
</script>

<style scoped>
.mission-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow: visible;
  height: auto;
  box-sizing: border-box;
}

.mission-list {
  flex: none;
  margin: 20px;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

.mission-details {
  flex: none;
  margin: 20px;
  max-width: 100%;
  box-sizing: border-box;
}

.toggle-icon {
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  font-size: 1.5rem;
  margin: 10px 0;
  user-select: none;
}

.mission-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.mission-dropdown {
  margin-left: 20px;
  flex: 1 1 auto;
  min-width: 150px;
}

.spinner-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.spinner {
  border: 8px solid #f3f3f3;
  border-top: 8px solid #3498db;
  border-radius: 50%;
  width: 60px;
  height: 60px;
  animation: spin 2s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
