<template>
  <div class="pack-prices">
    <div class="pack-prices-header">
      <button class="pack-prices-toggle" @click="expanded = !expanded">
        <span class="pack-prices-title">Pack Values</span>
        <span class="pack-prices-chevron">{{ expanded ? "▲" : "▼" }}</span>
      </button>
      <button class="btn-calculate" @click="handleCalculateEV">
        Calculate Pack Values
      </button>
    </div>
    <div v-if="expanded" class="pack-prices-body">
      <div class="pack-prices-hint-row">
        <p class="pack-prices-hint">
          Set the PP value of each pack type to calculate mission value.
        </p>
        <button class="btn-reset" @click="handleReset">Reset</button>
      </div>
      <div
        v-for="packType in usedPackTypes"
        :key="packType"
        class="pack-price-row"
      >
        <label class="pack-price-label">{{
          PACK_TYPE_LABELS[packType] ?? packType
        }}</label>
        <input
          type="number"
          class="pack-price-input"
          min="0"
          :value="settingsStore.getPackPrice(packType)"
          @change="handleChange(packType, $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useMissionStore } from "../stores/useMissionStore";
import {
  useSettingsStore,
  PACK_TYPES,
  PACK_TYPE_LABELS,
} from "../stores/useSettingsStore";
import { useCardStore } from "../stores/useCardStore";
import { computePackEVs } from "../helpers/packEV";

const settingsStore = useSettingsStore();
const missionStore = useMissionStore();
const cardStore = useCardStore();
const expanded = ref(false);

const usedPackTypes = computed(() => {
  const used = new Set<string>();
  for (const um of missionStore.userMissions) {
    for (const reward of um.rawMission.rewards ?? []) {
      if ((reward.type as string).toLowerCase() === "pack") {
        const r = reward as { packType: string };
        used.add(r.packType);
      }
    }
  }
  return PACK_TYPES.filter((pt) => used.has(pt));
});

function handleChange(packType: string, event: Event) {
  const input = event.target as HTMLInputElement;
  const raw = input.value;
  const val = parseInt(raw, 10);
  // Validate: reject negative values, clamp to non-negative
  const validValue = isNaN(val) ? 0 : Math.max(0, val);
  settingsStore.setPackPrice(packType, validValue);
  if (!isNaN(val) && val < 0) {
    input.value = validValue.toString();
  }
  missionStore.recomputeMissionValues();
}

function handleCalculateEV() {
  const evs = computePackEVs(cardStore.shopCards);
  for (const [packType, ev] of evs) {
    settingsStore.setPackPrice(packType, ev);
  }
  missionStore.recomputeMissionValues();
}

function handleReset() {
  settingsStore.resetPackPrices();
  missionStore.recomputeMissionValues();
}
</script>

<style scoped>
.pack-prices {
  border-top: 1px solid var(--sidebar-border);
}

.pack-prices-header {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding-right: 0.75rem;
}

.pack-prices-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  background: none;
  border: none;
  padding: 0.6rem 0 0.6rem 1rem;
  cursor: pointer;
  color: var(--sidebar-text);
  transition: background 0.15s;
}

.pack-prices-toggle:hover {
  background: rgba(255, 255, 255, 0.05);
}

.btn-calculate {
  flex-shrink: 0;
  font-size: 0.65rem;
  padding: 2px 7px;
  border-radius: 4px;
  cursor: pointer;
  background: transparent;
  color: var(--sidebar-muted);
  border: 1px solid rgba(255, 255, 255, 0.15);
  transition:
    background 0.15s,
    color 0.15s;
}

.btn-calculate:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--sidebar-text);
}

.pack-prices-title {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 600;
  color: var(--sidebar-muted);
}

.pack-prices-chevron {
  font-size: 0.6rem;
  color: var(--sidebar-muted);
}

.pack-prices-body {
  padding: 0 1rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.pack-prices-hint-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.pack-prices-hint {
  font-size: 0.68rem;
  color: var(--sidebar-muted);
  line-height: 1.4;
  margin: 0;
}

.btn-reset {
  flex-shrink: 0;
  font-size: 0.65rem;
  padding: 2px 7px;
  border-radius: 4px;
  cursor: pointer;
  background: transparent;
  color: var(--sidebar-muted);
  border: 1px solid rgba(255, 255, 255, 0.15);
  transition:
    background 0.15s,
    color 0.15s;
}

.btn-reset:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--sidebar-text);
}

.pack-price-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pack-price-label {
  flex: 1;
  font-size: 0.75rem;
  color: var(--sidebar-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pack-price-input {
  width: 72px;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  color: var(--sidebar-text);
  padding: 3px 6px;
  font-size: 0.75rem;
  text-align: right;
  flex-shrink: 0;
}

.pack-price-input:focus {
  outline: none;
  border-color: var(--accent);
}

.pack-price-input::-webkit-outer-spin-button,
.pack-price-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.pack-price-input[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}
</style>
