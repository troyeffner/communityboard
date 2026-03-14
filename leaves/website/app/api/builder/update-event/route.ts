import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { EVENT_STATUSES, normalizeEventStatus } from '@/lib/statuses'
import { normalizeItemType } from '@/lib/itemTypes'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return jsonError('Invalid JSON')
  const eventId = String(body.event_id || '').trim()
  if (!eventId) return jsonError('event_id is required')

  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const description = typeof body.description === 'string' ? body.description.trim() : ''
  const location = typeof body.location === 'string' ? body.location.trim() : ''
  const status = typeof body.status === 'string' ? normalizeEventStatus(body.status, EVENT_STATUSES.DRAFT) : ''
  const itemType = typeof body.type === 'string' ? normalizeItemType(body.type, 'event') : ''
  const recurrenceMode = typeof body.recurrence_mode === 'string' ? body.recurrence_mode.trim().toLowerCase() : ''
  const recurrenceWeekday = typeof body.recurrence_weekday === 'string' ? body.recurrence_weekday.trim().toLowerCase() : ''
  const recurrenceMonthOrdinal = typeof body.recurrence_month_ordinal === 'string' ? body.recurrence_month_ordinal.trim().toLowerCase() : ''
  const startAtRaw = typeof body.start_at === 'string' ? body.start_at.trim() : ''

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return jsonError('Missing Supabase env vars', 500)
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const updates: Record<string, unknown> = {}
  if (title) updates.title = title
  if ('location' in body) updates.location_text = location || null
  if ('description' in body || 'recurrence_mode' in body || 'recurrence_weekday' in body || 'recurrence_month_ordinal' in body || 'type' in body) {
    const nextDetails: Record<string, string> = {}
    if (description) nextDetails.description = description
    const effectiveType = itemType || 'event'
    if (effectiveType === 'recurring_event') {
      if (recurrenceMode === 'weekly' || recurrenceMode === 'monthly') nextDetails.recurrence_mode = recurrenceMode
      if (recurrenceWeekday) nextDetails.recurrence_weekday = recurrenceWeekday
      if (recurrenceMode === 'monthly' && recurrenceMonthOrdinal) nextDetails.recurrence_month_ordinal = recurrenceMonthOrdinal
    }
    updates.details_json = nextDetails
  }
  if (status) updates.status = status
  if (itemType) updates.type = itemType
  if (startAtRaw) {
    const dt = new Date(startAtRaw.length === 16 ? `${startAtRaw}:00` : startAtRaw)
    if (!Number.isNaN(dt.getTime())) {
      updates.start_date = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
      updates.time_of_day = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}:00`
    }
  }
  if (Object.keys(updates).length === 0) return jsonError('No updatable fields provided')

  const itemUpdate = await supabase.from('poster_items').update(updates).eq('id', eventId)
  if (itemUpdate.error) {
    const message = (itemUpdate.error.message || '').toLowerCase()
    const missingPosterItems =
      itemUpdate.error.code === '42P01' ||
      itemUpdate.error.code === '42703' ||
      message.includes('poster_items') ||
      message.includes('location_text') ||
      message.includes('details_json') ||
      message.includes('schema cache')

    if (!missingPosterItems) return jsonError(itemUpdate.error.message, 500)

    const legacyUpdates: Record<string, unknown> = {}
    if (title) legacyUpdates.title = title
    if ('location' in body) legacyUpdates.location = location || null
    if ('description' in body) legacyUpdates.description = description || null
    if (status) legacyUpdates.status = status
    if (itemType) legacyUpdates.is_recurring = itemType === 'recurring_event'
    if (startAtRaw) legacyUpdates.start_at = startAtRaw.length === 16 ? `${startAtRaw}:00` : startAtRaw
    const fallback = await supabase.from('events').update(legacyUpdates).eq('id', eventId)
    if (fallback.error) return jsonError(fallback.error.message, 500)
  }

  await supabase
    .from('event_activity_log')
    .insert([{ event_id: eventId, action: 'edited', user_id: null }])

  return NextResponse.json({ ok: true })
}
