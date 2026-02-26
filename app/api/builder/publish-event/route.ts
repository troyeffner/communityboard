import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireBuilder } from '@/lib/builder-auth'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(req: Request) {
  const auth = await requireBuilder(req)
  if (!auth.ok) return auth.response

  const body = await req.json().catch(() => null)
  if (!body) return jsonError('Invalid JSON')
  const eventId = String(body.event_id || '').trim()
  if (!eventId) return jsonError('event_id is required')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.DEV_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DEV_SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return jsonError('Missing Supabase env vars', 500)
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const now = new Date().toISOString()
  const update = await supabase
    .from('events')
    .update({ status: 'on_board', published_by: auth.identity.id, published_at: now })
    .eq('id', eventId)
  if (update.error) return jsonError(update.error.message, 500)

  const activity = await supabase
    .from('event_activity_log')
    .insert([{ event_id: eventId, action: 'published', user_id: auth.identity.id }])
  if (activity.error) {
    const message = (activity.error.message || '').toLowerCase()
    if (!message.includes('event_activity_log')) return jsonError(activity.error.message, 500)
  }

  return NextResponse.json({ ok: true, status: 'on_board', published_at: now })
}
