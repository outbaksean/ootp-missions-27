<template>
  <div class="sp-panel">
    <!-- ─── CONFIGURE ACCORDION ─── -->
    <div class="sp-configure">
      <!-- Scope -->
      <div class="sp-acc-item">
        <button class="sp-acc-header" @click="toggleSection('scope')">
          <div class="sp-acc-left">
            <span class="sp-acc-title">Scope</span>
            <span class="sp-acc-summary">{{ scopeSummary }}</span>
          </div>
          <span
            class="sp-acc-chevron"
            :class="{ 'sp-acc-chevron--open': openSection === 'scope' }"
          ></span>
        </button>
        <div v-if="openSection === 'scope'" class="sp-acc-body">
          <p class="sp-acc-desc">
            Add filters to narrow scope. Leave empty to include all missions.
          </p>
          <div v-if="hasNoFilters" class="sp-empty-scope">
            No filters selected — all missions will be included
          </div>

          <div class="sp-field">
            <span class="sp-field-label">Category</span>
            <select class="sp-select" @change="addCategory($event)">
              <option value="">Add a category...</option>
              <option
                v-for="cat in availableCategories"
                :key="cat"
                :value="cat"
              >
                {{ cat }}
              </option>
            </select>
            <div v-if="scope.categories.length > 0" class="sp-pills">
              <span v-for="cat in scope.categories" :key="cat" class="sp-pill">
                {{ cat }}
                <button class="sp-pill-remove" @click="removeCategory(cat)">
                  x
                </button>
              </span>
            </div>
          </div>

          <div class="sp-field">
            <span class="sp-field-label">Chain</span>
            <div class="sp-combobox">
              <input
                type="text"
                class="sp-input"
                placeholder="Search chains..."
                v-model="chainQuery"
                @focus="chainOpen = true"
                @blur="() => delayClose(() => (chainOpen = false))"
              />
              <div
                v-if="chainOpen && filteredChains.length > 0"
                class="sp-dropdown"
              >
                <div
                  v-for="m in filteredChains"
                  :key="m.id"
                  class="sp-dropdown-item"
                  @mousedown.prevent="addChain(m)"
                >
                  {{ m.rawMission.name }}
                </div>
              </div>
            </div>
            <div v-if="scope.chainIds.length > 0" class="sp-pills">
              <span v-for="id in scope.chainIds" :key="id" class="sp-pill">
                {{ chainNameById(id) }}
                <button class="sp-pill-remove" @click="removeChain(id)">
                  x
                </button>
              </span>
            </div>
          </div>

          <div class="sp-field">
            <span class="sp-field-label">Reward Card</span>
            <div class="sp-combobox">
              <input
                type="text"
                class="sp-input"
                placeholder="Search reward cards..."
                v-model="rewardCardQuery"
                @focus="rewardCardOpen = true"
                @blur="() => delayClose(() => (rewardCardOpen = false))"
              />
              <div
                v-if="rewardCardOpen && filteredRewardCards.length > 0"
                class="sp-dropdown"
              >
                <div
                  v-for="card in filteredRewardCards"
                  :key="card.cardId"
                  class="sp-dropdown-item"
                  @mousedown.prevent="addRewardCard(card)"
                >
                  {{ card.label }}
                </div>
              </div>
            </div>
            <div v-if="scope.rewardCardIds.length > 0" class="sp-pills">
              <span v-for="id in scope.rewardCardIds" :key="id" class="sp-pill">
                {{ rewardCardLabelById(id) }}
                <button class="sp-pill-remove" @click="removeRewardCard(id)">
                  x
                </button>
              </span>
            </div>
          </div>

          <div class="sp-field">
            <span class="sp-field-label">Mission</span>
            <div class="sp-combobox">
              <input
                type="text"
                class="sp-input"
                placeholder="Search missions..."
                v-model="missionQuery"
                @focus="missionOpen = true"
                @blur="() => delayClose(() => (missionOpen = false))"
              />
              <div
                v-if="missionOpen && filteredMissionOptions.length > 0"
                class="sp-dropdown"
              >
                <div
                  v-for="m in filteredMissionOptions"
                  :key="m.id"
                  class="sp-dropdown-item"
                  @mousedown.prevent="addMissionById(m)"
                >
                  {{ m.rawMission.name }}
                </div>
              </div>
            </div>
            <div v-if="scope.missionIds.length > 0" class="sp-pills">
              <span v-for="id in scope.missionIds" :key="id" class="sp-pill">
                {{ missionNameById(id) }}
                <button class="sp-pill-remove" @click="removeMissionById(id)">
                  x
                </button>
              </span>
            </div>
          </div>

          <div class="sp-scope-footer">
            <button
              v-if="!hasNoFilters"
              class="sp-clear-link"
              @click="clearScope"
            >
              Clear all filters
            </button>
            <span class="sp-scope-count"
              >{{ resolvedMissionCount }} missions in scope</span
            >
          </div>
        </div>
      </div>

      <!-- Strategy -->
      <div class="sp-acc-item">
        <button class="sp-acc-header" @click="toggleSection('strategy')">
          <div class="sp-acc-left">
            <span class="sp-acc-title">Strategy</span>
            <span class="sp-acc-summary">{{ strategySummary }}</span>
          </div>
          <span
            class="sp-acc-chevron"
            :class="{ 'sp-acc-chevron--open': openSection === 'strategy' }"
          ></span>
        </button>
        <div v-if="openSection === 'strategy'" class="sp-acc-body">
          <div class="sp-strategy-cards">
            <button
              class="sp-strategy-card"
              :class="{ 'sp-strategy-card--active': strategy === 'completion' }"
              @click="strategy = 'completion'"
            >
              <div class="sp-strategy-name">Completion</div>
              <div class="sp-strategy-desc">
                Complete as many missions as possible, starting with the
                cheapest
              </div>
            </button>
            <button
              class="sp-strategy-card"
              :class="{ 'sp-strategy-card--active': strategy === 'value' }"
              @click="strategy = 'value'"
            >
              <div class="sp-strategy-name">Value</div>
              <div class="sp-strategy-desc">
                Prioritize missions where rewards outweigh card costs
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- Options -->
      <div class="sp-acc-item">
        <button class="sp-acc-header" @click="toggleSection('options')">
          <div class="sp-acc-left">
            <span class="sp-acc-title">Options</span>
            <span class="sp-acc-summary">{{ optionsSummary }}</span>
          </div>
          <span
            class="sp-acc-chevron"
            :class="{ 'sp-acc-chevron--open': openSection === 'options' }"
          ></span>
        </button>
        <div v-if="openSection === 'options'" class="sp-acc-body">
          <div class="sp-option-group">
            <label class="sp-option-label">Available PP</label>
            <p class="sp-option-desc">
              Budget for card purchases. Leave blank for unlimited.
            </p>
            <div class="sp-pp-row">
              <input
                type="text"
                class="sp-pp-input"
                v-model="ppInput"
                placeholder="Unlimited"
                inputmode="numeric"
              />
              <button
                v-if="ppInput.trim()"
                class="sp-pp-clear"
                @click="ppInput = ''"
              >
                Clear
              </button>
            </div>
          </div>
          <div class="sp-option-group">
            <label class="sp-toggle-row">
              <input
                type="checkbox"
                class="sp-toggle-input"
                v-model="completableOnly"
              />
              <span class="sp-toggle-label">Completable missions only</span>
            </label>
            <p class="sp-option-desc">
              Only include missions where all required cards have market prices.
              When off, cards toward non-completable missions are still listed.
            </p>
          </div>
          <div class="sp-option-group sp-option-group--last">
            <label class="sp-toggle-row">
              <input
                type="checkbox"
                class="sp-toggle-input"
                v-model="optimizeForLockedCards"
              />
              <span class="sp-toggle-label">Optimize for locked cards</span>
            </label>
            <p class="sp-option-desc">
              Use optimized mode calculations — accounts for locked cards and
              the opportunity cost of selling unlocked cards. Only useful if
              you've uploaded your locked card data.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── GENERATE BUTTON ─── -->
    <button class="sp-generate-btn" @click="handleGenerate">
      Generate Shopping Plan
    </button>

    <!-- ─── NO RESULTS YET ─── -->
    <p v-if="!props.wizardConfig" class="sp-no-results">
      Configure settings above and click Generate to build your shopping plan.
    </p>

    <!-- ─── RESULTS ─── -->
    <template v-else>
      <!-- Results bar -->
      <div class="sp-results-bar">
        <span class="sp-results-title">Shopping List</span>
        <div class="sp-results-actions">
          <button
            v-if="eligibleMissions.length > 0"
            class="sp-export-btn"
            @click="headerCollapsed = !headerCollapsed"
          >
            {{ headerCollapsed ? "Show summary" : "Hide summary" }}
          </button>
          <template v-if="shoppingItems.length > 0">
            <button class="sp-export-btn" @click="exportCsv">CSV</button>
            <button class="sp-export-btn" @click="exportHtml">HTML</button>
          </template>
        </div>
      </div>

      <!-- Structured summary header -->
      <div
        v-if="eligibleMissions.length > 0 && !headerCollapsed"
        class="sl-structured-summary"
      >
        <!-- Scope -->
        <div class="sl-struct-row">
          <div class="sl-struct-label">Scope</div>
          <div class="sl-scope-tags">
            <span
              v-if="scopeLabels.length === 0"
              class="sl-scope-tag sl-scope-tag--all"
              >All missions</span
            >
            <span
              v-for="label in scopeLabels"
              :key="label"
              class="sl-scope-tag"
            >
              {{ label }}
            </span>
          </div>
        </div>

        <!-- Missions -->
        <div class="sl-struct-row">
          <div class="sl-struct-label">
            Missions
            <span class="sl-missions-badge">{{
              selectedLeafMissions.length
            }}</span>
          </div>
          <div class="sl-missions-rows">
            <div
              v-if="selectedLeafMissions.length === 0"
              class="sl-missions-empty"
            >
              None
            </div>
            <div
              v-for="m in visibleMissions(selectedLeafMissions, 'missions')"
              :key="m.id"
              class="sl-mission-row"
            >
              <span class="sl-mission-row-name">{{ m.rawMission.name }}</span>
              <span v-if="m.remainingPrice > 0" class="sl-mission-row-cost"
                >{{ m.remainingPrice.toLocaleString() }} PP</span
              >
              <span v-else class="sl-mission-row-free">Free</span>
            </div>
            <button
              v-if="selectedLeafMissions.length > COLLAPSE_THRESHOLD"
              class="sl-missions-toggle"
              @click="toggleExpand('missions')"
            >
              {{
                expandedSections.has("missions")
                  ? "Show less"
                  : `+${selectedLeafMissions.length - COLLAPSE_SHOW} more`
              }}
            </button>
          </div>
        </div>

        <!-- Total cost (under missions) -->
        <div class="sl-struct-row sl-total-row">
          <span class="sl-total-label">Total cost</span>
          <span class="sl-total-value"
            >{{ totalCost.toLocaleString() }} PP</span
          >
        </div>

        <!-- Excluded (no price data) -->
        <div
          v-if="
            props.wizardConfig?.completableOnly && excludedMissions.length > 0
          "
          class="sl-struct-row"
        >
          <div class="sl-struct-label sl-struct-label--excluded">
            Excluded
            <span class="sl-missions-badge sl-missions-badge--excluded">{{
              excludedMissions.length
            }}</span>
          </div>
          <div class="sl-missions-rows">
            <div
              v-for="m in visibleMissions(excludedMissions, 'excluded')"
              :key="m.id"
              class="sl-mission-row"
            >
              <span class="sl-mission-row-name">{{ m.rawMission.name }}</span>
              <span class="sl-mission-row-excluded-label">No price data</span>
            </div>
            <button
              v-if="excludedMissions.length > COLLAPSE_THRESHOLD"
              class="sl-missions-toggle"
              @click="toggleExpand('excluded')"
            >
              {{
                expandedSections.has("excluded")
                  ? "Show less"
                  : `+${excludedMissions.length - COLLAPSE_SHOW} more`
              }}
            </button>
          </div>
        </div>

        <!-- Over budget -->
        <div v-if="outOfBudgetMissions.length > 0" class="sl-struct-row">
          <div class="sl-struct-label sl-struct-label--excluded">
            Over budget
            <span class="sl-missions-badge sl-missions-badge--excluded">{{
              outOfBudgetMissions.length
            }}</span>
          </div>
          <div class="sl-missions-rows">
            <div
              v-for="m in visibleMissions(outOfBudgetMissions, 'overbudget')"
              :key="m.id"
              class="sl-mission-row"
            >
              <span class="sl-mission-row-name">{{ m.rawMission.name }}</span>
              <span class="sl-mission-row-excluded-label"
                >{{ m.remainingPrice.toLocaleString() }} PP</span
              >
            </div>
            <button
              v-if="outOfBudgetMissions.length > COLLAPSE_THRESHOLD"
              class="sl-missions-toggle"
              @click="toggleExpand('overbudget')"
            >
              {{
                expandedSections.has("overbudget")
                  ? "Show less"
                  : `+${outOfBudgetMissions.length - COLLAPSE_SHOW} more`
              }}
            </button>
          </div>
        </div>

        <!-- Remaining cost (under over budget) -->
        <div
          v-if="outOfBudgetMissions.length > 0"
          class="sl-struct-row sl-total-row"
        >
          <span class="sl-total-label">Remaining cost</span>
          <span class="sl-total-value"
            >{{ overBudgetTotalCost.toLocaleString() }} PP</span
          >
        </div>

        <!-- Negative value -->
        <div
          v-if="negativeValueExcludedMissions.length > 0"
          class="sl-struct-row"
        >
          <div class="sl-struct-label sl-struct-label--excluded">
            Negative value
            <span class="sl-missions-badge sl-missions-badge--excluded">{{
              negativeValueExcludedMissions.length
            }}</span>
          </div>
          <div class="sl-missions-rows">
            <div
              v-for="m in visibleMissions(
                negativeValueExcludedMissions,
                'negvalue',
              )"
              :key="m.id"
              class="sl-mission-row"
            >
              <span class="sl-mission-row-name">{{ m.rawMission.name }}</span>
            </div>
            <button
              v-if="negativeValueExcludedMissions.length > COLLAPSE_THRESHOLD"
              class="sl-missions-toggle"
              @click="toggleExpand('negvalue')"
            >
              {{
                expandedSections.has("negvalue")
                  ? "Show less"
                  : `+${negativeValueExcludedMissions.length - COLLAPSE_SHOW} more`
              }}
            </button>
          </div>
        </div>

        <!-- Combined rewards -->
        <div v-if="rewardChips.length > 0" class="sl-struct-row">
          <div class="sl-struct-label">
            Combined rewards
            <span v-if="totalRewardValue > 0" class="sl-rewards-value-inline">
              {{ totalRewardValue.toLocaleString() }} PP
            </span>
          </div>
          <div class="sl-reward-chips">
            <span
              v-for="item in rewardChips"
              :key="item.label"
              class="sl-reward-chip"
              :class="chipClass(item)"
              >{{ item.count > 1 ? item.count + "x " : ""
              }}{{ item.label }}</span
            >
          </div>
        </div>
      </div>

      <!-- Empty states -->
      <p v-if="eligibleMissions.length === 0" class="sl-empty">
        No calculated missions found. Use the Calculate button on missions to
        get started.
      </p>
      <p
        v-else-if="buyItemCount === 0 && shoppingItems.length === 0"
        class="sl-empty"
      >
        No cards to buy — all missions are already completable with owned cards.
      </p>

      <!-- Card list -->
      <div
        v-for="item in shoppingItems"
        :key="item.cardId"
        class="sl-item"
        :class="{
          'sl-item--completing': item.completingMissions.length > 0,
          'sl-item--reward': item.isRewardItem,
        }"
      >
        <div class="sl-item-main">
          <span class="sl-card-title">{{ item.title }}</span>
          <span v-if="item.isRewardItem" class="sl-reward-label">
            Reward from '{{ item.rewardFromMission!.rawMission.name }}'
          </span>
          <span v-else class="sl-price"
            >{{ item.price.toLocaleString() }} PP</span
          >
        </div>
        <div v-if="item.explanation" class="sl-item-explanation">
          {{ item.explanation }}
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { UserMission } from "../models/UserMission";
import type { ShopCard } from "../models/ShopCard";
import {
  type ShoppingWizardConfig,
  type ShoppingScope,
  emptyScopeIsAll,
} from "../models/ShoppingWizardConfig";
import {
  buildShoppingItems,
  buildMissionPriority,
  selectMissionsForBudget,
  resolveScopedMissions,
  buildCsvContent,
  buildHtmlContent,
  computeCompletedByList,
  escapeHtml,
} from "../helpers/ShoppingListHelper";
import type { ShoppingItem } from "../helpers/ShoppingListHelper";
import {
  collectRewardItems,
  chipClass,
  type RewardItem,
} from "../helpers/RewardItemsHelper";
import { PACK_TYPE_LABELS } from "../stores/useSettingsStore";

const props = defineProps<{
  missions: UserMission[];
  wizardConfig: ShoppingWizardConfig | null;
  packPrices: Map<string, number>;
  shopCardsById: Map<number, ShopCard>;
  categories: string[];
  chainMissions: UserMission[];
  rewardCards: Array<{ cardId: number; label: string }>;
}>();

const emit = defineEmits<{
  (e: "confirm", config: ShoppingWizardConfig): void;
}>();

// ─── ACCORDION STATE ───
const openSection = ref<"scope" | "strategy" | "options" | null>(
  props.wizardConfig ? null : "scope",
);
const headerCollapsed = ref(false);

function toggleSection(section: "scope" | "strategy" | "options") {
  openSection.value = openSection.value === section ? null : section;
}

// ─── CONFIGURE DRAFT STATE ───
function initScope(): ShoppingScope {
  return props.wizardConfig
    ? { ...props.wizardConfig.scope }
    : { categories: [], chainIds: [], rewardCardIds: [], missionIds: [] };
}

const scope = ref<ShoppingScope>(initScope());
const strategy = ref<"completion" | "value">(
  props.wizardConfig?.strategy ?? "completion",
);
const ppInput = ref(
  props.wizardConfig?.availablePP != null
    ? String(props.wizardConfig.availablePP)
    : "",
);
const completableOnly = ref(props.wizardConfig?.completableOnly ?? true);
const optimizeForLockedCards = ref(
  props.wizardConfig?.optimizeForLockedCards ?? false,
);

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

// ─── CONFIGURE COMPUTED ───
const hasNoFilters = computed(() => emptyScopeIsAll(scope.value));

const resolvedMissionCount = computed(
  () =>
    resolveScopedMissions(props.missions, scope.value).filter(
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
  return props.missions
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
  return props.missions.find((m) => m.id === id)?.rawMission.name ?? `#${id}`;
}

// ─── SECTION SUMMARIES ───
const scopeSummary = computed(() => {
  if (emptyScopeIsAll(scope.value)) return "All missions";
  const count =
    scope.value.categories.length +
    scope.value.chainIds.length +
    scope.value.rewardCardIds.length +
    scope.value.missionIds.length;
  return count === 1 ? "1 filter" : `${count} filters`;
});

const strategySummary = computed(() =>
  strategy.value === "completion" ? "Completion" : "Value",
);

const optionsSummary = computed(() => {
  const pp = ppInput.value.trim() ? `${ppInput.value.trim()} PP` : "Unlimited";
  const extra = completableOnly.value ? ", completable only" : "";
  return pp + extra;
});

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

// ─── GENERATE ───
function handleGenerate() {
  const raw = ppInput.value.trim().replace(/,/g, "");
  const parsedPP = raw ? Number(raw) : null;
  const availablePP =
    parsedPP !== null && Number.isFinite(parsedPP) && parsedPP > 0
      ? parsedPP
      : null;
  openSection.value = null;
  emit("confirm", {
    scope: scope.value,
    strategy: strategy.value,
    availablePP,
    completableOnly: completableOnly.value,
    optimizeForLockedCards: optimizeForLockedCards.value,
  });
}

// ─── RESULTS COMPUTED (driven by committed wizardConfig prop) ───
const resultStrategy = computed(
  () => props.wizardConfig?.strategy ?? "completion",
);
const resultAvailablePP = computed(
  () => props.wizardConfig?.availablePP ?? null,
);

const inScopeIncomplete = computed(() => {
  if (!props.wizardConfig) return [];
  const incomplete = props.missions.filter(
    (m) => !m.completed && m.progressText !== "Not Calculated",
  );
  const wScope = props.wizardConfig.scope;
  if (emptyScopeIsAll(wScope)) return incomplete;
  const scopedIds = new Set(
    resolveScopedMissions(props.missions, wScope).map((m) => m.id),
  );
  return incomplete.filter((m) => scopedIds.has(m.id));
});

const eligibleMissions = computed(() => {
  if (!props.wizardConfig) return [];
  if (props.wizardConfig.completableOnly) {
    return inScopeIncomplete.value.filter((m) => m.isCompletable);
  }
  return inScopeIncomplete.value;
});

const excludedMissions = computed(() =>
  inScopeIncomplete.value.filter(
    (m) => !m.isCompletable && m.rawMission.type !== "missions",
  ),
);

const missionSelection = computed(() => {
  const leafMissions = eligibleMissions.value.filter(
    (m) => m.rawMission.type !== "missions",
  );
  return selectMissionsForBudget(
    leafMissions,
    resultStrategy.value,
    resultAvailablePP.value,
    props.missions,
  );
});

const missionPriority = computed(() =>
  buildMissionPriority(
    eligibleMissions.value,
    missionSelection.value.selectionOrder,
    resultStrategy.value,
    missionSelection.value.selectedIds,
  ),
);

const outOfBudgetMissions = computed(() => {
  if (resultAvailablePP.value === null) return [];
  const leafMissions = eligibleMissions.value.filter(
    (m) => m.rawMission.type !== "missions",
  );
  const excluded = missionSelection.value.negativeValueExcluded;
  const selectedIds = missionSelection.value.selectedIds;
  return leafMissions.filter(
    (m) => !selectedIds.has(m.id) && !excluded.includes(m),
  );
});

const negativeValueExcludedMissions = computed(() => {
  if (resultStrategy.value !== "value") return [];
  return missionSelection.value.negativeValueExcluded;
});

const overBudgetTotalCost = computed(() =>
  outOfBudgetMissions.value.reduce((sum, m) => sum + m.remainingPrice, 0),
);

// ─── COLLAPSE STATE ───
const COLLAPSE_THRESHOLD = 12;
const COLLAPSE_SHOW = 10;
const expandedSections = ref<Set<string>>(new Set());

function toggleExpand(key: string) {
  const next = new Set(expandedSections.value);
  if (next.has(key)) {
    next.delete(key);
  } else {
    next.add(key);
  }
  expandedSections.value = next;
}

function visibleMissions<T>(items: T[], key: string): T[] {
  if (items.length <= COLLAPSE_THRESHOLD) return items;
  if (expandedSections.value.has(key)) return items;
  return items.slice(0, COLLAPSE_SHOW);
}

const shoppingItems = computed((): ShoppingItem[] =>
  props.wizardConfig
    ? buildShoppingItems(
        eligibleMissions.value,
        missionSelection.value.selectedIds,
        props.missions,
        props.shopCardsById,
        missionPriority.value,
      )
    : [],
);

const buyItemCount = computed(
  () => shoppingItems.value.filter((i) => !i.isRewardItem).length,
);

// ─── HEADER DATA ───
const scopeLabels = computed((): string[] => {
  if (!props.wizardConfig) return [];
  const wScope = props.wizardConfig.scope;
  if (emptyScopeIsAll(wScope)) return [];
  const missionById = new Map(props.missions.map((m) => [m.id, m]));
  const labels: string[] = [];
  for (const cat of wScope.categories) labels.push(cat);
  for (const id of wScope.chainIds) {
    labels.push(missionById.get(id)?.rawMission.name ?? `#${id}`);
  }
  for (const id of wScope.rewardCardIds) {
    labels.push(props.shopCardsById.get(id)?.cardTitle ?? `Card #${id}`);
  }
  for (const id of wScope.missionIds) {
    labels.push(missionById.get(id)?.rawMission.name ?? `#${id}`);
  }
  return labels;
});

const selectedLeafMissions = computed(
  () => missionSelection.value.selectionOrder,
);

const totalCost = computed(() =>
  shoppingItems.value
    .filter((i) => !i.isRewardItem)
    .reduce((sum, i) => sum + i.price, 0),
);

const completingMissions = computed(() => {
  const shoppingCardIds = new Set(shoppingItems.value.map((i) => i.cardId));
  return computeCompletedByList(
    eligibleMissions.value,
    props.missions,
    shoppingCardIds,
  );
});

const rewardChips = computed((): RewardItem[] =>
  collectRewardItems(completingMissions.value, {
    packPrices: props.packPrices,
    packTypeLabels: PACK_TYPE_LABELS,
    shopCardsById: props.shopCardsById,
  }),
);

const totalRewardValue = computed(() =>
  completingMissions.value.reduce((sum, m) => sum + (m.rewardValue ?? 0), 0),
);

// ─── HTML EXPORT HEADER ───
function chipInlineStyle(item: RewardItem): string {
  const lower = item.label.toLowerCase();
  if (item.type === "park")
    return "background:#d1fae5;color:#065f46;border:1px solid #6ee7b7;";
  if (item.type === "card")
    return "background:#ede9fe;color:#4c1d95;border:1px solid #c4b5fd;";
  if (lower.includes("rainbow"))
    return "background:linear-gradient(90deg,#f87171,#fb923c,#fbbf24,#4ade80,#60a5fa,#a78bfa,#f472b6);color:#fff;border:1px solid transparent;";
  if (lower.includes("perfect"))
    return "background:#0f172a;color:#f8fafc;border:1px solid #334155;";
  if (lower.includes("diamond"))
    return "background:#bae6fd;color:#0c4a6e;border:1px solid #7dd3fc;";
  if (lower.includes("gold"))
    return "background:#fbbf24;color:#78350f;border:1px solid #f59e0b;";
  if (lower.includes("silver"))
    return "background:#cbd5e1;color:#1e293b;border:1px solid #94a3b8;";
  if (lower.includes("standard"))
    return "background:#3b82f6;color:#fff;border:1px solid #2563eb;";
  return "background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;";
}

const structuredHeaderHtml = computed((): string => {
  if (!props.wizardConfig || eligibleMissions.value.length === 0) return "";
  const e = escapeHtml;
  const rows: string[] = [];

  // Scope
  const scopeContent =
    scopeLabels.value.length === 0
      ? '<span class="hdr-scope-tag hdr-scope-tag--all">All missions</span>'
      : scopeLabels.value
          .map((l) => `<span class="hdr-scope-tag">${e(l)}</span>`)
          .join("");
  rows.push(
    `<div class="hdr-row"><div class="hdr-label">Scope</div><div class="hdr-scope-tags">${scopeContent}</div></div>`,
  );

  // Missions
  const missionRowsHtml =
    selectedLeafMissions.value.length === 0
      ? '<div class="hdr-none">None</div>'
      : selectedLeafMissions.value
          .map((m) => {
            const cost =
              m.remainingPrice > 0
                ? `<span class="hdr-cost">${m.remainingPrice.toLocaleString()} PP</span>`
                : '<span class="hdr-free">Free</span>';
            return `<div class="hdr-mission-row"><span class="hdr-mission-name">${e(m.rawMission.name)}</span>${cost}</div>`;
          })
          .join("");
  rows.push(
    `<div class="hdr-row"><div class="hdr-label">Missions <span class="hdr-badge">${selectedLeafMissions.value.length}</span></div><div class="hdr-mission-rows">${missionRowsHtml}</div></div>`,
  );

  // Total cost
  rows.push(
    `<div class="hdr-row hdr-total-row"><span class="hdr-total-label">Total cost</span><span class="hdr-total-value">${totalCost.value.toLocaleString()} PP</span></div>`,
  );

  // Excluded
  if (props.wizardConfig.completableOnly && excludedMissions.value.length > 0) {
    const mRows = excludedMissions.value
      .map(
        (m) =>
          `<div class="hdr-mission-row"><span class="hdr-mission-name">${e(m.rawMission.name)}</span><span class="hdr-excl-label">No price data</span></div>`,
      )
      .join("");
    rows.push(
      `<div class="hdr-row"><div class="hdr-label hdr-label--excl">Excluded <span class="hdr-badge hdr-badge--excl">${excludedMissions.value.length}</span></div><div class="hdr-mission-rows">${mRows}</div></div>`,
    );
  }

  // Over budget
  if (outOfBudgetMissions.value.length > 0) {
    const mRows = outOfBudgetMissions.value
      .map(
        (m) =>
          `<div class="hdr-mission-row"><span class="hdr-mission-name">${e(m.rawMission.name)}</span><span class="hdr-excl-label">${m.remainingPrice.toLocaleString()} PP</span></div>`,
      )
      .join("");
    rows.push(
      `<div class="hdr-row"><div class="hdr-label hdr-label--excl">Over budget <span class="hdr-badge hdr-badge--excl">${outOfBudgetMissions.value.length}</span></div><div class="hdr-mission-rows">${mRows}</div></div>`,
    );
    rows.push(
      `<div class="hdr-row hdr-total-row"><span class="hdr-total-label">Remaining cost</span><span class="hdr-total-value">${overBudgetTotalCost.value.toLocaleString()} PP</span></div>`,
    );
  }

  // Negative value
  if (negativeValueExcludedMissions.value.length > 0) {
    const mRows = negativeValueExcludedMissions.value
      .map(
        (m) =>
          `<div class="hdr-mission-row"><span class="hdr-mission-name">${e(m.rawMission.name)}</span></div>`,
      )
      .join("");
    rows.push(
      `<div class="hdr-row"><div class="hdr-label hdr-label--excl">Negative value <span class="hdr-badge hdr-badge--excl">${negativeValueExcludedMissions.value.length}</span></div><div class="hdr-mission-rows">${mRows}</div></div>`,
    );
  }

  // Combined rewards
  if (rewardChips.value.length > 0) {
    const chipsHtml = rewardChips.value
      .map((item) => {
        const style = chipInlineStyle(item);
        const label =
          item.count > 1 ? `${item.count}x ${item.label}` : item.label;
        return `<span class="hdr-chip" style="${style}">${e(label)}</span>`;
      })
      .join("");
    const valueLabel =
      totalRewardValue.value > 0
        ? ` <span class="hdr-reward-value">${totalRewardValue.value.toLocaleString()} PP</span>`
        : "";
    rows.push(
      `<div class="hdr-row"><div class="hdr-label">Combined rewards${valueLabel}</div><div class="hdr-chips">${chipsHtml}</div></div>`,
    );
  }

  return rows.join("");
});

// ─── EXPORT ───
function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCsv() {
  const csv = buildCsvContent(shoppingItems.value);
  downloadFile("ootp-shopping-list.csv", csv, "text/csv;charset=utf-8;");
}

function exportHtml() {
  const html = buildHtmlContent({
    items: shoppingItems.value,
    headerHtml: structuredHeaderHtml.value,
  });
  downloadFile("ootp-shopping-list.html", html, "text/html;charset=utf-8;");
}
</script>

<style scoped>
/* ─── PANEL ─── */
.sp-panel {
  height: 100%;
  overflow-y: auto;
  background: var(--detail-bg);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* ─── CONFIGURE ACCORDION ─── */
.sp-configure {
  border: 1px solid var(--card-border);
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}

.sp-acc-item {
  border-bottom: 1px solid var(--card-border);
}

.sp-acc-item:last-child {
  border-bottom: none;
}

.sp-acc-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 0.9rem;
  background: #fff;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
  gap: 0.5rem;
}

.sp-acc-header:hover {
  background: #f8fafc;
}

.sp-acc-left {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  flex: 1;
  min-width: 0;
}

.sp-acc-title {
  font-size: 0.82rem;
  font-weight: 700;
  color: #1e293b;
  flex-shrink: 0;
}

.sp-acc-summary {
  font-size: 0.78rem;
  color: #64748b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sp-acc-chevron {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sp-acc-chevron::before {
  content: "";
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid #94a3b8;
  transition: transform 0.2s;
}

.sp-acc-chevron--open::before {
  transform: rotate(180deg);
}

.sp-acc-body {
  padding: 0.75rem 0.9rem;
  background: #fafafa;
  border-top: 1px solid var(--card-border);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.sp-acc-desc {
  font-size: 0.78rem;
  color: #64748b;
  margin: 0;
  line-height: 1.4;
}

/* ─── SCOPE FIELDS ─── */
.sp-empty-scope {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-size: 0.78rem;
  color: #0369a1;
}

.sp-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.sp-field-label {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #64748b;
}

.sp-select {
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 5px 7px;
  font-size: 0.8rem;
  color: #1e293b;
  background: #fff;
  cursor: pointer;
  width: 100%;
}

.sp-select:focus {
  outline: none;
  border-color: #6366f1;
}

.sp-combobox {
  position: relative;
}

.sp-input {
  width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 5px 7px;
  font-size: 0.8rem;
  color: #1e293b;
  background: #fff;
  box-sizing: border-box;
}

.sp-input:focus {
  outline: none;
  border-color: #6366f1;
}

.sp-dropdown {
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

.sp-dropdown-item {
  padding: 6px 9px;
  font-size: 0.8rem;
  color: #1e293b;
  cursor: pointer;
}

.sp-dropdown-item:hover {
  background: #f1f5f9;
}

.sp-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.sp-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  background: #e0e7ff;
  color: #3730a3;
  border-radius: 9999px;
  font-size: 0.72rem;
  font-weight: 500;
  padding: 2px 8px 2px 10px;
}

.sp-pill-remove {
  background: none;
  border: none;
  color: #3730a3;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  opacity: 0.6;
}

.sp-pill-remove:hover {
  opacity: 1;
}

.sp-scope-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.25rem;
  border-top: 1px solid #f1f5f9;
}

.sp-clear-link {
  background: none;
  border: none;
  color: #dc2626;
  font-size: 0.75rem;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.sp-scope-count {
  font-size: 0.75rem;
  color: #64748b;
  font-style: italic;
}

/* ─── STRATEGY SECTION ─── */
.sp-strategy-cards {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sp-strategy-card {
  width: 100%;
  text-align: left;
  padding: 0.75rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s;
}

.sp-strategy-card:hover {
  border-color: #a5b4fc;
  background: #f5f3ff;
}

.sp-strategy-card--active {
  border-color: #6366f1;
  background: #eef2ff;
}

.sp-strategy-name {
  font-size: 0.88rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.2rem;
}

.sp-strategy-card--active .sp-strategy-name {
  color: #4338ca;
}

.sp-strategy-desc {
  font-size: 0.77rem;
  color: #64748b;
  line-height: 1.4;
}

/* ─── OPTIONS SECTION ─── */
.sp-option-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding-bottom: 0.65rem;
  border-bottom: 1px solid #f1f5f9;
}

.sp-option-group--last {
  border-bottom: none;
  padding-bottom: 0;
}

.sp-option-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #1e293b;
}

.sp-option-desc {
  font-size: 0.75rem;
  color: #64748b;
  line-height: 1.4;
  margin: 0;
}

.sp-pp-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sp-pp-input {
  width: 130px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 4px 7px;
  font-size: 0.8rem;
  color: #1e293b;
  background: #fff;
}

.sp-pp-input:focus {
  outline: none;
  border-color: #6366f1;
}

.sp-pp-clear {
  font-size: 0.7rem;
  padding: 3px 8px;
  border-radius: 5px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #64748b;
  cursor: pointer;
}

.sp-pp-clear:hover {
  background: #f1f5f9;
}

.sp-toggle-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
}

.sp-toggle-input {
  width: 13px;
  height: 13px;
  cursor: pointer;
  accent-color: #6366f1;
  flex-shrink: 0;
}

.sp-toggle-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: #1e293b;
  user-select: none;
}

/* ─── GENERATE BUTTON ─── */
.sp-generate-btn {
  width: 100%;
  padding: 12px;
  background: #6366f1;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s;
}

.sp-generate-btn:hover {
  background: #4f46e5;
}

/* ─── NO RESULTS ─── */
.sp-no-results {
  font-size: 0.85rem;
  color: #94a3b8;
  text-align: center;
  padding: 1.5rem 1rem;
  margin: 0;
}

/* ─── RESULTS BAR ─── */
.sp-results-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--card-border);
  flex-shrink: 0;
}

.sp-results-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary, #1e293b);
}

.sp-results-actions {
  display: flex;
  gap: 0.35rem;
}

.sp-export-btn {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 5px;
  border: 1px solid var(--card-border);
  background: var(--detail-bg);
  color: #64748b;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.sp-export-btn:hover {
  background: #6366f1;
  border-color: #6366f1;
  color: #fff;
}

/* ─── STRUCTURED SUMMARY HEADER ─── */
.sl-structured-summary {
  background: #eff6ff;
  border: 1px solid #c7d2fe;
  border-left: 3px solid #6366f1;
  border-radius: 6px;
  flex-shrink: 0;
  overflow: hidden;
}

.sl-struct-row {
  padding: 0.5rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  border-bottom: 1px solid #dde4fb;
}

.sl-struct-row:last-child {
  border-bottom: none;
}

.sl-struct-label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #4338ca;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.sl-missions-badge {
  background: #4338ca;
  color: #fff;
  border-radius: 9999px;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 1px 6px;
  line-height: 1.4;
}

.sl-scope-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.sl-scope-tag {
  display: inline-block;
  background: #e0e7ff;
  color: #3730a3;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  padding: 2px 10px;
}

.sl-scope-tag--all {
  background: #f0f9ff;
  color: #0369a1;
  border: 1px solid #bae6fd;
}

.sl-missions-rows {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.sl-missions-toggle {
  align-self: flex-start;
  margin-top: 0.1rem;
  background: none;
  border: none;
  color: #4338ca;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.sl-missions-empty {
  font-size: 0.8rem;
  color: #94a3b8;
}

.sl-mission-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.sl-mission-row-name {
  font-size: 0.8rem;
  color: #1e293b;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sl-mission-row-cost {
  font-size: 0.78rem;
  font-weight: 600;
  color: #16a34a;
  flex-shrink: 0;
}

.sl-mission-row-free {
  font-size: 0.78rem;
  color: #94a3b8;
  flex-shrink: 0;
}

.sl-total-row {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.sl-total-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: #1e293b;
}

.sl-total-value {
  font-size: 0.9rem;
  font-weight: 700;
  color: #1e293b;
}

.sl-struct-label--excluded {
  color: #92400e;
}

.sl-missions-badge--excluded {
  background: #92400e;
}

.sl-mission-row-excluded-label {
  font-size: 0.75rem;
  color: #92400e;
  flex-shrink: 0;
  font-style: italic;
}

.sl-reward-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.sl-reward-chip {
  font-size: 0.65rem;
  padding: 1px 8px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
  font-weight: 500;
  border: 1px solid #cbd5e1;
  white-space: nowrap;
}

.sl-rewards-value-inline {
  font-size: 0.75rem;
  font-weight: 500;
  color: #4338ca;
}

/* ─── CHIP COLOR VARIANTS ─── */
.chip--standard {
  background: #3b82f6;
  color: #fff;
  border-color: #2563eb;
}

.chip--silver {
  background: #cbd5e1;
  color: #1e293b;
  border-color: #94a3b8;
}

.chip--gold {
  background: #fbbf24;
  color: #78350f;
  border-color: #f59e0b;
}

.chip--diamond {
  background: #bae6fd;
  color: #0c4a6e;
  border-color: #7dd3fc;
}

.chip--perfect {
  background: #0f172a;
  color: #f8fafc;
  border-color: #334155;
}

.chip--rainbow {
  background: linear-gradient(
    90deg,
    #f87171,
    #fb923c,
    #fbbf24,
    #4ade80,
    #60a5fa,
    #a78bfa,
    #f472b6
  );
  color: #fff;
  border-color: transparent;
  text-shadow: 0 0 3px rgba(0, 0, 0, 0.55);
}

.chip--park {
  background: #d1fae5;
  color: #065f46;
  border-color: #6ee7b7;
}

.chip--card {
  background: #ede9fe;
  color: #4c1d95;
  border-color: #c4b5fd;
}

/* ─── EMPTY STATE ─── */
.sl-empty {
  color: #94a3b8;
  font-size: 0.85rem;
  text-align: center;
  padding: 2rem 1rem;
  margin: 0;
}

/* ─── CARD ITEMS ─── */
.sl-item {
  border: 1px solid var(--card-border);
  border-radius: 8px;
  padding: 0.6rem 0.8rem;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  transition: box-shadow 0.15s;
  flex-shrink: 0;
}

.sl-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.sl-item--completing {
  border-left: 3px solid #16a34a;
}

.sl-item--reward {
  background: #f5f3ff;
  border-color: #c4b5fd;
}

.sl-item-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.sl-card-title {
  font-size: 0.88rem;
  font-weight: 600;
  color: #1e293b;
  flex: 1;
  min-width: 0;
}

.sl-price {
  font-size: 0.8rem;
  font-weight: 600;
  color: #16a34a;
  flex-shrink: 0;
}

.sl-reward-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: #6366f1;
  flex-shrink: 0;
  font-style: italic;
}

.sl-item-explanation {
  font-size: 0.75rem;
  color: #64748b;
  line-height: 1.45;
}

/* ─── EXCLUSION WARNING ─── */
.sl-exclusion {
  background: #fefce8;
  border-left: 3px solid #eab308;
  border-radius: 4px;
  padding: 0.6rem 0.75rem;
  flex-shrink: 0;
}

.sl-exclusion-text {
  font-size: 0.82rem;
  color: #713f12;
  line-height: 1.55;
  margin: 0;
}
</style>
