<template>
  <div
    class="modal fade"
    id="cardUploaderModal"
    tabindex="-1"
    aria-labelledby="cardUploaderModalLabel"
    aria-hidden="true"
  >
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="cardUploaderModalLabel">
            Upload Card Data
          </h5>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div class="modal-body">
          <div class="mb-4">
            <label class="form-label fw-semibold">User Cards</label>
            <input
              type="file"
              ref="shopFileInput"
              class="d-none"
              @change="handleShopFileChange"
            />
            <div
              class="upload-drop-zone"
              :class="{ 'upload-drop-zone--active': shopDragging }"
              @dragenter.prevent="onShopDragEnter"
              @dragover.prevent
              @dragleave="onShopDragLeave"
              @drop.prevent="onShopDrop"
              @click="shopFileInput?.click()"
            >
              Drop your card export CSV here, or click to browse
            </div>
            <div v-if="hasShopCards && !isDefaultData" class="clear-btn-row">
              <button
                class="btn btn-sm btn-danger"
                type="button"
                @click="clearShopCards"
              >
                Clear
              </button>
            </div>
          </div>

          <div class="mb-4">
            <label class="form-label fw-semibold">Card Locks</label>
            <input
              type="file"
              ref="lockFileInput"
              class="d-none"
              :disabled="isDefaultData"
              @change="handleLockFileChange"
            />
            <div
              class="upload-drop-zone"
              :class="{
                'upload-drop-zone--active': lockDragging,
                'upload-drop-zone--disabled': isDefaultData,
              }"
              @dragenter.prevent="onLockDragEnter"
              @dragover.prevent
              @dragleave="onLockDragLeave"
              @drop.prevent="onLockDrop"
              @click="!isDefaultData && lockFileInput?.click()"
            >
              <template v-if="isDefaultData">
                Upload your card data first
              </template>
              <template v-else>
                Drop your card locks CSV here, or click to browse
              </template>
            </div>
          </div>

          <div class="upload-help-section">
            <button
              class="btn-help-toggle"
              type="button"
              @click="helpExpanded = !helpExpanded"
            >
              {{ helpExpanded ? "Hide instructions" : "Show instructions" }}
            </button>
            <div v-if="helpExpanded" class="upload-help-content">
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
          </div>
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
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useCardStore } from "@/stores/useCardStore";
import { useMissionStore } from "@/stores/useMissionStore";

const cardStore = useCardStore();
const missionStore = useMissionStore();

const hasShopCards = computed(() => cardStore.hasShopCards);
const isDefaultData = computed(() => cardStore.isDefaultData);

// User Cards drop zone
const shopFileInput = ref<HTMLInputElement | null>(null);
const shopDragging = ref(false);
let shopDragCounter = 0;

function onShopDragEnter() {
  shopDragCounter++;
  shopDragging.value = true;
}

function onShopDragLeave() {
  if (--shopDragCounter === 0) shopDragging.value = false;
}

async function onShopDrop(e: DragEvent) {
  shopDragCounter = 0;
  shopDragging.value = false;
  const file = e.dataTransfer?.files[0];
  if (file) await processShopFile(file);
}

async function handleShopFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) await processShopFile(file);
}

async function processShopFile(file: File) {
  await cardStore.uploadShopFile(file);
  await missionStore.initialize();
  const closeBtn = document.querySelector(
    '#cardUploaderModal [data-bs-dismiss="modal"]',
  );
  if (closeBtn instanceof HTMLElement) closeBtn.click();
}

async function clearShopCards() {
  await cardStore.clearShopCards();
  await missionStore.initialize();
}

// Card Locks drop zone
const lockFileInput = ref<HTMLInputElement | null>(null);
const lockDragging = ref(false);
let lockDragCounter = 0;

function onLockDragEnter() {
  if (isDefaultData.value) return;
  lockDragCounter++;
  lockDragging.value = true;
}

function onLockDragLeave() {
  if (--lockDragCounter === 0) lockDragging.value = false;
}

async function onLockDrop(e: DragEvent) {
  lockDragCounter = 0;
  lockDragging.value = false;
  if (isDefaultData.value) return;
  const file = e.dataTransfer?.files[0];
  if (file) await processLockFile(file);
}

async function handleLockFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) await processLockFile(file);
}

async function processLockFile(file: File) {
  await cardStore.uploadUserFile(file);
  await missionStore.initialize();
}

// Help
const helpExpanded = ref(false);
</script>

<style scoped>
.upload-drop-zone {
  border: 2px dashed #cbd5e1;
  border-radius: 8px;
  padding: 3rem 2rem;
  text-align: center;
  cursor: pointer;
  background: #fff;
  color: #64748b;
  font-size: 0.9rem;
  transition:
    border-color 0.15s,
    background 0.15s;
  margin-bottom: 0.5rem;
}

.upload-drop-zone:hover,
.upload-drop-zone--active {
  border-color: #22c55e;
  background: #f0fdf4;
  color: #1e293b;
}

.upload-drop-zone--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.clear-btn-row {
  text-align: center;
  margin-top: 0.5rem;
}

.upload-help-section {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 0.75rem;
}

.btn-help-toggle {
  background: none;
  border: none;
  padding: 0;
  font-size: 0.85rem;
  color: #94a3b8;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.btn-help-toggle:hover {
  color: #cbd5e1;
}

.upload-help-content {
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.upload-help-body {
  font-size: 0.875rem;
  color: #cbd5e1;
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
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.12);
}
</style>
