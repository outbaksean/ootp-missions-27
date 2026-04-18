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
            4/17/2026 - Live Update 1. Added the new 23 live cards to live
            missions. Done on 4/18/2026.
          </p>
          <p>
            4/16/2026 - Negro Leagues missions. Added the 15 new "Negro Leagues"
            category missions in the Jackie Robinson and Satchel Paige Chains.
            Done on 4/16/2026.
          </p>
          <p>
            4/9/2026 - Albert Pujols missions. Added the 8 new "Bonus Rewards"
            category missions in the Albert Pujols Chain. Done on 4/11/2026.
          </p>
          <p>
            3/23/2026 - Packs missions. Added the 4 new "Packs" category
            missions. Done on 3/28/2026.
          </p>
          <p>
            3/5/2026 - Initial Release. All initial missions are included. Done
            on 3/13/2026.
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
