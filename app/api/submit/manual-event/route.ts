import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type EventStatus = 'draft' | 'published'

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

  const { title, location, description, start_at, is_recurring, recurrence_rule } = body as {
    title?: string
    location?: string
    description?: string
    start_at?: string
    is_recurring?: boolean
    recurrence_rule?: string | null
    status?: EventStatus
  }

  if (!title?.trim()) return jsonError('title is required')

  const recurring = Boolean(is_recurring)
  const rule = recurrence_rule?.trim() || null
  if (recurring && !rule) return jsonError('recurrence_rule is required when recurring')

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return jsonError('Missing Supabase env vars', 500)

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })
  const resolvedStartAt = start_at?.trim() || defaultNy2pmLocalIso()
  const nyIsoGuess = resolvedStartAt.length === 16 ? `${resolvedStartAt}:00` : resolvedStartAt

  const payload = {
    title: title.trim(),
    location: location?.trim() || null,
    description: description?.trim() || null,
    start_at: nyIsoGuess,
    status: 'draft' as EventStatus,
    is_recurring: recurring,
    recurrence_rule: recurring ? rule : null,
  }

  const insert = await supabase
    .from('events')
    .insert([payload])
    .select('id')
    .limit(1)

  let eventId = insert.data?.[0]?.id as string | undefined

  if (insert.error) {
    if (!isMissingRecurrenceColumnError(insert.error)) return jsonError(insert.error.message, 500)

    // Backward compatibility before recurrence migration.
    const fallback = await supabase
      .from('events')
      .insert([
        {
          title: payload.title,
          location: payload.location,
          description: payload.description,
          start_at: payload.start_at,
          status: payload.status,
        },
      ])
      .select('id')
      .limit(1)

    if (fallback.error) return jsonError(fallback.error.message, 500)
    eventId = fallback.data?.[0]?.id as string | undefined
  }

  return NextResponse.json({ ok: true, event_id: eventId || null })
}
