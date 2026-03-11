#!/usr/bin/env node
import { promises as fs } from 'fs'
import path from 'path'

function pad2(v) {
  return String(v).padStart(2, '0')
}

function stamp(now) {
  return `${now.getUTCFullYear()}${pad2(now.getUTCMonth() + 1)}${pad2(now.getUTCDate())}_${pad2(now.getUTCHours())}${pad2(now.getUTCMinutes())}`
}

function parseJsonl(text) {
  const rows = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      rows.push(JSON.parse(trimmed))
    } catch {
      // ignore malformed lines
    }
  }
  return rows
}

function safe(v) {
  return String(v || '').trim()
}

function asRows(mapObj) {
  return Object.entries(mapObj)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
}

function toIso(v) {
  const s = safe(v)
  const t = Date.parse(s)
  return Number.isFinite(t) ? new Date(t).toISOString() : null
}

async function main() {
  const root = process.env.CB_TRUNK_PATH
    ? path.resolve(process.env.CB_TRUNK_PATH)
    : path.join(process.cwd(), 'trunk')
  const workPath = path.join(root, 'fibers', 'work', 'deploy_events.jsonl')
  const readmodelRoot = path.join(root, 'branches', 'readmodels')
  const outputRoot = path.join(root, 'overnight', 'outputs')

  await fs.mkdir(readmodelRoot, { recursive: true })
  await fs.mkdir(outputRoot, { recursive: true })

  const text = await fs.readFile(workPath, 'utf8').catch(() => '')
  const rows = parseJsonl(text)
  const deployRows = rows
    .filter((r) => safe(r?.event_type) === 'deploy_event')
    .sort((a, b) => safe(a?.created_at).localeCompare(safe(b?.created_at)))

  const byProvider = {}
  const byStage = {}
  const byStatus = {}
  const stateByLifecycle = new Map()

  for (const row of deployRows) {
    const payload = row.payload || {}
    const provider = safe(payload.provider) || safe(row.object_id).split(':')[0] || 'unknown'
    const target = safe(payload.target) || 'unknown'
    const stage = safe(payload.stage) || 'unknown'
    const status = safe(payload.status) || 'unknown'
    const ref = safe(payload.ref) || null
    const createdAt = toIso(row.created_at)

    byProvider[provider] = (byProvider[provider] || 0) + 1
    byStage[stage] = (byStage[stage] || 0) + 1
    byStatus[status] = (byStatus[status] || 0) + 1

    const key = `${provider}:${target}:${stage}`
    const prev = stateByLifecycle.get(key)
    if (!prev) {
      stateByLifecycle.set(key, {
        provider,
        target,
        stage,
        object_id: safe(row.object_id) || key,
        last_status: status,
        last_ref: ref,
        last_created_at: createdAt,
        total_events: 1,
        count_by_status: { [status]: 1 },
      })
      continue
    }

    prev.total_events += 1
    prev.count_by_status[status] = (prev.count_by_status[status] || 0) + 1
    if (!prev.last_created_at || (createdAt && createdAt >= prev.last_created_at)) {
      prev.last_status = status
      prev.last_ref = ref
      prev.last_created_at = createdAt
    }
  }

  const lifecycleRows = [...stateByLifecycle.values()].sort((a, b) => {
    const aKey = `${a.provider}:${a.target}:${a.stage}`
    const bKey = `${b.provider}:${b.target}:${b.stage}`
    return aKey.localeCompare(bKey)
  })

  const now = new Date()
  const readmodel = {
    generated_at: now.toISOString(),
    source: 'generate-deploy-readmodels-pass1',
    source_file: workPath,
    source_rows_total: rows.length,
    deploy_event_rows: deployRows.length,
    summary: {
      total_lifecycles: lifecycleRows.length,
      by_provider: asRows(byProvider),
      by_stage: asRows(byStage),
      by_status: asRows(byStatus),
    },
    lifecycle_rows: lifecycleRows,
  }

  const readmodelPath = path.join(readmodelRoot, 'deploy_lifecycle.json')
  await fs.writeFile(readmodelPath, `${JSON.stringify(readmodel, null, 2)}\n`, 'utf8')

  const summaryPath = path.join(outputRoot, `readmodel_deploy_summary_${stamp(now)}.json`)
  await fs.writeFile(summaryPath, `${JSON.stringify(readmodel, null, 2)}\n`, 'utf8')

  console.log(`deploy readmodel: ${readmodelPath}`)
  console.log(`deploy readmodel summary: ${summaryPath}`)
}

main().catch((error) => {
  console.error('generate-deploy-readmodels-pass1 failed', error)
  process.exitCode = 1
})
