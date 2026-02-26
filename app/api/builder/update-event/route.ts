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
  const fields = ['title', 'description', 'start_at', 'end_at', 'location', 'event_location_name', 'event_location_address', 'is_recurring', 'recurrence_rule', 'status', 'event_category', 'event_attributes', 'event_audience']
  for (const key of fields) {
    if (key in body) allowed[key] = body[key]
  }
  if (Object.keys(allowed).length === 0) return jsonError('No updatable fields provided')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.DEV_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DEV_SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return jsonError('Missing Supabase env vars', 500)
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const update = await supabase.from('events').update(allowed).eq('id', eventId)
  if (update.error) return jsonError(update.error.message, 500)

  await supabase
    .from('event_activity_log')
    .insert([{ event_id: eventId, action: 'edited', user_id: null }])

  return NextResponse.json({ ok: true })
}
