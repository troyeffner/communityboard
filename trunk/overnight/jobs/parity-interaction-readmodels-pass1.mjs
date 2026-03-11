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

async function readJson(filePath) {
  const text = await fs.readFile(filePath, 'utf8')
  return JSON.parse(text)
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

function rowsToMap(rows) {
  const out = {}
  for (const row of rows || []) {
    const key = String(row.key || '').trim()
    if (!key) continue
    out[key] = Number(row.count || 0)
  }
  return out
}

function diffMaps(left, right) {
  const keys = Array.from(new Set([...Object.keys(left), ...Object.keys(right)])).sort()
  const mismatches = []
  let leftTotal = 0
  let rightTotal = 0
  for (const key of keys) {
    const a = Number(left[key] || 0)
    const b = Number(right[key] || 0)
    leftTotal += a
    rightTotal += b
    if (a !== b) mismatches.push({ key, legacy: a, trunk: b, delta: b - a })
  }
  return { keys: keys.length, leftTotal, rightTotal, mismatches }
}

function isMissingTableError(error, tableName) {
  const message = String(error?.message || '').toLowerCase()
  const needle = `public.${tableName}`.toLowerCase()
  return message.includes('could not find the table') && message.includes(needle)
}

function rowsToUniqueSet(rows, keys) {
  return new Set((rows || []).map((row) => keys.map((k) => String(row[k] || '')).join(':')))
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

  const eventModel = await readJson(path.join(readmodelRoot, 'interaction_event_votes.json'))
  const tagModel = await readJson(path.join(readmodelRoot, 'interaction_tag_votes.json'))
  const itemModel = await readJson(path.join(readmodelRoot, 'interaction_item_upvotes.json'))
  const trunkEvent = rowsToMap(eventModel.rows)
  const trunkTag = rowsToMap(tagModel.rows)
  const trunkItem = rowsToMap(itemModel.rows)

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  const warnings = []

  const eventRes = await supabase.from('event_votes').select('event_id,voter_vid')
  let legacyEventSet = new Set()
  if (eventRes.error) {
    if (isMissingTableError(eventRes.error, 'event_votes')) {
      warnings.push('legacy table missing: public.event_votes')
    } else {
      throw new Error(`event_votes parity query failed: ${eventRes.error.message}`)
    }
  } else {
    legacyEventSet = rowsToUniqueSet(eventRes.data, ['event_id', 'voter_vid'])
  }
  const legacyEvent = {}
  for (const key of legacyEventSet) {
    const [eventId] = key.split(':')
    legacyEvent[eventId] = (legacyEvent[eventId] || 0) + 1
  }

  const tagRes = await supabase.from('tag_votes').select('event_id,tag_id,voter_fingerprint')
  let legacyTagSet = new Set()
  if (tagRes.error) {
    if (isMissingTableError(tagRes.error, 'tag_votes')) {
      warnings.push('legacy table missing: public.tag_votes')
    } else {
      throw new Error(`tag_votes parity query failed: ${tagRes.error.message}`)
    }
  } else {
    legacyTagSet = rowsToUniqueSet(tagRes.data, ['event_id', 'tag_id', 'voter_fingerprint'])
  }
  const legacyTag = {}
  for (const key of legacyTagSet) {
    const [eventId, tagId] = key.split(':')
    const pair = `${eventId}:${tagId}`
    legacyTag[pair] = (legacyTag[pair] || 0) + 1
  }

  const itemRes = await supabase.from('poster_item_upvotes').select('poster_item_id,viewer_id')
  let legacyItemSet = new Set()
  if (itemRes.error) {
    if (isMissingTableError(itemRes.error, 'poster_item_upvotes')) {
      warnings.push('legacy table missing: public.poster_item_upvotes')
    } else {
      throw new Error(`poster_item_upvotes parity query failed: ${itemRes.error.message}`)
    }
  } else {
    legacyItemSet = rowsToUniqueSet(itemRes.data, ['poster_item_id', 'viewer_id'])
  }
  const legacyItem = {}
  for (const key of legacyItemSet) {
    const [itemId] = key.split(':')
    legacyItem[itemId] = (legacyItem[itemId] || 0) + 1
  }

  const eventDiff = diffMaps(legacyEvent, trunkEvent)
  const tagDiff = diffMaps(legacyTag, trunkTag)
  const itemDiff = diffMaps(legacyItem, trunkItem)
  const now = new Date()
  const report = {
    generated_at: now.toISOString(),
    source: 'parity-interaction-readmodels-pass1',
    parity: {
      event_votes: eventDiff,
      tag_votes: tagDiff,
      poster_item_upvotes: itemDiff,
    },
    warnings,
    status:
      warnings.length > 0
        ? 'partial_missing_legacy_tables'
        : eventDiff.mismatches.length === 0 &&
            tagDiff.mismatches.length === 0 &&
            itemDiff.mismatches.length === 0
          ? 'aligned'
          : 'drift',
  }

  await fs.mkdir(outputRoot, { recursive: true })
  const base = `parity_interaction_readmodels_${stamp(now)}`
  const jsonPath = path.join(outputRoot, `${base}.json`)
  const mdPath = path.join(outputRoot, `${base}.md`)
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

  const md = [
    '# Interaction Parity Report (Pass 1)',
    '',
    `generated_at: ${report.generated_at}`,
    `status: ${report.status}`,
    '',
    ...(warnings.length > 0 ? [`warnings:`, ...warnings.map((w) => `- ${w}`), ''] : []),
    `- event_votes mismatches: ${eventDiff.mismatches.length}`,
    `- tag_votes mismatches: ${tagDiff.mismatches.length}`,
    `- poster_item_upvotes mismatches: ${itemDiff.mismatches.length}`,
    '',
    `json: ${jsonPath}`,
  ].join('\n')
  await fs.writeFile(mdPath, `${md}\n`, 'utf8')

  console.log(`parity report: ${jsonPath}`)
  console.log(`summary: ${mdPath}`)
}

main().catch((error) => {
  console.error('parity-interaction-readmodels-pass1 failed', error)
  process.exitCode = 1
})
