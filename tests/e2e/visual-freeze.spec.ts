import { test, expect } from '@playwright/test'

test('poster view visual snapshot', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.locator('a[href="/submit"]')).toBeVisible()
  await expect(page.locator('a[href="/businesses"]')).toBeVisible()
  await expect(page.getByTestId('home-shell')).toHaveScreenshot('home-mobile.png')
})

test('builder create visual snapshot', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/builder/create')
  const workspace = page.getByTestId('builder-panel-workspace')
  await expect(workspace).toBeVisible()
  await expect(page.getByTestId('builder-panel-submissions').locator('a[href="/builder/create"]')).toBeVisible()
  await expect(page.getByTestId('builder-panel-submissions').locator('a[href="/builder/tend"]')).toBeVisible()
  await expect(workspace).toHaveScreenshot('builder-create-workspace-desktop.png', { animations: 'disabled' })
})
