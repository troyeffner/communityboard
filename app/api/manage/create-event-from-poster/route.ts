import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ATTRIBUTES, AUDIENCE, EVENT_CATEGORIES, asStringArray, toSet } from '@/lib/taxonomy'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

type BBoxPoint = { x: number; y: number }
type EventStatus = 'draft' | 'published' | 'unpublished'

function isMissingRecurrenceColumnError(error: { code?: string; message?: string } | null | undefined) {
  const message = (error?.message || '').toLowerCase()
  return (
    error?.code === '42703' ||
    message.includes('recurrence_rule') ||
    message.includes('is_recurring') ||
    message.includes('description') ||
    message.includes('source_type') ||
    message.includes('source_place') ||
    message.includes('source_detail') ||
    message.includes('event_category') ||
    message.includes('event_attributes') ||
    message.includes('event_audience') ||
    message.includes('event_location_name') ||
    message.includes('event_location_address') ||
    message.includes('schema cache')
  )
}

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
  const body = await req.json().catch(() => null)
  if (!body) return jsonError('Invalid JSON')

  const {
    poster_upload_id,
    title,
    location,
    description,
    start_at,
    status,
    bbox,
    is_recurring,
    recurrence_rule,
    event_category,
    event_attributes,
    event_audience,
    event_location_name,
    event_location_address,
  } = body as {
    poster_upload_id?: string
    title?: string
    location?: string
    description?: string
    start_at?: string
    status?: EventStatus
    bbox?: BBoxPoint
    is_recurring?: boolean
    recurrence_rule?: string | null
    event_category?: string | null
    event_attributes?: string[] | string | null
    event_audience?: string[] | string | null
    event_location_name?: string | null
    event_location_address?: string | null
  }

  if (!poster_upload_id) return jsonError('poster_upload_id is required')
  if (!title?.trim()) return jsonError('title is required')
  if (status !== 'draft' && status !== 'published' && status !== 'unpublished') return jsonError('Invalid status')

  if (!bbox || typeof bbox.x !== 'number' || typeof bbox.y !== 'number') {
    return jsonError('bbox is required (x,y). Click the image to set a pin.')
  }

  const recurring = Boolean(is_recurring)
  const recurrenceRule = recurrence_rule?.trim() || null
  const categorySet = toSet(EVENT_CATEGORIES)
  const attributeSet = toSet(ATTRIBUTES)
  const audienceSet = toSet(AUDIENCE)
  const parsedAttributes = asStringArray(event_attributes).filter((tag) => attributeSet.has(tag))
  const parsedAudience = asStringArray(event_audience).filter((tag) => audienceSet.has(tag))
  const parsedCategory = event_category?.trim() || null
  if (parsedCategory && !categorySet.has(parsedCategory)) return jsonError('Invalid event_category')
  if (recurring && !recurrenceRule) {
    return jsonError('recurrence_rule is required when recurring')
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return jsonError('Missing Supabase env vars', 500)

  const supabase = createClient(url, serviceKey)

  const resolvedStartAt = start_at?.trim() || defaultNy2pmLocalIso()
  const nyIsoGuess = resolvedStartAt.length === 16 ? `${resolvedStartAt}:00` : resolvedStartAt

  const eventPayload = {
    title: title.trim(),
    location: location?.trim() || null,
    description: description?.trim() || null,
    source_type: null,
    source_place: null,
    source_detail: null,
    start_at: nyIsoGuess,
    status,
    is_recurring: recurring,
    recurrence_rule: recurring ? recurrenceRule : null,
    event_category: parsedCategory,
    event_attributes: parsedAttributes,
    event_audience: parsedAudience,
    event_location_name: event_location_name?.trim() || null,
    event_location_address: event_location_address?.trim() || null,
  }

  let createdEvents: Array<{ id: string }> | null = null

  const insert = await supabase
    .from('events')
    .insert([eventPayload])
    .select('id')
    .limit(1)

  if (insert.error) {
    if (!isMissingRecurrenceColumnError(insert.error)) return jsonError(insert.error.message, 500)

    const fallback = await supabase
      .from('events')
      .insert([
        {
          title: eventPayload.title,
          location: eventPayload.location,
          start_at: eventPayload.start_at,
          status: eventPayload.status,
        },
      ])
      .select('id')
      .limit(1)

    if (fallback.error) return jsonError(fallback.error.message, 500)
    createdEvents = fallback.data as Array<{ id: string }>
  } else {
    createdEvents = insert.data as Array<{ id: string }>
  }

  const eventId = createdEvents?.[0]?.id
  if (!eventId) return jsonError('Failed to create event', 500)

  const { error: linkErr } = await supabase.from('poster_event_links').insert([
    {
      poster_upload_id,
      event_id: eventId,
      bbox: { x: bbox.x, y: bbox.y },
    },
  ])

  if (linkErr) return jsonError(linkErr.message, 500)

  return NextResponse.json({ ok: true, event_id: eventId })
}
