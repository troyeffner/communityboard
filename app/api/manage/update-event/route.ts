import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ATTRIBUTES, AUDIENCE, EVENT_CATEGORIES, asStringArray, toSet } from '@/lib/taxonomy'

type EventStatus = 'draft' | 'published' | 'unpublished'
const SOURCE_TYPES = new Set([
  'community_board',
  'window_display',
  'business_card_rack',
  'flyer_stack',
  'newspaper',
  'word_of_mouth',
])

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

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

function isMissingSeenAtColumnError(error: { code?: string; message?: string } | null | undefined) {
  const message = (error?.message || '').toLowerCase()
  return (
    error?.code === '42703' ||
    message.includes('seen_at_label') ||
    message.includes('seen_at_name') ||
    message.includes('schema cache')
  )
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return jsonError('Invalid JSON')

  const { id, poster_upload_id, seen_at_label, title, location, description, source_type, source_place, source_detail, start_at, status, is_recurring, recurrence_rule } = body as {
    id?: string
    poster_upload_id?: string | null
    seen_at_label?: string | null
    title?: string
    location?: string
    description?: string
    source_type?: string
    source_place?: string
    source_detail?: string
    start_at?: string
    status?: EventStatus
    is_recurring?: boolean
    recurrence_rule?: string | null
    event_category?: string | null
    event_attributes?: string[] | string | null
    event_audience?: string[] | string | null
    event_location_name?: string | null
    event_location_address?: string | null
  }
  const { event_category, event_attributes, event_audience, event_location_name, event_location_address } = body as {
    event_category?: string | null
    event_attributes?: string[] | string | null
    event_audience?: string[] | string | null
    event_location_name?: string | null
    event_location_address?: string | null
  }

  if (!id) return jsonError('id is required')
  if (!title?.trim()) return jsonError('title is required')
  if (!start_at?.trim()) return jsonError('start_at is required')
  if (status !== 'draft' && status !== 'published' && status !== 'unpublished') return jsonError('Invalid status')

  const recurring = Boolean(is_recurring)
  const recurrenceRule = recurrence_rule?.trim() || null
  const sourceType = source_type?.trim().toLowerCase() || null
  const categorySet = toSet(EVENT_CATEGORIES)
  const attributeSet = toSet(ATTRIBUTES)
  const audienceSet = toSet(AUDIENCE)
  const parsedAttributes = asStringArray(event_attributes).filter((tag) => attributeSet.has(tag))
  const parsedAudience = asStringArray(event_audience).filter((tag) => audienceSet.has(tag))
  const parsedCategory = event_category?.trim() || null
  if (parsedCategory && !categorySet.has(parsedCategory)) return jsonError('Invalid event_category')
  if (recurring && !recurrenceRule) return jsonError('recurrence_rule is required when recurring')
  if (sourceType && !SOURCE_TYPES.has(sourceType)) return jsonError('Invalid source_type')

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return jsonError('Missing Supabase env vars', 500)

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })
  const nyIsoGuess = start_at.length === 16 ? `${start_at}:00` : start_at

  const updatePayload = {
    title: title.trim(),
    location: location?.trim() || null,
    description: description?.trim() || null,
    source_type: sourceType,
    source_place: source_place?.trim() || null,
    source_detail: source_detail?.trim() || null,
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

  const update = await supabase
    .from('events')
    .update(updatePayload)
    .eq('id', id)

  if (update.error) {
    if (!isMissingRecurrenceColumnError(update.error)) return jsonError(update.error.message, 500)

    const fallback = await supabase
      .from('events')
      .update({
        title: updatePayload.title,
        location: updatePayload.location,
        start_at: updatePayload.start_at,
        status: updatePayload.status,
      })
      .eq('id', id)

    if (fallback.error) return jsonError(fallback.error.message, 500)
  }

  if (typeof seen_at_label === 'string' && poster_upload_id) {
    const seenAtValue = seen_at_label.trim() || null
    const primarySeenAt = await supabase
      .from('poster_uploads')
      .update({ seen_at_label: seenAtValue })
      .eq('id', poster_upload_id)

    if (primarySeenAt.error && isMissingSeenAtColumnError(primarySeenAt.error)) {
      const fallbackSeenAt = await supabase
        .from('poster_uploads')
        .update({ seen_at_name: seenAtValue })
        .eq('id', poster_upload_id)
      if (fallbackSeenAt.error && !isMissingSeenAtColumnError(fallbackSeenAt.error)) {
        return jsonError(fallbackSeenAt.error.message, 500)
      }
      if (fallbackSeenAt.error && isMissingSeenAtColumnError(fallbackSeenAt.error)) {
        return jsonError('Seen at columns are missing on poster_uploads. Run the DB migration for seen_at_label.', 500)
      }
    } else if (primarySeenAt.error) {
      return jsonError(primarySeenAt.error.message, 500)
    }
  }

  return NextResponse.json({ ok: true })
}
