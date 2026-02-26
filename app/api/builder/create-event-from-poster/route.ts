import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

function normalizeStatus(raw: unknown): 'draft' | 'published' {
  const value = String(raw || '').trim().toLowerCase()
  if (value === 'published' || value === 'on_board') return 'published'
  return 'draft'
}

export async function POST(req: Request) {
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return jsonError('Missing Supabase env vars', 500)
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  const eventAttributes =
    body.event_attributes && typeof body.event_attributes === 'object' && !Array.isArray(body.event_attributes)
      ? body.event_attributes
      : {}
  const normalizedStatus = normalizeStatus(body.status)

  const resolvedStartAt = startAt || defaultNy2pmLocalIso()
  const nyIsoGuess = resolvedStartAt.length === 16 ? `${resolvedStartAt}:00` : resolvedStartAt
  const create = await supabase
    .from('events')
    .insert([{
      title,
      location: location || null,
      description: description || null,
      start_at: nyIsoGuess,
      status: normalizedStatus,
      is_recurring: Boolean(body.is_recurring),
      recurrence_rule: body.is_recurring ? String(body.recurrence_rule || '').trim() || null : null,
      event_category: String(body.event_category || '').trim() || null,
      event_attributes: eventAttributes,
      event_audience: Array.isArray(body.event_audience) ? body.event_audience : [],
      event_location_name: String(body.event_location_name || '').trim() || null,
      event_location_address: String(body.event_location_address || '').trim() || null,
    }])
    .select('id')
    .single()

  let eventId = create.data?.id as string | undefined
  if (create.error) {
    const message = (create.error.message || '').toLowerCase()
    const optionalMissing =
      create.error.code === '42703' ||
      message.includes('event_attributes') ||
      message.includes('event_audience') ||
      message.includes('event_category') ||
      message.includes('event_location_name') ||
      message.includes('event_location_address') ||
      message.includes('schema cache')

    if (!optionalMissing) return jsonError(create.error.message, 500)

    const fallback = await supabase
      .from('events')
      .insert([{
        title,
        location: location || null,
        description: description || null,
        start_at: nyIsoGuess,
        status: normalizedStatus,
      }])
      .select('id')
      .single()
    if (fallback.error) return jsonError(fallback.error.message, 500)
    eventId = fallback.data?.id as string | undefined
  }
  if (!eventId) return jsonError('Failed to create event', 500)

  const link = await supabase
    .from('poster_event_links')
    .insert([{ poster_upload_id: posterUploadId, event_id: eventId, bbox }])
  if (link.error) return jsonError(link.error.message, 500)

  return NextResponse.json({ ok: true, event_id: eventId, status: normalizedStatus })
}
