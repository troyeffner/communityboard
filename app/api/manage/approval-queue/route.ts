import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function isMissingRecurrenceColumnError(error: { code?: string; message?: string } | null | undefined) {
  const message = (error?.message || '').toLowerCase()
  return (
    error?.code === '42703' ||
    message.includes('schema cache')
  )
}

type EventStatus = 'draft' | 'published' | 'archived'

type FallbackEventRow = {
  id: string
  title: string
  location: string | null
  description?: string | null
  start_at: string
  status: EventStatus
  created_at: string
  poster_event_links:
    | { id: string; poster_upload_id: string }
    | Array<{ id: string; poster_upload_id: string }>
    | null
}

type EventRow = {
  id: string
  title: string
  location: string | null
  description?: string | null
  start_at: string
  status: EventStatus
  created_at: string
  poster_event_links:
    | { id: string; poster_upload_id: string }
    | Array<{ id: string; poster_upload_id: string }>
    | null
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return jsonError('Missing Supabase env vars', 500)

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

  const { data, error } = await supabase
    .from('events')
    .select('id,title,location,description,start_at,status,created_at,poster_event_links(id,poster_upload_id)')
    .in('status', ['draft'])
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    // Backward compatibility before recurrence migration.
    if (!isMissingRecurrenceColumnError(error)) return jsonError(error.message, 500)

    const fallback = await supabase
      .from('events')
      .select('id,title,location,description,start_at,status,created_at,poster_event_links(id,poster_upload_id)')
      .in('status', ['draft'])
      .order('created_at', { ascending: false })
      .limit(100)

    if (fallback.error) return jsonError(fallback.error.message, 500)

    const rows = ((fallback.data || []) as FallbackEventRow[]).map((row) => {
      const links = Array.isArray(row.poster_event_links)
        ? row.poster_event_links
        : row.poster_event_links
          ? [row.poster_event_links]
          : []

      return {
        id: row.id,
        title: row.title,
        location: row.location,
        description: row.description || null,
        start_at: row.start_at,
        status: row.status,
        created_at: row.created_at,
        source_type: links.length > 0 ? 'poster' : 'manual',
        source: links.length > 0 ? 'poster' : 'manual',
        poster_upload_id: links[0]?.poster_upload_id || null,
        link_id: links[0]?.id || null,
      }
    })

    return NextResponse.json({ rows })
  }

  const rows = ((data || []) as EventRow[]).map((row) => {
    const links = Array.isArray(row.poster_event_links)
      ? row.poster_event_links
      : row.poster_event_links
        ? [row.poster_event_links]
        : []

    return {
      id: row.id,
      title: row.title,
      location: row.location,
      description: row.description || null,
      start_at: row.start_at,
      status: row.status,
      created_at: row.created_at,
      source_type: links.length > 0 ? 'poster' : 'manual',
      source: links.length > 0 ? 'poster' : 'manual',
      poster_upload_id: links[0]?.poster_upload_id || null,
      link_id: links[0]?.id || null,
    }
  })

  return NextResponse.json({ rows })
}
