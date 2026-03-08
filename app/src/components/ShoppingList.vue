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
        <button
          class="sl-collapse-btn"
          @click="isInputCollapsed = !isInputCollapsed"
          :aria-expanded="!isInputCollapsed"
        >
          Settings {{ isInputCollapsed ? "▼" : "▲" }}
        </button>
      </div>
    </div>

    <!-- ─── SETTINGS (collapsible) ─── -->
    <div v-if="!isInputCollapsed" class="sl-settings">
      <!-- Strategy -->
      <div class="sl-setting-row">
        <span class="sl-setting-label">Strategy</span>
        <div class="sl-radio-group">
          <label class="sl-radio-label">
            <input type="radio" v-model="strategy" value="value" />
            Mission Value
          </label>
          <label class="sl-radio-label">
            <input type="radio" v-model="strategy" value="completion" />
            Mission Completion
          </label>
        </div>
      </div>

      <!-- Available PP -->
      <div class="sl-setting-row">
        <span class="sl-setting-label">Available PP</span>
        <div class="sl-radio-group">
          <label class="sl-radio-label">
            <input type="radio" v-model="ppMode" value="unlimited" />
            Unlimited
          </label>
          <label class="sl-radio-label">
            <input type="radio" v-model="ppMode" value="custom" />
            Custom
          </label>
          <input
            v-if="ppMode === 'custom'"
            type="number"
            class="sl-pp-input"
            v-model.number="ppInput"
            placeholder="e.g. 200000"
            min="0"
          />
        </div>
      </div>

      <!-- Included Missions -->
      <div class="sl-setting-row sl-setting-row--missions">
        <span class="sl-setting-label">Included Missions</span>
        <div class="sl-missions-section">
          <span v-if="includedMissions.length === 0" class="sl-missions-all">
            All (use "Include" on missions to narrow scope)
          </span>
          <div v-else class="sl-missions-tags">
            <span
              v-for="mission in includedMissions"
              :key="mission.id"
              class="sl-mission-tag"
            >
              {{ mission.rawMission.name }}
              <button
                class="sl-tag-remove"
                @click="$emit('removeMission', mission.id)"
                title="Remove"
              >
                ×
              </button>
            </span>
            <button class="sl-clear-btn" @click="$emit('clearMissions')">
              Clear All
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── SUMMARY HEADER ─── -->
    <div v-if="eligibleMissions.length > 0" class="sl-summary">
      <p class="sl-summary-text">{{ summaryText }}</p>
    </div>

    <!-- ─── EXCLUSION WARNING ─── -->
    <div v-if="exclusionText" class="sl-exclusion">
      <p class="sl-exclusion-text">{{ exclusionText }}</p>
    </div>

    <!-- ─── NEGATIVE VALUE EXCLUSION WARNING ─── -->
    <div v-if="negativeValueExclusionText" class="sl-exclusion">
      <p class="sl-exclusion-text">{{ negativeValueExclusionText }}</p>
    </div>

    <!-- ─── OUT OF BUDGET WARNING ─── -->
    <div v-if="outOfBudgetText" class="sl-exclusion">
      <p class="sl-exclusion-text">{{ outOfBudgetText }}</p>
    </div>

    <!-- ─── EMPTY STATES ─── -->
    <p v-if="eligibleMissions.length === 0" class="sl-empty">
      No calculated missions found. Use the Calculate button on missions to get
      started.
    </p>
    <p v-else-if="shoppingItems.length === 0" class="sl-empty">
      No cards to buy — all missions are already completable with owned cards.
    </p>

    <!-- ─── CARD LIST ─── -->
    <div
      v-for="item in shoppingItems"
      :key="item.cardId"
      class="sl-item"
      :class="{ 'sl-item--completing': item.completingMissions.length > 0 }"
    >
      <div class="sl-item-main">
        <span class="sl-card-title">{{ item.title }}</span>
        <span class="sl-price">{{ item.price.toLocaleString() }} PP</span>
      </div>
      <div class="sl-item-explanation">{{ item.explanation }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { UserMission } from "../models/UserMission";
import type { ShopCard } from "../models/ShopCard";
import {
  buildShoppingItems,
  buildSummaryText,
  buildExclusionText,
  buildNegativeValueExclusionText,
  buildOutOfBudgetText,
  buildMissionPriority,
  selectMissionsForBudget,
} from "../helpers/ShoppingListHelper";
import type { ShoppingItem } from "../helpers/ShoppingListHelper";

const props = defineProps<{
  missions: UserMission[];
  includedMissionIds: Set<number>;
  packPrices: Map<string, number>;
  shopCardsById: Map<number, ShopCard>;
}>();

defineEmits<{
  (e: "removeMission", id: number): void;
  (e: "clearMissions"): void;
}>();

// ─── STATE ───
const strategy = ref<"value" | "completion">("value");
const ppMode = ref<"unlimited" | "custom">("unlimited");
const ppInput = ref<number | null>(null);
const isInputCollapsed = ref(false);

// ─── HELPERS ───
function collectDescendantIds(
  rootId: number,
  missionById: Map<number, UserMission>,
): Set<number> {
  const result = new Set<number>();
  const queue = [rootId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const subId of missionById.get(id)?.rawMission.missionIds ?? []) {
      if (!result.has(subId)) {
        result.add(subId);
        queue.push(subId);
      }
    }
  }
  return result;
}

// ─── COMPUTED: Available PP ───
const availablePP = computed((): number | null => {
  if (ppMode.value === "unlimited") return null;
  const val = ppInput.value;
  return val !== null && !isNaN(val) && val > 0 ? val : null;
});

// ─── COMPUTED: Missions explicitly added ───
const includedMissions = computed(() =>
  props.missions.filter((m) => props.includedMissionIds.has(m.id)),
);

// ─── COMPUTED: In-scope incomplete missions (before completability filter) ───
const inScopeIncomplete = computed(() => {
  const incomplete = props.missions.filter(
    (m) => !m.completed && m.progressText !== "Not Calculated",
  );

  if (props.includedMissionIds.size === 0) return incomplete;

  const missionById = new Map(props.missions.map((m) => [m.id, m]));
  const expandedIds = new Set<number>();
  for (const id of props.includedMissionIds) {
    expandedIds.add(id);
    collectDescendantIds(id, missionById).forEach((did) =>
      expandedIds.add(did),
    );
  }
  return incomplete.filter((m) => expandedIds.has(m.id));
});

// ─── COMPUTED: Eligible missions for shopping list ───
// Only completable missions enter the shopping list. Non-completable missions
// (those requiring cards with no market price) are tracked separately.
const eligibleMissions = computed(() =>
  inScopeIncomplete.value.filter((m) => m.isCompletable),
);

// ─── COMPUTED: Missions excluded due to unpurchasable cards ───
// Leaf missions only — chain exclusions are implied by their sub-missions.
const excludedMissions = computed(() =>
  inScopeIncomplete.value.filter(
    (m) => !m.isCompletable && m.rawMission.type !== "missions",
  ),
);

// ─── COMPUTED: Exclusion warning text ───
const exclusionText = computed(() =>
  buildExclusionText(excludedMissions.value),
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

// ─── COMPUTED: Mission priority map for Phase 4 card ordering ───
const missionPriority = computed(() =>
  buildMissionPriority(
    eligibleMissions.value,
    missionSelection.value.selectionOrder,
    strategy.value,
    missionSelection.value.selectedIds,
  ),
);

// ─── COMPUTED: Negative value exclusion warning text ───
const negativeValueExclusionText = computed(() => {
  // Only show for value strategy
  if (strategy.value !== "value") return "";

  const excluded = missionSelection.value.negativeValueExcluded;

  // Special case: all eligible missions excluded for negative value
  const leafMissions = eligibleMissions.value.filter(
    (m) => m.rawMission.type !== "missions",
  );
  if (excluded.length > 0 && excluded.length === leafMissions.length) {
    return "No missions with positive net value found.";
  }

  return buildNegativeValueExclusionText(excluded);
});

// ─── COMPUTED: Missions excluded due to insufficient budget ───
const outOfBudgetMissions = computed(() => {
  // Only applicable when budget is limited
  if (availablePP.value === null) return [];

  const leafMissions = eligibleMissions.value.filter(
    (m) => m.rawMission.type !== "missions",
  );
  const excluded = missionSelection.value.negativeValueExcluded;
  const selectedIds = missionSelection.value.selectedIds;

  // Out-of-budget = leaf missions that are eligible, not selected, and not negatively excluded
  return leafMissions.filter(
    (m) => !selectedIds.has(m.id) && !excluded.includes(m),
  );
});

// ─── COMPUTED: Out-of-budget exclusion warning text ───
const outOfBudgetText = computed(() =>
  buildOutOfBudgetText(outOfBudgetMissions.value),
);

// ─── COMPUTED: Shopping items (final card list) ───
const shoppingItems = computed((): ShoppingItem[] =>
  buildShoppingItems(
    eligibleMissions.value,
    missionSelection.value.selectedIds,
    props.missions,
    props.shopCardsById,
    missionPriority.value,
  ),
);

// ─── COMPUTED: Summary header text ───
const summaryText = computed(() =>
  buildSummaryText({
    strategy: strategy.value,
    availablePP: availablePP.value,
    includedMissionIds: props.includedMissionIds,
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
  const rows = [["Card Title", "Cost (PP)", "Explanation"]];
  for (const item of shoppingItems.value) {
    rows.push([item.title, item.price.toString(), item.explanation]);
  }
  const csv = rows
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n");
  downloadFile("ootp-shopping-list.csv", csv, "text/csv;charset=utf-8;");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function exportHtml() {
  const rows = shoppingItems.value
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.title)}</td>
        <td class="price">${item.price.toLocaleString()}</td>
        <td>${escapeHtml(item.explanation)}</td>
      </tr>`,
    )
    .join("");

  // Build exclusion sections if any exist
  const exclusionsSections: string[] = [];
  if (exclusionText.value) {
    exclusionsSections.push(
      `<div class="exclusion">${escapeHtml(exclusionText.value)}</div>`,
    );
  }
  if (negativeValueExclusionText.value) {
    exclusionsSections.push(
      `<div class="exclusion">${escapeHtml(negativeValueExclusionText.value)}</div>`,
    );
  }
  if (outOfBudgetText.value) {
    exclusionsSections.push(
      `<div class="exclusion">${escapeHtml(outOfBudgetText.value)}</div>`,
    );
  }
  const exclusionsHtml = exclusionsSections.join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>OOTP Shopping List</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 960px; margin: 0 auto; padding: 2rem; color: #1e293b; }
    h1 { font-size: 1.4rem; margin-bottom: 0.5rem; }
    .summary { background: #f1f5f9; border-left: 4px solid #6366f1; border-radius: 4px; padding: 0.75rem 1rem; margin-bottom: 1.5rem; font-size: 0.9rem; line-height: 1.6; }
    .exclusion { background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; padding: 0.75rem 1rem; margin-bottom: 1rem; font-size: 0.9rem; line-height: 1.6; color: #92400e; }
    table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    th { background: #1e293b; color: #f8fafc; padding: 10px 14px; text-align: left; font-weight: 600; }
    td { padding: 9px 14px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    tr:hover td { background: #f8fafc; }
    .price { font-weight: 600; color: #16a34a; white-space: nowrap; }
    .explanation { color: #475569; }
  </style>
</head>
<body>
  <h1>OOTP Shopping List</h1>
  <div class="summary">${escapeHtml(summaryText.value)}</div>
  ${exclusionsHtml}
  <table>
    <thead><tr><th>Card</th><th>Cost (PP)</th><th>Explanation</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;

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

.sl-collapse-btn {
  font-size: 0.72rem;
  font-weight: 500;
  padding: 3px 9px;
  border-radius: 5px;
  border: 1px solid var(--card-border);
  background: var(--detail-bg);
  color: #64748b;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background 0.15s,
    color 0.15s;
}

.sl-collapse-btn:hover {
  background: #f1f5f9;
  color: #1e293b;
}

/* ─── SETTINGS ─── */
.sl-settings {
  background: #f8fafc;
  border: 1px solid var(--card-border);
  border-radius: 8px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  flex-shrink: 0;
}

.sl-setting-row {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.sl-setting-row--missions {
  flex-direction: column;
  gap: 0.35rem;
}

.sl-setting-label {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
  white-space: nowrap;
  min-width: 90px;
  padding-top: 2px;
}

.sl-setting-row--missions .sl-setting-label {
  min-width: unset;
  padding-top: 0;
}

.sl-radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  align-items: center;
}

.sl-radio-label {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.82rem;
  color: #1e293b;
  cursor: pointer;
}

.sl-pp-input {
  width: 110px;
  padding: 3px 7px;
  border: 1px solid var(--card-border);
  border-radius: 5px;
  font-size: 0.82rem;
  background: #fff;
  color: #1e293b;
}

.sl-pp-input:focus {
  outline: none;
  border-color: #6366f1;
}

.sl-missions-section {
  width: 100%;
}

.sl-missions-all {
  font-size: 0.82rem;
  color: #64748b;
  font-style: italic;
}

.sl-missions-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  align-items: center;
}

.sl-mission-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  background: #e0e7ff;
  color: #3730a3;
  border-radius: 9999px;
  padding: 2px 8px 2px 10px;
}

.sl-tag-remove {
  background: none;
  border: none;
  color: #3730a3;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  opacity: 0.6;
}

.sl-tag-remove:hover {
  opacity: 1;
}

.sl-clear-btn {
  font-size: 0.72rem;
  padding: 2px 8px;
  border-radius: 5px;
  border: 1px solid #fca5a5;
  background: transparent;
  color: #dc2626;
  cursor: pointer;
  transition: background 0.15s;
}

.sl-clear-btn:hover {
  background: #fee2e2;
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
