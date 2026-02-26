import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireBuilder } from '@/lib/builder-auth'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

type BBox = { x: number; y: number }

function defaultNy2pmLocalIso() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const year = parts.find((p) => p.type === 'year')?.value
  const month = parts.find((p) => p.type === 'month')?.value
  const day = parts.find((p) => p.type === 'day')?.value
  if (!year || !month || !day) return '2000-01-01T14:00:00'
  return `${year}-${month}-${day}T14:00:00`
}

export async function POST(req: Request) {
  const auth = await requireBuilder(req)
  if (!auth.ok) return auth.response

  const body = await req.json().catch(() => null)
  if (!body) return jsonError('Invalid JSON')
  const posterUploadId = String(body.poster_upload_id || '').trim()
  const title = String(body.title || '').trim()
  const location = String(body.location || '').trim()
  const description = String(body.description || '').trim()
  const startAt = String(body.start_at || '').trim()
  const bbox = body.bbox as BBox | undefined
  if (!posterUploadId) return jsonError('poster_upload_id is required')
  if (!title) return jsonError('title is required')
  if (!bbox || typeof bbox.x !== 'number' || typeof bbox.y !== 'number') return jsonError('bbox is required')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.DEV_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DEV_SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return jsonError('Missing Supabase env vars', 500)
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const resolvedStartAt = startAt || defaultNy2pmLocalIso()
  const nyIsoGuess = resolvedStartAt.length === 16 ? `${resolvedStartAt}:00` : resolvedStartAt
  const create = await supabase
    .from('events')
    .insert([{
      title,
      location: location || null,
      description: description || null,
      start_at: nyIsoGuess,
      status: 'planted',
      is_recurring: Boolean(body.is_recurring),
      recurrence_rule: body.is_recurring ? String(body.recurrence_rule || '').trim() || null : null,
      event_category: String(body.event_category || '').trim() || null,
      event_attributes: Array.isArray(body.event_attributes) ? body.event_attributes : [],
      event_audience: Array.isArray(body.event_audience) ? body.event_audience : [],
      event_location_name: String(body.event_location_name || '').trim() || null,
      event_location_address: String(body.event_location_address || '').trim() || null,
    }])
    .select('id')
    .single()
  if (create.error) return jsonError(create.error.message, 500)
  if (!create.data?.id) return jsonError('Failed to create event', 500)

  const link = await supabase
    .from('poster_event_links')
    .insert([{ poster_upload_id: posterUploadId, event_id: create.data.id, bbox }])
  if (link.error) return jsonError(link.error.message, 500)

  return NextResponse.json({ ok: true, event_id: create.data.id, status: 'planted' })
}
