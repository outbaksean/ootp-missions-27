<template>
  <div class="upload-section">
    <!-- Section header: label + utility links -->
    <div class="section-header">
      <span class="section-label">Card Data</span>
      <div class="section-links">
        <button
          class="link-btn"
          type="button"
          data-bs-toggle="modal"
          data-bs-target="#appHelpModal"
        >
          Help
        </button>
        <button
          class="link-btn"
          type="button"
          data-bs-toggle="modal"
          data-bs-target="#prereleaseStatusModal"
        >
          PreRelease
        </button>
      </div>
    </div>

    <!-- Status block: indicator + timestamp + upload toggle -->
    <div class="status-block">
      <div class="status-row">
        <div class="status-indicator">
          <span
            class="status-dot"
            :class="hasUserCards ? 'dot-green' : 'dot-red'"
          ></span>
          <span :class="statusClass">{{ statusText }}</span>
        </div>
        <button
          class="action-btn"
          type="button"
          @click="isExpanded = !isExpanded"
        >
          {{ isExpanded ? "Hide" : "Upload" }}
        </button>
      </div>
      <div v-if="hasUserCards && lastUploadedText" class="upload-time">
        {{ lastUploadedText }}
      </div>
    </div>

    <!-- File inputs -->
    <div v-show="isExpanded" class="upload-form">
      <button
        class="action-btn upload-help-link"
        type="button"
        data-bs-toggle="modal"
        data-bs-target="#uploadHelpModal"
      >
        Upload Help
      </button>
      <div class="upload-field">
        <label for="shopCardsFile">User Cards</label>
        <input
          type="file"
          id="shopCardsFile"
          class="upload-file-input"
          @change="handleShopCardsUpload"
        />
        <button v-if="hasShopCards" class="btn-clear" @click="clearShopCards">
          Clear
        </button>
      </div>
      <div class="upload-field">
        <label for="userCardsFile">Card Locks</label>
        <input
          type="file"
          id="userCardsFile"
          class="upload-file-input"
          :disabled="isDefaultData"
          @change="handleUserCardsUpload"
        />
        <span v-if="isDefaultData" class="field-hint">
          Upload your card data first
        </span>
      </div>
    </div>

    <!-- Upload Help Modal -->
    <div
      class="modal fade"
      id="uploadHelpModal"
      tabindex="-1"
      aria-labelledby="uploadHelpModalLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="uploadHelpModalLabel">Upload Help</h5>
            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
          </div>
          <div class="modal-body">
            <p class="text-muted mx-3 mb-3">
              To get the latest price and ownership data, from the card shop,
              with no filters on click Export Card List to CSV.
            </p>
            <img
              src="/OotpExportShopCards.jpg"
              alt="Shop Cards Export Help"
              class="img-fluid mb-3"
            />
            <p class="text-muted mx-3 mb-3">
              To export your locked card data, add "PT Card ID" and "PT Lock" to
              a view and with no filters click Report, Write report to csv. This
              is only for displaying locked cards, owned cards come from the
              shop csv.
            </p>
            <p class="text-danger mx-3 mb-3">
              Note: If you have more than 8190 cards exports will be paginated
              essentially making exporting your card inventory impossible. If
              you want locked status to be displayed and are over the limit, I
              recommend quickselling duplicates to get under the limit.
            </p>
            <img
              src="/OotpUserCardView.jpg"
              alt="User Card View Help"
              class="img-fluid"
            />
            <img
              src="/OotpExportUserCards.jpg"
              alt="User Cards Export Help"
              class="img-fluid mb-3"
            />
            <div class="modal-footer">
              <button
                type="button"
                class="btn btn-secondary"
                data-bs-dismiss="modal"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- App Help Modal -->
    <div
      class="modal fade"
      id="appHelpModal"
      tabindex="-1"
      aria-labelledby="appHelpModalLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="appHelpModalLabel">How it works</h5>
            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
          </div>
          <div class="modal-body help-body">
            <h6>Calculation</h6>
            <p>
              Click Calculate on a mission to compute its cost, or use Calculate
              All in the sidebar to process everything at once. For count
              missions the app picks the cheapest unowned cards to hit the
              required number. For points missions it uses a knapsack solver to
              find the minimum-cost card combination that meets the required
              point total. Chain missions sum the cheapest incomplete
              sub-mission costs.
            </p>
            <p>
              Cards not in your uploaded data are excluded. Cards with no price
              show "Set price to include" in the detail panel — enter a price to
              add them to the calculation.
            </p>

            <h6>Mission list columns</h6>
            <ul>
              <li>
                <strong>Remaining</strong> — cost to acquire the cards flagged
                Buy in the detail panel.
              </li>
              <li>
                <strong>Unlock Cost</strong> — sell value of the owned cards
                flagged Use. These cards would need to be locked, giving up the
                option to sell them.
              </li>
              <li>
                <strong>Reward</strong> — market value of the mission prize.
                Configure pack prices in the sidebar for missions that pay out
                packs.
              </li>
              <li>
                <strong>Net</strong> — Reward minus Remaining. With Include
                unlocked cards enabled, Unlock Cost is also subtracted.
              </li>
            </ul>

            <h6>Mission detail panel</h6>
            <p>
              Cards are sorted unowned first (cheapest to most expensive), then
              owned unlocked, then locked.
            </p>
            <ul>
              <li>
                <strong>Buy</strong> — this card is included in the calculated
                cost. Acquire it to complete the mission.
              </li>
              <li>
                <strong>Use</strong> — with Optimize on, an owned card the
                solver recommends locking rather than buying a cheaper
                alternative.
              </li>
              <li>
                <strong>Owned / Locked</strong> — current status badges. Use the
                Lock and Own buttons to update status without re-uploading.
                Changes persist across reloads.
              </li>
              <li>
                <strong>Price field</strong> — click to override the card's
                price. Highlighted when overridden. Persists across reloads.
              </li>
              <li>
                <strong>N other missions</strong> — this card appears in other
                missions. Click to expand the list.
              </li>
              <li>
                <strong>Recalculate</strong> — appears when owned or lock status
                has changed. Click to update the mission cost.
              </li>
              <li>
                <strong>Set Completed</strong> — manually mark a mission done.
                Available when you own enough cards. The mission also
                auto-completes once enough cards are locked.
              </li>
            </ul>

            <h6>Sidebar options</h6>
            <ul>
              <li>
                <strong>Group by</strong> — None: flat list. Chain: grouped
                under parent chain missions. Category: grouped by in-game
                mission category.
              </li>
              <li>
                <strong>Target Mission</strong> — filters the list to only
                missions that contribute to a selected chain mission.
              </li>
              <li>
                <strong>Sort by</strong> — Default: data order. Remaining Price:
                cheapest to complete first. Mission Value: best net value first.
                Name: alphabetical.
              </li>
              <li>
                <strong>Use Sell Price</strong> — use the lowest active sell
                order price instead of the last completed sale price.
              </li>
              <li>
                <strong>Hide Completed</strong> — hides missions marked
                complete.
              </li>
              <li>
                <strong>Positive Value Only</strong> — shows only missions where
                reward value exceeds the cost to complete them.
              </li>
              <li>
                <strong>Include unlocked cards in net value</strong> — deducts
                the sell value of cards you would need to lock from net value.
              </li>
              <li>
                <strong>Optimize card assignment</strong> — instead of always
                buying unowned cards, finds the cheapest mix of buying new cards
                and locking ones you already own.
              </li>
              <li>
                <strong>Sell - Buy difference</strong> — the percentage spread
                between a card's price and what you'd receive selling it.
                Applied to the opportunity cost of locking owned cards.
              </li>
              <li>
                <strong>Pack Prices</strong> — set the PP value of each pack
                type so reward value can be calculated for missions that pay out
                packs.
              </li>
            </ul>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              data-bs-dismiss="modal"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
    <!-- PreRelease Status Modal (Bootstrap JS) -->
    <div
      class="modal fade"
      id="prereleaseStatusModal"
      tabindex="-1"
      aria-labelledby="prereleaseStatusModalLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="helpModalLabel">PreRelease Status</h5>
            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
          </div>
          <div class="modal-body">
            <div class="card-body">
              <h3>Current Status</h3>
              <p>Updated 2/25/2026</p>
              <ul>
                <li>
                  Currently using OOTP 26 data with plans to migrate to OOTP 27
                  missions and cards on or near release date
                </li>
                <li>
                  Updated mission calculation algorithm for a major performance
                  boost, removed greedy mode toggle
                </li>
                <li>
                  Added optimize card selection mode - this will change the
                  algorithm to show which unlocked cards you own but should not
                  lock because there's more value in buying other cards and
                  selling the owned one.
                </li>
                <li>
                  Added ability to set cards as owned or locked in the ui and
                  the ability to override prices. Imported card shop data is
                  still preferred but no longer needed.
                </li>
                <li>Highlights cards that are in multiple missions.</li>
                <li>
                  The date missions were last uploaded is now shown on the site.
                </li>
                <li>
                  Added reward value, value of unlocked owned cards, and net
                  value to complete for missions and groups.
                </li>
                <li>Added grouping by mission chain.</li>
                <li>Added combined remaining mission rewards to groups.</li>
                <li>Added Mission Search.</li>
                <li>
                  UI Overhauled including responsive ui, this works on phones
                  now.
                </li>
              </ul>
              <h3>In Season Updates</h3>
              <ul>
                <li>
                  When cards or updated or added I need to manually export card
                  data from the game and import into the app, this will take
                  well under an hour but requires manual work
                </li>
                <li>
                  Currently any new missions need to be added manually and can
                  take several hours depending on the amount of missions
                  <ul>
                    <li>
                      Getting mission data programatically has been tried and
                      failed. The data doesn't seem to be saved on a system file
                      and decrypting api requests with WireShark failed
                    </li>
                    <li>
                      I'm going to look into using OCR to get mission data
                    </li>
                  </ul>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCardStore } from "@/stores/useCardStore";
import { useMissionStore } from "@/stores/useMissionStore";
import { computed, ref } from "vue";

const cardStore = useCardStore();
const missionStore = useMissionStore();

const hasShopCards = computed(() => cardStore.hasShopCards);
const isDefaultData = computed(() => cardStore.isDefaultData);
const hasUserCards = computed(() => hasShopCards.value && !isDefaultData.value);
const isExpanded = ref(!hasUserCards.value);

const statusClass = computed(() =>
  hasUserCards.value ? "status-loaded" : "status-missing",
);
const statusText = computed(() =>
  hasUserCards.value ? "Cards loaded" : "User data not imported",
);

const lastUploadedText = computed(() => {
  const iso = cardStore.lastUploadedAt;
  if (!iso) return null;
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
});

const handleShopCardsUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) {
    await cardStore.uploadShopFile(file);
    await missionStore.initialize();
    isExpanded.value = false;
  }
};

const clearShopCards = async () => {
  await cardStore.clearShopCards();
  await missionStore.initialize();
};

const handleUserCardsUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) {
    await cardStore.uploadUserFile(file);
  }
};
</script>

<style scoped>
.upload-section {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--sidebar-border);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* ── Section header ── */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-label {
  font-size: 0.63rem;
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--sidebar-muted);
}

.section-links {
  display: flex;
  gap: 0.75rem;
}

.link-btn {
  background: none;
  border: none;
  padding: 0;
  font-size: 0.68rem;
  color: var(--sidebar-muted);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
  text-decoration-color: rgba(100, 116, 139, 0.4);
  transition: color 0.15s;
}

.link-btn:hover {
  color: var(--sidebar-text);
}

/* ── Status block ── */
.status-block {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot-green {
  background: #4ade80;
  box-shadow: 0 0 5px rgba(74, 222, 128, 0.45);
}

.dot-red {
  background: #fca5a5;
  box-shadow: 0 0 5px rgba(252, 165, 165, 0.45);
}

.status-loaded {
  font-size: 0.78rem;
  color: #4ade80;
  font-weight: 500;
}

.status-missing {
  font-size: 0.78rem;
  color: #fca5a5;
  font-weight: 500;
}

.upload-time {
  font-size: 0.66rem;
  color: var(--sidebar-muted);
  padding-left: 0.95rem; /* align with status text, past the dot */
}

.action-btn {
  background: rgba(255, 255, 255, 0.07);
  color: var(--sidebar-text);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 0.72rem;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.13);
}

/* ── Upload form ── */
.upload-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-top: 0.375rem;
  border-top: 1px solid var(--sidebar-border);
}

.upload-help-link {
  width: 100%;
  text-align: center;
}

.upload-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.upload-field label {
  font-size: 0.63rem;
  color: var(--sidebar-muted);
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

.upload-file-input {
  font-size: 0.7rem;
  color: var(--sidebar-text);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 3px 4px;
  cursor: pointer;
  width: 100%;
}

.upload-file-input:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.field-hint {
  font-size: 0.63rem;
  color: var(--sidebar-muted);
  font-style: italic;
}

.btn-clear {
  background: rgba(220, 38, 38, 0.15);
  color: #fca5a5;
  border: 1px solid rgba(220, 38, 38, 0.25);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 0.7rem;
  cursor: pointer;
  width: fit-content;
  transition: background 0.15s;
}

.btn-clear:hover {
  background: rgba(220, 38, 38, 0.27);
}

.help-body h6 {
  font-weight: 600;
  margin-top: 1.25rem;
  margin-bottom: 0.35rem;
}

.help-body h6:first-child {
  margin-top: 0;
}

.help-body p,
.help-body ul {
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

/* ── Modal styling ── */
:deep(.modal-content) {
  background: #1e293b;
  color: #e2e8f0;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
}

:deep(.modal-header) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  padding: 1rem 1.25rem;
}

:deep(.modal-title) {
  font-size: 1.15rem;
  font-weight: 600;
  color: #f1f5f9;
}

:deep(.modal-body) {
  padding: 1.25rem;
  color: #cbd5e1;
  line-height: 1.6;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}

:deep(.modal-body h3) {
  font-size: 1.1rem;
  font-weight: 600;
  color: #f1f5f9;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}

:deep(.modal-body h3:first-child) {
  margin-top: 0;
}

:deep(.modal-body h6) {
  font-size: 1rem;
  font-weight: 600;
  color: #f1f5f9;
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
}

:deep(.modal-body h6:first-child) {
  margin-top: 0;
}

:deep(.modal-body p) {
  font-size: 0.9rem;
  color: #cbd5e1;
  margin-bottom: 0.75rem;
  line-height: 1.6;
}

:deep(.modal-body ul) {
  font-size: 0.9rem;
  color: #cbd5e1;
  margin-bottom: 1rem;
  padding-left: 1.5rem;
}

:deep(.modal-body ul li) {
  margin-bottom: 0.5rem;
  line-height: 1.6;
}

:deep(.modal-body ul ul) {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

:deep(.modal-body strong) {
  color: #f1f5f9;
  font-weight: 600;
}

:deep(.modal-body .text-muted) {
  color: #94a3b8 !important;
}

:deep(.modal-body .text-danger) {
  color: #fca5a5 !important;
}

:deep(.modal-body .img-fluid) {
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

:deep(.modal-body .card-body) {
  background: transparent;
  padding: 0;
}

:deep(.modal-footer) {
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  padding: 0.875rem 1.25rem;
}

:deep(.btn-close) {
  filter: invert(1) grayscale(100%) brightness(200%);
  opacity: 0.6;
}

:deep(.btn-close:hover) {
  opacity: 1;
}

:deep(.btn-secondary) {
  background: rgba(255, 255, 255, 0.07);
  color: #e2e8f0;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  padding: 6px 16px;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background 0.15s;
}

:deep(.btn-secondary:hover) {
  background: rgba(255, 255, 255, 0.13);
  border-color: rgba(255, 255, 255, 0.18);
  color: #f1f5f9;
}

:deep(.modal-backdrop) {
  background-color: rgba(0, 0, 0, 0.65);
}
</style>
