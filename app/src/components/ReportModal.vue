<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="$emit('close')">
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h2 class="modal-title">Generate Report</h2>
          <button class="modal-close" @click="$emit('close')" aria-label="Close">
            ✕
          </button>
        </div>

        <div class="modal-body">
          <!-- Budget -->
          <div class="form-group">
            <label class="form-label" for="report-budget">Budget (PP)</label>
            <input
              id="report-budget"
              type="number"
              class="form-input"
              v-model="budget"
              min="0"
              placeholder="No limit"
            />
            <span class="form-hint">Leave blank for no budget limit</span>
          </div>

          <!-- Objectives -->
          <div class="form-group">
            <label class="form-label">Objectives</label>
            <div class="objectives-list">
              <label
                v-for="obj in availableObjectives"
                :key="obj.key"
                class="objective-item"
              >
                <input
                  type="checkbox"
                  class="objective-checkbox"
                  :checked="objectives.has(obj.key)"
                  @change="toggleObjective(obj.key)"
                />
                <div class="objective-info">
                  <span class="objective-name">{{ obj.label }}</span>
                  <span class="objective-desc">{{ obj.description }}</span>
                </div>
              </label>

              <!-- Chain dropdown shown when complete-chain is checked -->
              <div v-if="objectives.has('complete-chain')" class="chain-select-wrap">
                <select class="form-select" v-model="chainId">
                  <option :value="null">Select a chain...</option>
                  <option
                    v-for="m in chainOptions"
                    :key="m.id"
                    :value="m.id"
                  >
                    {{ m.rawMission.name }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <span
            v-if="objectives.has('complete-chain') && chainId === null"
            class="chain-hint"
          >
            Select a chain above
          </span>
          <button class="btn-cancel" @click="$emit('close')">Cancel</button>
          <button
            class="btn-generate"
            :disabled="!canGenerate"
            @click="generate"
          >
            Generate
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import type { UserMission } from "../models/UserMission";
import type { ReportConfig } from "../helpers/ReportHelper";

defineProps<{
  chainOptions: UserMission[];
}>();

const emit = defineEmits<{
  (e: "generate", config: ReportConfig): void;
  (e: "close"): void;
}>();

const availableObjectives = [
  {
    key: "net-value",
    label: "Best net value",
    description: "Maximize PP gained after costs",
  },
  {
    key: "most-missions",
    label: "Most missions",
    description: "Complete as many missions as possible within budget",
  },
  {
    key: "best-roi",
    label: "Best ROI",
    description: "Best reward-to-cost ratio",
  },
  {
    key: "complete-chain",
    label: "Complete a chain",
    description: "Finish all remaining missions in a specific chain",
  },
  {
    key: "affordable-wins",
    label: "All affordable wins",
    description: "Every positive-net mission in budget",
  },
];

// State persists across opens
const budget = ref<number | "">("");
const objectives = ref<Set<string>>(new Set(["net-value", "most-missions"]));
const chainId = ref<number | null>(null);

function toggleObjective(key: string) {
  const next = new Set(objectives.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  objectives.value = next;
}

const canGenerate = computed(() => {
  if (objectives.value.size === 0) return false;
  if (objectives.value.has("complete-chain") && chainId.value === null)
    return false;
  return true;
});

function generate() {
  if (!canGenerate.value) return;
  const budgetVal = budget.value === "" ? null : Number(budget.value);
  emit("generate", {
    budget: budgetVal,
    objectives: Array.from(objectives.value),
    chainId: chainId.value,
  });
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === "Escape") emit("close");
}

onMounted(() => document.addEventListener("keydown", onKeyDown));
onUnmounted(() => document.removeEventListener("keydown", onKeyDown));
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: #fff;
  border-radius: 10px;
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.25),
    0 4px 16px rgba(0, 0, 0, 0.1);
  width: 440px;
  max-width: calc(100vw - 2rem);
  max-height: calc(100vh - 4rem);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.modal-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 0.85rem;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  line-height: 1;
  transition: background 0.15s, color 0.15s;
}

.modal-close:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.modal-body {
  padding: 1.25rem;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.form-input {
  padding: 7px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.88rem;
  color: #1e293b;
  background: #fff;
  outline: none;
  transition: border-color 0.15s;
}

.form-input:focus {
  border-color: var(--accent, #3b82f6);
}

.form-input::-webkit-outer-spin-button,
.form-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.form-input[type="number"] {
  -moz-appearance: textfield;
}

.form-hint {
  font-size: 0.72rem;
  color: #94a3b8;
}

.objectives-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.objective-item {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.5rem 0.6rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.12s;
}

.objective-item:hover {
  background: #f8fafc;
}

.objective-checkbox {
  margin-top: 2px;
  accent-color: var(--accent, #3b82f6);
  width: 14px;
  height: 14px;
  cursor: pointer;
  flex-shrink: 0;
}

.objective-info {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.objective-name {
  font-size: 0.85rem;
  font-weight: 500;
  color: #1e293b;
}

.objective-desc {
  font-size: 0.72rem;
  color: #64748b;
}

.chain-select-wrap {
  padding: 0 0 0 1.4rem;
}

.form-select {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.85rem;
  color: #1e293b;
  background: #fff;
  cursor: pointer;
  outline: none;
}

.form-select:focus {
  border-color: var(--accent, #3b82f6);
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.85rem 1.25rem;
  border-top: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.chain-hint {
  font-size: 0.75rem;
  color: #f59e0b;
  margin-right: auto;
}

.btn-cancel {
  padding: 7px 16px;
  font-size: 0.85rem;
  font-weight: 500;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475569;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-cancel:hover {
  background: #f1f5f9;
}

.btn-generate {
  padding: 7px 18px;
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 6px;
  border: none;
  background: var(--accent, #3b82f6);
  color: #fff;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
}

.btn-generate:hover:not(:disabled) {
  background: var(--accent-hover, #2563eb);
}

.btn-generate:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
