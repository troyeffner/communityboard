#!/usr/bin/env node
import { promises as fs } from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

function pad2(v) {
  return String(v).padStart(2, '0')
}

function stamp(now) {
  return `${now.getUTCFullYear()}${pad2(now.getUTCMonth() + 1)}${pad2(now.getUTCDate())}_${pad2(now.getUTCHours())}${pad2(now.getUTCMinutes())}`
}

async function loadEnvLocalIfNeeded() {
  const envPath = path.join(process.cwd(), '.env.local')
  const text = await fs.readFile(envPath, 'utf8').catch(() => '')
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx < 0) continue
    const key = trimmed.slice(0, idx).trim()
    let value = trimmed.slice(idx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

function diffMetric(name, legacy, trunk) {
  return { metric: name, legacy, trunk, delta: trunk - legacy, aligned: legacy === trunk }
}

async function main() {
  await loadEnvLocalIfNeeded()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  }

  const root = process.env.CB_TRUNK_PATH
    ? path.resolve(process.env.CB_TRUNK_PATH)
    : path.join(process.cwd(), 'trunk')
  const readmodelRoot = path.join(root, 'branches', 'readmodels')
  const outputRoot = path.join(root, 'overnight', 'outputs')
  const baselinePath = path.join(readmodelRoot, 'content_surface_baseline.json')
  const baselineText = await fs.readFile(baselinePath, 'utf8')
  const baseline = JSON.parse(baselineText)
  const trunkMetrics = baseline.metrics || {}

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  const [eventsPublished, uploadsAll, itemsPublished, linksAll] = await Promise.all([
    supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('poster_uploads').select('*', { count: 'exact', head: true }),
    supabase.from('poster_items').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('poster_event_links').select('*', { count: 'exact', head: true }),
  ])

  for (const result of [eventsPublished, uploadsAll, itemsPublished, linksAll]) {
    if (result.error) throw new Error(`content parity query failed: ${result.error.message}`)
  }

  const legacyMetrics = {
    events_published_count: Number(eventsPublished.count || 0),
    poster_uploads_count: Number(uploadsAll.count || 0),
    poster_items_published_count: Number(itemsPublished.count || 0),
    poster_event_links_count: Number(linksAll.count || 0),
  }

  const diffs = [
    diffMetric('events_published_count', legacyMetrics.events_published_count, Number(trunkMetrics.events_published_count || 0)),
    diffMetric('poster_uploads_count', legacyMetrics.poster_uploads_count, Number(trunkMetrics.poster_uploads_count || 0)),
    diffMetric('poster_items_published_count', legacyMetrics.poster_items_published_count, Number(trunkMetrics.poster_items_published_count || 0)),
    diffMetric('poster_event_links_count', legacyMetrics.poster_event_links_count, Number(trunkMetrics.poster_event_links_count || 0)),
  ]

  const now = new Date()
  const report = {
    generated_at: now.toISOString(),
    source: 'parity-content-readmodels-pass1',
    baseline_file: baselinePath,
    diffs,
    status: diffs.every((d) => d.aligned) ? 'aligned' : 'drift',
  }

  await fs.mkdir(outputRoot, { recursive: true })
  const base = `parity_content_readmodels_${stamp(now)}`
  const jsonPath = path.join(outputRoot, `${base}.json`)
  const mdPath = path.join(outputRoot, `${base}.md`)
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

  const md = [
    '# Content Parity Report (Pass 1)',
    '',
    `generated_at: ${report.generated_at}`,
    `status: ${report.status}`,
    `baseline_file: ${report.baseline_file}`,
    '',
    'diffs:',
    ...diffs.map((d) => `- ${d.metric}: legacy=${d.legacy}, trunk=${d.trunk}, delta=${d.delta}, aligned=${d.aligned}`),
  ].join('\n')
  await fs.writeFile(mdPath, `${md}\n`, 'utf8')

  console.log(`content parity report: ${jsonPath}`)
  console.log(`summary: ${mdPath}`)
}

main().catch((error) => {
  console.error('parity-content-readmodels-pass1 failed', error)
  process.exitCode = 1
})

