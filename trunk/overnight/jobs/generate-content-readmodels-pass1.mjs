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
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const [eventsPublished, uploadsAll, itemsPublished, linksAll] = await Promise.all([
    supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('poster_uploads').select('*', { count: 'exact', head: true }),
    supabase.from('poster_items').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('poster_event_links').select('*', { count: 'exact', head: true }),
  ])

  for (const result of [eventsPublished, uploadsAll, itemsPublished, linksAll]) {
    if (result.error) throw new Error(`content readmodel query failed: ${result.error.message}`)
  }

  const now = new Date()
  const baseline = {
    generated_at: now.toISOString(),
    source: 'generate-content-readmodels-pass1',
    metrics: {
      events_published_count: Number(eventsPublished.count || 0),
      poster_uploads_count: Number(uploadsAll.count || 0),
      poster_items_published_count: Number(itemsPublished.count || 0),
      poster_event_links_count: Number(linksAll.count || 0),
    },
  }

  await fs.mkdir(readmodelRoot, { recursive: true })
  await fs.mkdir(outputRoot, { recursive: true })
  await fs.writeFile(path.join(readmodelRoot, 'content_surface_baseline.json'), `${JSON.stringify(baseline, null, 2)}\n`, 'utf8')
  const summaryPath = path.join(outputRoot, `readmodel_content_surface_summary_${stamp(now)}.json`)
  await fs.writeFile(summaryPath, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8')

  console.log(`content readmodel baseline: ${path.join(readmodelRoot, 'content_surface_baseline.json')}`)
  console.log(`summary: ${summaryPath}`)
}

main().catch((error) => {
  console.error('generate-content-readmodels-pass1 failed', error)
  process.exitCode = 1
})

