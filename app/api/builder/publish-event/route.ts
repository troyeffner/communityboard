import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { EVENT_STATUSES } from '@/lib/statuses'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function isMissingPublishColumns(error: { code?: string; message?: string } | null | undefined) {
  const lower = (error?.message || '').toLowerCase()
  return (
    error?.code === '42703' ||
    lower.includes('published_at') ||
    lower.includes('published_by') ||
    lower.includes('schema cache')
  )
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

  const now = new Date().toISOString()
  let update = await supabase
    .from('events')
    .update({ status: EVENT_STATUSES.PUBLISHED, published_by: null, published_at: now })
    .eq('id', eventId)

  if (update.error && isMissingPublishColumns(update.error)) {
    update = await supabase
      .from('events')
      .update({ status: EVENT_STATUSES.PUBLISHED })
      .eq('id', eventId)
  }
  if (update.error) return jsonError(update.error.message, 500)

  const activity = await supabase
    .from('event_activity_log')
    .insert([{ event_id: eventId, action: 'published', user_id: null }])
  if (activity.error) {
    const message = (activity.error.message || '').toLowerCase()
    if (!message.includes('event_activity_log')) return jsonError(activity.error.message, 500)
  }

  return NextResponse.json({ ok: true, status: EVENT_STATUSES.PUBLISHED, published_at: now })
}
