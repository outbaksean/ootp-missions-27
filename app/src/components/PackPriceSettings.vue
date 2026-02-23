<template>
  <div class="pack-prices">
    <button class="pack-prices-toggle" @click="expanded = !expanded">
      <span class="pack-prices-title">Pack Prices</span>
      <span class="pack-prices-chevron">{{ expanded ? '▲' : '▼' }}</span>
    </button>
    <div v-if="expanded" class="pack-prices-body">
      <p class="pack-prices-hint">
        Set the PP value of each pack type to calculate mission value.
      </p>
      <div v-for="packType in PACK_TYPES" :key="packType" class="pack-price-row">
        <label class="pack-price-label">{{ packType }}</label>
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
import { ref } from 'vue'
import { useMissionStore } from '../stores/useMissionStore'
import { useSettingsStore, PACK_TYPES } from '../stores/useSettingsStore'

const settingsStore = useSettingsStore()
const missionStore = useMissionStore()
const expanded = ref(false)

function handleChange(packType: string, event: Event) {
  const raw = (event.target as HTMLInputElement).value
  const val = parseInt(raw, 10)
  settingsStore.setPackPrice(packType, isNaN(val) ? 0 : val)
  missionStore.recomputeMissionValues()
}
</script>

<style scoped>
.pack-prices {
  border-top: 1px solid var(--sidebar-border);
}

.pack-prices-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: none;
  border: none;
  padding: 0.6rem 1rem;
  cursor: pointer;
  color: var(--sidebar-text);
  transition: background 0.15s;
}

.pack-prices-toggle:hover {
  background: rgba(255, 255, 255, 0.05);
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

.pack-prices-hint {
  font-size: 0.68rem;
  color: var(--sidebar-muted);
  line-height: 1.4;
  margin: 0 0 0.25rem;
}

.pack-prices-empty {
  font-size: 0.75rem;
  color: var(--sidebar-muted);
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
</style>
