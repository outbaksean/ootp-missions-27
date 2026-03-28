<template>
  <div
    class="modal fade"
    id="missionNotesModal"
    tabindex="-1"
    aria-labelledby="missionNotesModalLabel"
    aria-hidden="true"
  >
    <div class="modal-dialog modal-dialog-scrollable modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="missionNotesModalLabel">Mission Notes</h5>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div class="modal-body">
          <p class="text-muted">Updated {{ missionsVersion }}</p>
          <p>All missions from release are included. All done on 3/13/2026.</p>
          <p>
            For release I updated default pack values upwards, they're total
            guesses.
          </p>
          <p>
            Note: Many mission card rewards are variants, they're currently
            being shown and valued as their base card. I plan to update that but
            it's tricky both technically and from a user experience perspective.
          </p>
          <p>
            Adding missions is mostly a manual process, please be patient if I
            fall behind. If you'd like to give help with mission updates please
            reach out on Discord, my ID is 247169022242717699 (Roenel)
          </p>
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
defineProps<{
  missionsVersion: string;
}>();
</script>
