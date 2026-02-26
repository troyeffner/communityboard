import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return jsonError('Invalid JSON')
  const eventId = String(body.event_id || '').trim()
  if (!eventId) return jsonError('event_id is required')

  const allowed: Record<string, unknown> = {}
  const fields = ['title', 'description', 'start_at', 'end_at', 'location', 'event_location_name', 'event_location_address', 'status', 'event_category', 'event_attributes', 'event_audience']
  for (const key of fields) {
    if (key in body) allowed[key] = body[key]
  }
  if ('event_attributes' in allowed) {
    const value = allowed.event_attributes
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      allowed.event_attributes = {}
    }
  }
  if ('event_audience' in allowed && !Array.isArray(allowed.event_audience)) {
    allowed.event_audience = []
  }
  if (Object.keys(allowed).length === 0) return jsonError('No updatable fields provided')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return jsonError('Missing Supabase env vars', 500)
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const update = await supabase.from('events').update(allowed).eq('id', eventId)
  if (update.error) {
    const message = (update.error.message || '').toLowerCase()
    const optionalMissing =
      update.error.code === '42703' ||
      message.includes('event_attributes') ||
      message.includes('event_audience') ||
      message.includes('event_category') ||
      message.includes('event_location_name') ||
      message.includes('event_location_address') ||
      message.includes('schema cache')

    if (!optionalMissing) return jsonError(update.error.message, 500)

    const fallbackAllowed: Record<string, unknown> = {}
    const fallbackFields = ['title', 'description', 'start_at', 'end_at', 'location', 'status']
    for (const key of fallbackFields) {
      if (key in allowed) fallbackAllowed[key] = allowed[key]
    }
    if (Object.keys(fallbackAllowed).length > 0) {
      const fallback = await supabase.from('events').update(fallbackAllowed).eq('id', eventId)
      if (fallback.error) return jsonError(fallback.error.message, 500)
    }
  }

  await supabase
    .from('event_activity_log')
    .insert([{ event_id: eventId, action: 'edited', user_id: null }])

  return NextResponse.json({ ok: true })
}
