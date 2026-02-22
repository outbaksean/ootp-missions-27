<template>
  <div class="missions-layout">
    <!-- ─── SIDEBAR ─── -->
    <aside class="sidebar">
      <CardUploader />

      <div class="sidebar-section">
        <MissionSearch v-model="searchQuery" />
      </div>

      <div class="sidebar-section">
        <label class="sidebar-label" for="category-dropdown">Category</label>
        <select id="category-dropdown" v-model="selectedCategoryFilter" class="sidebar-select">
          <option value="">All Categories</option>
          <option v-for="category in missionCategories" :key="category" :value="category">
            {{ category }}
          </option>
        </select>
      </div>

      <div class="sidebar-section">
        <label class="sidebar-label" for="target-mission-dropdown">Target Mission</label>
        <select
          id="target-mission-dropdown"
          v-model="selectedMissionFilter"
          class="sidebar-select"
        >
          <option value="">All Missions</option>
          <option v-for="mission in missionsOfTypeMissions" :key="mission.id" :value="mission.id">
            {{ mission.rawMission.name }}
          </option>
        </select>
      </div>

      <div class="sidebar-divider" />

      <div class="sidebar-section sidebar-toggles">
        <label class="toggle-label">
          <input
            type="checkbox"
            class="toggle-input"
            v-model="useSellPrice"
            @change="updatePriceType"
          />
          Use Sell Price
        </label>
        <label class="toggle-label">
          <input type="checkbox" class="toggle-input" v-model="hideCompleted" />
          Hide Completed
        </label>
      </div>

      <div class="sidebar-divider" />

      <div class="sidebar-section">
        <button
          class="btn-calc-all"
          @click="missionStore.calculateAllNotCalculatedMissions(filteredMissions.map((m) => m.id))"
        >
          Calculate All
        </button>
        <span class="calc-hint">May take a moment</span>
      </div>
    </aside>

    <!-- ─── MAIN AREA ─── -->
    <div class="main-area">
      <section class="list-panel">
        <div v-if="isLoading" class="spinner-container">
          <div class="spinner"></div>
        </div>
        <MissionList
          v-else
          :filteredMissions="filteredMissions"
          :isMissionComplete="isMissionComplete"
          :remainingPriceText="remainingPriceText"
          :selectMission="selectMission"
          :selectedMission="selectedMission"
          @calculateMission="missionStore.calculateMissionDetails"
        />
      </section>

      <!-- ─── DETAIL PANEL ─── -->
      <aside v-if="selectedMission" class="detail-panel">
        <div class="detail-header">
          <button class="close-btn" @click="selectedMission = null" aria-label="Close">✕</button>
        </div>
        <MissionDetails :selectedMission="selectedMission" :missions="missions" />
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMissionStore } from '../stores/useMissionStore'
import CardUploader from './CardUploader.vue'
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

const isLoading = computed(() => missionStore.loading)

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
  if (mission.completed) return ''
  if (mission.remainingPrice <= 0) return ''
  return `${mission.remainingPrice.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })} PP`
}

const isMissionComplete = (mission: UserMission) => mission.completed

const selectMission = (mission: UserMission) => {
  selectedMission.value = mission
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
.missions-layout {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* ─── SIDEBAR ─── */
.sidebar {
  width: 230px;
  flex-shrink: 0;
  background: var(--sidebar-bg);
  color: var(--sidebar-text);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.sidebar-section {
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.sidebar-divider {
  border-top: 1px solid var(--sidebar-border);
  margin: 0;
}

.sidebar-label {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--sidebar-muted);
  font-weight: 600;
}

.sidebar-select {
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  color: var(--sidebar-text);
  padding: 6px 8px;
  font-size: 0.8rem;
  width: 100%;
  cursor: pointer;
}

.sidebar-select option {
  background: #1e293b;
  color: #e2e8f0;
}

.sidebar-toggles {
  gap: 0.6rem;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.83rem;
  cursor: pointer;
}

.toggle-input {
  accent-color: var(--accent);
  width: 14px;
  height: 14px;
  cursor: pointer;
}

.btn-calc-all {
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 0.83rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
  width: 100%;
}

.btn-calc-all:hover {
  background: var(--accent-hover);
}

.calc-hint {
  font-size: 0.68rem;
  color: var(--sidebar-muted);
  text-align: center;
}

/* ─── MAIN AREA ─── */
.main-area {
  flex: 1;
  display: flex;
  min-width: 0;
  overflow: hidden;
}

.list-panel {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  background: #f1f5f9;
  min-width: 0;
}

/* ─── DETAIL PANEL ─── */
.detail-panel {
  width: 360px;
  flex-shrink: 0;
  overflow-y: auto;
  background: var(--detail-bg);
  border-left: 1px solid var(--card-border);
}

.detail-header {
  display: flex;
  justify-content: flex-end;
  padding: 0.4rem 0.5rem;
  border-bottom: 1px solid var(--card-border);
  position: sticky;
  top: 0;
  background: var(--detail-bg);
  z-index: 1;
}

.close-btn {
  background: none;
  border: none;
  font-size: 0.9rem;
  color: #94a3b8;
  cursor: pointer;
  padding: 3px 7px;
  border-radius: 4px;
  line-height: 1;
  transition: background 0.15s, color 0.15s;
}

.close-btn:hover {
  background: #e2e8f0;
  color: #1e293b;
}

/* ─── SPINNER ─── */
.spinner-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.spinner {
  border: 4px solid #e2e8f0;
  border-top: 4px solid var(--accent);
  border-radius: 50%;
  width: 36px;
  height: 36px;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
