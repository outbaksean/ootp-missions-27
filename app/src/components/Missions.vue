<template>
  <div class="missions-layout">
    <!-- ─── SIDEBAR ─── -->
    <aside
      class="sidebar"
      :class="{ 'sidebar--collapsed': isSidebarCollapsed }"
    >
      <CardUploader />

      <div class="sidebar-section">
        <MissionSearch v-model="searchQuery" />
      </div>

      <div class="sidebar-section">
        <label class="sidebar-label" for="category-dropdown">Category</label>
        <select
          id="category-dropdown"
          v-model="selectedCategoryFilter"
          class="sidebar-select"
        >
          <option value="">All Categories</option>
          <option
            v-for="category in missionCategories"
            :key="category"
            :value="category"
          >
            {{ category }}
          </option>
        </select>
      </div>

      <div class="sidebar-section">
        <label class="sidebar-label" for="group-by-select">Group by</label>
        <select id="group-by-select" v-model="groupBy" class="sidebar-select">
          <option value="none">None</option>
          <option value="chain">Chain</option>
          <option value="category">Category</option>
        </select>
      </div>

      <div class="sidebar-section">
        <label class="sidebar-label" for="target-mission-dropdown"
          >Target Mission</label
        >
        <select
          id="target-mission-dropdown"
          v-model="selectedMissionFilter"
          class="sidebar-select"
        >
          <option value="">All Missions</option>
          <option
            v-for="mission in missionsOfTypeMissions"
            :key="mission.id"
            :value="mission.id"
          >
            {{ mission.rawMission.name }}
          </option>
        </select>
      </div>

      <div class="sidebar-section">
        <label class="sidebar-label" for="sort-by-select">Sort by</label>
        <select id="sort-by-select" v-model="sortBy" class="sidebar-select">
          <option value="default">Default</option>
          <option value="price">Remaining Price</option>
          <option value="value">Mission Value</option>
          <option value="name">Name</option>
        </select>
      </div>

      <div class="sidebar-divider" />

      <div class="sidebar-section sidebar-toggles">
        <label class="toggle-label">
          <input
            type="checkbox"
            class="toggle-input"
            v-model="useSellPrice"
            @change="updatePriceType"
          />
          Use Sell Price
        </label>
        <label class="toggle-label">
          <input type="checkbox" class="toggle-input" v-model="hideCompleted" />
          Hide Completed
        </label>
        <label class="toggle-label">
          <input
            type="checkbox"
            class="toggle-input"
            v-model="showPositiveOnly"
          />
          Positive Value Only
        </label>
        <label
          class="toggle-label"
          title="Subtracts the sell value of owned cards you'd need to lock from the mission's net value"
        >
          <input
            type="checkbox"
            class="toggle-input"
            :checked="settingsStore.subtractUnlockedCards"
            @change="handleIncludeUnlockedChange($event)"
          />
          Include unlocked cards in net value
        </label>
        <label
          class="toggle-label"
          title="Compares owned card opportunity cost vs buying cheaper unowned cards to find the minimum-cost assignment"
        >
          <input
            type="checkbox"
            class="toggle-input"
            :checked="settingsStore.optimizeCardSelection"
            @change="handleOptimizeChange($event)"
          />
          Optimize card assignment
        </label>
        <div class="discount-row">
          <span class="discount-label">Sell - Buy difference</span>
          <div class="discount-input-wrap">
            <input
              id="sell-discount-input"
              type="number"
              class="discount-input"
              min="0"
              max="100"
              :value="Math.round(settingsStore.unlockedCardDiscount * 100)"
              @change="handleDiscountChange($event)"
            />
            <span class="discount-pct">%</span>
          </div>
        </div>
      </div>

      <div class="sidebar-divider" />

      <div class="sidebar-section">
        <button class="btn-mark-all-complete" @click="markAllComplete">
          Set All Complete
        </button>
        <span class="calc-hint">Marks missions with enough owned cards</span>
        <button
          class="btn-unmark-all-complete"
          @click="missionStore.clearAllManualCompletions()"
        >
          Unset All Complete
        </button>
      </div>

      <PackPriceSettings />

      <div class="sidebar-spacer" />

      <div v-if="missionStore.missionsVersion" class="sidebar-version">
        Mission data: {{ missionStore.missionsVersion }}
      </div>
    </aside>

    <!-- ─── SIDEBAR BACKDROP (mobile) ─── -->
    <div
      v-if="isMobile && !isSidebarCollapsed"
      class="sidebar-backdrop"
      @click="toggleSidebar"
    />

    <!-- ─── SIDEBAR TOGGLE ─── -->
    <button
      class="sidebar-toggle"
      :class="{ 'sidebar-toggle--collapsed': isSidebarCollapsed }"
      @click="toggleSidebar"
      aria-label="Toggle sidebar"
    />

    <!-- ─── MAIN AREA ─── -->
    <div class="main-area">
      <section
        class="list-panel"
        :style="
          selectedMission && !isMobile
            ? { width: listPanelWidth + 'px', flex: 'none' }
            : {}
        "
      >
        <div v-if="isLoading" class="spinner-container">
          <div class="spinner"></div>
        </div>
        <template v-else>
          <div v-if="!hasUserCards" class="upload-prompt">
            <div class="upload-prompt-header">
              <p class="upload-prompt-title">User data not imported</p>
              <button
                class="upload-prompt-toggle"
                @click="helpExpanded = !helpExpanded"
              >
                {{ helpExpanded ? "Hide instructions" : "Show instructions" }}
              </button>
            </div>
            <template v-if="helpExpanded">
              <p class="upload-prompt-body">
                To get the latest price and ownership data, from the card shop,
                with no filters on, click Export Card List to CSV and upload it
                using the sidebar.
              </p>
              <img
                src="/OotpExportShopCards.jpg"
                alt="Shop Cards Export Help"
                class="upload-prompt-img"
              />
              <p class="upload-prompt-body">
                To export your locked card data, add "PT Card ID" and "PT Lock"
                to a view and with no filters click Report, Write report to csv.
                This is only for displaying locked cards — owned cards come from
                the shop csv.
              </p>
              <p class="upload-prompt-note">
                Note: If you have more than 8190 cards, exports will be
                paginated making it impossible to export your full card
                inventory. Quicksell duplicates to get under the limit if you
                want locked status displayed.
              </p>
              <img
                src="/OotpUserCardView.jpg"
                alt="User Card View Help"
                class="upload-prompt-img"
              />
              <img
                src="/OotpExportUserCards.jpg"
                alt="User Cards Export Help"
                class="upload-prompt-img"
              />
            </template>
          </div>
          <MissionList
            :groups="groupedMissions"
            :isMissionComplete="isMissionComplete"
            :remainingPriceText="remainingPriceText"
            :selectMission="selectMission"
            :selectedMission="selectedMission"
            @calculateMission="missionStore.calculateMissionDetails"
            @calculateGroup="missionStore.calculateAllNotCalculatedMissions"
          />
        </template>
      </section>

      <!-- ─── RESIZE HANDLE ─── -->
      <div
        v-if="selectedMission"
        class="resize-handle"
        @mousedown="startResize"
      />

      <!-- ─── DETAIL PANEL ─── -->
      <aside v-if="selectedMission" class="detail-panel">
        <div class="detail-header">
          <button
            class="close-btn"
            @click="selectedMission = null"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <MissionDetails
          :selectedMission="selectedMission"
          :missions="missions"
          @selectMission="selectMission"
        />
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useMissionStore } from "../stores/useMissionStore";
import { useCardStore } from "../stores/useCardStore";
import CardUploader from "./CardUploader.vue";
import MissionDetails from "./MissionDetails.vue";
import MissionList from "./MissionList.vue";
import MissionSearch from "./MissionSearch.vue";
import PackPriceSettings from "./PackPriceSettings.vue";
import { useSettingsStore } from "../stores/useSettingsStore";
import type { UserMission } from "../models/UserMission";

defineOptions({ name: "MissionsView" });

const missionStore = useMissionStore();
const cardStore = useCardStore();

const SIDEBAR_COLLAPSED_KEY = "ootp-sidebar-collapsed";
const isSidebarCollapsed = ref(
  localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true",
);

function toggleSidebar() {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
  localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isSidebarCollapsed.value));
}

const isMobile = ref(window.innerWidth < 768);

function onWindowResize() {
  const wasDesktop = !isMobile.value;
  isMobile.value = window.innerWidth < 768;
  // When crossing into mobile, collapse the sidebar so the list is immediately
  // usable and the toggle shows the "open" affordance rather than "close".
  if (isMobile.value && wasDesktop && !isSidebarCollapsed.value) {
    isSidebarCollapsed.value = true;
  }
}

onMounted(() => {
  window.addEventListener("resize", onWindowResize);
  // On mobile, default to sidebar collapsed if the user has never set a preference
  if (isMobile.value && localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === null) {
    isSidebarCollapsed.value = true;
  }
});

const LIST_PANEL_WIDTH_KEY = "ootp-list-panel-width";
const listPanelWidth = ref<number>(
  parseInt(localStorage.getItem(LIST_PANEL_WIDTH_KEY) ?? "", 10) || 500,
);

let resizeStartX = 0;
let resizeStartWidth = 0;

function startResize(e: MouseEvent) {
  resizeStartX = e.clientX;
  resizeStartWidth = listPanelWidth.value;
  document.addEventListener("mousemove", onResizeMove);
  document.addEventListener("mouseup", stopResize);
  e.preventDefault();
}

function onResizeMove(e: MouseEvent) {
  listPanelWidth.value = Math.max(
    200,
    resizeStartWidth + (e.clientX - resizeStartX),
  );
}

function stopResize() {
  document.removeEventListener("mousemove", onResizeMove);
  document.removeEventListener("mouseup", stopResize);
  localStorage.setItem(LIST_PANEL_WIDTH_KEY, String(listPanelWidth.value));
}

onUnmounted(() => {
  document.removeEventListener("mousemove", onResizeMove);
  document.removeEventListener("mouseup", stopResize);
  window.removeEventListener("resize", onWindowResize);
});
const settingsStore = useSettingsStore();
const hasUserCards = computed(
  () => cardStore.hasShopCards && !cardStore.isDefaultData,
);
const helpExpanded = ref(false);
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

const missions = computed(() => missionStore.userMissions);
const missionsOfTypeMissions = computed(() =>
  missionStore.userMissions.filter((m) => m.rawMission.type === "missions"),
);

function loadPref<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const selectedMission = ref<UserMission | null>(null);
const useSellPrice = ref(missionStore.selectedPriceType.sellPrice);
const searchQuery = ref("");
const selectedMissionFilter = ref<number | "">();
const hideCompleted = ref(loadPref("ootp-display-hideCompleted", false));
const selectedCategoryFilter = ref<string | null>(
  loadPref("ootp-display-categoryFilter", null),
);
const groupBy = ref<"none" | "chain" | "category">(
  loadPref("ootp-display-groupBy", "category"),
);
const sortBy = ref<"default" | "price" | "value" | "name">(
  loadPref("ootp-display-sortBy", "default"),
);
const showPositiveOnly = ref(loadPref("ootp-display-showPositiveOnly", false));

watch(hideCompleted, (v) =>
  localStorage.setItem("ootp-display-hideCompleted", JSON.stringify(v)),
);
watch(selectedCategoryFilter, (v) =>
  localStorage.setItem("ootp-display-categoryFilter", JSON.stringify(v)),
);
watch(groupBy, (v) =>
  localStorage.setItem("ootp-display-groupBy", JSON.stringify(v)),
);
watch(sortBy, (v) =>
  localStorage.setItem("ootp-display-sortBy", JSON.stringify(v)),
);
watch(showPositiveOnly, (v) =>
  localStorage.setItem("ootp-display-showPositiveOnly", JSON.stringify(v)),
);

const isLoading = computed(() => missionStore.loading);

const handleIncludeUnlockedChange = (event: Event) => {
  settingsStore.setSubtractUnlockedCards(
    (event.target as HTMLInputElement).checked,
  );
  missionStore.recomputeMissionValues();
};

const handleOptimizeChange = (event: Event) => {
  settingsStore.setOptimizeCardSelection(
    (event.target as HTMLInputElement).checked,
  );
  missionStore.buildUserMissions();
};

const handleDiscountChange = (event: Event) => {
  const raw = (event.target as HTMLInputElement).value;
  const pct = parseInt(raw, 10);
  const val = isNaN(pct) ? 0.1 : Math.min(100, Math.max(0, pct)) / 100;
  settingsStore.setUnlockedCardDiscount(val);
  missionStore.buildUserMissions();
};

const updatePriceType = () => {
  missionStore.setUseSellPrice(useSellPrice.value);
  missionStore.buildUserMissions();
};

const filteredMissions = computed(() => {
  let result = missions.value;

  if (selectedMissionFilter.value) {
    const filteredMission = missions.value.find(
      (m) => m.id === selectedMissionFilter.value,
    );
    if (filteredMission) {
      const missionById = new Map(missions.value.map((m) => [m.id, m]));
      const descendantIds = collectDescendantIds(
        filteredMission.id,
        missionById,
      );
      result = missions.value.filter(
        (m) => m.id === filteredMission.id || descendantIds.has(m.id),
      );
    } else {
      result = [];
    }
  }

  if (hideCompleted.value) {
    result = result.filter((m) => !m.completed);
  }

  if (selectedCategoryFilter.value) {
    result = result.filter(
      (m) => m.rawMission.category === selectedCategoryFilter.value,
    );
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    result = result.filter(
      (m) =>
        m.rawMission.name.toLowerCase().includes(q) ||
        m.rawMission.category.toLowerCase().includes(q),
    );
  }

  if (showPositiveOnly.value) {
    result = result.filter(
      (m) => m.missionValue !== undefined && m.missionValue > 0,
    );
  }

  if (sortBy.value === "price") {
    result = [...result].sort((a, b) => a.remainingPrice - b.remainingPrice);
  } else if (sortBy.value === "value") {
    result = [...result].sort((a, b) => {
      if (a.missionValue === undefined && b.missionValue === undefined)
        return 0;
      if (a.missionValue === undefined) return 1;
      if (b.missionValue === undefined) return -1;
      return b.missionValue - a.missionValue;
    });
  } else if (sortBy.value === "name") {
    result = [...result].sort((a, b) =>
      a.rawMission.name.localeCompare(b.rawMission.name),
    );
  }

  return result;
});

const groupedMissions = computed(
  (): Array<{ label: string; missions: UserMission[] }> => {
    if (groupBy.value === "none") {
      return [{ label: "", missions: filteredMissions.value }];
    }

    if (groupBy.value === "category") {
      const groups = new Map<string, UserMission[]>();
      for (const m of filteredMissions.value) {
        const label = m.rawMission.category || "Other";
        if (!groups.has(label)) groups.set(label, []);
        groups.get(label)!.push(m);
      }
      return Array.from(groups.entries()).map(([label, missions]) => ({
        label,
        missions,
      }));
    }

    if (groupBy.value === "chain") {
      const missionById = new Map(
        missionStore.userMissions.map((m) => [m.id, m]),
      );

      // Collect all IDs that are sub-missions of any missions-type mission
      const allSubIds = new Set<number>();
      for (const m of missionStore.userMissions) {
        if (m.rawMission.type === "missions" && m.rawMission.missionIds) {
          m.rawMission.missionIds.forEach((id) => allSubIds.add(id));
        }
      }
      // Chain roots: missions-type missions that are not themselves a sub-mission
      const chainRoots = filteredMissions.value.filter(
        (m) => m.rawMission.type === "missions" && !allSubIds.has(m.id),
      );
      const groups: Array<{ label: string; missions: UserMission[] }> = [];
      const assignedIds = new Set<number>();
      for (const root of chainRoots) {
        const subIds = collectDescendantIds(root.id, missionById);
        const members = filteredMissions.value.filter(
          (m) => m.id === root.id || subIds.has(m.id),
        );
        members.forEach((m) => assignedIds.add(m.id));
        groups.push({ label: root.rawMission.name, missions: members });
      }
      // Standalone: anything not in a chain
      const standalone = filteredMissions.value.filter(
        (m) => !assignedIds.has(m.id),
      );
      if (standalone.length > 0) {
        groups.push({ label: "Standalone", missions: standalone });
      }
      return groups;
    }

    return [{ label: "", missions: filteredMissions.value }];
  },
);

function markAllComplete() {
  for (const mission of filteredMissions.value) {
    if (!mission.completed && missionStore.missionCanMarkComplete(mission)) {
      missionStore.toggleMissionComplete(mission.id);
    }
  }
}

const remainingPriceText = (mission: UserMission) => {
  if (mission.completed) return "";
  if (mission.remainingPrice <= 0) return "";
  return `${mission.remainingPrice.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })} PP`;
};

const isMissionComplete = (mission: UserMission) => mission.completed;

const selectMission = (mission: UserMission) => {
  selectedMission.value = mission;
};

const missionCategories = computed(() => {
  const categories = new Set<string>();
  missions.value.forEach((m) => {
    if (m.rawMission.category) categories.add(m.rawMission.category);
  });
  return Array.from(categories);
});

watch(
  () => missionStore.userMissions,
  (newMissions) => {
    if (!selectedMission.value) return;
    // Keep the panel open after a rebuild (e.g. lock toggle) by updating the reference.
    // If the mission no longer exists (e.g. after a full reload), close the panel.
    selectedMission.value =
      newMissions.find((m) => m.id === selectedMission.value!.id) ?? null;
  },
);
</script>

<style scoped>
.missions-layout {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* ─── SIDEBAR ─── */
.sidebar {
  width: 230px;
  flex-shrink: 0;
  background: var(--sidebar-bg);
  color: var(--sidebar-text);
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  transition: width 0.2s ease;
}

.sidebar--collapsed {
  width: 0;
  overflow: hidden;
}

/* ─── SIDEBAR TOGGLE ─── */
.sidebar-toggle {
  width: 14px;
  flex-shrink: 0;
  background: var(--sidebar-bg);
  border: none;
  border-right: 1px solid var(--sidebar-border);
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.sidebar-toggle:hover {
  background: color-mix(in srgb, var(--sidebar-bg) 80%, white);
}

.sidebar-toggle::before {
  content: "";
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-right: 5px solid #64748b;
  transition: transform 0.2s ease;
}

.sidebar-toggle--collapsed::before {
  transform: rotate(180deg);
}

.sidebar-section {
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.sidebar-divider {
  border-top: 1px solid var(--sidebar-border);
  margin: 0;
}

.sidebar-label {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--sidebar-muted);
  font-weight: 600;
}

.sidebar-select {
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  color: var(--sidebar-text);
  padding: 6px 8px;
  font-size: 0.8rem;
  width: 100%;
  cursor: pointer;
}

.sidebar-select option {
  background: #1e293b;
  color: #e2e8f0;
}

.sidebar-toggles {
  gap: 0.6rem;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.83rem;
  cursor: pointer;
}

.toggle-input {
  accent-color: var(--accent);
  width: 14px;
  height: 14px;
  cursor: pointer;
}

.btn-mark-all-complete {
  background: transparent;
  color: #86efac;
  border: 1px solid #4ade80;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 0.83rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
  width: 100%;
}

.btn-mark-all-complete:hover {
  background: #166534;
  color: #dcfce7;
}

.btn-unmark-all-complete {
  background: transparent;
  color: #fca5a5;
  border: 1px solid #f87171;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 0.83rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
  width: 100%;
}

.btn-unmark-all-complete:hover {
  background: #7f1d1d;
  color: #fee2e2;
}

.sidebar-spacer {
  flex: 1;
}

.sidebar-version {
  padding: 0.5rem 1rem;
  font-size: 0.65rem;
  color: var(--sidebar-muted);
  border-top: 1px solid var(--sidebar-border);
}

/* ─── MAIN AREA ─── */
.main-area {
  flex: 1;
  display: flex;
  min-width: 0;
  overflow: hidden;
}

.list-panel {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  background: #f1f5f9;
  min-width: 0;
}

.upload-prompt {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.upload-prompt-header {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
}

.upload-prompt-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
}

.upload-prompt-toggle {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.82rem;
  font-weight: 500;
  color: #1e293b;
  cursor: pointer;
  padding: 4px 12px;
  flex-shrink: 0;
  transition: background 0.15s;
}

.upload-prompt-toggle:hover {
  background: #e2e8f0;
}

.upload-prompt-body {
  font-size: 0.85rem;
  color: #64748b;
  line-height: 1.5;
}

.upload-prompt-note {
  font-size: 0.82rem;
  color: #94a3b8;
  line-height: 1.5;
}

.upload-prompt-img {
  max-width: 100%;
  width: auto;
  align-self: flex-start;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
}

/* ─── RESIZE HANDLE ─── */
.resize-handle {
  width: 4px;
  flex-shrink: 0;
  cursor: col-resize;
  background: var(--card-border);
  transition: background 0.15s;
  user-select: none;
}

.resize-handle:hover {
  background: #94a3b8;
}

/* ─── DETAIL PANEL ─── */
.detail-panel {
  flex: 1;
  min-width: 280px;
  overflow-y: auto;
  background: var(--detail-bg);
  border-left: 1px solid var(--card-border);
}

.detail-header {
  display: flex;
  justify-content: flex-end;
  padding: 0.4rem 0.5rem;
  border-bottom: 1px solid var(--card-border);
  position: sticky;
  top: 0;
  background: var(--detail-bg);
  z-index: 1;
}

.close-btn {
  background: none;
  border: none;
  font-size: 0.9rem;
  color: #94a3b8;
  cursor: pointer;
  padding: 3px 7px;
  border-radius: 4px;
  line-height: 1;
  transition:
    background 0.15s,
    color 0.15s;
}

.close-btn:hover {
  background: #e2e8f0;
  color: #1e293b;
}

/* ─── SPINNER ─── */
.spinner-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.spinner {
  border: 4px solid #e2e8f0;
  border-top: 4px solid var(--accent);
  border-radius: 50%;
  width: 36px;
  height: 36px;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* ─── SELL DISCOUNT ─── */
.discount-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.1rem;
}

.discount-label {
  font-size: 0.83rem;
  color: var(--sidebar-text);
}

.discount-input-wrap {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}

.discount-input {
  width: 44px;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  color: var(--sidebar-text);
  padding: 3px 5px;
  font-size: 0.8rem;
  text-align: right;
}

.discount-input:focus {
  outline: none;
  border-color: var(--accent);
}

.discount-input::-webkit-outer-spin-button,
.discount-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.discount-input[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}

.discount-pct {
  font-size: 0.8rem;
  color: var(--sidebar-muted);
}

/* ─── MOBILE ─── */
@media (max-width: 767px) {
  /* Needed so absolute children are scoped to this area, not the viewport */
  .missions-layout {
    position: relative;
  }

  /* Sidebar becomes a slide-in overlay drawer */
  .sidebar {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: min(300px, 82vw);
    z-index: 200;
    transform: translateX(0);
    transition: transform 0.25s ease;
    /* Offset content so it doesn't hide behind the toggle strip */
    padding-left: 36px;
  }

  /* On mobile, slide off-screen rather than collapsing width to 0 */
  .sidebar--collapsed {
    width: min(300px, 82vw);
    overflow: hidden;
    transform: translateX(-100%);
  }

  /* Dimming overlay behind open sidebar */
  .sidebar-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    z-index: 149;
  }

  /* Toggle stays in flow as the leftmost flex item; give it a tappable width
     and stack it above the backdrop so it remains reachable */
  .sidebar-toggle {
    position: relative;
    z-index: 201;
    width: 36px;
  }

  /* Detail panel: full-screen overlay so the list panel stays untouched.
     z-index above sidebar-toggle (201) so it covers the full width. */
  .detail-panel {
    position: absolute;
    inset: 0;
    z-index: 210;
    min-width: 0;
    border-left: none;
  }

  /* Resize handle is mouse-only */
  .resize-handle {
    display: none;
  }
}
</style>
