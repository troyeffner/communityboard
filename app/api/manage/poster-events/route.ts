import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    message.includes('schema cache')
  )
}

type EventStatus = 'draft' | 'published'
type EventRow = {
  id: string
  title: string
  location: string | null
  description?: string | null
  source_type?: string | null
  source_place?: string | null
  source_detail?: string | null
  start_at: string
  status: EventStatus
  is_recurring?: boolean | null
  recurrence_rule?: string | null
}

type LinkRow = {
  id: string
  bbox: { x: number; y: number } | null
  created_at: string
  events: EventRow | EventRow[] | null
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const poster_upload_id = url.searchParams.get('poster_upload_id')
  if (!poster_upload_id) return jsonError('poster_upload_id is required')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return jsonError('Missing Supabase env vars', 500)

  const supabase = createClient(supabaseUrl, serviceKey)

  const primary = await supabase
    .from('poster_event_links')
    .select('id, bbox, created_at, events ( id, title, location, description, source_type, source_place, source_detail, start_at, status, is_recurring, recurrence_rule )')
    .eq('poster_upload_id', poster_upload_id)
    .order('created_at', { ascending: false })

  let data: LinkRow[] | null = (primary.data || null) as LinkRow[] | null
  if (primary.error) {
    if (!isMissingRecurrenceColumnError(primary.error)) return jsonError(primary.error.message, 500)

    const fallback = await supabase
      .from('poster_event_links')
      .select('id, bbox, created_at, events ( id, title, location, description, start_at, status )')
      .eq('poster_upload_id', poster_upload_id)
      .order('created_at', { ascending: false })

    if (fallback.error) return jsonError(fallback.error.message, 500)
    data = (fallback.data || null) as LinkRow[] | null
  }

  const rows = ((data || []) as LinkRow[])
    .map((r) => {
      const event = Array.isArray(r.events) ? r.events[0] : r.events
      if (!event) return null
      return {
        link_id: r.id,
        bbox: r.bbox,
        created_at: r.created_at,
        event,
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)

  return NextResponse.json({ rows })
}
