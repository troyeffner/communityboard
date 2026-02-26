import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return jsonError('Invalid JSON')

  const { poster_upload_id, title, start_at, status } = body as {
    poster_upload_id?: string
    title?: string
    start_at?: string
    status?: 'draft' | 'published'
  }

  if (!poster_upload_id) return jsonError('poster_upload_id is required')
  if (!title?.trim()) return jsonError('title is required')
  if (!start_at?.trim()) return jsonError('start_at is required')
  if (status !== 'draft' && status !== 'published') return jsonError('Invalid status')

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return jsonError('Missing Supabase env vars', 500)

  const supabase = createClient(url, serviceKey)

  // Insert event
  const nyIsoGuess = start_at.length === 16 ? `${start_at}:00` : start_at

  const { data: createdEvents, error: eventErr } = await supabase
    .from('events')
    .insert([{ title: title.trim(), start_at: nyIsoGuess, status }])
    .select('id')
    .limit(1)

  if (eventErr) return jsonError(eventErr.message, 500)
  const eventId = createdEvents?.[0]?.id
  if (!eventId) return jsonError('Failed to create event', 500)

  // Link to poster upload
  const { error: linkErr } = await supabase.from('poster_event_links').insert([
    { poster_upload_id, event_id: eventId },
  ])

  if (linkErr) return jsonError(linkErr.message, 500)

  return NextResponse.json({ ok: true, event_id: eventId })
}
