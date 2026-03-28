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
          <p>
            All missions from the first missions drop on 3/23/2026 are included.
            All done on 3/28/2026.
          </p>
          <p>Added the 4 new "Packs" category missions.</p>
          <p>
            Updated the Phillies live missions to replace Johan Rojas with Bryse
            Wilson to match the change in game.
          </p>
          <p>
            Changed default artifact price to 0. Hid pack values that aren't
            mission rewards yet. Fixed sticker rewards to match what's in game.
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
