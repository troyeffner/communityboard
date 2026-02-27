import { expect, test, type Page } from '@playwright/test'

async function assertNoHorizontalOverflow(page: Page) {
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('Viewport size unavailable')
  const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth)
  expect(bodyScrollWidth).toBeLessThanOrEqual(viewport.width)
}

async function assertPosterStageFits(page: Page) {
  const stage = page.getByTestId('poster-stage')
  await expect(stage).toBeVisible()

  const fits = await page.evaluate(() => {
    const stageEl = document.querySelector('[data-testid="poster-stage"]') as HTMLElement | null
    if (!stageEl) return false
    const container = stageEl.parentElement as HTMLElement | null
    if (!container) return false
    const stageRect = stageEl.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    return stageRect.width <= containerRect.width + 1 && stageRect.height <= containerRect.height + 1
  })

  expect(fits).toBe(true)
}

test.describe('CommunityBoard Verification Guardrails', () => {
  test('home page at 390x844 has visible nav and no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'Submit a poster photo' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Browse Businesses & Services' })).toBeVisible()
    await assertNoHorizontalOverflow(page)
  })

  test('home page at 430x932 has visible nav and no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 })
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'Submit a poster photo' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Browse Businesses & Services' })).toBeVisible()
    await assertNoHorizontalOverflow(page)
  })

  test('poster view at 390x844 has stage, navigation, no overflow, and snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/poster/e2e-fixture')

    await expect(page.getByRole('link', { name: /Return to Community Board/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Browse posters/ })).toBeVisible()

    await assertPosterStageFits(page)
    await assertNoHorizontalOverflow(page)

    await expect(page).toHaveScreenshot('poster-view-mobile.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('builder create at 1024x768 has visible navigation and no overflow', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.goto('/builder/create')

    await expect(page.getByRole('link', { name: 'Create drafts' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Pin to board' })).toBeVisible()

    await assertNoHorizontalOverflow(page)
  })

  test('builder create at 1440x900 has visible navigation, no overflow, and snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/builder/create')

    await expect(page.getByRole('link', { name: 'Create drafts' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Pin to board' })).toBeVisible()

    await assertNoHorizontalOverflow(page)

    await expect(page).toHaveScreenshot('builder-create-desktop.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })
})

// --- Visual Regression Freeze ---
test('poster view visual snapshot', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/poster/e2e-fixture')
  await expect(page).toHaveScreenshot('poster-view-mobile.png', { fullPage: true })
})

test('builder create visual snapshot', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/builder/create')
  await expect(page).toHaveScreenshot('builder-create-desktop.png', { fullPage: true })
})
