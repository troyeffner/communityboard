import { test, expect } from '@playwright/test'

test('home shell visual snapshot', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.locator('a[href="/submit"]')).toBeVisible()
  await expect(page.locator('a[href="/businesses"]')).toBeVisible()
  await expect(page.getByTestId('home-shell')).toHaveScreenshot('home-mobile.png')
})

test('builder shared layout visual snapshots', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/builder/create')
  const board = page.getByTestId('builder-create-panels')
  const workspace = page.getByTestId('builder-panel-workspace')
  const details = page.getByTestId('builder-panel-inspector')
  await expect(board).toBeVisible()
  await expect(workspace).toBeVisible()
  await expect(details).toBeVisible()
  await expect(board).toHaveScreenshot('builder-board-layout-desktop.png', { animations: 'disabled' })
  await expect(workspace).toHaveScreenshot('builder-workspace-desktop.png', { animations: 'disabled' })
  await expect(details).toHaveScreenshot('builder-details-rail-desktop.png', { animations: 'disabled' })
})
