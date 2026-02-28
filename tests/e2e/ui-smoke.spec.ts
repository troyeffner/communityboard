import { expect, test, type Page } from '@playwright/test'

async function assertNoHorizontalOverflow(page: Page) {
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('Viewport size unavailable')
  const pageScrollWidth = await page.evaluate(() => {
    const bodyWidth = document.body?.scrollWidth || 0
    const docWidth = document.documentElement?.scrollWidth || 0
    return Math.max(bodyWidth, docWidth)
  })
  expect(pageScrollWidth).toBeLessThanOrEqual(viewport.width)
}

test.describe('CommunityBoard Verification Guardrails', () => {
  test('home page at 390x844 has visible nav and no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await expect(page.locator('a[href="/submit"]')).toBeVisible()
    await expect(page.locator('a[href="/businesses"]')).toBeVisible()
    await assertNoHorizontalOverflow(page)
  })

  test('home page at 430x932 has visible nav and no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 })
    await page.goto('/')
    await expect(page.locator('a[href="/submit"]')).toBeVisible()
    await expect(page.locator('a[href="/businesses"]')).toBeVisible()
    await assertNoHorizontalOverflow(page)
  })

  test('poster view at 390x844 has stage, navigation, no overflow, and snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/poster/e2e-fixture')

    await expect(page.locator('a[href="/"]')).toBeVisible()
    await expect(page.locator('a[href^="/browse"]')).toBeVisible()

    const stage = page.getByTestId('poster-stage')
    await expect(stage).toBeVisible()
    const stageBox = await stage.boundingBox()
    expect(stageBox?.width || 0).toBeGreaterThan(0)
    expect(stageBox?.height || 0).toBeGreaterThan(0)
    await assertNoHorizontalOverflow(page)

    await expect(page).toHaveScreenshot('poster-view-mobile.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('builder create at 1024x768 has visible navigation and no overflow', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.goto('/builder/create')

    const shell = page.getByTestId('builder-create-panels')
    await expect(shell).toBeVisible()
    await expect(page.getByTestId('builder-panel-submissions').locator('a[href="/builder/create"]')).toBeVisible()
    await expect(page.getByTestId('builder-panel-submissions').locator('a[href="/builder/tend"]')).toBeVisible()
    await expect(page.getByTestId('builder-panel-workspace')).toBeVisible()

    await assertNoHorizontalOverflow(page)
  })

  test('builder create at 1440x900 has visible navigation, no overflow, and snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/builder/create')

    const shell = page.getByTestId('builder-create-panels')
    await expect(shell).toBeVisible()
    await expect(page.getByTestId('builder-panel-submissions').locator('a[href="/builder/create"]')).toBeVisible()
    await expect(page.getByTestId('builder-panel-submissions').locator('a[href="/builder/tend"]')).toBeVisible()
    await expect(page.getByTestId('builder-panel-workspace')).toBeVisible()

    await assertNoHorizontalOverflow(page)

    await expect(page).toHaveScreenshot('builder-create-desktop.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })
})
