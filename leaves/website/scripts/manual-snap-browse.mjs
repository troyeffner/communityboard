import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '@playwright/test'

const PORT = 3000
const URL = `http://127.0.0.1:${PORT}/browse`
const outputPath = path.resolve('test-results/manual/browse-full.png')

async function isServerReady() {
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}`)
    return res.ok || res.status >= 200
  } catch {
    return false
  }
}

async function waitForServer(timeoutMs = 60_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (await isServerReady()) return true
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  return false
}

let startedServer = null

try {
  const alreadyRunning = await isServerReady()
  if (!alreadyRunning) {
    startedServer = spawn('npm', ['run', 'dev', '--', '--port', String(PORT)], {
      stdio: 'inherit',
      env: { ...process.env },
    })

    const ready = await waitForServer()
    if (!ready) {
      throw new Error(`Dev server did not become ready on :${PORT}`)
    }
  }

  await mkdir(path.dirname(outputPath), { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.screenshot({ path: outputPath, fullPage: true })
  await browser.close()

  console.log(outputPath)
} finally {
  if (startedServer) {
    startedServer.kill('SIGTERM')
  }
}
