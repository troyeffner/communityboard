import { spawn, execSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '@playwright/test'

const PRIMARY_PORT = 3000
const FALLBACK_PORT = 3001
const START_TIMEOUT_MS = 60_000
const POLL_MS = 300

const ROUTES = [
  { slug: 'home', path: '/' },
  { slug: 'submit', path: '/submit' },
  { slug: 'browse', path: '/browse' },
  { slug: 'create', path: '/builder/create' },
  { slug: 'poster', path: '/poster/e2e-fixture' },
]

const VIEWPORTS = [
  { key: 'desktop', width: 1440, height: 900 },
  { key: 'mobile', width: 390, height: 844 },
]

const EXPECTED_TITLES = {
  '/': 'Community Board',
  '/submit': 'Submit',
  '/browse': 'Browse posters',
  '/builder/create': 'Create posters',
  '/poster/e2e-fixture': 'Found at: E2E Community Board',
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function timestampFolderName(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  const y = date.getFullYear()
  const m = pad(date.getMonth() + 1)
  const d = pad(date.getDate())
  const hh = pad(date.getHours())
  const mm = pad(date.getMinutes())
  return `${y}${m}${d}-${hh}${mm}`
}

function gitHead() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}

async function isReachable(baseUrl) {
  try {
    const res = await fetch(`${baseUrl}/`, { redirect: 'follow' })
    return res.ok
  } catch {
    return false
  }
}

async function waitUntilReachable(baseUrl, timeoutMs) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (await isReachable(baseUrl)) return true
    await sleep(POLL_MS)
  }
  return false
}

async function ensureServer() {
  const retries = []
  const primaryUrl = `http://127.0.0.1:${PRIMARY_PORT}`
  if (await isReachable(primaryUrl)) {
    return { baseUrl: primaryUrl, started: null, startedByScript: false, retries }
  }

  let child = spawn('npm', ['run', 'dev', '--', '--port', String(PRIMARY_PORT)], {
    stdio: 'inherit',
    env: { ...process.env },
  })

  const primaryReady = await waitUntilReachable(primaryUrl, START_TIMEOUT_MS)
  if (primaryReady) {
    retries.push({ port: PRIMARY_PORT, success: true, reason: 'started' })
    return { baseUrl: primaryUrl, started: child, startedByScript: true, retries }
  }

  retries.push({ port: PRIMARY_PORT, success: false, reason: 'timeout_or_bind_failure' })
  child.kill('SIGTERM')
  await sleep(500)

  const fallbackUrl = `http://127.0.0.1:${FALLBACK_PORT}`
  child = spawn('npm', ['run', 'dev', '--', '--port', String(FALLBACK_PORT)], {
    stdio: 'inherit',
    env: { ...process.env },
  })

  const fallbackReady = await waitUntilReachable(fallbackUrl, START_TIMEOUT_MS)
  if (!fallbackReady) {
    retries.push({ port: FALLBACK_PORT, success: false, reason: 'timeout_or_bind_failure' })
    child.kill('SIGTERM')
    throw new Error(`Dev server did not become reachable on :${PRIMARY_PORT} or :${FALLBACK_PORT}`)
  }

  retries.push({ port: FALLBACK_PORT, success: true, reason: 'fallback_after_primary_failure' })
  return { baseUrl: fallbackUrl, started: child, startedByScript: true, retries }
}

async function verifyRoutes(baseUrl) {
  for (const route of ROUTES) {
    const res = await fetch(`${baseUrl}${route.path}`, { redirect: 'follow' })
    if (!res.ok) {
      throw new Error(`Route check failed for ${route.path}: HTTP ${res.status}`)
    }
  }
}

async function captureScreens(baseUrl, outputDir) {
  const browser = await chromium.launch({ headless: true })
  const titleMap = {}

  try {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        isMobile: viewport.key === 'mobile',
        hasTouch: viewport.key === 'mobile',
        deviceScaleFactor: viewport.key === 'mobile' ? 2 : 1,
      })
      const page = await context.newPage()

      for (const route of ROUTES) {
        const url = `${baseUrl}${route.path}`
        await page.goto(url, { waitUntil: 'networkidle' })
        await page.waitForTimeout(300)

        const fileName = `${route.slug}-${viewport.key}.png`
        const filePath = path.join(outputDir, fileName)
        await page.screenshot({ path: filePath, fullPage: true })

        if (viewport.key === 'desktop') {
          titleMap[route.path] = await page.title()
        }
      }

      await context.close()
    }

    return titleMap
  } finally {
    await browser.close()
  }
}

function buildTitleMismatches(titles) {
  return Object.entries(EXPECTED_TITLES)
    .filter(([route, expected]) => (titles[route] || '') !== expected)
    .map(([route, expected]) => ({
      route,
      expected,
      actual: titles[route] || '',
    }))
}

async function main() {
  const runTimestamp = new Date().toISOString()
  const outputDir = path.resolve('test-results', 'ui-eval', timestampFolderName())
  await mkdir(outputDir, { recursive: true })

  const server = await ensureServer()

  try {
    await verifyRoutes(server.baseUrl)
    const titles = await captureScreens(server.baseUrl, outputDir)
    const titleMismatches = buildTitleMismatches(titles)

    const meta = {
      timestamp: runTimestamp,
      git_head: gitHead(),
      base_url: server.baseUrl,
      retries: server.retries,
      routes: ROUTES,
      viewports: VIEWPORTS,
      titles,
      expected_titles: EXPECTED_TITLES,
      title_mismatches: titleMismatches,
      files: ROUTES.flatMap((route) => VIEWPORTS.map((viewport) => `${route.slug}-${viewport.key}.png`)),
    }

    await writeFile(path.join(outputDir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`, 'utf8')
    console.log(outputDir)
  } finally {
    if (server.startedByScript && server.started) {
      server.started.kill('SIGTERM')
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
