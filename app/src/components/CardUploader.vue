<template>
  <div class="card-uploader container mt-4">
    <button
      class="btn btn-primary mb-3 mx-3"
      type="button"
      data-bs-toggle="collapse"
      data-bs-target="#cardUploaderCollapse"
      aria-expanded="false"
      aria-controls="cardUploaderCollapse"
    >
      Upload card data</button
    ><button
      class="btn btn-info mb-3 mx-3"
      type="button"
      data-bs-toggle="modal"
      data-bs-target="#helpModal"
    >
      Help</button
    ><span class="text-muted">{{ loadedMessage }}</span>

    <div class="collapse" id="cardUploaderCollapse">
      <div class="d-flex align-items-center justify-content-between">
        <div class="d-flex align-items-center">
          <label for="shopCardsFile" class="form-label me-2">Shop Cards:</label>
          <input
            type="file"
            id="shopCardsFile"
            class="form-control me-2"
            @change="handleShopCardsUpload"
          />
          <button v-if="hasShopCards" class="btn btn-danger me-2" @click="clearShopCards">
            Clear
          </button>
        </div>
        <div class="d-flex align-items-center">
          <label for="userCardsFile" class="form-label me-2">User Cards:</label>
          <input
            type="file"
            id="userCardsFile"
            class="form-control me-2"
            @change="handleUserCardsUpload"
          />
        </div>
      </div>
    </div>

    <!-- Help Modal -->
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
              To get the latest price and ownership data, from the card shop, with no filters on
              click Export Card List to CSV.
            </p>
            <img
              src="/OotpExportShopCards.jpg"
              alt="Shop Cards Export Help"
              class="img-fluid mb-3"
            />
            <p class="text-muted mx-3 mb-3">
              To export your locked card data, add "PT Card ID" and "PT Lock" to a view and with no
              filters click Report, Write report to csv. This is only for displaying locked cards,
              owned cards come from the shop csv.
            </p>
            <p class="text-danger mx-3 mb-3">
              Note: If you have more than 8190 cards exports will be paginated essentially making
              exporting your card inventory impossible. If you want locked status to be displayed
              and are over the limit, I recommend quickselling duplicates to get under the limit.
            </p>
            <img src="/OotpUserCardView.jpg" alt="User Card View Help" class="img-fluid" />
            <img
              src="/OotpExportUserCards.jpg"
              alt="User Cards Export Help"
              class="img-fluid mb-3"
            />
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCardStore } from '@/stores/useCardStore'
import { useMissionStore } from '@/stores/useMissionStore'
import { computed } from 'vue'

const cardStore = useCardStore()
const missionStore = useMissionStore()

const hasShopCards = computed(() => cardStore.hasShopCards)

const loadedMessage = computed(() => {
  if (hasShopCards.value) return 'Shop cards are loaded.'
  return 'No cards loaded.'
})

const handleShopCardsUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) {
    await cardStore.uploadShopFile(file)
    await missionStore.initialize()
  }
}

const clearShopCards = async () => {
  await cardStore.clearShopCards()
  await missionStore.initialize()
}

const handleUserCardsUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) {
    await cardStore.uploadUserFile(file)
  }
}
</script>
