import { test, expect } from '@playwright/test'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * OOTP Missions 27 — UI Baseline Tests (Feb 2026)
 *
 * Captures the pre-redesign UI structure. Run these after a UI overhaul to
 * verify all major features still work even if the visual layout changes.
 *
 * Current UI shape:
 *  - Nav bar (cratervar.com link) + WIP banner
 *  - Collapsed upload panel (Upload card data + Help buttons)
 *  - Two header rows of controls above the mission list
 *    Row 1: Missions heading | Use Sell Price | Hide Completed
 *    Row 2: Search box | Target Mission dropdown | Category dropdown | Calculate All
 *  - Full-width mission list rows: name | progress | price | button
 *  - Mission detail panel replaces list when a mission is selected
 *  - Footer with GitHub link
 *
 * DB name: OOTPMissions27DB (distinct from the archived v26 app's OOTPMissionsDB)
 *
 * Speed strategy: intercept the shop_cards.csv request and return a 5-row stub.
 * The real CSV has 5,500 rows; with 250 missions the calculation takes 13-15s.
 * With 5 rows it completes in under 2s. Each test also clears IndexedDB so the
 * stub is always used (never the 5,500-row cached version).
 */

const minimalCsv = fs.readFileSync(
  path.join(__dirname, 'fixtures/shop_cards_minimal.csv'),
  'utf-8',
)

test.beforeEach(async ({ page }) => {
  // Clear any cached shop cards so the intercepted CSV is always used
  await page.goto('/ootp-missions-27/')
  await page.evaluate(() => new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase('OOTPMissions27DB')
    req.onsuccess = () => resolve()
    req.onerror = () => resolve()
  }))

  // Intercept the default CSV request and return the 5-row stub
  await page.route('**/data/shop_cards.csv', (route) =>
    route.fulfill({ contentType: 'text/csv', body: minimalCsv }),
  )

  await page.reload()
  await page.waitForSelector('.list-group-item', { timeout: 10000 })
})

// ---------------------------------------------------------------------------
// Page shell
// ---------------------------------------------------------------------------

test.describe('Page shell', () => {
  test('has correct title', async ({ page }) => {
    await expect(page).toHaveTitle('OOTP 27 Missions')
  })

  test('nav bar shows cratervar.com link', async ({ page }) => {
    await expect(page.getByRole('link', { name: /cratervar\.com/i })).toBeVisible()
  })

  test('WIP banner is visible', async ({ page }) => {
    await expect(page.locator('.wip-banner')).toBeVisible()
  })

  test('footer shows github link', async ({ page }) => {
    await expect(page.getByRole('link', { name: /github/i })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Upload bar
// ---------------------------------------------------------------------------

test.describe('Upload bar', () => {
  test('"Upload card data" and "Help" buttons are visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Upload card data' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Help' })).toBeVisible()
  })

  test('shows "Shop cards are loaded." after default data initialises', async ({ page }) => {
    await expect(page.getByText('Shop cards are loaded.')).toBeVisible()
  })

  test('upload panel is collapsed by default', async ({ page }) => {
    await expect(page.locator('#cardUploaderCollapse')).not.toBeVisible()
  })

  test('upload panel expands to show Shop Cards and User Cards inputs', async ({ page }) => {
    await page.getByRole('button', { name: 'Upload card data' }).click()
    await expect(page.getByText('Shop Cards:')).toBeVisible()
    await expect(page.getByText('User Cards:')).toBeVisible()
  })

  test('help modal opens and shows a close button', async ({ page }) => {
    await page.getByRole('button', { name: 'Help' }).click()
    await expect(page.getByRole('heading', { name: 'Help' })).toBeVisible()
    // Modal has two close controls: ✕ icon and a text "Close" button
    await expect(page.locator('.modal.show .btn-secondary', { hasText: 'Close' })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Mission controls
// ---------------------------------------------------------------------------

test.describe('Mission controls', () => {
  test('Missions heading is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Missions' })).toBeVisible()
  })

  test('"Use Sell Price" and "Hide Completed" toggles are present', async ({ page }) => {
    await expect(page.getByText('Use Sell Price')).toBeVisible()
    await expect(page.getByText('Hide Completed')).toBeVisible()
  })

  test('search box is present', async ({ page }) => {
    await expect(page.getByPlaceholder('Search missions...')).toBeVisible()
  })

  test('Target Mission and Category dropdowns are present', async ({ page }) => {
    await expect(page.getByLabel('Target Mission')).toBeVisible()
    await expect(page.getByLabel('Category')).toBeVisible()
  })

  test('"Calculate All" button is present', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Calculate All/i })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Mission list
// ---------------------------------------------------------------------------

test.describe('Mission list', () => {
  test('renders more than five missions', async ({ page }) => {
    const count = await page.locator('.list-group-item').count()
    expect(count).toBeGreaterThan(5)
  })

  test('known missions appear in the list', async ({ page }) => {
    await expect(page.getByText('First Victims')).toBeVisible()
    await expect(page.getByText('Call-Ups')).toBeVisible()
    await expect(page.getByText('Immortal Relievers')).toBeVisible()
  })

  test('each row has a bold name, progress indicator, price field, and action button', async ({
    page,
  }) => {
    const row = page.locator('.list-group-item').first()
    await expect(row.locator('strong')).not.toBeEmpty()
    await expect(row.locator('.text-danger, .text-success')).toBeVisible()
    await expect(row.locator('.progress-text')).toBeVisible()
    await expect(row.locator('button')).toBeVisible()
  })

  test('each row shows a reward line below the name', async ({ page }) => {
    await expect(page.locator('.list-group-item').first().locator('.reward-text')).not.toBeEmpty()
  })

  test('count missions show "out of" progress immediately (no Calculate needed)', async ({
    page,
  }) => {
    const row = page.locator('.list-group-item', { hasText: 'First Victims' })
    await expect(row.locator('.text-danger, .text-success')).toContainText('out of')
  })

  test('count missions have a Select button', async ({ page }) => {
    const row = page.locator('.list-group-item', { hasText: 'First Victims' })
    await expect(row.getByRole('button', { name: 'Select' })).toBeVisible()
  })

  test('points missions show "Not Calculated" and a Calculate button', async ({ page }) => {
    const row = page.locator('.list-group-item', { hasText: 'Call-Ups' })
    await expect(row.locator('.text-danger')).toHaveText('Not Calculated')
    await expect(row.getByRole('button', { name: 'Calculate' })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Mission selection
// ---------------------------------------------------------------------------

test.describe('Mission selection', () => {
  test('clicking Select collapses the list and shows the detail panel', async ({ page }) => {
    await page
      .locator('.list-group-item', { hasText: 'First Victims' })
      .getByRole('button', { name: 'Select' })
      .click()

    await expect(page.locator('.toggle-icon')).toBeVisible()
    await expect(page.locator('.mission-details')).toBeVisible()
    await expect(page.locator('.mission-list')).not.toBeVisible()
  })

  test('clicking the toggle icon re-expands the mission list', async ({ page }) => {
    await page
      .locator('.list-group-item', { hasText: 'First Victims' })
      .getByRole('button', { name: 'Select' })
      .click()

    await page.locator('.toggle-icon').click()
    await expect(page.locator('.mission-list')).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

test.describe('Filters', () => {
  test('search box narrows the mission list', async ({ page }) => {
    const allCount = await page.locator('.list-group-item').count()
    await page.getByPlaceholder('Search missions..').fill('Immortal')
    const filteredCount = await page.locator('.list-group-item').count()
    // Search matches on name OR category, so count should drop but not to zero
    expect(filteredCount).toBeLessThan(allCount)
    expect(filteredCount).toBeGreaterThan(0)
  })

  test('clearing search restores the full list', async ({ page }) => {
    const allCount = await page.locator('.list-group-item').count()
    await page.getByPlaceholder('Search missions..').fill('Immortal')
    await page.getByPlaceholder('Search missions..').fill('')
    expect(await page.locator('.list-group-item').count()).toBe(allCount)
  })

  test('category dropdown has "All Categories" plus at least one real category', async ({
    page,
  }) => {
    const select = page.getByLabel('Category')
    await expect(select.getByRole('option', { name: 'All Categories' })).toBeAttached()
    expect(await select.locator('option').count()).toBeGreaterThan(1)
  })

  test('selecting a category filters the list', async ({ page }) => {
    const allCount = await page.locator('.list-group-item').count()
    const secondOption = page.getByLabel('Category').locator('option').nth(1)
    await page.getByLabel('Category').selectOption(await secondOption.getAttribute('value') ?? '')
    expect(await page.locator('.list-group-item').count()).toBeLessThan(allCount)
  })

  test('Hide Completed removes completed missions from the list', async ({ page }) => {
    const allCount = await page.locator('.list-group-item').count()
    await page
      .locator('.form-check', { hasText: 'Hide Completed' })
      .locator('input[type=checkbox]')
      .check()
    expect(await page.locator('.list-group-item').count()).toBeLessThanOrEqual(allCount)
  })
})
