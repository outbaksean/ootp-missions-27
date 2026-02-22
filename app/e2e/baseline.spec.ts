import { test, expect } from '@playwright/test'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * OOTP Missions 27 — UI Baseline Tests (Feb 2026, post-redesign)
 *
 * Layout after redesign:
 *  - Nav bar (cratervar.com link) + WIP banner
 *  - Three-panel layout:
 *    Left sidebar (230px): upload status/buttons, search, category dropdown,
 *      target mission dropdown, Use Sell Price toggle, Hide Completed toggle,
 *      Calculate All button
 *    Main panel: scrollable mission card list
 *    Detail panel (360px): appears when a mission is selected, shows cards/sub-missions
 *  - Footer with GitHub link
 *
 * Speed strategy: intercept the shop_cards.csv request and return a 5-row stub.
 */

const minimalCsv = fs.readFileSync(
  path.join(__dirname, 'fixtures/shop_cards_minimal.csv'),
  'utf-8',
)

test.beforeEach(async ({ page }) => {
  await page.goto('/ootp-missions-27/')
  await page.evaluate(() =>
    new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase('OOTPMissions27DB')
      req.onsuccess = () => resolve()
      req.onerror = () => resolve()
    }),
  )

  await page.route('**/data/shop_cards.csv', (route) =>
    route.fulfill({ contentType: 'text/csv', body: minimalCsv }),
  )

  await page.reload()
  await page.waitForSelector('.mission-card', { timeout: 10000 })
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
// Upload section (sidebar)
// ---------------------------------------------------------------------------

test.describe('Upload section', () => {
  test('"Upload" and "Help" buttons are visible in the sidebar', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Upload' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Help' })).toBeVisible()
  })

  test('shows loaded status after default data initialises', async ({ page }) => {
    await expect(page.getByText('✓ Cards loaded')).toBeVisible()
  })

  test('file inputs are hidden by default when cards are loaded', async ({ page }) => {
    await expect(page.locator('#shopCardsFile')).not.toBeVisible()
    await expect(page.locator('#userCardsFile')).not.toBeVisible()
  })

  test('clicking Upload reveals Shop Cards and User Cards inputs', async ({ page }) => {
    await page.getByRole('button', { name: 'Upload' }).click()
    await expect(page.locator('#shopCardsFile')).toBeVisible()
    await expect(page.locator('#userCardsFile')).toBeVisible()
  })

  test('help modal opens and shows a close button', async ({ page }) => {
    await page.getByRole('button', { name: 'Help' }).click()
    await expect(page.getByRole('heading', { name: 'Help' })).toBeVisible()
    await expect(page.locator('.modal.show .btn-secondary', { hasText: 'Close' })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Sidebar controls
// ---------------------------------------------------------------------------

test.describe('Sidebar controls', () => {
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
    const count = await page.locator('.mission-card').count()
    expect(count).toBeGreaterThan(5)
  })

  test('known missions appear in the list', async ({ page }) => {
    await expect(page.getByText('First Victims')).toBeVisible()
    await expect(page.getByText('Call-Ups')).toBeVisible()
    await expect(page.getByText('Immortal Relievers')).toBeVisible()
  })

  test('each card has a name, progress bar, and action button', async ({ page }) => {
    const card = page.locator('.mission-card').first()
    await expect(card.locator('.card-name')).not.toBeEmpty()
    await expect(card.locator('.progress-track')).toBeVisible()
    await expect(card.locator('button')).toBeVisible()
  })

  test('each card shows a reward line', async ({ page }) => {
    await expect(page.locator('.mission-card').first().locator('.card-reward')).not.toBeEmpty()
  })

  test('count missions show progress text immediately (no Calculate needed)', async ({ page }) => {
    const card = page.locator('.mission-card', { hasText: 'First Victims' })
    await expect(card.locator('.progress-label')).not.toHaveText('Not calculated')
  })

  test('count missions have a Select button', async ({ page }) => {
    const card = page.locator('.mission-card', { hasText: 'First Victims' })
    await expect(card.getByRole('button', { name: 'Select' })).toBeVisible()
  })

  test('points missions show "Not calculated" and a Calculate button', async ({ page }) => {
    const card = page.locator('.mission-card', { hasText: 'Call-Ups' })
    await expect(card.locator('.progress-label')).toHaveText('Not calculated')
    await expect(card.getByRole('button', { name: 'Calculate' })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Mission selection (side panel)
// ---------------------------------------------------------------------------

test.describe('Mission selection', () => {
  test('clicking Select shows the detail panel alongside the list', async ({ page }) => {
    await page
      .locator('.mission-card', { hasText: 'First Victims' })
      .getByRole('button', { name: 'Select' })
      .click()

    await expect(page.locator('.detail-panel')).toBeVisible()
    // List remains visible (side-by-side layout)
    await expect(page.locator('.list-panel')).toBeVisible()
  })

  test('detail panel shows the mission name', async ({ page }) => {
    await page
      .locator('.mission-card', { hasText: 'First Victims' })
      .getByRole('button', { name: 'Select' })
      .click()

    await expect(page.locator('.detail-panel')).toContainText('First Victims')
  })

  test('close button dismisses the detail panel', async ({ page }) => {
    await page
      .locator('.mission-card', { hasText: 'First Victims' })
      .getByRole('button', { name: 'Select' })
      .click()

    await page.locator('.close-btn').click()
    await expect(page.locator('.detail-panel')).not.toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

test.describe('Filters', () => {
  test('search box narrows the mission list', async ({ page }) => {
    const allCount = await page.locator('.mission-card').count()
    await page.getByPlaceholder('Search missions...').fill('Immortal')
    const filteredCount = await page.locator('.mission-card').count()
    expect(filteredCount).toBeLessThan(allCount)
    expect(filteredCount).toBeGreaterThan(0)
  })

  test('clearing search restores the full list', async ({ page }) => {
    const allCount = await page.locator('.mission-card').count()
    await page.getByPlaceholder('Search missions...').fill('Immortal')
    await page.getByPlaceholder('Search missions...').fill('')
    expect(await page.locator('.mission-card').count()).toBe(allCount)
  })

  test('category dropdown has "All Categories" plus at least one real category', async ({
    page,
  }) => {
    const select = page.getByLabel('Category')
    await expect(select.getByRole('option', { name: 'All Categories' })).toBeAttached()
    expect(await select.locator('option').count()).toBeGreaterThan(1)
  })

  test('selecting a category filters the list', async ({ page }) => {
    const allCount = await page.locator('.mission-card').count()
    const secondOption = page.getByLabel('Category').locator('option').nth(1)
    await page.getByLabel('Category').selectOption((await secondOption.getAttribute('value')) ?? '')
    expect(await page.locator('.mission-card').count()).toBeLessThan(allCount)
  })

  test('Hide Completed removes completed missions from the list', async ({ page }) => {
    const allCount = await page.locator('.mission-card').count()
    await page.locator('.toggle-label', { hasText: 'Hide Completed' }).locator('input').check()
    expect(await page.locator('.mission-card').count()).toBeLessThanOrEqual(allCount)
  })
})
