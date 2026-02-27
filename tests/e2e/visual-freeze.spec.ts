import { test, expect } from '@playwright/test'

test('poster view visual snapshot', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('http://localhost:3000/')
  await expect(page).toHaveScreenshot('home-mobile.png', { fullPage: true })
})

test('builder create visual snapshot', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('http://localhost:3000/builder/create')
  await expect(page).toHaveScreenshot('builder-create-desktop.png', { fullPage: true })
})
