#!/usr/bin/env node
import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

function argValue(flag, fallback = '') {
  for (let idx = process.argv.length - 2; idx >= 0; idx -= 1) {
    if (process.argv[idx] === flag) {
      return String(process.argv[idx + 1] || '').trim()
    }
  }
  return fallback
}

async function main() {
  const stage = argValue('--stage', 'intent')
  const status = argValue('--status', 'unknown')
  const target = argValue('--target', 'communityboard')
  const provider = argValue('--provider', 'vercel')
  const ref = argValue('--ref', '')
  const note = argValue('--note', '')

  const now = new Date()
  const root = process.env.CB_TRUNK_PATH
    ? path.resolve(process.env.CB_TRUNK_PATH)
    : path.join(process.cwd(), 'trunk')
  const workPath = path.join(root, 'fibers', 'work', 'deploy_events.jsonl')
  await fs.mkdir(path.dirname(workPath), { recursive: true })

  const record = {
    fiber_id: `deploy_${now.toISOString().replace(/[:.-]/g, '')}_${randomUUID().slice(0, 8)}`,
    fiber_kind: 'work',
    created_at: now.toISOString(),
    source_surface: 'trunk/branches/ops/emit-deploy-fiber.mjs',
    event_type: 'deploy_event',
    object_type: 'deployment',
    object_id: `${provider}:${target}:${stage}`,
    actor_type: 'system',
    actor_id_hash: null,
    payload: { stage, status, target, provider, ref, note },
    tags: ['communityboard', 'deploy', provider, stage, status],
    lineage: 'communityboard.cutover.pass6.deploy-fiberization',
    status: 'captured',
    source_repo: 'communityboard',
  }

  await fs.appendFile(workPath, `${JSON.stringify(record)}\n`, 'utf8')
  console.log(`deploy fiber emitted: ${workPath}`)
}

main().catch((error) => {
  console.error('emit-deploy-fiber failed', error)
  process.exitCode = 1
})
