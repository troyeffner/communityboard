import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return jsonError('Invalid JSON')

  const { event_id } = body as { event_id?: string }
  if (!event_id) return jsonError('event_id is required')

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return jsonError('Missing Supabase env vars', 500)

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

  const { error: delLinksErr } = await supabase
    .from('poster_event_links')
    .delete()
    .eq('event_id', event_id)

  if (delLinksErr) return jsonError(delLinksErr.message, 500)

  const { error: delEventErr } = await supabase
    .from('events')
    .delete()
    .eq('id', event_id)

  if (delEventErr) return jsonError(delEventErr.message, 500)

  return NextResponse.json({ ok: true })
}
