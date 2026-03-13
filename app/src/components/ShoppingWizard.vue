<template>
  <Teleport to="body">
    <div class="sw-overlay" @click.self="$emit('cancel')">
      <div class="sw-modal" role="dialog" aria-modal="true">
        <!-- Step indicator -->
        <div class="sw-steps">
          <div
            v-for="n in 3"
            :key="n"
            class="sw-step-dot"
            :class="{
              'sw-step-dot--active': n === step,
              'sw-step-dot--done': n < step,
            }"
          />
        </div>

        <!-- ─── STEP 1: SCOPE ─── -->
        <div v-if="step === 1" class="sw-content">
          <h2 class="sw-title">Which missions?</h2>
          <p class="sw-subtitle">
            Add filters to narrow scope. Leave empty to include all missions.
          </p>

          <div v-if="hasNoFilters" class="sw-empty-scope">
            No filters selected — all missions will be included
          </div>

          <!-- Category -->
          <div class="sw-filter-section">
            <span class="sw-filter-label">Category</span>
            <select class="sw-select" @change="addCategory($event)">
              <option value="">Add a category…</option>
              <option
                v-for="cat in availableCategories"
                :key="cat"
                :value="cat"
              >
                {{ cat }}
              </option>
            </select>
            <div v-if="scope.categories.length > 0" class="sw-pills">
              <span v-for="cat in scope.categories" :key="cat" class="sw-pill">
                {{ cat }}
                <button class="sw-pill-remove" @click="removeCategory(cat)">
                  ×
                </button>
              </span>
            </div>
          </div>

          <!-- Chain -->
          <div class="sw-filter-section">
            <span class="sw-filter-label">Chain</span>
            <div class="sw-combobox">
              <input
                type="text"
                class="sw-input"
                placeholder="Search chains…"
                v-model="chainQuery"
                @focus="chainOpen = true"
                @blur="() => delayClose(() => (chainOpen = false))"
              />
              <div
                v-if="chainOpen && filteredChains.length > 0"
                class="sw-dropdown"
              >
                <div
                  v-for="m in filteredChains"
                  :key="m.id"
                  class="sw-dropdown-item"
                  @mousedown.prevent="addChain(m)"
                >
                  {{ m.rawMission.name }}
                </div>
              </div>
            </div>
            <div v-if="scope.chainIds.length > 0" class="sw-pills">
              <span v-for="id in scope.chainIds" :key="id" class="sw-pill">
                {{ chainNameById(id) }}
                <button class="sw-pill-remove" @click="removeChain(id)">
                  ×
                </button>
              </span>
            </div>
          </div>

          <!-- Reward Card -->
          <div class="sw-filter-section">
            <span class="sw-filter-label">Reward Card</span>
            <div class="sw-combobox">
              <input
                type="text"
                class="sw-input"
                placeholder="Search reward cards…"
                v-model="rewardCardQuery"
                @focus="rewardCardOpen = true"
                @blur="() => delayClose(() => (rewardCardOpen = false))"
              />
              <div
                v-if="rewardCardOpen && filteredRewardCards.length > 0"
                class="sw-dropdown"
              >
                <div
                  v-for="card in filteredRewardCards"
                  :key="card.cardId"
                  class="sw-dropdown-item"
                  @mousedown.prevent="addRewardCard(card)"
                >
                  {{ card.label }}
                </div>
              </div>
            </div>
            <div v-if="scope.rewardCardIds.length > 0" class="sw-pills">
              <span v-for="id in scope.rewardCardIds" :key="id" class="sw-pill">
                {{ rewardCardLabelById(id) }}
                <button class="sw-pill-remove" @click="removeRewardCard(id)">
                  ×
                </button>
              </span>
            </div>
          </div>

          <!-- Mission -->
          <div class="sw-filter-section">
            <span class="sw-filter-label">Mission</span>
            <div class="sw-combobox">
              <input
                type="text"
                class="sw-input"
                placeholder="Search missions…"
                v-model="missionQuery"
                @focus="missionOpen = true"
                @blur="() => delayClose(() => (missionOpen = false))"
              />
              <div
                v-if="missionOpen && filteredMissionOptions.length > 0"
                class="sw-dropdown"
              >
                <div
                  v-for="m in filteredMissionOptions"
                  :key="m.id"
                  class="sw-dropdown-item"
                  @mousedown.prevent="addMissionById(m)"
                >
                  {{ m.rawMission.name }}
                </div>
              </div>
            </div>
            <div v-if="scope.missionIds.length > 0" class="sw-pills">
              <span v-for="id in scope.missionIds" :key="id" class="sw-pill">
                {{ missionNameById(id) }}
                <button class="sw-pill-remove" @click="removeMissionById(id)">
                  ×
                </button>
              </span>
            </div>
          </div>

          <!-- Footer: clear all + count -->
          <div class="sw-scope-footer">
            <button
              v-if="!hasNoFilters"
              class="sw-clear-link"
              @click="clearScope"
            >
              Clear all filters
            </button>
            <span class="sw-scope-count"
              >{{ resolvedMissionCount }} missions in scope</span
            >
          </div>
        </div>

        <!-- ─── STEP 2: STRATEGY ─── -->
        <div v-else-if="step === 2" class="sw-content">
          <h2 class="sw-title">What's your goal?</h2>
          <p class="sw-subtitle">How should missions be prioritized?</p>

          <div class="sw-strategy-cards">
            <button
              class="sw-strategy-card"
              :class="{ 'sw-strategy-card--active': strategy === 'completion' }"
              @click="strategy = 'completion'"
            >
              <div class="sw-strategy-name">Completion</div>
              <div class="sw-strategy-desc">
                Complete as many missions as possible, starting with the
                cheapest
              </div>
            </button>
            <button
              class="sw-strategy-card"
              :class="{ 'sw-strategy-card--active': strategy === 'value' }"
              @click="strategy = 'value'"
            >
              <div class="sw-strategy-name">Value</div>
              <div class="sw-strategy-desc">
                Prioritize missions where rewards outweigh card costs
              </div>
            </button>
            <button
              class="sw-strategy-card"
              :class="{
                'sw-strategy-card--active': strategy === 'value-optimized',
              }"
              @click="strategy = 'value-optimized'"
            >
              <div class="sw-strategy-name">
                Value, optimized
                <span
                  class="sw-tooltip-hint"
                  data-tooltip="Like Value, but only locked cards count toward mission completion. The opportunity cost of selling unlocked owned cards is factored into each mission's cost. Only useful if you have uploaded your locked card data."
                  @mouseenter="onTooltipEnter('value-optimized', $event)"
                  @mouseleave="onTooltipLeave"
                  @click.stop="onTooltipClick('value-optimized', $event)"
                  >(?)</span
                >
              </div>
              <div class="sw-strategy-desc">
                Like Value, but accounts for locked cards and the opportunity
                cost of selling unlocked owned cards
              </div>
            </button>
          </div>
        </div>

        <!-- ─── STEP 3: OPTIONS ─── -->
        <div v-else-if="step === 3" class="sw-content">
          <h2 class="sw-title">Options</h2>

          <div class="sw-option-group">
            <label class="sw-option-label">Available PP</label>
            <p class="sw-option-desc">
              Budget for card purchases. Leave blank for unlimited.
            </p>
            <div class="sw-pp-row">
              <input
                type="text"
                class="sw-pp-input"
                v-model="ppInput"
                placeholder="Unlimited"
                inputmode="numeric"
              />
              <button
                v-if="ppInput.trim()"
                class="sw-pp-clear"
                @click="ppInput = ''"
              >
                Clear
              </button>
            </div>
          </div>

          <div class="sw-option-group">
            <label class="sw-toggle-row">
              <input
                type="checkbox"
                class="sw-toggle-input"
                v-model="completableOnly"
              />
              <span class="sw-toggle-label">Completable missions only</span>
            </label>
            <p class="sw-option-desc">
              Only include missions where all required cards have market prices.
              When off, cards toward non-completable missions are still listed.
            </p>
          </div>
        </div>

        <!-- ─── FOOTER BUTTONS ─── -->
        <div class="sw-footer">
          <button class="sw-btn sw-btn--secondary" @click="handleBack">
            {{ step === 1 ? "Cancel" : "← Back" }}
          </button>
          <button class="sw-btn sw-btn--primary" @click="handleNext">
            {{ step === 3 ? "Generate Shopping List" : "Next →" }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ─── TOOLTIP PORTAL ─── -->
  <Teleport to="body">
    <div
      v-if="openTooltipId"
      class="sw-tooltip-portal"
      :style="{
        top: tooltipAnchor.top + 'px',
        left: tooltipAnchor.left + 'px',
      }"
    >
      {{ tooltipContent }}
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { UserMission } from "../models/UserMission";
import type { ShopCard } from "../models/ShopCard";
import {
  type ShoppingWizardConfig,
  type ShoppingScope,
  defaultWizardConfig,
  emptyScopeIsAll,
} from "../models/ShoppingWizardConfig";
import { resolveScopedMissions } from "../helpers/ShoppingListHelper";

const props = defineProps<{
  categories: string[];
  chainMissions: UserMission[];
  rewardCards: Array<{ cardId: number; label: string }>;
  allMissions: UserMission[];
  shopCardsById: Map<number, ShopCard>;
  initialConfig?: ShoppingWizardConfig;
}>();

const emit = defineEmits<{
  (e: "confirm", config: ShoppingWizardConfig): void;
  (e: "cancel"): void;
}>();

// ─── STATE ───
const step = ref(1);

function initScope(): ShoppingScope {
  return props.initialConfig
    ? { ...props.initialConfig.scope }
    : { categories: [], chainIds: [], rewardCardIds: [], missionIds: [] };
}

const scope = ref<ShoppingScope>(initScope());
const strategy = ref<"completion" | "value" | "value-optimized">(
  props.initialConfig?.strategy ?? "completion",
);
const ppInput = ref(
  props.initialConfig?.availablePP != null
    ? String(props.initialConfig.availablePP)
    : "",
);
const completableOnly = ref(props.initialConfig?.completableOnly ?? true);

// Search / dropdown state
const chainQuery = ref("");
const chainOpen = ref(false);
const rewardCardQuery = ref("");
const rewardCardOpen = ref(false);
const missionQuery = ref("");
const missionOpen = ref(false);

function delayClose(fn: () => void) {
  setTimeout(fn, 150);
}

// ─── COMPUTED ───
const hasNoFilters = computed(() => emptyScopeIsAll(scope.value));

const resolvedMissionCount = computed(
  () =>
    resolveScopedMissions(props.allMissions, scope.value).filter(
      (m) => !m.completed,
    ).length,
);

const availableCategories = computed(() =>
  props.categories.filter((c) => !scope.value.categories.includes(c)),
);

const filteredChains = computed(() => {
  const q = chainQuery.value.trim().toLowerCase();
  return props.chainMissions
    .filter((m) => !scope.value.chainIds.includes(m.id))
    .filter((m) => !q || m.rawMission.name.toLowerCase().includes(q));
});

const filteredRewardCards = computed(() => {
  const q = rewardCardQuery.value.trim().toLowerCase();
  return props.rewardCards
    .filter((c) => !scope.value.rewardCardIds.includes(c.cardId))
    .filter((c) => !q || c.label.toLowerCase().includes(q));
});

const filteredMissionOptions = computed(() => {
  const q = missionQuery.value.trim().toLowerCase();
  return props.allMissions
    .filter((m) => !scope.value.missionIds.includes(m.id))
    .filter((m) => !q || m.rawMission.name.toLowerCase().includes(q))
    .slice(0, 50);
});

// ─── LABEL HELPERS ───
function chainNameById(id: number): string {
  return (
    props.chainMissions.find((m) => m.id === id)?.rawMission.name ?? `#${id}`
  );
}

function rewardCardLabelById(id: number): string {
  const card = props.rewardCards.find((c) => c.cardId === id);
  if (card) return card.label;
  const shopCard = props.shopCardsById.get(id);
  return shopCard ? shopCard.cardTitle : `Card #${id}`;
}

function missionNameById(id: number): string {
  return (
    props.allMissions.find((m) => m.id === id)?.rawMission.name ?? `#${id}`
  );
}

// ─── SCOPE MUTATORS ───
function addCategory(event: Event) {
  const val = (event.target as HTMLSelectElement).value;
  if (!val || scope.value.categories.includes(val)) return;
  scope.value = {
    ...scope.value,
    categories: [...scope.value.categories, val],
  };
  (event.target as HTMLSelectElement).value = "";
}

function removeCategory(cat: string) {
  scope.value = {
    ...scope.value,
    categories: scope.value.categories.filter((c) => c !== cat),
  };
}

function addChain(m: UserMission) {
  if (scope.value.chainIds.includes(m.id)) return;
  scope.value = { ...scope.value, chainIds: [...scope.value.chainIds, m.id] };
  chainQuery.value = "";
  chainOpen.value = false;
}

function removeChain(id: number) {
  scope.value = {
    ...scope.value,
    chainIds: scope.value.chainIds.filter((c) => c !== id),
  };
}

function addRewardCard(card: { cardId: number; label: string }) {
  if (scope.value.rewardCardIds.includes(card.cardId)) return;
  scope.value = {
    ...scope.value,
    rewardCardIds: [...scope.value.rewardCardIds, card.cardId],
  };
  rewardCardQuery.value = "";
  rewardCardOpen.value = false;
}

function removeRewardCard(id: number) {
  scope.value = {
    ...scope.value,
    rewardCardIds: scope.value.rewardCardIds.filter((c) => c !== id),
  };
}

function addMissionById(m: UserMission) {
  if (scope.value.missionIds.includes(m.id)) return;
  scope.value = {
    ...scope.value,
    missionIds: [...scope.value.missionIds, m.id],
  };
  missionQuery.value = "";
  missionOpen.value = false;
}

function removeMissionById(id: number) {
  scope.value = {
    ...scope.value,
    missionIds: scope.value.missionIds.filter((m) => m !== id),
  };
}

function clearScope() {
  scope.value = {
    categories: [],
    chainIds: [],
    rewardCardIds: [],
    missionIds: [],
  };
}

// ─── NAVIGATION ───
function handleBack() {
  if (step.value === 1) {
    emit("cancel");
  } else {
    step.value--;
  }
}

function handleNext() {
  if (step.value < 3) {
    step.value++;
    return;
  }
  const raw = ppInput.value.trim().replace(/,/g, "");
  const parsedPP = raw ? Number(raw) : null;
  const availablePP =
    parsedPP !== null && Number.isFinite(parsedPP) && parsedPP > 0
      ? parsedPP
      : null;

  emit("confirm", {
    scope: scope.value,
    strategy: strategy.value,
    availablePP,
    completableOnly: completableOnly.value,
  });
}

// ─── TOOLTIP ───
const isMobile = ref(window.innerWidth < 768);
const openTooltipId = ref<string | null>(null);
const tooltipContent = ref("");
const tooltipAnchor = ref({ top: 0, left: 0 });

function getTooltipInfo(event: Event) {
  const el = event.currentTarget as HTMLElement;
  const rect = el.getBoundingClientRect();
  return { top: rect.top, left: rect.left, text: el.dataset.tooltip ?? "" };
}

function onTooltipEnter(id: string, event: Event) {
  if (isMobile.value) return;
  const { top, left, text } = getTooltipInfo(event);
  tooltipContent.value = text;
  tooltipAnchor.value = { top, left };
  openTooltipId.value = id;
}

function onTooltipLeave() {
  if (isMobile.value) return;
  openTooltipId.value = null;
}

function onTooltipClick(id: string, event: Event) {
  if (!isMobile.value) return;
  if (openTooltipId.value === id) {
    openTooltipId.value = null;
    return;
  }
  const { top, left, text } = getTooltipInfo(event);
  tooltipContent.value = text;
  tooltipAnchor.value = { top, left };
  openTooltipId.value = id;
}

// Keep unused import happy
void defaultWizardConfig;
</script>

<style scoped>
.sw-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.sw-modal {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  width: 100%;
  max-width: 640px;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  overflow: hidden;
}

/* ─── STEP INDICATOR ─── */
.sw-steps {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.25rem 1.5rem 0;
  flex-shrink: 0;
}

.sw-step-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #e2e8f0;
  transition: background 0.2s;
}

.sw-step-dot--active {
  background: #6366f1;
  width: 24px;
  border-radius: 4px;
}

.sw-step-dot--done {
  background: #6366f1;
  opacity: 0.4;
}

/* ─── CONTENT ─── */
.sw-content {
  padding: 1.25rem 1.5rem;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.sw-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.sw-subtitle {
  font-size: 0.82rem;
  color: #64748b;
  margin: 0;
}

/* ─── SCOPE STEP ─── */
.sw-empty-scope {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  padding: 0.65rem 1rem;
  font-size: 0.82rem;
  color: #0369a1;
}

.sw-filter-section {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.sw-filter-label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #64748b;
}

.sw-select {
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 0.82rem;
  color: #1e293b;
  background: #fff;
  cursor: pointer;
  width: 100%;
}

.sw-select:focus {
  outline: none;
  border-color: #6366f1;
}

.sw-combobox {
  position: relative;
}

.sw-input {
  width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 0.82rem;
  color: #1e293b;
  background: #fff;
  box-sizing: border-box;
}

.sw-input:focus {
  outline: none;
  border-color: #6366f1;
}

.sw-dropdown {
  position: absolute;
  top: calc(100% + 2px);
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  max-height: 180px;
  overflow-y: auto;
  z-index: 50;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.sw-dropdown-item {
  padding: 7px 10px;
  font-size: 0.82rem;
  color: #1e293b;
  cursor: pointer;
}

.sw-dropdown-item:hover {
  background: #f1f5f9;
}

.sw-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.sw-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  background: #e0e7ff;
  color: #3730a3;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  padding: 2px 8px 2px 10px;
}

.sw-pill-remove {
  background: none;
  border: none;
  color: #3730a3;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  opacity: 0.6;
}

.sw-pill-remove:hover {
  opacity: 1;
}

.sw-scope-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.25rem;
  border-top: 1px solid #f1f5f9;
  margin-top: auto;
}

.sw-clear-link {
  background: none;
  border: none;
  color: #dc2626;
  font-size: 0.78rem;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.sw-scope-count {
  font-size: 0.78rem;
  color: #64748b;
  font-style: italic;
}

/* ─── STRATEGY STEP ─── */
.sw-strategy-cards {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.sw-strategy-card {
  width: 100%;
  text-align: left;
  padding: 1rem 1.25rem;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s;
}

.sw-strategy-card:hover {
  border-color: #a5b4fc;
  background: #f5f3ff;
}

.sw-strategy-card--active {
  border-color: #6366f1;
  background: #eef2ff;
}

.sw-strategy-name {
  font-size: 0.95rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.3rem;
}

.sw-strategy-card--active .sw-strategy-name {
  color: #4338ca;
}

.sw-strategy-desc {
  font-size: 0.8rem;
  color: #64748b;
  line-height: 1.45;
}

/* ─── OPTIONS STEP ─── */
.sw-option-group {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #f1f5f9;
}

.sw-option-group:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.sw-option-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: #1e293b;
}

.sw-option-desc {
  font-size: 0.78rem;
  color: #64748b;
  line-height: 1.45;
  margin: 0;
}

.sw-pp-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sw-pp-input {
  width: 140px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 5px 8px;
  font-size: 0.82rem;
  color: #1e293b;
  background: #fff;
}

.sw-pp-input:focus {
  outline: none;
  border-color: #6366f1;
}

.sw-pp-clear {
  font-size: 0.72rem;
  padding: 3px 9px;
  border-radius: 5px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #64748b;
  cursor: pointer;
}

.sw-pp-clear:hover {
  background: #f1f5f9;
}

.sw-toggle-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.sw-toggle-input {
  width: 14px;
  height: 14px;
  cursor: pointer;
  accent-color: #6366f1;
  flex-shrink: 0;
}

.sw-toggle-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #1e293b;
  user-select: none;
}

/* ─── TOOLTIP HINT ─── */
.sw-tooltip-hint {
  font-size: 0.75em;
  color: #94a3b8;
  cursor: help;
  user-select: none;
  margin-left: 0.2rem;
}

/* ─── FOOTER ─── */
.sw-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-top: 1px solid #f1f5f9;
  flex-shrink: 0;
}

.sw-btn {
  padding: 8px 20px;
  border-radius: 7px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition:
    background 0.15s,
    color 0.15s;
}

.sw-btn--secondary {
  background: transparent;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.sw-btn--secondary:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.sw-btn--primary {
  background: #6366f1;
  color: #fff;
}

.sw-btn--primary:hover {
  background: #4f46e5;
}
</style>

<style>
.sw-tooltip-portal {
  position: fixed;
  z-index: 9999;
  width: 280px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.6rem 0.8rem;
  font-size: 0.8rem;
  color: #374151;
  line-height: 1.5;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  pointer-events: none;
  transform: translateY(calc(-100% - 8px));
}
</style>
