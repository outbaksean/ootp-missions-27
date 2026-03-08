<template>
  <div
    class="modal fade"
    id="prereleaseStatusModal"
    tabindex="-1"
    aria-labelledby="prereleaseStatusModalLabel"
    aria-hidden="true"
  >
    <div class="modal-dialog modal-dialog-scrollable modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="prereleaseStatusModalLabel">
            PreRelease Status
          </h5>
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
            <p>Updated 3/7/2026</p>
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
                Added ability to set cards as owned or locked in the ui and the
                ability to override prices. Imported card shop data is still
                preferred but no longer needed.
              </li>
              <li>Highlights cards that are in multiple missions.</li>
              <li>
                The date missions were last uploaded is now shown on the site
                along with a mission notes modal for details on last uploaded
                missions.
              </li>
              <li>
                Added reward value, value of unlocked owned cards, and net value
                to complete for missions and groups.
              </li>
              <li>Added grouping by mission chain.</li>
              <li>Added combined remaining mission rewards to groups.</li>
              <li>Added Mission Search.</li>
              <li>
                UI Overhauled including responsive ui, this works on phones now.
              </li>
              <li>
                Added Shopping Mode that gives a buy list based on strategy, pp
                budget, and selected missions.
              </li>
            </ul>
            <h3>In Season Updates</h3>
            <ul>
              <li>
                When cards or updated or added I need to manually export card
                data from the game and import into the app, this will take well
                under an hour but requires manual work
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
                    I now have an OCR setup that I've used to extract all OOTP
                    26 missions. It still takes a while and needs manual input
                    but is much quicker than before. The OCR is likely to need
                    tweaking on release to account for ui updates but should
                    speed up mission extraction during the season.
                  </li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
