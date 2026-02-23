<template>
  <div class="mission-list">
    <template v-for="group in groups" :key="group.label || '__none__'">
      <div
        v-if="group.label"
        class="group-header"
        @click="toggleGroup(group.label)"
      >
        <span class="group-chevron">{{ collapsed.has(group.label) ? '▶' : '▼' }}</span>
        <span class="group-label">{{ group.label }}</span>
        <span class="group-meta">{{ group.missions.length }} missions</span>
        <span v-if="groupRemainingTotal(group.missions)" class="group-price">
          {{ groupRemainingTotal(group.missions) }}
        </span>
        <button
          v-if="groupHasUncalculated(group.missions)"
          class="group-calculate-btn"
          @click.stop="$emit('calculateGroup', group.missions.filter((m) => !m.completed && m.progressText === 'Not Calculated').map((m) => m.id))"
        >
          Calculate
        </button>
      </div>

      <template v-if="!group.label || !collapsed.has(group.label)">
        <div
          v-for="mission in group.missions"
          :key="mission.id"
          class="mission-card"
          :class="{
            'mission-card--complete': isMissionComplete(mission),
            'mission-card--selected': selectedMission && selectedMission.id === mission.id,
          }"
        >
          <!-- Name + status badge -->
          <div class="card-header">
            <strong class="card-name">{{ mission.rawMission.name }}</strong>
            <span v-if="isMissionComplete(mission)" class="badge badge-done">✓ Done</span>
            <span v-else-if="mission.progressText === 'Not Calculated'" class="badge badge-pending">
              —
            </span>
          </div>

          <!-- Reward -->
          <div class="card-reward">{{ mission.rawMission.reward }}</div>

          <!-- Progress -->
          <div class="card-progress">
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: progressPercent(mission) + '%' }"></div>
            </div>
            <span
              class="progress-label"
              :class="{ 'label-unknown': mission.progressText === 'Not Calculated' }"
            >
              {{ progressLabel(mission) }}
            </span>
          </div>

          <!-- Footer: price + action -->
          <div class="card-footer">
            <span class="card-price">{{ remainingPriceText(mission) }}</span>
            <button
              v-if="mission.progressText === 'Not Calculated'"
              class="btn-action btn-calculate"
              @click="$emit('calculateMission', mission.id)"
            >
              Calculate
            </button>
            <button v-else class="btn-action btn-select" @click="selectMission(mission)">
              Select
            </button>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { PropType } from 'vue'
import type { UserMission } from '../models/UserMission'

const props = defineProps({
  groups: {
    type: Array as PropType<Array<{ label: string; missions: UserMission[] }>>,
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
  selectedMission: {
    type: Object as PropType<UserMission | null>,
    default: null,
  },
})

defineEmits<{
  (e: 'calculateMission', id: number): void
  (e: 'calculateGroup', ids: number[]): void
}>()

const collapsed = ref<Set<string>>(new Set())

function toggleGroup(label: string) {
  const next = new Set(collapsed.value)
  next.has(label) ? next.delete(label) : next.add(label)
  collapsed.value = next
}

function groupHasUncalculated(missions: UserMission[]): boolean {
  return missions.some((m) => !m.completed && m.progressText === 'Not Calculated')
}

function groupRemainingTotal(missions: UserMission[]): string {
  // Only show total when all missions have been calculated
  if (groupHasUncalculated(missions)) return ''
  const total = missions
    .filter((m) => !m.completed)
    .reduce((sum, m) => sum + m.remainingPrice, 0)
  if (total <= 0) return ''
  return (
    total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' PP'
  )
}

function progressPercent(mission: UserMission): number {
  if (mission.completed) return 100
  if (mission.progressText === 'Not Calculated') return 0

  const required = mission.rawMission.requiredCount
  if (!required) return 0

  if (mission.rawMission.type === 'count') {
    const owned = mission.missionCards.filter((c) => c.owned).length
    return Math.min(100, Math.round((owned / required) * 100))
  }

  // points / missions: parse leading number from progressText
  const match = mission.progressText.match(/^([\d,]+)/)
  if (match) {
    const value = parseInt(match[1].replace(/,/g, ''), 10)
    return Math.min(100, Math.round((value / required) * 100))
  }

  return 0
}

function progressLabel(mission: UserMission): string {
  if (mission.completed) return 'Completed'
  if (mission.progressText === 'Not Calculated') return 'Not calculated'
  return mission.progressText
}
</script>

<style scoped>
.mission-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* ─── GROUP HEADER ─── */
.group-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  background: #e2e8f0;
  border-radius: 6px;
  padding: 0.45rem 0.75rem;
  cursor: pointer;
  transition: background 0.15s;
  margin-top: 0.25rem;
  user-select: none;
}

.group-header:first-child {
  margin-top: 0;
}

.group-header:hover {
  background: #cbd5e1;
}

.group-calculate-btn {
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 2px 10px;
  font-size: 0.7rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
  flex-shrink: 0;
  margin-left: auto;
}

.group-calculate-btn:hover {
  background: var(--accent-hover);
}

.group-chevron {
  font-size: 0.6rem;
  color: #64748b;
  flex-shrink: 0;
  width: 0.75rem;
}

.group-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: #334155;
  flex: 1;
}

.group-meta {
  font-size: 0.7rem;
  color: #64748b;
  flex-shrink: 0;
}

.group-price {
  font-size: 0.7rem;
  color: #475569;
  font-weight: 500;
  flex-shrink: 0;
  margin-left: 0.5rem;
}

/* ─── MISSION CARD ─── */
.mission-card {
  background: #fff;
  border: 1px solid var(--card-border);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  box-shadow: var(--card-shadow);
  transition:
    box-shadow 0.15s,
    border-color 0.15s;
}

.mission-card:hover {
  box-shadow: var(--card-hover-shadow);
}

.mission-card--complete {
  border-left: 3px solid var(--accent);
  opacity: 0.72;
}

.mission-card--selected {
  border-color: #94a3b8;
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.18);
}

/* Header */
.card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.2rem;
}

.card-name {
  font-size: 0.92rem;
  color: var(--text-primary);
  flex: 1;
  font-weight: 600;
}

.badge {
  font-size: 0.68rem;
  padding: 2px 7px;
  border-radius: 999px;
  font-weight: 600;
  flex-shrink: 0;
}

.badge-done {
  background: #dcfce7;
  color: #166534;
}

.badge-pending {
  background: #f1f5f9;
  color: #94a3b8;
}

/* Reward */
.card-reward {
  font-size: 0.76rem;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}

/* Progress */
.card-progress {
  margin-bottom: 0.5rem;
}

.progress-track {
  height: 5px;
  background: var(--progress-bg);
  border-radius: 999px;
  overflow: hidden;
  margin-bottom: 0.3rem;
}

.progress-fill {
  height: 100%;
  background: var(--progress-fill);
  border-radius: 999px;
  transition: width 0.3s ease;
}

.progress-label {
  font-size: 0.72rem;
  color: var(--text-muted);
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.label-unknown {
  color: #94a3b8;
  font-style: italic;
}

/* Footer */
.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-price {
  font-size: 0.78rem;
  color: var(--text-muted);
  font-weight: 500;
}

.btn-action {
  border: none;
  border-radius: 5px;
  padding: 4px 14px;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-calculate {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #cbd5e1;
}

.btn-calculate:hover {
  background: #e2e8f0;
}

.btn-select {
  background: var(--accent);
  color: #fff;
}

.btn-select:hover {
  background: var(--accent-hover);
}
</style>
