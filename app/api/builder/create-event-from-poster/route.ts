import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { POSTER_STATUSES } from '@/lib/statuses'

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

function toDateAndTimeParts(value: string) {
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) {
    const [datePart, timePart] = value.split('T')
    return {
      start_date: datePart || null,
      time_of_day: timePart ? `${timePart.slice(0, 5)}:00` : '14:00:00',
    }
  }
  const yyyy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  const hh = String(dt.getHours()).padStart(2, '0')
  const mi = String(dt.getMinutes()).padStart(2, '0')
  return {
    start_date: `${yyyy}-${mm}-${dd}`,
    time_of_day: `${hh}:${mi}:00`,
  }
}

function isPosterItemsMissing(error: { code?: string; message?: string } | null | undefined) {
  const message = (error?.message || '').toLowerCase()
  return (
    error?.code === '42P01' ||
    error?.code === '42703' ||
    message.includes('poster_items') ||
    message.includes('location_text') ||
    message.includes('details_json') ||
    message.includes('schema cache')
  )
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return jsonError('Invalid JSON')
  const posterUploadId = String(body.poster_upload_id || '').trim()
  const title = String(body.title || '').trim()
  const location = String(body.location || '').trim()
  const description = String(body.description || '').trim()
  const recurrenceMode = typeof body.recurrence_mode === 'string' ? body.recurrence_mode.trim().toLowerCase() : ''
  const recurrenceWeekday = typeof body.recurrence_weekday === 'string' ? body.recurrence_weekday.trim().toLowerCase() : ''
  const recurrenceMonthOrdinal = typeof body.recurrence_month_ordinal === 'string' ? body.recurrence_month_ordinal.trim().toLowerCase() : ''
  const startAt = String(body.start_at || '').trim()
  const bbox = body.bbox as BBox | undefined
  if (!posterUploadId) return jsonError('poster_upload_id is required')
  if (!bbox || typeof bbox.x !== 'number' || typeof bbox.y !== 'number') return jsonError('bbox is required')
  const effectiveTitle = title || 'Untitled draft'

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return jsonError('Missing Supabase env vars', 500)
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  const resolvedStartAt = startAt || defaultNy2pmLocalIso()
  const dateTime = resolvedStartAt.length === 16 ? `${resolvedStartAt}:00` : resolvedStartAt
  const timeParts = toDateAndTimeParts(dateTime)

  const type = String(body.type || 'event').trim() || 'event'
  const detailsJson: Record<string, string> = {}
  if (description) detailsJson.description = description
  if (type === 'recurring_event') {
    if (recurrenceMode === 'weekly' || recurrenceMode === 'monthly') detailsJson.recurrence_mode = recurrenceMode
    if (recurrenceWeekday) detailsJson.recurrence_weekday = recurrenceWeekday
    if (recurrenceMode === 'monthly' && recurrenceMonthOrdinal) detailsJson.recurrence_month_ordinal = recurrenceMonthOrdinal
  }

  const createItem = await supabase
    .from('poster_items')
    .insert([{
      poster_id: posterUploadId,
      type,
      x: bbox.x,
      y: bbox.y,
      title: effectiveTitle,
      start_date: timeParts.start_date,
      time_of_day: timeParts.time_of_day,
      location_text: location || null,
      details_json: detailsJson,
      status: 'draft',
    }])
    .select('id')
    .single()

  let itemId = createItem.data?.id as string | undefined
  if (createItem.error && !isPosterItemsMissing(createItem.error)) {
    return jsonError(createItem.error.message, 500)
  }

  if (!itemId) {
    const createLegacy = await supabase
      .from('events')
      .insert([{
        title: effectiveTitle,
        location: location || null,
        description: description || null,
        start_at: dateTime,
        status: 'draft',
      }])
      .select('id')
      .single()
    if (createLegacy.error) return jsonError(createLegacy.error.message, 500)
    itemId = createLegacy.data?.id as string | undefined
    if (!itemId) return jsonError('Failed to create item', 500)
    const link = await supabase
      .from('poster_event_links')
      .insert([{ poster_upload_id: posterUploadId, event_id: itemId, bbox }])
    if (link.error) return jsonError(link.error.message, 500)
  }

  await supabase
    .from('poster_uploads')
    .update({ status: POSTER_STATUSES.TENDING })
    .eq('id', posterUploadId)

  return NextResponse.json({ ok: true, item_id: itemId, status: 'draft' })
}
