<template>
  <div class="shopping-list-panel">
    <!-- ─── HEADER ─── -->
    <div class="sl-header">
      <h3 class="sl-title">Shopping List</h3>
      <div class="sl-header-actions">
        <button
          v-if="shoppingItems.length > 0"
          class="sl-export-btn"
          @click="exportCsv"
          title="Export as CSV"
        >
          CSV
        </button>
        <button
          v-if="shoppingItems.length > 0"
          class="sl-export-btn"
          @click="exportHtml"
          title="Export full report as HTML"
        >
          HTML
        </button>
        <button class="sl-configure-btn" @click="$emit('configure')">
          Configure
        </button>
      </div>
    </div>

    <!-- ─── SUMMARY HEADER ─── -->
    <div v-if="eligibleMissions.length > 0" class="sl-summary">
      <p class="sl-summary-text">{{ summaryText }}</p>
    </div>

    <!-- ─── EXCLUSION WARNINGS ─── -->
    <div v-if="exclusionText" class="sl-exclusion">
      <p class="sl-exclusion-text">{{ exclusionText }}</p>
    </div>
    <div v-if="negativeValueExclusionText" class="sl-exclusion">
      <p class="sl-exclusion-text">{{ negativeValueExclusionText }}</p>
    </div>
    <div v-if="outOfBudgetText" class="sl-exclusion">
      <p class="sl-exclusion-text">{{ outOfBudgetText }}</p>
    </div>

    <!-- ─── EMPTY STATES ─── -->
    <p v-if="eligibleMissions.length === 0" class="sl-empty">
      No calculated missions found. Use the Calculate button on missions to get
      started.
    </p>
    <p
      v-else-if="buyItemCount === 0 && shoppingItems.length === 0"
      class="sl-empty"
    >
      No cards to buy — all missions are already completable with owned cards.
    </p>

    <!-- ─── CARD LIST ─── -->
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
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { UserMission } from "../models/UserMission";
import type { ShopCard } from "../models/ShopCard";
import type { ShoppingWizardConfig } from "../models/ShoppingWizardConfig";
import { emptyScopeIsAll } from "../models/ShoppingWizardConfig";
import {
  buildShoppingItems,
  buildSummaryText,
  buildScopeText,
  buildExclusionText,
  buildNegativeValueExclusionText,
  buildOutOfBudgetText,
  buildMissionPriority,
  selectMissionsForBudget,
  resolveScopedMissions,
  buildCsvContent,
  buildHtmlContent,
} from "../helpers/ShoppingListHelper";
import type { ShoppingItem } from "../helpers/ShoppingListHelper";

const props = defineProps<{
  missions: UserMission[];
  wizardConfig: ShoppingWizardConfig;
  packPrices: Map<string, number>;
  shopCardsById: Map<number, ShopCard>;
}>();

defineEmits<{
  (e: "configure"): void;
}>();

// ─── COMPUTED: Strategy and PP from wizard config ───
const strategy = computed(() => props.wizardConfig.strategy);

const availablePP = computed(() => props.wizardConfig.availablePP);

// ─── COMPUTED: In-scope incomplete missions ───
const inScopeIncomplete = computed(() => {
  const incomplete = props.missions.filter(
    (m) => !m.completed && m.progressText !== "Not Calculated",
  );
  const scope = props.wizardConfig.scope;
  if (emptyScopeIsAll(scope)) return incomplete;

  const scopedIds = new Set(
    resolveScopedMissions(props.missions, scope).map((m) => m.id),
  );
  return incomplete.filter((m) => scopedIds.has(m.id));
});

// ─── COMPUTED: Eligible missions (completability filter) ───
const eligibleMissions = computed(() => {
  if (props.wizardConfig.completableOnly) {
    return inScopeIncomplete.value.filter((m) => m.isCompletable);
  }
  return inScopeIncomplete.value;
});

// ─── COMPUTED: Missions excluded due to unpurchasable cards ───
const excludedMissions = computed(() =>
  inScopeIncomplete.value.filter(
    (m) => !m.isCompletable && m.rawMission.type !== "missions",
  ),
);

// ─── COMPUTED: Exclusion text ───
const exclusionText = computed(() =>
  props.wizardConfig.completableOnly
    ? buildExclusionText(excludedMissions.value)
    : "",
);

// ─── COMPUTED: Greedy mission selection ───
const missionSelection = computed(() => {
  const leafMissions = eligibleMissions.value.filter(
    (m) => m.rawMission.type !== "missions",
  );
  return selectMissionsForBudget(
    leafMissions,
    strategy.value,
    availablePP.value,
    props.missions,
  );
});

// ─── COMPUTED: Mission priority map ───
const missionPriority = computed(() =>
  buildMissionPriority(
    eligibleMissions.value,
    missionSelection.value.selectionOrder,
    strategy.value,
    missionSelection.value.selectedIds,
  ),
);

// ─── COMPUTED: Negative value exclusion text ───
const negativeValueExclusionText = computed(() => {
  if (strategy.value !== "value") return "";
  const excluded = missionSelection.value.negativeValueExcluded;
  const leafMissions = eligibleMissions.value.filter(
    (m) => m.rawMission.type !== "missions",
  );
  if (excluded.length > 0 && excluded.length === leafMissions.length) {
    return "No missions with positive net value found.";
  }
  return buildNegativeValueExclusionText(excluded);
});

// ─── COMPUTED: Out-of-budget missions ───
const outOfBudgetMissions = computed(() => {
  if (availablePP.value === null) return [];
  const leafMissions = eligibleMissions.value.filter(
    (m) => m.rawMission.type !== "missions",
  );
  const excluded = missionSelection.value.negativeValueExcluded;
  const selectedIds = missionSelection.value.selectedIds;
  return leafMissions.filter(
    (m) => !selectedIds.has(m.id) && !excluded.includes(m),
  );
});

const outOfBudgetText = computed(() =>
  buildOutOfBudgetText(outOfBudgetMissions.value),
);

// ─── COMPUTED: Shopping items ───
const shoppingItems = computed((): ShoppingItem[] =>
  buildShoppingItems(
    eligibleMissions.value,
    missionSelection.value.selectedIds,
    props.missions,
    props.shopCardsById,
    missionPriority.value,
  ),
);

// ─── COMPUTED: Non-reward item count (for empty state) ───
const buyItemCount = computed(
  () => shoppingItems.value.filter((i) => !i.isRewardItem).length,
);

// ─── COMPUTED: Summary text ───
const summaryText = computed(() =>
  buildSummaryText({
    strategy: strategy.value,
    availablePP: availablePP.value,
    scopeText: buildScopeText(
      props.wizardConfig.scope,
      props.missions,
      props.shopCardsById,
    ),
    eligibleMissions: eligibleMissions.value,
    allMissions: props.missions,
    shoppingItems: shoppingItems.value,
    packPrices: props.packPrices,
    shopCardsById: props.shopCardsById,
  }),
);

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
    summaryText: summaryText.value,
    exclusionText: exclusionText.value,
    negativeValueExclusionText: negativeValueExclusionText.value,
    outOfBudgetText: outOfBudgetText.value,
  });
  downloadFile("ootp-shopping-list.html", html, "text/html;charset=utf-8;");
}
</script>

<style scoped>
.shopping-list-panel {
  height: 100%;
  overflow-y: auto;
  background: var(--detail-bg);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* ─── HEADER ─── */
.sl-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--card-border);
  flex-shrink: 0;
  gap: 0.5rem;
}

.sl-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary, #1e293b);
}

.sl-header-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
}

.sl-export-btn {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 5px;
  border: 1px solid var(--card-border);
  background: var(--detail-bg);
  color: #64748b;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.sl-export-btn:hover {
  background: #6366f1;
  border-color: #6366f1;
  color: #fff;
}

.sl-configure-btn {
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

.sl-configure-btn:hover {
  background: #6366f1;
  color: #fff;
}

/* ─── SUMMARY ─── */
.sl-summary {
  background: #eff6ff;
  border-left: 3px solid #6366f1;
  border-radius: 4px;
  padding: 0.6rem 0.75rem;
  flex-shrink: 0;
}

.sl-summary-text {
  font-size: 0.82rem;
  color: #1e293b;
  line-height: 1.55;
  margin: 0;
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
