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

  test('poster view at 390x844 has shared board layout, stage, and stable snapshots', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/poster/e2e-fixture')

    await expect(page.locator('a[href="/"]')).toBeVisible()
    await expect(page.locator('a[href="/browse"]')).toBeVisible()

    const board = page.getByTestId('poster-view-grid')
    const stage = page.getByTestId('poster-stage')
    const rightRail = page.getByTestId('poster-panel-right')

    await expect(board).toBeVisible()
    await expect(stage).toBeVisible()
    await expect(rightRail).toBeVisible()

    await assertNoHorizontalOverflow(page)

    await expect(board).toHaveScreenshot('poster-board-mobile.png', { animations: 'disabled' })
    await expect(rightRail).toHaveScreenshot('poster-details-rail-mobile.png', { animations: 'disabled' })
  })

  test('builder create at 1024x768 has shared board layout and no overflow', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.goto('/builder/create')

    const shell = page.getByTestId('builder-create-panels')
    await expect(shell).toBeVisible()
    await expect(page.getByTestId('builder-panel-submissions').locator('a[href="/builder/create"]')).toBeVisible()
    await expect(page.getByTestId('builder-panel-submissions').locator('a[href="/builder/tend"]')).toBeVisible()
    await expect(page.getByTestId('builder-panel-workspace')).toBeVisible()
    await expect(page.getByTestId('builder-panel-inspector')).toBeVisible()

    await assertNoHorizontalOverflow(page)
  })

  test('builder create at 1440x900 has stable layout snapshots', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/builder/create')

    const shell = page.getByTestId('builder-create-panels')
    const workspace = page.getByTestId('builder-panel-workspace')
    const details = page.getByTestId('builder-panel-inspector')

    await expect(shell).toBeVisible()
    await expect(workspace).toBeVisible()
    await expect(details).toBeVisible()

    await assertNoHorizontalOverflow(page)

    await expect(shell).toHaveScreenshot('builder-board-layout-desktop.png', { animations: 'disabled' })
    await expect(workspace).toHaveScreenshot('builder-workspace-desktop.png', { animations: 'disabled' })
    await expect(details).toHaveScreenshot('builder-details-rail-desktop.png', { animations: 'disabled' })
  })
})
