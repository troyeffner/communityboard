import { appendFile, mkdir } from 'fs/promises'
import path from 'path'
import { createHash, randomUUID } from 'crypto'

type ActorType = 'community' | 'practitioner' | 'system'

export type SignalFiberInput = {
  sourceSurface: string
  eventType: string
  objectType: string
  objectId: string
  actorType?: ActorType
  actorId?: string | null
  payload?: Record<string, unknown>
  tags?: string[]
  lineage?: string
  status?: string
}

function pad2(v: number) {
  return String(v).padStart(2, '0')
}

function safeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function hashActorId(actorId: string | null | undefined) {
  if (!actorId) return null
  return createHash('sha256').update(actorId).digest('hex')
}

function uniqueTags(tags: string[] | undefined) {
  if (!tags || tags.length === 0) return []
  return Array.from(new Set(tags.map((t) => t.trim()).filter(Boolean)))
}

export async function appendSignalFiber(input: SignalFiberInput) {
  const mode = process.env.CB_FIBER_WRITE_MODE || 'filesystem'
  if (mode === 'off') return { ok: false, reason: 'disabled' as const }
  if (mode !== 'filesystem') return { ok: false, reason: 'unsupported-mode' as const }

  try {
    const now = new Date()
    const yyyy = String(now.getUTCFullYear())
    const mm = pad2(now.getUTCMonth() + 1)
    const dd = pad2(now.getUTCDate())
    const hh = pad2(now.getUTCHours())
    const min = pad2(now.getUTCMinutes())
    const ss = pad2(now.getUTCSeconds())
    const root = process.env.CB_TRUNK_PATH
      ? path.resolve(process.env.CB_TRUNK_PATH)
      : path.join(process.cwd(), 'trunk')
    const dir = path.join(root, 'fibers', 'incoming', yyyy, mm, dd)
    const filePath = path.join(dir, 'signal.jsonl')
    const fiberId = `signal_${yyyy}${mm}${dd}_${hh}${min}${ss}_${randomUUID().slice(0, 8)}`
    const fiber = {
      fiber_id: fiberId,
      fiber_kind: 'signal',
      created_at: now.toISOString(),
      source_surface: input.sourceSurface,
      event_type: input.eventType,
      object_type: input.objectType,
      object_id: input.objectId,
      actor_type: input.actorType || 'community',
      actor_id_hash: hashActorId(input.actorId),
      payload: input.payload || {},
      tags: uniqueTags(input.tags),
      lineage: input.lineage || 'communityboard.trunk-cutover.pass2',
      status: input.status || 'captured',
      source_repo: 'communityboard',
    }
    await mkdir(dir, { recursive: true })
    await appendFile(filePath, `${JSON.stringify(fiber)}\n`, 'utf8')

    if (process.env.CB_TRIGGER_READMODEL_REFRESH === '1') {
      const refreshPath = path.join(root, 'overnight', 'outputs', 'refresh_requests.jsonl')
      await mkdir(path.dirname(refreshPath), { recursive: true })
      await appendFile(
        refreshPath,
        `${JSON.stringify({
          requested_at: now.toISOString(),
          reason: 'route-write',
          source_surface: input.sourceSurface,
          fiber_id: fiberId,
        })}\n`,
        'utf8',
      )
    }
    return { ok: true, fiberId, filePath }
  } catch (error) {
    // Fiber emission is shadow-write during cutover; runtime should not fail if this write fails.
    console.error('appendSignalFiber failed', error)
    return { ok: false, reason: 'write-failed' as const }
  }
}

export function signalObjectId(parts: Array<string | number | null | undefined>) {
  return parts.map((v) => safeSlug(String(v ?? ''))).filter(Boolean).join(':')
}
