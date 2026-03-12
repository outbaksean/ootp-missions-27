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
        <label class="sidebar-label">Mission Type</label>
        <div class="type-filter-group">
          <button
            class="type-filter-btn"
            :class="{
              'type-filter-btn--active': missionTypeFilter.has('count'),
            }"
            @click="toggleMissionTypeFilter('count')"
          >
            Cards
          </button>
          <button
            class="type-filter-btn"
            :class="{
              'type-filter-btn--active': missionTypeFilter.has('points'),
            }"
            @click="toggleMissionTypeFilter('points')"
          >
            Points
          </button>
          <button
            class="type-filter-btn"
            :class="{
              'type-filter-btn--active': missionTypeFilter.has('missions'),
            }"
            @click="toggleMissionTypeFilter('missions')"
          >
            Missions
          </button>
        </div>
      </div>

      <div class="sidebar-section">
        <label class="sidebar-label" for="group-by-select">Group by</label>
        <select id="group-by-select" v-model="groupBy" class="sidebar-select">
          <option value="none">None</option>
          <option value="chain">Chain</option>
          <option value="category">Category</option>
          <option value="card-reward">Card Reward</option>
        </select>
      </div>

      <div class="sidebar-section">
        <label class="sidebar-label" for="target-mission-input"
          >Target Mission</label
        >
        <div class="combobox-wrapper">
          <input
            id="target-mission-input"
            v-model="missionDropdownQuery"
            type="text"
            class="sidebar-input"
            placeholder="All Missions"
            @focus="missionDropdownOpen = true"
            @blur="onMissionDropdownBlur"
            @keydown="onMissionDropdownKeydown"
          />
          <div
            v-if="missionDropdownOpen"
            class="combobox-dropdown"
            @mousedown.prevent
          >
            <div
              class="combobox-option"
              :class="{
                'combobox-option--selected': selectedMissionFilter === '',
              }"
              @click="selectMissionOption('')"
            >
              All Missions
            </div>
            <div
              v-for="mission in filteredMissionDropdownOptions"
              :key="mission.id"
              class="combobox-option"
              :class="{
                'combobox-option--selected':
                  selectedMissionFilter === mission.id,
              }"
              @click="selectMissionOption(mission.id)"
            >
              {{ mission.rawMission.name }}
            </div>
            <div
              v-if="filteredMissionDropdownOptions.length === 0"
              class="combobox-empty"
            >
              {{
                missionDropdownQuery.trim()
                  ? "No missions found"
                  : "No missions available"
              }}
            </div>
          </div>
        </div>
      </div>

      <div class="sidebar-section">
        <label class="sidebar-label" for="target-card-input">Target Card</label>
        <div class="combobox-wrapper">
          <input
            id="target-card-input"
            v-model="cardDropdownQuery"
            type="text"
            class="sidebar-input"
            placeholder="All Cards"
            @focus="cardDropdownOpen = true"
            @blur="onCardDropdownBlur"
            @keydown="onCardDropdownKeydown"
          />
          <div
            v-if="cardDropdownOpen"
            class="combobox-dropdown"
            @mousedown.prevent
          >
            <div
              class="combobox-option"
              :class="{
                'combobox-option--selected': selectedCardFilter === undefined,
              }"
              @click="selectCardOption(undefined)"
            >
              All Cards
            </div>
            <div
              v-for="card in filteredCardDropdownOptions"
              :key="card.cardId"
              class="combobox-option"
              :class="{
                'combobox-option--selected': selectedCardFilter === card.cardId,
              }"
              @click="selectCardOption(card.cardId!)"
            >
              {{ card.label }}
            </div>
            <div
              v-if="filteredCardDropdownOptions.length === 0"
              class="combobox-empty"
            >
              {{
                cardDropdownQuery.trim()
                  ? "No cards found"
                  : "No cards available"
              }}
            </div>
          </div>
        </div>
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
          <span
            class="tooltip-hint"
            data-tooltip="Uses the lowest active sell order price instead of the last 10 price."
            @mouseenter="onTooltipEnter('sell-price', $event)"
            @mouseleave="onTooltipLeave"
            @click.stop="onTooltipClick('sell-price', $event)"
            >(?)</span
          >
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
          <span
            class="tooltip-hint"
            data-tooltip="Only shows missions where the reward value exceeds the cost to complete them."
            @mouseenter="onTooltipEnter('positive-only', $event)"
            @mouseleave="onTooltipLeave"
            @click.stop="onTooltipClick('positive-only', $event)"
            >(?)</span
          >
        </label>
        <label class="toggle-label">
          <input
            type="checkbox"
            class="toggle-input"
            :checked="settingsStore.includeCardRewardsInValue"
            @change="handleIncludeCardRewardsChange($event)"
          />
          Include card rewards in value
          <span
            class="tooltip-hint"
            data-tooltip="When enabled, the market price of reward cards is included in the Reward and Net value calculations. Disable if you don't intend to sell reward cards."
            @mouseenter="onTooltipEnter('card-rewards', $event)"
            @mouseleave="onTooltipLeave"
            @click.stop="onTooltipClick('card-rewards', $event)"
            >(?)</span
          >
        </label>
      </div>

      <div class="sidebar-divider" />

      <div class="sidebar-section">
        <div class="mark-complete-row">
          <button
            class="btn-shopping-mode"
            :class="{
              'btn-shopping-mode--active': settingsStore.optimizedMode,
            }"
            @click="toggleOptimizedMode"
          >
            {{
              settingsStore.optimizedMode
                ? "Disable Optimized Mode"
                : "Enable Optimized Mode"
            }}
          </button>
          <span
            class="tooltip-hint"
            data-tooltip="Optimized mode takes into account locked cards and finds optimal mission values by considering the opportunity cost of selling unlocked cards. Only intended for users who have uploaded their locked card data."
            @mouseenter="onTooltipEnter('optimized-mode', $event)"
            @mouseleave="onTooltipLeave"
            @click.stop="onTooltipClick('optimized-mode', $event)"
            >(?)</span
          >
        </div>
        <div class="mark-complete-row">
          <button
            class="btn-shopping-mode"
            :class="{ 'btn-shopping-mode--active': showShoppingList }"
            @click="toggleShoppingMode"
          >
            {{
              showShoppingList
                ? "Disable Shopping Mode"
                : "Enable Shopping Mode"
            }}
          </button>
          <span
            class="tooltip-hint"
            data-tooltip="Opens a wizard to configure a shopping list — choose scope, strategy, and budget to get an ordered card purchase plan."
            @mouseenter="onTooltipEnter('shopping-mode', $event)"
            @mouseleave="onTooltipLeave"
            @click.stop="onTooltipClick('shopping-mode', $event)"
            >(?)</span
          >
        </div>
        <div v-if="settingsStore.optimizedMode" class="discount-row">
          <span class="discount-label"
            >Sell - Buy difference
            <span
              class="tooltip-hint"
              data-tooltip="How much less you receive selling a card vs its current price. Applied when calculating the opportunity cost of locking cards you own."
              @mouseenter="onTooltipEnter('sell-discount', $event)"
              @mouseleave="onTooltipLeave"
              @click.stop="onTooltipClick('sell-discount', $event)"
              >(?)</span
            ></span
          >
          <div class="discount-input-wrap">
            <input
              id="sell-discount-input"
              type="number"
              class="discount-input"
              min="0"
              max="99"
              :value="Math.round(settingsStore.unlockedCardDiscount * 100)"
              @change="handleDiscountChange($event)"
            />
            <span class="discount-pct">%</span>
          </div>
        </div>
      </div>

      <PackPriceSettings />

      <div class="sidebar-spacer" />

      <div class="sidebar-notes-row">
        <button
          class="btn-mission-notes"
          type="button"
          data-bs-toggle="modal"
          data-bs-target="#missionNotesModal"
        >
          Mission Notes
        </button>
      </div>

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
        v-if="!showShoppingList"
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
          <template v-if="!hasUserCards && !dropZoneDismissed">
            <input
              type="file"
              ref="listFileInput"
              class="list-file-input"
              @change="handleListFileChange"
            />
            <div
              class="list-drop-zone"
              :class="{ 'list-drop-zone--active': listDragging }"
              @dragenter.prevent="onListDragEnter"
              @dragover.prevent
              @dragleave="onListDragLeave"
              @drop.prevent="onListDrop"
              @click="listFileInput?.click()"
            >
              <p class="list-drop-zone-heading">
                Drop your card export CSV here
              </p>
              <p class="list-drop-zone-sub">or click to browse</p>
            </div>
            <div class="list-drop-zone-footer">
              <button
                class="btn-drop-zone-link"
                type="button"
                @click="listHelpExpanded = !listHelpExpanded"
              >
                {{
                  listHelpExpanded ? "Hide instructions" : "Show instructions"
                }}
              </button>
              <button
                class="btn-drop-zone-link"
                type="button"
                @click="dropZoneDismissed = true"
              >
                Skip for now
              </button>
            </div>
            <div v-if="listHelpExpanded" class="list-upload-help">
              <p class="upload-help-body">
                To get the latest price and ownership data, from the card shop,
                with no filters on, click Export Card List to CSV.
              </p>
              <img
                src="/OotpExportShopCards.jpg"
                alt="Shop Cards Export Help"
                class="upload-help-img"
              />
              <p class="upload-help-body">
                To export your locked card data, add "PT Card ID" and "PT Lock"
                to a view and with no filters click Report, Write report to csv.
                This is only for displaying locked cards, owned cards come from
                the shop csv.
              </p>
              <p class="upload-help-note">
                Note: If you have more than 8190 cards, exports will be
                paginated making it impossible to export your full card
                inventory. Quicksell duplicates to get under the limit if you
                want locked status displayed.
              </p>
              <img
                src="/OotpUserCardView.jpg"
                alt="User Card View Help"
                class="upload-help-img"
              />
              <img
                src="/OotpExportUserCards.jpg"
                alt="User Cards Export Help"
                class="upload-help-img"
              />
            </div>
          </template>
          <div
            v-if="
              groupedMissions.length === 0 ||
              groupedMissions.every((g) => g.missions.length === 0)
            "
            class="empty-missions-message"
          >
            <p>No missions match the current filters.</p>
          </div>
          <MissionList
            v-else
            ref="missionListRef"
            :groups="groupedMissions"
            :isMissionComplete="isMissionComplete"
            :remainingPriceText="remainingPriceText"
            :selectMission="selectMission"
            :selectedMission="selectedMission"
            :isShoppingListMode="false"
            :shoppingListMissionIds="emptyMissionIdSet"
            @calculateMission="missionStore.calculateMissionDetails"
            @calculateGroup="missionStore.calculateAllNotCalculatedMissions"
            @includeMission="() => {}"
          />
        </template>
      </section>

      <!-- ─── SHOPPING LIST PANEL ─── -->
      <template v-if="showShoppingList">
        <aside class="detail-panel">
          <ShoppingList
            :missions="missions"
            :wizardConfig="wizardConfig"
            :packPrices="settingsStore.packPrices"
            :shopCardsById="cardStore.shopCardsById"
            :categories="missionCategories"
            :chainMissions="chainRootMissions"
            :rewardCards="allRewardCards"
            @confirm="onWizardConfirm"
          />
        </aside>
      </template>

      <!-- ─── RESIZE HANDLE + DETAIL PANEL ─── -->
      <template v-else-if="selectedMission">
        <div class="resize-handle" @mousedown="startResize" />
        <aside class="detail-panel">
          <MissionDetails
            :selectedMission="selectedMission"
            :missions="missions"
            @selectMission="selectMission"
            @close="selectedMission = null"
          />
        </aside>
      </template>
    </div>
  </div>

  <Teleport to="body">
    <MissionNotesModal :missionsVersion="missionStore.missionsVersion" />
  </Teleport>

  <!-- ─── TOOLTIP PORTAL ─── -->
  <Teleport to="body">
    <div
      v-if="openTooltipId"
      class="sidebar-tooltip-portal"
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
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useMissionStore } from "../stores/useMissionStore";
import { useCardStore } from "../stores/useCardStore";
import CardUploader from "./CardUploader.vue";
import MissionDetails from "./MissionDetails.vue";
import MissionList from "./MissionList.vue";
import MissionNotesModal from "./MissionNotesModal.vue";
import MissionSearch from "./MissionSearch.vue";
import PackPriceSettings from "./PackPriceSettings.vue";
import { useSettingsStore, PACK_TYPE_LABELS } from "../stores/useSettingsStore";
import ShoppingList from "./ShoppingList.vue";
import type { UserMission } from "../models/UserMission";
import { collectRewardItems } from "@/helpers/RewardItemsHelper";
import type { RewardItem } from "@/helpers/RewardItemsHelper";
import { type ShoppingWizardConfig } from "../models/ShoppingWizardConfig";

defineOptions({ name: "MissionsView" });

const emptyMissionIdSet = new Set<number>();

const missionStore = useMissionStore();
const cardStore = useCardStore();

const SIDEBAR_COLLAPSED_KEY = "ootp-sidebar-collapsed";
const isSidebarCollapsed = ref(
  localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true",
);

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

function closeTooltips() {
  openTooltipId.value = null;
}

function toggleSidebar() {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
  localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isSidebarCollapsed.value));
}

const isMobile = ref(window.innerWidth < 768);

let windowResizeListenerAdded = false;

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
  windowResizeListenerAdded = true;
  // On mobile, default to sidebar collapsed if the user has never set a preference
  if (isMobile.value && localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === null) {
    isSidebarCollapsed.value = true;
  }
  document.addEventListener("click", closeTooltips);
});

const LIST_PANEL_WIDTH_KEY = "ootp-list-panel-width";
const listPanelWidth = ref<number>(
  parseInt(localStorage.getItem(LIST_PANEL_WIDTH_KEY) ?? "", 10) || 500,
);

let resizeStartX = 0;
let resizeStartWidth = 0;
let resizeListenersAdded = false;

function startResize(e: MouseEvent) {
  resizeStartX = e.clientX;
  resizeStartWidth = listPanelWidth.value;
  document.addEventListener("mousemove", onResizeMove);
  document.addEventListener("mouseup", stopResize);
  resizeListenersAdded = true;
  e.preventDefault();
}

function onResizeMove(e: MouseEvent) {
  listPanelWidth.value = Math.max(
    200,
    resizeStartWidth + (e.clientX - resizeStartX),
  );
}

function stopResize() {
  if (resizeListenersAdded) {
    document.removeEventListener("mousemove", onResizeMove);
    document.removeEventListener("mouseup", stopResize);
    resizeListenersAdded = false;
  }
  localStorage.setItem(LIST_PANEL_WIDTH_KEY, String(listPanelWidth.value));
}

onUnmounted(() => {
  // Clean up resize handle listeners if they were added
  if (resizeListenersAdded) {
    document.removeEventListener("mousemove", onResizeMove);
    document.removeEventListener("mouseup", stopResize);
    resizeListenersAdded = false;
  }
  // Clean up window resize listener if it was added
  if (windowResizeListenerAdded) {
    window.removeEventListener("resize", onWindowResize);
    windowResizeListenerAdded = false;
  }
  document.removeEventListener("click", closeTooltips);
});
const settingsStore = useSettingsStore();
const hasUserCards = computed(
  () => cardStore.hasShopCards && !cardStore.isDefaultData,
);
const dropZoneDismissed = ref(false);
const listDragging = ref(false);
const listHelpExpanded = ref(false);
const listFileInput = ref<HTMLInputElement | null>(null);
let listDragCounter = 0;

function onListDragEnter() {
  listDragCounter++;
  listDragging.value = true;
}

function onListDragLeave() {
  if (--listDragCounter === 0) listDragging.value = false;
}

async function onListDrop(e: DragEvent) {
  listDragCounter = 0;
  listDragging.value = false;
  const file = e.dataTransfer?.files[0];
  if (!file) return;
  await cardStore.uploadShopFile(file);
  await missionStore.initialize();
}

async function handleListFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  await cardStore.uploadShopFile(file);
  await missionStore.initialize();
}
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

const selectedMission = ref<UserMission | null>(null);
const showShoppingList = ref(false);
const wizardConfig = ref<ShoppingWizardConfig | null>(null);

function toggleShoppingMode() {
  if (showShoppingList.value) {
    disableShoppingMode();
  } else {
    showShoppingList.value = true;
  }
}

function onWizardConfirm(config: ShoppingWizardConfig) {
  wizardConfig.value = config;
}

function disableShoppingMode() {
  showShoppingList.value = false;
  wizardConfig.value = null;
}

const useSellPrice = ref(missionStore.selectedPriceType.sellPrice);
const searchQuery = ref("");
const selectedMissionFilter = ref<number | "">();
const hideCompleted = ref(loadPref("ootp-display-hideCompleted", false));
const selectedCategoryFilter = ref<string | null>(
  loadPref("ootp-display-categoryFilter", null),
);

const missions = computed(() => missionStore.userMissions);
const missionsOfTypeMissions = computed(() =>
  missionStore.userMissions.filter((m) => m.rawMission.type === "missions"),
);
const missionDropdownQuery = ref("");
const missionDropdownOpen = ref(false);
const filteredMissionDropdownOptions = computed(() => {
  const query = missionDropdownQuery.value.trim().toLowerCase();
  let missions = missionsOfTypeMissions.value;
  // Filter out completed missions if hideCompleted is enabled
  if (hideCompleted.value) {
    missions = missions.filter((mission) => !mission.completed);
  }
  if (!query) return missions;
  return missions.filter((mission) =>
    mission.rawMission.name.toLowerCase().includes(query),
  );
});

// Collect all unique reward cards from all missions
const allRewardCards = computed(() => {
  // Filter missions based on hideCompleted setting
  let missionsToUse = missions.value;
  if (hideCompleted.value) {
    missionsToUse = missions.value.filter((m) => !m.completed);
  }
  const items = collectRewardItems(missionsToUse, {
    packPrices: settingsStore.packPrices,
    packTypeLabels: PACK_TYPE_LABELS,
    shopCardsById: cardStore.shopCardsById,
  });
  // Only cards with cardId
  return items.filter(
    (item) => item.type === "card" && item.cardId !== undefined,
  ) as (RewardItem & { cardId: number })[];
});

const cardDropdownQuery = ref("");
const cardDropdownOpen = ref(false);
const selectedCardFilter = ref<number | undefined>(undefined);
const filteredCardDropdownOptions = computed(() => {
  const query = cardDropdownQuery.value.trim().toLowerCase();
  if (!query) return allRewardCards.value;
  return allRewardCards.value.filter((card) =>
    card.label.toLowerCase().includes(query),
  );
});

// Map cardId to the mission that rewards it (prefer non-completed missions)
function findMissionForCard(cardId: number): number | "" {
  const missionWithCard = missions.value.find((mission) => {
    const rewards = mission.rawMission.rewards ?? [];
    return rewards.some(
      (reward) =>
        (reward.type as string).toLowerCase() === "card" &&
        (reward as { cardId: number }).cardId === cardId,
    );
  });
  return missionWithCard ? missionWithCard.id : "";
}

function selectMissionOption(missionId: number | "") {
  selectedMissionFilter.value = missionId;
  // Reset card filter when mission is selected
  selectedCardFilter.value = undefined;
  cardDropdownQuery.value = "";

  if (missionId === "") {
    missionDropdownQuery.value = "";
  } else {
    const mission = missionsOfTypeMissions.value.find(
      (m) => m.id === missionId,
    );
    if (mission) {
      missionDropdownQuery.value = mission.rawMission.name;
    }
  }
  missionDropdownOpen.value = false;
}

function selectCardOption(cardId: number | undefined) {
  selectedCardFilter.value = cardId;
  // Reset mission filter when card is selected
  selectedMissionFilter.value = "";
  missionDropdownQuery.value = "";

  if (cardId === undefined) {
    cardDropdownQuery.value = "";
  } else {
    const card = allRewardCards.value.find((c) => c.cardId === cardId);
    if (card) {
      cardDropdownQuery.value = card.label;
    }
    // Find and select the mission that rewards this card
    const missionId = findMissionForCard(cardId);
    selectedMissionFilter.value = missionId;
  }
  cardDropdownOpen.value = false;
}

function onMissionDropdownBlur() {
  // Delay to allow click events on dropdown items to fire
  setTimeout(() => {
    missionDropdownOpen.value = false;
    // Reset display text if no valid selection
    if (
      selectedMissionFilter.value === "" ||
      selectedMissionFilter.value === undefined
    ) {
      missionDropdownQuery.value = "";
    } else {
      const mission = missionsOfTypeMissions.value.find(
        (m) => m.id === selectedMissionFilter.value,
      );
      if (mission) {
        missionDropdownQuery.value = mission.rawMission.name;
      }
    }
  }, 150);
}

function onMissionDropdownKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    missionDropdownOpen.value = false;
    (e.target as HTMLInputElement).blur();
  }
}

function onCardDropdownBlur() {
  setTimeout(() => {
    cardDropdownOpen.value = false;
    if (selectedCardFilter.value === undefined) {
      cardDropdownQuery.value = "";
    } else {
      const card = allRewardCards.value.find(
        (c) => c.cardId === selectedCardFilter.value,
      );
      if (card) {
        cardDropdownQuery.value = card.label;
      }
    }
  }, 150);
}

function onCardDropdownKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    cardDropdownOpen.value = false;
    (e.target as HTMLInputElement).blur();
  }
}

function loadPref<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const CATEGORY_ORDER = [
  "Live Series",
  "Pack Rewards",
  "Launch Deck",
  "Bonus Rewards",
  "Immortal Seasons",
  "Negro Leagues",
  "Hall of Fame",
  "Baseball Reference",
  "Future Legends",
  "Launch Plus",
  "PT Elite",
  "Playoff Moments",
  "World Series Start",
  "Holiday Times",
  "Final Mission Set",
];
const categoryPriority = (cat: string) => {
  const i = CATEGORY_ORDER.indexOf(cat);
  return i === -1 ? CATEGORY_ORDER.length : i;
};
const missionTypeFilter = ref<Set<string>>(
  new Set(
    loadPref<string[]>("ootp-display-typeFilter", [
      "count",
      "points",
      "missions",
    ]),
  ),
);

function toggleMissionTypeFilter(type: string) {
  const next = new Set(missionTypeFilter.value);
  if (next.has(type)) {
    // Don't allow deselecting all
    if (next.size > 1) next.delete(type);
  } else {
    next.add(type);
  }
  missionTypeFilter.value = next;
  localStorage.setItem("ootp-display-typeFilter", JSON.stringify([...next]));
}

const groupBy = ref<"none" | "chain" | "category" | "card-reward">(
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

async function recalculateWithOptimizedMode(newValue: boolean) {
  console.log(
    `[missions] recalculateWithOptimizedMode: ${!newValue} -> ${newValue}, showShoppingList=${showShoppingList.value}, wizardOptimize=${wizardConfig.value?.optimizeForLockedCards}`,
  );
  const calculatedMissions = missionStore.userMissions.filter(
    (m) => m.progressText !== "Not Calculated",
  );

  settingsStore.setOptimizedMode(newValue);
  missionStore.buildUserMissions();

  if (calculatedMissions.length === 0) return;

  missionStore.setLoading(true);
  await new Promise((resolve) => setTimeout(resolve, 50));

  const leaves = calculatedMissions.filter(
    (m) => m.rawMission.type !== "missions",
  );
  const parents = calculatedMissions
    .filter((m) => m.rawMission.type === "missions")
    .sort((a, b) => a.id - b.id);

  await Promise.all(
    leaves.map((m) => missionStore.calculateMissionDetails(m.id, true, true)),
  );
  for (const parent of parents) {
    await missionStore.calculateMissionDetails(parent.id, true, true);
  }

  missionStore.setLoading(false);
}

async function toggleOptimizedMode() {
  await recalculateWithOptimizedMode(!settingsStore.optimizedMode);
}

const handleIncludeCardRewardsChange = (event: Event) => {
  settingsStore.setIncludeCardRewardsInValue(
    (event.target as HTMLInputElement).checked,
  );
  missionStore.recomputeMissionValues();
};

const handleDiscountChange = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const raw = input.value;
  const pct = parseInt(raw, 10);
  // Validate: reject negative values, cap at 99% to prevent zero prices
  if (!isNaN(pct) && pct < 0) {
    input.value = Math.round(
      settingsStore.unlockedCardDiscount * 100,
    ).toString();
    return;
  }
  const val = isNaN(pct) ? 0.1 : Math.min(99, Math.max(0, pct)) / 100;
  settingsStore.setUnlockedCardDiscount(val);
  missionStore.buildUserMissions();
};

const updatePriceType = async () => {
  // Capture missions that were already calculated before the price type change
  const calculatedMissions = missionStore.userMissions.filter(
    (m) => m.progressText !== "Not Calculated",
  );

  missionStore.setUseSellPrice(useSellPrice.value);
  missionStore.buildUserMissions();

  if (calculatedMissions.length === 0) return;

  // Show loading spinner during recalculation
  missionStore.setLoading(true);

  // Wait for browser to render the spinner
  await new Promise((resolve) => setTimeout(resolve, 50));

  // Recalculate all missions that were previously calculated
  // Calculate leaf missions (count/points) first, then parents in ascending ID order
  const leaves = calculatedMissions.filter(
    (m) => m.rawMission.type !== "missions",
  );
  const parents = calculatedMissions.filter(
    (m) => m.rawMission.type === "missions",
  );

  await Promise.all(
    leaves.map((m) => missionStore.calculateMissionDetails(m.id, true, true)),
  );

  parents.sort((a, b) => a.id - b.id);
  for (const parent of parents) {
    await missionStore.calculateMissionDetails(parent.id, true, true);
  }

  missionStore.setLoading(false);
};

function groupNetValue(missions: UserMission[]): number {
  const incomplete = missions.filter((m) => !m.completed);
  const rewardTotal = incomplete.reduce((s, m) => s + (m.rewardValue ?? 0), 0);
  const leafMissions = incomplete.filter(
    (m) => m.rawMission.type !== "missions",
  );
  const costTotal = leafMissions.reduce((s, m) => s + m.remainingPrice, 0);
  const unlockedTotal = settingsStore.optimizedMode
    ? leafMissions.reduce((s, m) => s + m.unlockedCardsPrice, 0)
    : 0;
  return rewardTotal - costTotal - unlockedTotal;
}

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

  if (missionTypeFilter.value.size < 3) {
    result = result.filter((m) =>
      missionTypeFilter.value.has(m.rawMission.type),
    );
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
      const groupMap = new Map<string, UserMission[]>();
      for (const m of filteredMissions.value) {
        const label = m.rawMission.category || "Other";
        if (!groupMap.has(label)) groupMap.set(label, []);
        groupMap.get(label)!.push(m);
      }
      const groups = Array.from(groupMap.entries()).map(
        ([label, missions]) => ({
          label,
          missions,
        }),
      );
      if (sortBy.value === "price") {
        groups.sort((a, b) => {
          const aTotal = a.missions
            .filter((m) => m.rawMission.type !== "missions")
            .reduce((s, m) => s + m.remainingPrice, 0);
          const bTotal = b.missions
            .filter((m) => m.rawMission.type !== "missions")
            .reduce((s, m) => s + m.remainingPrice, 0);
          return aTotal - bTotal;
        });
      } else if (sortBy.value === "value") {
        groups.sort(
          (a, b) => groupNetValue(b.missions) - groupNetValue(a.missions),
        );
      } else if (sortBy.value === "name") {
        groups.sort((a, b) => a.label.localeCompare(b.label));
      } else {
        groups.sort(
          (a, b) => categoryPriority(a.label) - categoryPriority(b.label),
        );
      }
      return groups;
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
      const chainGroups: Array<{
        label: string;
        missions: UserMission[];
        rootCategory: string;
      }> = [];
      const assignedIds = new Set<number>();
      for (const root of chainRoots) {
        const subIds = collectDescendantIds(root.id, missionById);
        const members = filteredMissions.value.filter(
          (m) => m.id === root.id || subIds.has(m.id),
        );
        members.forEach((m) => assignedIds.add(m.id));
        chainGroups.push({
          label: root.rawMission.name,
          missions: members,
          rootCategory: root.rawMission.category,
        });
      }
      if (sortBy.value === "price") {
        chainGroups.sort((a, b) => {
          const aTotal = a.missions
            .filter((m) => m.rawMission.type !== "missions")
            .reduce((s, m) => s + m.remainingPrice, 0);
          const bTotal = b.missions
            .filter((m) => m.rawMission.type !== "missions")
            .reduce((s, m) => s + m.remainingPrice, 0);
          return aTotal - bTotal;
        });
      } else if (sortBy.value === "value") {
        chainGroups.sort(
          (a, b) => groupNetValue(b.missions) - groupNetValue(a.missions),
        );
      } else if (sortBy.value === "name") {
        chainGroups.sort((a, b) => a.label.localeCompare(b.label));
      } else {
        // default: category priority order, then alphabetically within same category
        chainGroups.sort((a, b) => {
          const catDiff =
            categoryPriority(a.rootCategory) - categoryPriority(b.rootCategory);
          return catDiff !== 0 ? catDiff : a.label.localeCompare(b.label);
        });
      }
      const result: Array<{ label: string; missions: UserMission[] }> =
        chainGroups.map(({ label, missions }) => ({ label, missions }));
      // Standalone: anything not in a chain — always last
      const standalone = filteredMissions.value.filter(
        (m) => !assignedIds.has(m.id),
      );
      if (standalone.length > 0) {
        result.push({ label: "Standalone", missions: standalone });
      }
      return result;
    }

    if (groupBy.value === "card-reward") {
      const missionById = new Map(
        missionStore.userMissions.map((m) => [m.id, m]),
      );
      const cardGroupMap = new Map<
        number,
        { label: string; missions: UserMission[] }
      >();
      // Track which missions appear in at least one card group (for No Card Reward bucket).
      // A mission can appear in multiple groups if it is a child of multiple card-reward missions.
      const inAnyCardGroup = new Set<number>();
      for (const m of filteredMissions.value) {
        const rewards = m.rawMission.rewards ?? [];
        const cardReward = rewards.find(
          (r) =>
            (r.type as string).toLowerCase() === "card" &&
            (r as { cardId: number }).cardId !== 0,
        ) as { cardId: number } | undefined;
        if (cardReward) {
          const { cardId } = cardReward;
          if (!cardGroupMap.has(cardId)) {
            const shopCard = cardStore.shopCardsById.get(cardId);
            const label = shopCard ? shopCard.cardTitle : `Card #${cardId}`;
            cardGroupMap.set(cardId, { label, missions: [] });
          }
          const group = cardGroupMap.get(cardId)!;
          const descendantIds = collectDescendantIds(m.id, missionById);
          const members = filteredMissions.value.filter(
            (fm) => fm.id === m.id || descendantIds.has(fm.id),
          );
          // Deduplicate within this group (a mission could be a descendant via
          // multiple paths), but allow the same mission in different groups.
          const alreadyInThisGroup = new Set(group.missions.map((fm) => fm.id));
          members.forEach((fm) => {
            if (!alreadyInThisGroup.has(fm.id)) {
              group.missions.push(fm);
              alreadyInThisGroup.add(fm.id);
            }
            inAnyCardGroup.add(fm.id);
          });
        }
      }
      const groups: Array<{ label: string; missions: UserMission[] }> =
        Array.from(cardGroupMap.values());
      if (sortBy.value === "price") {
        groups.sort((a, b) => {
          const aTotal = a.missions
            .filter((m) => m.rawMission.type !== "missions")
            .reduce((s, m) => s + m.remainingPrice, 0);
          const bTotal = b.missions
            .filter((m) => m.rawMission.type !== "missions")
            .reduce((s, m) => s + m.remainingPrice, 0);
          return aTotal - bTotal;
        });
      } else if (sortBy.value === "value") {
        groups.sort(
          (a, b) => groupNetValue(b.missions) - groupNetValue(a.missions),
        );
      } else {
        groups.sort((a, b) => a.label.localeCompare(b.label));
      }
      const noCardGroup = filteredMissions.value.filter(
        (m) => !inAnyCardGroup.has(m.id),
      );
      if (noCardGroup.length > 0) {
        groups.push({ label: "No Card Reward", missions: noCardGroup });
      }
      return groups;
    }

    return [{ label: "", missions: filteredMissions.value }];
  },
);

const remainingPriceText = (mission: UserMission) => {
  if (mission.completed) return "";
  if (mission.remainingPrice <= 0) return "";
  return `${mission.remainingPrice.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })} PP`;
};

const isMissionComplete = (mission: UserMission) => mission.completed;

const missionListRef = ref<{ scrollToMission: (id: number) => void } | null>(
  null,
);

const selectMission = (mission: UserMission) => {
  selectedMission.value = mission;
  // Scroll to the mission in the list after a short delay
  // to allow Vue to update the selected state
  setTimeout(() => {
    if (missionListRef.value) {
      missionListRef.value.scrollToMission(mission.id);
    }
  }, 50);
};

const missionCategories = computed(() => {
  const categories = new Set<string>();
  missions.value.forEach((m) => {
    if (m.rawMission.category) categories.add(m.rawMission.category);
  });
  return Array.from(categories).sort(
    (a, b) => categoryPriority(a) - categoryPriority(b),
  );
});

const chainRootMissions = computed(() => {
  const allSubIds = new Set<number>();
  for (const m of missions.value) {
    if (m.rawMission.type === "missions" && m.rawMission.missionIds) {
      m.rawMission.missionIds.forEach((id) => allSubIds.add(id));
    }
  }
  return missions.value.filter(
    (m) => m.rawMission.type === "missions" && !allSubIds.has(m.id),
  );
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
  padding: 0.25rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
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

.sidebar-input {
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  color: var(--sidebar-text);
  padding: 6px 8px;
  font-size: 0.8rem;
  width: 100%;
}

.sidebar-input::placeholder {
  color: var(--sidebar-muted);
}

.sidebar-input:focus {
  outline: none;
  border-color: var(--accent);
}

.combobox-wrapper {
  position: relative;
}

.combobox-dropdown {
  position: absolute;
  top: calc(100% + 2px);
  left: 0;
  right: 0;
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  max-height: 240px;
  overflow-y: auto;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.combobox-option {
  padding: 8px 10px;
  font-size: 0.8rem;
  color: var(--sidebar-text);
  cursor: pointer;
  transition: background 0.1s;
}

.combobox-option:hover {
  background: rgba(255, 255, 255, 0.1);
}

.combobox-option--selected {
  background: rgba(255, 255, 255, 0.15);
  color: var(--accent);
}

.combobox-empty {
  padding: 8px 10px;
  font-size: 0.8rem;
  color: var(--sidebar-muted);
  font-style: italic;
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

.type-filter-group {
  display: flex;
  gap: 0.3rem;
}

.type-filter-btn {
  flex: 1;
  padding: 4px 0;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 5px;
  cursor: pointer;
  background: transparent;
  color: var(--sidebar-muted);
  border: 1px solid rgba(255, 255, 255, 0.12);
  transition:
    background 0.12s,
    color 0.12s;
}

.type-filter-btn:hover {
  background: rgba(255, 255, 255, 0.07);
  color: var(--sidebar-text);
}

.type-filter-btn--active {
  background: rgba(34, 197, 94, 0.15);
  color: #86efac;
  border-color: #4ade80;
}

.sidebar-toggles {
  gap: 0.4rem;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.83rem;
  cursor: pointer;
}

.toggle-input {
  accent-color: var(--accent);
  width: 14px;
  height: 14px;
  cursor: pointer;
}

.tooltip-hint {
  font-size: 0.75em;
  color: var(--sidebar-muted);
  cursor: help;
  user-select: none;
}

/* Set All Complete row: button + tooltip hint side by side */
.mark-complete-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.mark-complete-row .btn-mark-all-complete {
  flex: 1;
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

.btn-shopping-mode {
  background: transparent;
  color: #93c5fd;
  border: 1px solid #60a5fa;
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

.btn-shopping-mode:hover {
  background: rgba(96, 165, 250, 0.15);
  color: #bfdbfe;
}

.btn-shopping-mode--active {
  background: #1e40af;
  color: #dbeafe;
  border-color: #3b82f6;
}

.btn-shopping-mode--active:hover {
  background: #1d4ed8;
  color: #eff6ff;
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

.empty-missions-message {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 3rem 2rem;
  text-align: center;
  color: #64748b;
}

.empty-missions-message p {
  font-size: 0.95rem;
  margin: 0;
}

.list-file-input {
  display: none;
}

.list-drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 3rem 2rem;
  background: #fff;
  border: 2px dashed #cbd5e1;
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s;
}

.list-drop-zone:hover,
.list-drop-zone--active {
  border-color: #22c55e;
  background: #f0fdf4;
}

.list-drop-zone-heading {
  font-size: 1.05rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.list-drop-zone-sub {
  font-size: 0.9rem;
  color: #64748b;
  margin: 0;
}

.list-drop-zone-footer {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  padding: 0.5rem 0 0;
}

.btn-drop-zone-link {
  background: none;
  border: none;
  padding: 0;
  font-size: 0.85rem;
  color: #64748b;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.btn-drop-zone-link:hover {
  color: #475569;
}

.list-upload-help {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.25rem;
  margin-top: 0.5rem;
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.upload-help-body {
  font-size: 0.875rem;
  color: #475569;
  margin: 0;
  line-height: 1.6;
}

.upload-help-note {
  font-size: 0.82rem;
  color: #94a3b8;
  margin: 0;
  line-height: 1.6;
}

.upload-help-img {
  max-width: 100%;
  width: auto;
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

/* ─── MISSION NOTES BUTTON ─── */
.sidebar-notes-row {
  padding: 0.4rem 1rem 0.25rem;
}

.btn-mission-notes {
  background: transparent;
  color: var(--sidebar-muted);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  width: 100%;
  text-align: left;
  transition:
    background 0.15s,
    color 0.15s;
}

.btn-mission-notes:hover {
  background: rgba(255, 255, 255, 0.07);
  color: var(--sidebar-text);
}
</style>

<style>
.sidebar-tooltip-portal {
  position: fixed;
  z-index: 9999;
  width: 280px;
  background: #fff;
  color: #1e293b;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 7px 10px;
  font-size: 0.74rem;
  font-weight: 400;
  line-height: 1.5;
  white-space: normal;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  pointer-events: none;
  transform: translateY(calc(-100% - 6px));
}
</style>
