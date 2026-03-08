<template>
  <div
    class="modal fade"
    id="appHelpModal"
    tabindex="-1"
    aria-labelledby="appHelpModalLabel"
    aria-hidden="true"
  >
    <div class="modal-dialog modal-dialog-scrollable modal-lg">
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
          <details open>
            <summary>Overview</summary>
            <p>
              This app helps you plan the cheapest path to completing OOTP
              Perfect Team missions. Upload your card shop export (and optional
              lock export), then calculate mission costs, compare rewards, and
              decide which missions are worth finishing. The app can also
              account for the opportunity cost of locking owned cards and can
              optimize which cards to buy vs lock.
            </p>
            <p>
              All calculations are local to your browser. Data is stored in your
              browser so your custom prices and lock status persist between
              visits.
            </p>
          </details>

          <details open>
            <summary>Uploading data</summary>
            <p>
              Start by exporting your card shop list with no filters and upload
              the CSV under User Cards. This provides prices and owned status.
              If you want lock status displayed, also export your locked card
              report with PT Card ID and PT Lock columns and upload it under
              Card Locks.
            </p>
            <p>
              You can manually set prices and owned and locked status in the
              mission details panel without any uploads, but uploads are
              recommended for accurate prices and faster setup.
            </p>
            <ul>
              <li>User Cards: required for accurate prices and ownership.</li>
              <li>Card Locks: optional, adds locked status and unlock cost.</li>
              <li>
                Large inventories may be paginated by the game making the locked
                cards export useless. In that case you can either quicksell
                duplicates to get under the limit or manually set locked status
                in the app. This does not apply to owned status as that comes
                from the shop export which doesn't have this issue.
              </li>
            </ul>
          </details>

          <details open>
            <summary>Mission list</summary>
            <p>
              Each row shows an overview of mission completion cost and value.
              Calculations update automatically as data and settings change.
            </p>
            <ul>
              <li>Remaining: cost to acquire cards marked Buy in details.</li>
              <li>Unlock Cost: sell value of owned cards marked Use.</li>
              <li>
                Reward: market value of the mission prize. Set pack values in
                the sidebar to override the default pack rewards.
              </li>
              <li>
                Net: Reward minus Remaining. When Include unlocked cards is
                enabled, Unlock Cost is also subtracted.
              </li>
              <li>
                Group rows summarize totals for the visible missions when
                grouped by chain or category.
              </li>
            </ul>
          </details>

          <details open>
            <summary>Mission details</summary>
            <p>
              The detail panel shows every card in the mission, sorted unowned
              (cheapest first), then owned unlocked, then locked.
            </p>
            <ul>
              <li>Buy: card is included in the calculated purchase list.</li>
              <li>
                Use: card is owned and the optimizer recommends locking it.
              </li>
              <li>Owned / Locked: current status badges with quick actions.</li>
              <li>
                Price field: override a card price to include it in calculations
                or adjust value.
              </li>
              <li>N other missions: shows where else the card appears.</li>
              <li>
                Set Completed: manual completion for missions you can finish.
                This does not change the lock status of any cards.
              </li>
            </ul>
          </details>

          <details open>
            <summary>Preferences</summary>
            <p>
              Use the sidebar toggles and selectors to control how missions are
              filtered and how costs are calculated.
            </p>
            <ul>
              <li>
                Group by: None (flat list), Chain (parent mission groups), or
                Category (in-game category).
              </li>
              <li>
                Target Mission: limits the list to missions that feed a selected
                chain.
              </li>
              <li>
                Sort by: Default, Remaining Price, Mission Value, or Name.
              </li>
              <li>
                Use Sell Price: uses lowest active sell order instead of last 10
                price.
              </li>
              <li>Hide Completed: removes finished missions from the list.</li>
              <li>
                Positive Value Only: shows only missions with positive net.
              </li>
              <li>
                Include unlocked cards in net value: subtracts unlock cost from
                net to reflect the full cost of locking owned cards.
              </li>
              <li>
                Optimize card assignment: finds the cheapest mix of buying and
                locking instead of always buying unowned cards.
              </li>
              <li>
                Sell - Buy difference: adjusts the opportunity cost of locking
                owned cards based on tax and market spread.
              </li>
              <li>Pack Values: set PP values for reward calculation.</li>
            </ul>
          </details>

          <details open>
            <summary>Shopping mode</summary>
            <p>
              The Shopping List panel turns your in-scope mission set into a
              single card-by-card buy plan. It supports two planning strategies
              and optional budget limits.
            </p>
            <ul>
              <li>
                Mission Value: prioritizes missions with the best net value
                first and excludes negative-value missions.
              </li>
              <li>
                Mission Completion: prioritizes completing missions attempting
                to complete all missions by lowest cost first.
              </li>
              <li>
                Available PP: Sets the max amount of PP to spend on cards.
                Defaults to unlimited.
              </li>
              <li>
                Included Missions: follows your Include selections and
                automatically includes descendant missions for chains.
              </li>
              <li>
                Exclusion warnings explain missions skipped due to
                non-completable cards, negative value rules, or budget.
              </li>
              <li>
                Export buttons generate a CSV card list or a full HTML report
                with summary and exclusions.
              </li>
            </ul>
          </details>
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
