<template>
  <div class="report-panel">
    <!-- Header -->
    <div class="report-header">
      <span class="report-title">Report</span>
      <button class="btn-clear" @click="$emit('clear')">Clear</button>
    </div>

    <!-- Budget line -->
    <div class="report-budget">
      Budget:
      <strong>{{
        config.budget !== null
          ? formatPP(config.budget)
          : "No budget limit"
      }}</strong>
    </div>

    <!-- One section per objective -->
    <div
      v-for="result in results"
      :key="result.key"
      class="objective-section"
    >
      <!-- Section header -->
      <div class="section-rule">
        <span class="section-label">{{ result.label }}</span>
      </div>

      <!-- Summary line -->
      <div class="section-summary">
        <span class="summary-count">{{ result.missions.length }} missions</span>
        <span class="summary-sep">|</span>
        <span>Cost: {{ formatPP(result.totalCost) }}</span>
        <template v-if="showsReward(result.key)">
          <span class="summary-sep">|</span>
          <span>Reward: {{ formatPP(result.totalReward) }}</span>
          <span class="summary-sep">|</span>
          <span :class="result.netGain >= 0 ? 'net-positive' : 'net-negative'">
            Net: {{ result.netGain >= 0 ? "+" : ""
            }}{{ formatPP(result.netGain) }}
          </span>
        </template>
      </div>

      <!-- Budget insufficient warning -->
      <div v-if="!result.budgetSufficient" class="budget-warning">
        Budget covers
        {{ missionsFittingBudget(result) }} of
        {{ result.missions.length }} missions
        ({{ formatPP(result.totalCost - (config.budget ?? 0)) }} short)
      </div>

      <!-- Budget-limited info for greedy objectives -->
      <div
        v-else-if="
          config.budget !== null &&
          result.missions.length < result.eligibleCount
        "
        class="budget-info"
      >
        {{ result.missions.length }} of {{ result.eligibleCount }} eligible
        missions included (budget limited)
      </div>

      <!-- Empty state -->
      <div v-if="result.missions.length === 0" class="section-empty">
        No missions match this objective.
      </div>

      <!-- Mission rows -->
      <table v-else class="mission-table">
        <thead>
          <tr>
            <th class="col-name">Mission</th>
            <th class="col-num">Cost</th>
            <th v-if="result.key === 'best-roi'" class="col-num">Reward</th>
            <th v-if="result.key === 'best-roi'" class="col-num">ROI</th>
            <th
              v-if="
                result.key === 'net-value' ||
                result.key === 'complete-chain' ||
                result.key === 'affordable-wins'
              "
              class="col-num"
            >
              Reward
            </th>
            <th
              v-if="
                result.key === 'net-value' ||
                result.key === 'complete-chain' ||
                result.key === 'affordable-wins'
              "
              class="col-num"
            >
              Net
            </th>
            <th v-if="result.key === 'complete-chain'" class="col-status">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="mission in result.missions"
            :key="mission.id"
            class="mission-row"
            @click="onSelectMission(mission)"
          >
            <td class="col-name">{{ mission.rawMission.name }}</td>
            <td class="col-num">{{ formatPP(mission.remainingPrice) }}</td>

            <!-- best-roi columns -->
            <template v-if="result.key === 'best-roi'">
              <td class="col-num">
                {{
                  mission.rewardValue !== undefined
                    ? formatPP(mission.rewardValue)
                    : "—"
                }}
              </td>
              <td class="col-num">
                {{
                  mission.rewardValue !== undefined && mission.remainingPrice > 0
                    ? formatRoi(mission.rewardValue, mission.remainingPrice)
                    : "—"
                }}
              </td>
            </template>

            <!-- net-value / complete-chain / affordable-wins columns -->
            <template
              v-if="
                result.key === 'net-value' ||
                result.key === 'complete-chain' ||
                result.key === 'affordable-wins'
              "
            >
              <td class="col-num">
                {{
                  mission.rewardValue !== undefined
                    ? formatPP(mission.rewardValue)
                    : "—"
                }}
              </td>
              <td
                class="col-num"
                :class="{
                  'net-positive':
                    mission.missionValue !== undefined &&
                    mission.missionValue >= 0,
                  'net-negative':
                    mission.missionValue !== undefined &&
                    mission.missionValue < 0,
                }"
              >
                {{
                  mission.missionValue !== undefined
                    ? (mission.missionValue >= 0 ? "+" : "") +
                      formatPP(mission.missionValue)
                    : "—"
                }}
              </td>
            </template>

            <!-- complete-chain status column -->
            <td v-if="result.key === 'complete-chain'" class="col-status status-needed">
              Needed
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { UserMission } from "../models/UserMission";
import {
  runObjective,
  type ReportConfig,
  type ObjectiveResult,
} from "../helpers/ReportHelper";

const props = defineProps<{
  config: ReportConfig;
  allUserMissions: UserMission[];
}>();

const emit = defineEmits<{
  (e: "clear"): void;
  (e: "selectMission", mission: UserMission): void;
}>();

const eligible = computed(() =>
  props.allUserMissions.filter(
    (m) => !m.completed && m.progressText !== "Not Calculated",
  ),
);

const results = computed((): ObjectiveResult[] =>
  props.config.objectives.map((key) =>
    runObjective(
      key,
      eligible.value,
      props.config.budget,
      props.config.chainId,
      props.allUserMissions,
    ),
  ),
);

function showsReward(key: string): boolean {
  return ["net-value", "best-roi", "complete-chain", "affordable-wins"].includes(
    key,
  );
}

function missionsFittingBudget(result: ObjectiveResult): number {
  if (props.config.budget === null) return result.missions.length;
  let running = 0;
  let count = 0;
  for (const m of result.missions) {
    if (running + m.remainingPrice <= props.config.budget) {
      running += m.remainingPrice;
      count++;
    } else {
      break;
    }
  }
  return count;
}

function formatPP(value: number): string {
  return (
    value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }) + " PP"
  );
}

function formatRoi(rewardValue: number, remainingPrice: number): string {
  const pct = (rewardValue / remainingPrice) * 100;
  return pct.toFixed(0) + "%";
}

function onSelectMission(mission: UserMission) {
  emit("selectMission", mission);
}
</script>

<style scoped>
.report-panel {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Header */
.report-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.report-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
}

.btn-clear {
  padding: 4px 12px;
  font-size: 0.78rem;
  font-weight: 500;
  border-radius: 5px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #64748b;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.btn-clear:hover {
  background: #fee2e2;
  color: #dc2626;
  border-color: #fca5a5;
}

/* Budget */
.report-budget {
  font-size: 0.83rem;
  color: var(--text-muted);
}

.report-budget strong {
  color: var(--text-primary);
}

/* Objective section */
.objective-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.section-rule {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding-bottom: 0.2rem;
  border-bottom: 2px solid #cbd5e1;
}

.section-label {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #475569;
  white-space: nowrap;
}

.section-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.78rem;
  color: var(--text-muted);
}

.summary-count {
  font-weight: 600;
  color: var(--text-primary);
}

.summary-sep {
  color: #cbd5e1;
}

.net-positive {
  color: #16a34a;
  font-weight: 600;
}

.net-negative {
  color: #dc2626;
  font-weight: 600;
}

/* Warnings */
.budget-warning {
  font-size: 0.75rem;
  color: #b45309;
  background: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 5px;
  padding: 5px 10px;
}

.budget-info {
  font-size: 0.75rem;
  color: #64748b;
}

.section-empty {
  font-size: 0.8rem;
  color: #94a3b8;
  font-style: italic;
  padding: 0.25rem 0;
}

/* Mission table */
.mission-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;
}

.mission-table thead th {
  text-align: left;
  padding: 4px 6px;
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #94a3b8;
  border-bottom: 1px solid #e2e8f0;
}

.mission-table thead th.col-num {
  text-align: right;
}

.mission-row {
  cursor: pointer;
  transition: background 0.1s;
}

.mission-row:hover td {
  background: #f1f5f9;
}

.mission-row td {
  padding: 5px 6px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}

.col-name {
  color: var(--text-primary);
  font-weight: 500;
  min-width: 0;
  word-break: break-word;
}

.col-num {
  text-align: right;
  white-space: nowrap;
  color: var(--text-muted);
  flex-shrink: 0;
}

.col-status {
  text-align: center;
  white-space: nowrap;
  font-size: 0.7rem;
  font-weight: 600;
}

.status-needed {
  color: #dc2626;
}
</style>
