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
          <button
            class="btn btn-sm btn-secondary mb-3"
            type="button"
            data-bs-toggle="modal"
            data-bs-target="#uploadHelpModal"
          >
            Upload Help
          </button>

          <div class="mb-3">
            <label class="form-label fw-semibold">User Cards</label>
            <div
              class="drop-zone"
              :class="{ 'drop-zone--active': shopDragging }"
              @dragenter.prevent="onShopDragEnter"
              @dragover.prevent
              @dragleave="onShopDragLeave"
              @drop.prevent="onShopDrop"
              @click="shopFileInput?.click()"
            >
              <input
                type="file"
                ref="shopFileInput"
                class="d-none"
                @change="handleShopFileChange"
              />
              Drop your card export CSV here, or click to browse
            </div>
            <button
              v-if="hasShopCards"
              class="btn btn-sm btn-danger mt-1"
              type="button"
              @click="clearShopCards"
            >
              Clear
            </button>
          </div>

          <div class="mb-3">
            <label class="form-label fw-semibold">Card Locks</label>
            <input
              type="file"
              class="form-control form-control-sm"
              :disabled="isDefaultData"
              @change="handleUserCardsUpload"
            />
            <span v-if="isDefaultData" class="text-muted small">
              Upload your card data first
            </span>
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

async function handleUserCardsUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    await cardStore.uploadUserFile(file);
    await missionStore.initialize();
  }
}
</script>

<style scoped>
.drop-zone {
  border: 2px dashed rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  padding: 2rem 1.5rem;
  text-align: center;
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s;
  margin-bottom: 0.75rem;
}

.drop-zone:hover,
.drop-zone--active {
  border-color: #4ade80;
  background: rgba(74, 222, 128, 0.06);
}
</style>
