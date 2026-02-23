<template>
  <div class="upload-section">
    <!-- Status row -->
    <div class="upload-status-row">
      <span :class="statusClass">{{ statusText }}</span>
      <div class="upload-actions">
        <button
          class="sidebar-btn"
          type="button"
          data-bs-toggle="modal"
          data-bs-target="#helpModal"
        >
          Help
        </button>
        <button v-if="hasUserCards" class="sidebar-btn" type="button" @click="isExpanded = !isExpanded">
          {{ isExpanded ? "Hide" : "Upload" }}
        </button>
      </div>
    </div>
    <div class="upload-status-row">
      <button
        class="sidebar-btn"
        type="button"
        data-bs-toggle="modal"
        data-bs-target="#prereleaseStatusModal"
      >
        PreRelease Status
      </button>
    </div>

    <!-- File inputs -->
    <div v-show="isExpanded || !hasUserCards" class="upload-form">
      <div class="upload-field">
        <label for="shopCardsFile">User Cards:</label>
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
        <label for="userCardsFile">Card Locks:</label>
        <input
          type="file"
          id="userCardsFile"
          class="upload-file-input"
          @change="handleUserCardsUpload"
        />
      </div>
    </div>

    <!-- Help Modal (Bootstrap JS) -->
    <div
      class="modal fade"
      id="helpModal"
      tabindex="-1"
      aria-labelledby="helpModalLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="helpModalLabel">Help</h5>
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
            <div data-v-31773649="" class="card-body">
              <h3>Current Status</h3>
              <p>Latest update 2/22/2026</p>
              <ul>
                <li>
                  Currently using OOTP 26 data with plans to migrate to OOTP 27
                  missions and cards on or near release date
                </li>
                <li>
                  Updated mission calculation algorithm for a major performance
                  boost, removed greedy mode toggle
                </li>
                <li>Added Mission Search</li>
                <li>UI Overhaul Done</li>
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
              <hr />
              <h3>Working Notes</h3>
              <ul>
                <li>Continue with first load time performance work</li>
                <li>Cleanup warnings and tests</li>
                <li>Plan for OCR to get mission data</li>
              </ul>
              <h4>Planned New Features</h4>
              <ul>
                <li>
                  Find a way to calculate mission value - Non-Locked plus
                  remaining card value minus reward value
                  <ul>
                    <li>Set default pack value and allow overrides</li>
                    <li>Allow lock selection in ui</li>
                    <li>Include sorting and filters</li>
                  </ul>
                </li>
                <li>Allow overrides of card cost</li>
                <li>
                  Group missions by reward visually in mission list
                  <ul>
                    <li>Allow alternative groups, category etc.</li>
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
  const isExpanded = ref(false);

  const statusClass = computed(() => (hasUserCards.value ? "status-loaded" : "status-missing"));
  const statusText = computed(() => (hasUserCards.value ? "Cards loaded" : "User data not imported"));

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
    padding: 0.875rem 1rem;
    border-bottom: 1px solid var(--sidebar-border);
  }

  .upload-status-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
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

  .upload-actions {
    display: flex;
    gap: 0.25rem;
  }

  .sidebar-btn {
    background: rgba(255, 255, 255, 0.08);
    color: var(--sidebar-text);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 4px;
    padding: 2px 8px;
    font-size: 0.75rem;
    cursor: pointer;
    transition: background 0.15s;
  }

  .sidebar-btn:hover {
    background: rgba(255, 255, 255, 0.14);
  }

  .upload-form {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }

  .upload-field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .upload-field label {
    font-size: 0.72rem;
    color: var(--sidebar-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .upload-file-input {
    font-size: 0.72rem;
    color: var(--sidebar-text);
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    padding: 4px;
    cursor: pointer;
  }

  .btn-clear {
    background: rgba(220, 38, 38, 0.18);
    color: #fca5a5;
    border: 1px solid rgba(220, 38, 38, 0.28);
    border-radius: 4px;
    padding: 2px 8px;
    font-size: 0.72rem;
    cursor: pointer;
    width: fit-content;
    margin-top: 2px;
    transition: background 0.15s;
  }

  .btn-clear:hover {
    background: rgba(220, 38, 38, 0.28);
  }
</style>
