# Playwright E2E Tests

## Running the tests

```bash
cd app

# First time only — install the Chromium browser binary
npx playwright install chromium

# Run all e2e tests (opens a browser window, reuses your dev server if running)
npm run test:e2e

# Chromium only, single file
npm run test:e2e -- --project=chromium e2e/baseline.spec.ts

# Debug mode — pauses at each step so you can inspect the page
npm run test:e2e -- --debug

# Open the last HTML report (test results + traces)
npx playwright show-report
```

The dev server must be running (`npm run dev`) or Playwright will start it automatically.
On CI the preview server is used instead (`npm run preview` after `npm run build`).

> **Run time:** The full suite runs in roughly **1–2 minutes** (28 tests × ~3s each).

---

## Test file index

| File | Purpose |
|------|---------|
| `e2e/baseline.spec.ts` | Pre-redesign UI snapshot (Feb 2026). Verifies the shape of the app before a UI overhaul. |
| `e2e/fixtures/shop_cards_minimal.csv` | 5-row stub CSV served to the app in place of the real 5,500-row file. |

---

## How the speed strategy works

The real `shop_cards.csv` has 5,500 rows. With 250 missions, the app's initialisation
calculates card lookups across the full set — taking 13–15s per page load regardless of
whether the CSV comes from the network or IndexedDB.

Each `beforeEach`:
1. Clears `OOTPMissions27DB` from IndexedDB (so the app always fetches fresh).
2. Registers a `page.route` intercept on `**/data/shop_cards.csv` that returns
   `e2e/fixtures/shop_cards_minimal.csv` (5 rows, correct headers).
3. Reloads the page — the app processes 5 rows instead of 5,500 and renders in ~2s.

> **Note:** `storageState` (Playwright's built-in auth helper) does **not** capture
> IndexedDB — only cookies and localStorage. It can't be used to pre-seed this app.

---

## What `baseline.spec.ts` covers

The worker fixture seeds IndexedDB before the first test. Each `beforeEach` navigates to
the page and waits for the mission list to render.

| Group | Tests |
|-------|-------|
| **Page shell** | Title, nav cratervar link, WIP banner, footer GitHub link |
| **Upload bar** | Buttons visible, "Shop cards are loaded." message, panel collapsed by default, panel expands to show file inputs, help modal opens |
| **Mission controls** | Missions heading, Use Sell Price + Hide Completed toggles, search box, Target Mission + Category dropdowns, Calculate All button |
| **Mission list** | More than 5 missions rendered, specific known missions present, row structure (name / progress / price / button), reward text below name, count missions show "out of" progress immediately, count missions have Select button, points missions show "Not Calculated" with Calculate button |
| **Mission selection** | Select collapses list and shows detail panel, toggle icon re-expands list |
| **Filters** | Search narrows list (matches name OR category), clearing search restores list, Category dropdown options, selecting a category filters, Hide Completed toggle |

---

## Adding tests

1. Import `test` and `expect` from `'@playwright/test'` — no custom fixture needed.
2. The `beforeEach` in `baseline.spec.ts` clears IndexedDB and intercepts the CSV for
   every test. New tests in the same file inherit this automatically.
3. For a new spec file, copy the `beforeEach` block (or the route-only part if you don't
   need a fully clean state).
4. To test a specific CSV upload, use `page.setInputFiles` instead of relying on the
   route intercept:
   ```ts
   await page.getByRole('button', { name: 'Upload card data' }).click()
   await page.locator('#shopCardsFile').setInputFiles('e2e/fixtures/shop_cards_minimal.csv')
   await page.waitForSelector('.list-group-item')
   ```
5. Prefer role/text/placeholder selectors over CSS classes — class names will change during
   the redesign; semantic selectors are more resilient.

---

## Updating tests after the UI overhaul

The baseline tests use **behavioural selectors**, not pixel snapshots, so layout changes
alone won't break them. When you do the overhaul:

- Tests that check **CSS classes** (`.wip-banner`, `.mission-list`, `.toggle-icon`,
  `.mission-details`, `.reward-text`, `.progress-text`) will need updating if those classes
  are renamed or removed.
- Tests that check **text labels** ("Use Sell Price", "Hide Completed", "Calculate All", etc.)
  will need updating if copy changes.
- Everything else (title, GitHub link, mission names, row count, filter behaviour) should
  pass without changes.

A useful workflow during the overhaul:

```bash
# Interactive UI mode — re-runs tests as you edit components
npm run test:e2e -- --project=chromium --ui
```

---

## CI

The playwright config automatically runs headless on CI and uses the preview server. Add
this to a GitHub Actions workflow:

```yaml
- name: Install Playwright browsers
  run: npx playwright install --with-deps chromium
  working-directory: app

- name: Build
  run: npm run build
  working-directory: app

- name: Run e2e tests
  run: npm run test:e2e -- --project=chromium
  working-directory: app
```

---

## Files generated by Playwright (gitignored)

```
app/test-results/      # Screenshots and traces on failure
app/playwright-report/ # HTML report from the last run
```
