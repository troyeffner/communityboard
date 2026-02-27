import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function isOptionalSchemaError(error: { code?: string; message?: string } | null | undefined) {
  const message = (error?.message || '').toLowerCase()
  return (
    error?.code === '42703' ||
    message.includes('poster_items') ||
    message.includes('x') ||
    message.includes('y') ||
    message.includes('location_text') ||
    message.includes('time_of_day') ||
    message.includes('schema cache')
  )
}

type ItemStatus = 'draft' | 'published' | 'archived' | string
type ItemRow = {
  id: string
  title: string
  type?: string | null
  location_text?: string | null
  details_json?: { description?: string | null } | null
  time_of_day?: string | null
  start_date?: string | null
  status: ItemStatus
  x: number
  y: number
  created_at: string
}

type LinkRow = {
  id: string
  bbox: { x: number; y: number } | null
  created_at: string
  events: EventRow | EventRow[] | null
}

type EventRow = {
  id: string
  title: string
  location: string | null
  description?: string | null
  start_at: string
  status: string
  item_type?: string | null
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const poster_upload_id = url.searchParams.get('poster_upload_id')
  if (!poster_upload_id) return jsonError('poster_upload_id is required')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return jsonError('Missing Supabase env vars', 500)

  const supabase = createClient(supabaseUrl, serviceKey)

  const itemsPrimary = await supabase
    .from('poster_items')
    .select('id,title,type,status,start_date,time_of_day,location_text,details_json,x,y,created_at')
    .eq('poster_id', poster_upload_id)
    .order('created_at', { ascending: false })

  if (!itemsPrimary.error) {
    const rows = ((itemsPrimary.data || []) as ItemRow[]).map((item) => {
      const startAt = item.start_date
        ? `${item.start_date}T${item.time_of_day || '14:00:00'}`
        : new Date(item.created_at).toISOString()
      return {
        link_id: item.id,
        bbox: { x: item.x, y: item.y },
        created_at: item.created_at,
        event: {
          id: item.id,
          title: item.title || 'Untitled',
          location: item.location_text || null,
          description: item.details_json?.description || null,
          start_at: startAt,
          status: item.status || 'draft',
          item_type: item.type || 'event',
        },
      }
    })
    return NextResponse.json({ rows })
  }

  if (!isOptionalSchemaError(itemsPrimary.error)) return jsonError(itemsPrimary.error.message, 500)

  const legacy = await supabase
    .from('poster_event_links')
    .select('id, bbox, created_at, events ( id, title, location, description, start_at, status )')
    .eq('poster_upload_id', poster_upload_id)
    .order('created_at', { ascending: false })
  if (legacy.error) return jsonError(legacy.error.message, 500)

  const rows = ((legacy.data || []) as LinkRow[])
    .map((r) => {
      const event = Array.isArray(r.events) ? r.events[0] : r.events
      if (!event) return null
      return { link_id: r.id, bbox: r.bbox, created_at: r.created_at, event }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)

  return NextResponse.json({ rows })
}
