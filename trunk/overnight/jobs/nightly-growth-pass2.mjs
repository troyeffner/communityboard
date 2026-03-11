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
      // ignore malformed lines for pass2 robustness
    }
  }
  return rows
}

function asRows(mapObj) {
  return Object.entries(mapObj)
    .map(([key, value]) => ({ key, count: value }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
}

function safeKey(v) {
  return String(v || '').trim()
}

async function readPolicy(policyPath) {
  const text = await fs.readFile(policyPath, 'utf8').catch(() => '')
  if (!text) {
    return {
      stable_tag_min_count: 2,
      registry_max_tags: 500,
      cadence: 'hourly',
      timezone: 'America/New_York',
    }
  }
  try {
    const parsed = JSON.parse(text)
    return {
      stable_tag_min_count: Number(parsed.stable_tag_min_count || 2),
      registry_max_tags: Number(parsed.registry_max_tags || 500),
      cadence: String(parsed.cadence || 'hourly'),
      timezone: String(parsed.timezone || 'America/New_York'),
    }
  } catch {
    return {
      stable_tag_min_count: 2,
      registry_max_tags: 500,
      cadence: 'hourly',
      timezone: 'America/New_York',
    }
  }
}

async function main() {
  const root = process.env.CB_TRUNK_PATH
    ? path.resolve(process.env.CB_TRUNK_PATH)
    : path.join(process.cwd(), 'trunk')
  const incomingRoot = path.join(root, 'fibers', 'incoming')
  const growthDir = path.join(root, 'fibers', 'growth')
  const tagsRegistryDir = path.join(root, 'tags', 'registry')
  const tagsIndexDir = path.join(root, 'tags', 'indexes')
  const readmodelRoot = path.join(root, 'branches', 'readmodels')
  const outputRoot = path.join(root, 'overnight', 'outputs')
  const policy = await readPolicy(path.join(root, 'config', 'overnight_policy.json'))

  const files = (await walkFiles(incomingRoot)).filter((f) => f.endsWith('.jsonl'))
  const allRows = []
  for (const file of files) {
    const text = await fs.readFile(file, 'utf8').catch(() => '')
    allRows.push(...parseJsonl(text))
  }

  const signalRows = allRows
    .filter((r) => r && (r.fiber_kind === 'signal' || String(r.fiber_id || '').startsWith('signal_')))
    .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')))

  const eventVotesByActor = new Set()
  const tagVotesByActor = new Set()
  const itemStateByActor = new Map()
  const observedTagCounts = {}
  const eventTypeCounts = {}

  for (const row of signalRows) {
    const createdAt = String(row.created_at || '')
    const eventType = safeKey(row.event_type || 'unknown')
    const actor = safeKey(row.actor_id_hash || 'unknown-actor')
    const payload = row.payload || {}
    eventTypeCounts[eventType] = (eventTypeCounts[eventType] || 0) + 1

    for (const tag of Array.isArray(row.tags) ? row.tags : []) {
      const key = safeKey(tag)
      if (!key) continue
      observedTagCounts[key] = (observedTagCounts[key] || 0) + 1
    }
    if (eventType) observedTagCounts[`evt:${eventType}`] = (observedTagCounts[`evt:${eventType}`] || 0) + 1
    const objectType = safeKey(row.object_type || '')
    if (objectType) observedTagCounts[`obj:${objectType}`] = (observedTagCounts[`obj:${objectType}`] || 0) + 1

    if (eventType === 'event_vote') {
      const eventId = safeKey(payload.event_id || row.object_id)
      if (!eventId) continue
      eventVotesByActor.add(`${eventId}:${actor}`)
      continue
    }

    if (eventType === 'tag_vote' || eventType === 'tag_suggest') {
      const eventId = safeKey(payload.event_id || '')
      const tagId = safeKey(payload.tag_id || '')
      const objectId = [eventId, tagId].filter(Boolean).join(':') || safeKey(row.object_id || '')
      if (!objectId) continue
      tagVotesByActor.add(`${objectId}:${actor}`)
      continue
    }

    if (eventType === 'item_upvote' || eventType === 'item_unvote') {
      const itemId = safeKey(payload.poster_item_id || row.object_id)
      if (!itemId) continue
      const key = `${itemId}:${actor}`
      const prev = itemStateByActor.get(key)
      if (!prev || createdAt >= prev.created_at) {
        itemStateByActor.set(key, { state: eventType, created_at: createdAt })
      }
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
  for (const [key, stateObj] of itemStateByActor.entries()) {
    if (stateObj.state !== 'item_upvote') continue
    const [itemId] = key.split(':')
    itemUpvotes[itemId] = (itemUpvotes[itemId] || 0) + 1
  }

  const stableTags = asRows(observedTagCounts)
    .filter((row) => row.count >= policy.stable_tag_min_count)
    .slice(0, policy.registry_max_tags)

  const now = new Date()
  const registry = {
    generated_at: now.toISOString(),
    source: 'nightly-growth-pass2',
    policy,
    observed_tag_count: Object.keys(observedTagCounts).length,
    stable_tag_count: stableTags.length,
    stable_tags: stableTags,
  }
  const summary = {
    generated_at: now.toISOString(),
    source: 'nightly-growth-pass2',
    policy,
    source_rows_total: allRows.length,
    source_signal_rows: signalRows.length,
    source_files: files.length,
    event_type_counts: asRows(eventTypeCounts),
    totals: {
      event_votes: asRows(eventVotes).reduce((acc, r) => acc + r.count, 0),
      tag_votes: asRows(tagVotes).reduce((acc, r) => acc + r.count, 0),
      item_upvotes: asRows(itemUpvotes).reduce((acc, r) => acc + r.count, 0),
      stable_tags: stableTags.length,
    },
  }

  const eventModel = {
    generated_at: now.toISOString(),
    generator: 'nightly-growth-pass2',
    source_rows_total: allRows.length,
    source_signal_rows: signalRows.length,
    source_files: files.length,
    model: 'interaction_event_votes',
    rows: asRows(eventVotes),
  }
  const tagModel = {
    generated_at: now.toISOString(),
    generator: 'nightly-growth-pass2',
    source_rows_total: allRows.length,
    source_signal_rows: signalRows.length,
    source_files: files.length,
    model: 'interaction_tag_votes',
    rows: asRows(tagVotes),
  }
  const itemModel = {
    generated_at: now.toISOString(),
    generator: 'nightly-growth-pass2',
    source_rows_total: allRows.length,
    source_signal_rows: signalRows.length,
    source_files: files.length,
    model: 'interaction_item_upvotes',
    rows: asRows(itemUpvotes),
  }

  await fs.mkdir(growthDir, { recursive: true })
  await fs.mkdir(tagsRegistryDir, { recursive: true })
  await fs.mkdir(tagsIndexDir, { recursive: true })
  await fs.mkdir(readmodelRoot, { recursive: true })
  await fs.mkdir(outputRoot, { recursive: true })

  await fs.writeFile(path.join(readmodelRoot, 'interaction_event_votes.json'), `${JSON.stringify(eventModel, null, 2)}\n`, 'utf8')
  await fs.writeFile(path.join(readmodelRoot, 'interaction_tag_votes.json'), `${JSON.stringify(tagModel, null, 2)}\n`, 'utf8')
  await fs.writeFile(path.join(readmodelRoot, 'interaction_item_upvotes.json'), `${JSON.stringify(itemModel, null, 2)}\n`, 'utf8')
  await fs.writeFile(path.join(tagsRegistryDir, 'interaction_tags.json'), `${JSON.stringify(registry, null, 2)}\n`, 'utf8')

  const stampValue = stamp(now)
  const summaryPath = path.join(outputRoot, `growth_pass2_summary_${stampValue}.json`)
  const tagsIndexPath = path.join(tagsIndexDir, `interaction_tags_${stampValue}.json`)
  await fs.writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
  await fs.writeFile(tagsIndexPath, `${JSON.stringify(registry, null, 2)}\n`, 'utf8')

  const growthFiber = {
    fiber_id: `growth_${stampValue}`,
    fiber_kind: 'growth',
    created_at: now.toISOString(),
    source_surface: 'trunk/overnight/jobs/nightly-growth-pass2.mjs',
    event_type: 'overnight_growth_pass2',
    object_type: 'growth_summary',
    object_id: `growth_pass2_summary_${stampValue}`,
    actor_type: 'system',
    actor_id_hash: null,
    payload: summary,
    tags: ['communityboard', 'overnight', 'growth-pass2'],
    lineage: 'communityboard.trunk-cutover.pass5.overnight',
    status: 'captured',
    source_repo: 'communityboard',
  }
  await fs.appendFile(path.join(growthDir, 'growth.jsonl'), `${JSON.stringify(growthFiber)}\n`, 'utf8')

  console.log(`pass2 growth summary: ${summaryPath}`)
  console.log(`stable tag registry: ${path.join(tagsRegistryDir, 'interaction_tags.json')}`)
  console.log(`readmodels refreshed: ${readmodelRoot}`)
}

main().catch((error) => {
  console.error('nightly-growth-pass2 failed', error)
  process.exitCode = 1
})

