<template>
  <div
    class="modal fade"
    id="uploadHelpModal"
    tabindex="-1"
    aria-labelledby="uploadHelpModalLabel"
    aria-hidden="true"
  >
    <div class="modal-dialog modal-dialog-scrollable modal-lg">
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
            To get the latest price and ownership data, from the card shop, with
            no filters on click Export Card List to CSV.
          </p>
          <img
            src="/OotpExportShopCards.jpg"
            alt="Shop Cards Export Help"
            class="img-fluid mb-3"
          />
          <p class="text-muted mx-3 mb-3">
            To export your locked card data, add "PT Card ID" and "PT Lock" to a
            view and with no filters click Report, Write report to csv. This is
            only for displaying locked cards, owned cards come from the shop
            csv.
          </p>
          <p class="text-danger mx-3 mb-3">
            Note: If you have more than 8190 cards exports will be paginated
            essentially making exporting your card inventory impossible. If you
            want locked status to be displayed and are over the limit, I
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
</template>
