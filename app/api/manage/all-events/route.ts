import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

type EventStatus = 'draft' | 'published'

type EventRow = {
  id: string
  title: string
  location: string | null
  description: string | null
  source_type: string | null
  source_place: string | null
  source_detail: string | null
  start_at: string
  status: EventStatus
  created_at: string
  is_recurring: boolean | null
  recurrence_rule: string | null
}

type LinkRow = {
  event_id: string
  poster_upload_id: string
}

function isMissingOptionalColumns(error: { code?: string; message?: string } | null | undefined) {
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

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return jsonError('Missing Supabase env vars', 500)

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

  const primary = await supabase
    .from('events')
    .select('id,title,location,description,source_type,source_place,source_detail,start_at,status,created_at,is_recurring,recurrence_rule')
    .order('created_at', { ascending: false })
    .limit(200)

  let events: EventRow[] = []
  if (primary.error) {
    if (!isMissingOptionalColumns(primary.error)) return jsonError(primary.error.message, 500)

    const fallback = await supabase
      .from('events')
      .select('id,title,location,start_at,status,created_at')
      .order('created_at', { ascending: false })
      .limit(200)

    if (fallback.error) return jsonError(fallback.error.message, 500)

    events = ((fallback.data || []) as Array<Omit<EventRow, 'description' | 'source_type' | 'source_place' | 'source_detail' | 'is_recurring' | 'recurrence_rule'>>).map((e) => ({
      ...e,
      description: null,
      source_type: null,
      source_place: null,
      source_detail: null,
      is_recurring: false,
      recurrence_rule: null,
    }))
  } else {
    events = (primary.data || []) as EventRow[]
  }

  const { data: links, error: linksError } = await supabase
    .from('poster_event_links')
    .select('event_id,poster_upload_id')

  if (linksError) return jsonError(linksError.message, 500)

  const linkCounts = new Map<string, number>()
  const latestPosterByEvent = new Map<string, string>()
  for (const link of (links || []) as LinkRow[]) {
    linkCounts.set(link.event_id, (linkCounts.get(link.event_id) || 0) + 1)
    if (!latestPosterByEvent.has(link.event_id)) {
      latestPosterByEvent.set(link.event_id, link.poster_upload_id)
    }
  }

  const rows = events.map((e) => ({
    ...e,
    source_type: e.source_type || null,
    source_place: e.source_place || null,
    source_detail: e.source_detail || null,
    is_recurring: Boolean(e.is_recurring),
    recurrence_rule: e.recurrence_rule || null,
    linked_count: linkCounts.get(e.id) || 0,
    is_linked: (linkCounts.get(e.id) || 0) > 0,
    poster_upload_id: latestPosterByEvent.get(e.id) || null,
  }))

  return NextResponse.json({ rows })
}
