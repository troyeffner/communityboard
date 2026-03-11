#!/usr/bin/env node
import { promises as fs } from 'fs'
import path from 'path'

function pad2(v) {
  return String(v).padStart(2, '0')
}

function stamp(now) {
  return `${now.getUTCFullYear()}${pad2(now.getUTCMonth() + 1)}${pad2(now.getUTCDate())}_${pad2(now.getUTCHours())}${pad2(now.getUTCMinutes())}`
}

async function walkFiles(dir) {
  const out = []
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...await walkFiles(full))
      continue
    }
    if (entry.isFile()) out.push(full)
  }
  return out
}

function parseJsonl(text) {
  const rows = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      rows.push(JSON.parse(trimmed))
    } catch {
      // skip malformed line in pass-1 script
    }
  }
  return rows
}

async function run() {
  const root = process.env.CB_TRUNK_PATH
    ? path.resolve(process.env.CB_TRUNK_PATH)
    : path.join(process.cwd(), 'trunk')
  const incomingRoot = path.join(root, 'fibers', 'incoming')
  const growthDir = path.join(root, 'fibers', 'growth')
  const outputDir = path.join(root, 'overnight', 'outputs')
  const now = new Date()

  const files = (await walkFiles(incomingRoot)).filter((f) => f.endsWith('.jsonl'))
  const fibers = []
  for (const file of files) {
    const text = await fs.readFile(file, 'utf8').catch(() => '')
    fibers.push(...parseJsonl(text))
  }

  const byEvent = {}
  const byTag = {}
  for (const fiber of fibers) {
    const eventType = String(fiber.event_type || 'unknown')
    byEvent[eventType] = (byEvent[eventType] || 0) + 1
    const tags = Array.isArray(fiber.tags) ? fiber.tags : []
    for (const tag of tags) {
      const key = String(tag || '').trim()
      if (!key) continue
      byTag[key] = (byTag[key] || 0) + 1
    }
  }

  const summary = {
    generated_at: now.toISOString(),
    source: 'nightly-growth-pass1',
    total_fibers_scanned: fibers.length,
    input_files_scanned: files.length,
    by_event_type: byEvent,
    by_tag: byTag,
  }

  await fs.mkdir(outputDir, { recursive: true })
  await fs.mkdir(growthDir, { recursive: true })

  const summaryName = `growth_summary_${stamp(now)}.json`
  const summaryPath = path.join(outputDir, summaryName)
  await fs.writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')

  const growthFiber = {
    fiber_id: `growth_${stamp(now)}`,
    fiber_kind: 'growth',
    created_at: now.toISOString(),
    source_surface: 'trunk/overnight/jobs/nightly-growth-pass1.mjs',
    event_type: 'overnight_growth_summary',
    object_type: 'growth_summary',
    object_id: summaryName.replace('.json', ''),
    actor_type: 'system',
    actor_id_hash: null,
    payload: summary,
    tags: ['communityboard', 'overnight', 'growth-summary'],
    lineage: 'communityboard.trunk-cutover.pass2.overnight',
    status: 'captured',
    source_repo: 'communityboard',
  }
  await fs.appendFile(path.join(growthDir, 'growth.jsonl'), `${JSON.stringify(growthFiber)}\n`, 'utf8')

  console.log(`overnight growth complete: ${summaryPath}`)
}

run().catch((error) => {
  console.error('nightly-growth-pass1 failed', error)
  process.exitCode = 1
})

