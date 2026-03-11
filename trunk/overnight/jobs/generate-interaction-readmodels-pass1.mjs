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
      // ignore malformed rows in pass1
    }
  }
  return rows
}

function keyJoin(parts) {
  return parts.map((v) => String(v || '').trim()).filter(Boolean).join(':')
}

function asArrayOfRows(mapObj) {
  return Object.entries(mapObj)
    .map(([key, value]) => ({ key, count: value }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
}

async function main() {
  const root = process.env.CB_TRUNK_PATH
    ? path.resolve(process.env.CB_TRUNK_PATH)
    : path.join(process.cwd(), 'trunk')
  const incomingRoot = path.join(root, 'fibers', 'incoming')
  const readmodelRoot = path.join(root, 'branches', 'readmodels')
  const outputRoot = path.join(root, 'overnight', 'outputs')

  const files = (await walkFiles(incomingRoot)).filter((f) => f.endsWith('.jsonl'))
  const rows = []
  for (const file of files) {
    const text = await fs.readFile(file, 'utf8').catch(() => '')
    rows.push(...parseJsonl(text))
  }

  const signalRows = rows
    .filter((r) => r && (r.fiber_kind === 'signal' || String(r.fiber_id || '').startsWith('signal_')))
    .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')))

  const eventVotesByActor = new Set()
  const tagVotesByActor = new Set()
  const itemStateByActor = new Map()

  for (const row of signalRows) {
    const eventType = String(row.event_type || '')
    const actor = String(row.actor_id_hash || 'unknown-actor')
    const payload = row.payload || {}

    if (eventType === 'event_vote') {
      const eventId = String(payload.event_id || row.object_id || '').trim()
      if (!eventId) continue
      eventVotesByActor.add(keyJoin([eventId, actor]))
      continue
    }

    if (eventType === 'tag_vote' || eventType === 'tag_suggest') {
      const eventId = String(payload.event_id || '').trim()
      const tagId = String(payload.tag_id || '').trim()
      const objectId = keyJoin([eventId, tagId]) || String(row.object_id || '').trim()
      if (!objectId) continue
      tagVotesByActor.add(keyJoin([objectId, actor]))
      continue
    }

    if (eventType === 'item_upvote' || eventType === 'item_unvote') {
      const itemId = String(payload.poster_item_id || row.object_id || '').trim()
      if (!itemId) continue
      itemStateByActor.set(keyJoin([itemId, actor]), eventType)
    }
  }

  const eventVotes = {}
  for (const key of eventVotesByActor) {
    const [eventId] = key.split(':')
    eventVotes[eventId] = (eventVotes[eventId] || 0) + 1
  }

  const tagVotes = {}
  for (const key of tagVotesByActor) {
    const split = key.split(':')
    if (split.length < 3) continue
    const objectId = `${split[0]}:${split[1]}`
    tagVotes[objectId] = (tagVotes[objectId] || 0) + 1
  }

  const itemUpvotes = {}
  for (const [key, state] of itemStateByActor.entries()) {
    if (state !== 'item_upvote') continue
    const [itemId] = key.split(':')
    itemUpvotes[itemId] = (itemUpvotes[itemId] || 0) + 1
  }

  const now = new Date()
  const meta = {
    generated_at: now.toISOString(),
    generator: 'generate-interaction-readmodels-pass1',
    source_rows_total: rows.length,
    source_signal_rows: signalRows.length,
    source_files: files.length,
  }

  const eventModel = { ...meta, model: 'interaction_event_votes', rows: asArrayOfRows(eventVotes) }
  const tagModel = { ...meta, model: 'interaction_tag_votes', rows: asArrayOfRows(tagVotes) }
  const itemModel = { ...meta, model: 'interaction_item_upvotes', rows: asArrayOfRows(itemUpvotes) }
  const summary = {
    ...meta,
    model: 'interaction_summary',
    totals: {
      events: eventModel.rows.length,
      event_votes: eventModel.rows.reduce((acc, r) => acc + r.count, 0),
      event_tags: tagModel.rows.length,
      tag_votes: tagModel.rows.reduce((acc, r) => acc + r.count, 0),
      items: itemModel.rows.length,
      item_upvotes: itemModel.rows.reduce((acc, r) => acc + r.count, 0),
    },
  }

  await fs.mkdir(readmodelRoot, { recursive: true })
  await fs.mkdir(outputRoot, { recursive: true })
  await fs.writeFile(path.join(readmodelRoot, 'interaction_event_votes.json'), `${JSON.stringify(eventModel, null, 2)}\n`, 'utf8')
  await fs.writeFile(path.join(readmodelRoot, 'interaction_tag_votes.json'), `${JSON.stringify(tagModel, null, 2)}\n`, 'utf8')
  await fs.writeFile(path.join(readmodelRoot, 'interaction_item_upvotes.json'), `${JSON.stringify(itemModel, null, 2)}\n`, 'utf8')
  const summaryPath = path.join(outputRoot, `readmodel_interaction_summary_${stamp(now)}.json`)
  await fs.writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')

  console.log(`readmodels generated: ${readmodelRoot}`)
  console.log(`summary: ${summaryPath}`)
}

main().catch((error) => {
  console.error('generate-interaction-readmodels-pass1 failed', error)
  process.exitCode = 1
})

