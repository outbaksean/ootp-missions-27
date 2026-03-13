<template>
  <div class="spl-panel">
    <!-- ─── HEADER ─── -->
    <div class="spl-header">
      <h3 class="spl-title">Shopping Plan</h3>
      <button class="spl-configure-btn" @click="$emit('configure')">
        Configure
      </button>
    </div>

    <!-- ─── IN PLAN ─── -->
    <div class="spl-section">
      <div class="spl-section-label">In Plan ({{ inPlanMissions.length }})</div>
      <p v-if="inPlanMissions.length === 0" class="spl-empty">
        No calculated missions in scope. Use Calculate on missions first.
      </p>
      <div v-for="mission in inPlanMissions" :key="mission.id" class="spl-row">
        <div class="spl-row-name">{{ mission.rawMission.name }}</div>
        <div class="spl-row-meta">
          <span v-if="mission.remainingPrice > 0" class="spl-row-cost">
            {{
              mission.remainingPrice.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })
            }}
            PP
          </span>
          <span class="spl-badge spl-badge--plan">In Plan</span>
        </div>
      </div>
    </div>

    <!-- ─── OUT OF BUDGET ─── -->
    <div v-if="outOfBudgetMissions.length > 0" class="spl-section">
      <div class="spl-section-label">
        Over Budget ({{ outOfBudgetMissions.length }})
      </div>
      <div
        v-for="mission in outOfBudgetMissions"
        :key="mission.id"
        class="spl-row spl-row--dim"
      >
        <div class="spl-row-name">{{ mission.rawMission.name }}</div>
        <div class="spl-row-meta">
          <span v-if="mission.remainingPrice > 0" class="spl-row-cost">
            {{
              mission.remainingPrice.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })
            }}
            PP
          </span>
          <span class="spl-badge spl-badge--budget">Over Budget</span>
        </div>
      </div>
    </div>

    <!-- ─── EXCLUDED (collapsible) ─── -->
    <div v-if="excludedMissions.length > 0" class="spl-section">
      <button class="spl-section-toggle" @click="excludedOpen = !excludedOpen">
        <span class="spl-section-label"
          >Excluded ({{ excludedMissions.length }})</span
        >
        <span class="spl-chevron">{{ excludedOpen ? "▲" : "▼" }}</span>
      </button>
      <template v-if="excludedOpen">
        <div
          v-for="item in excludedMissions"
          :key="item.mission.id"
          class="spl-row spl-row--dim"
        >
          <div class="spl-row-name">{{ item.mission.rawMission.name }}</div>
          <div class="spl-row-meta">
            <span class="spl-badge spl-badge--excluded">{{ item.reason }}</span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { UserMission } from "../models/UserMission";

defineProps<{
  inPlanMissions: UserMission[];
  outOfBudgetMissions: UserMission[];
  excludedMissions: { mission: UserMission; reason: string }[];
}>();

defineEmits<{
  (e: "configure"): void;
}>();

const excludedOpen = ref(false);
</script>

<style scoped>
.spl-panel {
  height: 100%;
  overflow-y: auto;
  background: var(--detail-bg);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ─── HEADER ─── */
.spl-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--card-border);
  flex-shrink: 0;
}

.spl-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary, #1e293b);
}

.spl-configure-btn {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 5px;
  border: 1px solid #6366f1;
  background: transparent;
  color: #6366f1;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.spl-configure-btn:hover {
  background: #6366f1;
  color: #fff;
}

/* ─── SECTION ─── */
.spl-section {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  flex-shrink: 0;
}

.spl-section-label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #64748b;
}

.spl-section-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: none;
  border: none;
  cursor: pointer;
  width: 100%;
  padding: 0;
  text-align: left;
}

.spl-chevron {
  font-size: 0.6rem;
  color: #94a3b8;
}

/* ─── ROWS ─── */
.spl-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  background: #fff;
  border: 1px solid var(--card-border);
  border-radius: 7px;
  padding: 0.5rem 0.75rem;
}

.spl-row--dim {
  opacity: 0.65;
}

.spl-row-name {
  font-size: 0.83rem;
  font-weight: 500;
  color: #1e293b;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.spl-row-meta {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
}

.spl-row-cost {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
}

/* ─── BADGES ─── */
.spl-badge {
  font-size: 0.65rem;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 9999px;
}

.spl-badge--plan {
  background: #dcfce7;
  color: #166534;
}

.spl-badge--budget {
  background: #fef3c7;
  color: #92400e;
}

.spl-badge--excluded {
  background: #f1f5f9;
  color: #64748b;
}

/* ─── EMPTY ─── */
.spl-empty {
  font-size: 0.82rem;
  color: #94a3b8;
  text-align: center;
  padding: 1rem;
  margin: 0;
}
</style>
