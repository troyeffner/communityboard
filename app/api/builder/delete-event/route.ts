import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return jsonError('Invalid JSON')
  const eventId = String(body.event_id || '').trim()
  if (!eventId) return jsonError('event_id is required')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return jsonError('Missing Supabase env vars', 500)
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const delLinks = await supabase.from('poster_event_links').delete().eq('event_id', eventId)
  if (delLinks.error) return jsonError(delLinks.error.message, 500)
  const delEvent = await supabase.from('events').delete().eq('id', eventId)
  if (delEvent.error) return jsonError(delEvent.error.message, 500)

  await supabase
    .from('event_activity_log')
    .insert([{ event_id: eventId, action: 'removed', user_id: null }])

  return NextResponse.json({ ok: true })
}
