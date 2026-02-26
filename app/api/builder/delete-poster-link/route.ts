import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return jsonError('Invalid JSON')

  const linkId = String(body.link_id || '').trim()
  const mode = String(body.mode || 'unlink').toLowerCase()
  if (!linkId) return jsonError('link_id is required')
  if (mode !== 'unlink' && mode !== 'cascade') return jsonError('mode must be unlink or cascade')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.DEV_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DEV_SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return jsonError('Missing Supabase env vars', 500)
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const lookup = await supabase
    .from('poster_event_links')
    .select('id,event_id')
    .eq('id', linkId)
    .maybeSingle()
  if (lookup.error) return jsonError(lookup.error.message, 500)
  if (!lookup.data) return jsonError('Link not found', 404)

  const delLink = await supabase.from('poster_event_links').delete().eq('id', linkId)
  if (delLink.error) return jsonError(delLink.error.message, 500)

  if (mode === 'cascade') {
    const delEvent = await supabase.from('events').delete().eq('id', lookup.data.event_id)
    if (delEvent.error) return jsonError(delEvent.error.message, 500)
  }

  return NextResponse.json({ ok: true, mode })
}
