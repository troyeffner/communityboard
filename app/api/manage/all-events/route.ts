import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ATTRIBUTES, AUDIENCE, EVENT_CATEGORIES, asStringArray, toSet } from '@/lib/taxonomy'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

type EventStatus = 'draft' | 'published' | 'unpublished'

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
  event_category: string | null
  event_attributes: string[] | null
  event_audience: string[] | null
  event_location_name: string | null
  event_location_address: string | null
}

type LinkRow = {
  event_id: string
  poster_upload_id: string
}

function isMissingOptionalColumns(error: { code?: string; message?: string } | null | undefined) {
  const message = (error?.message || '').toLowerCase()
  return (
    error?.code === '42703' ||
    message.includes('description') ||
    message.includes('source_type') ||
    message.includes('source_place') ||
    message.includes('source_detail') ||
    message.includes('event_category') ||
    message.includes('event_attributes') ||
    message.includes('event_audience') ||
    message.includes('event_location_name') ||
    message.includes('event_location_address') ||
    message.includes('schema cache')
  )
}

export async function GET(req: Request) {
  const categorySet = toSet(EVENT_CATEGORIES)
  const attributeSet = toSet(ATTRIBUTES)
  const audienceSet = toSet(AUDIENCE)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return jsonError('Missing Supabase env vars', 500)

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })
  const params = new URL(req.url).searchParams

  const primary = await supabase
    .from('events')
    .select('id,title,location,description,source_type,source_place,source_detail,start_at,status,created_at,event_category,event_attributes,event_audience,event_location_name,event_location_address')
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

    events = ((fallback.data || []) as Array<Omit<EventRow, 'description' | 'source_type' | 'source_place' | 'source_detail'>>).map((e) => ({
      ...e,
      description: null,
      source_type: null,
      source_place: null,
      source_detail: null,
      event_category: null,
      event_attributes: [],
      event_audience: [],
      event_location_name: null,
      event_location_address: null,
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
    event_category: e.event_category || null,
    event_attributes: e.event_attributes || [],
    event_audience: e.event_audience || [],
    event_location_name: e.event_location_name || null,
    event_location_address: e.event_location_address || null,
    linked_count: linkCounts.get(e.id) || 0,
    is_linked: (linkCounts.get(e.id) || 0) > 0,
    poster_upload_id: latestPosterByEvent.get(e.id) || null,
  }))

  const status = params.get('status')
  const linked = params.get('linked')
  const recurringOnly = params.get('recurringOnly')
  const category = params.get('category')
  const q = params.get('q')?.trim().toLowerCase() || ''
  const attrs = asStringArray(params.get('attr')).filter((tag) => attributeSet.has(tag))
  const aud = asStringArray(params.get('aud')).filter((tag) => audienceSet.has(tag))
  const validCategory = category && categorySet.has(category) ? category : null

  const filtered = rows.filter((row) => {
    if (status && row.status !== status) return false
    if (linked === 'linked' && !row.is_linked) return false
    if (linked === 'unlinked' && row.is_linked) return false
    if (recurringOnly === 'true') return false
    if (validCategory && row.event_category !== validCategory) return false
    if (attrs.length > 0 && !attrs.every((tag) => (row.event_attributes || []).includes(tag))) return false
    if (aud.length > 0 && !aud.every((tag) => (row.event_audience || []).includes(tag))) return false
    if (q) {
      const haystack = `${row.title} ${row.location || ''} ${row.description || ''}`.toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })

  return NextResponse.json({ rows: filtered })
}
