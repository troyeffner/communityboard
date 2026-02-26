import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type EventStatus = 'draft' | 'published'

type EventRow = {
  id: string
  title: string
  location: string | null
  start_at: string
  status: EventStatus
  created_at: string
  is_recurring?: boolean | null
  recurrence_rule?: string | null
}

type LinkRow = {
  event_id: string
  created_at: string
  poster_uploads: { file_path: string; seen_at_label?: string | null; seen_at_name?: string | null } | { file_path: string; seen_at_label?: string | null; seen_at_name?: string | null }[] | null
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function isMissingRecurrenceColumnError(error: { code?: string; message?: string } | null | undefined) {
  const message = (error?.message || '').toLowerCase()
  return (
    error?.code === '42703' ||
    message.includes('recurrence_rule') ||
    message.includes('is_recurring') ||
    message.includes('seen_at_label') ||
    message.includes('schema cache')
  )
}

function nyDateKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return jsonError('Missing Supabase env vars', 500)

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

  const primary = await supabase
    .from('events')
    .select('id,title,location,start_at,status,created_at,is_recurring,recurrence_rule')
    .eq('status', 'published')
    .order('start_at', { ascending: true })

  let events: EventRow[] = []
  if (primary.error) {
    if (!isMissingRecurrenceColumnError(primary.error)) return jsonError(primary.error.message, 500)

    const fallback = await supabase
      .from('events')
      .select('id,title,location,start_at,status,created_at')
      .eq('status', 'published')
      .order('start_at', { ascending: true })

    if (fallback.error) return jsonError(fallback.error.message, 500)

    events = ((fallback.data || []) as EventRow[]).map((row) => ({
      ...row,
      is_recurring: false,
      recurrence_rule: null,
    }))
  } else {
    events = (primary.data || []) as EventRow[]
  }

  const linksPrimary = await supabase
    .from('poster_event_links')
    .select('event_id, created_at, poster_uploads(file_path,seen_at_label,seen_at_name)')
    .order('created_at', { ascending: false })

  let links = linksPrimary.data as LinkRow[] | null
  if (linksPrimary.error) {
    const message = (linksPrimary.error.message || '').toLowerCase()
    const missingSeenLabel =
      linksPrimary.error.code === '42703' ||
      message.includes('seen_at_label') ||
      message.includes('schema cache')

    if (!missingSeenLabel) return jsonError(linksPrimary.error.message, 500)

    const fallbackLinks = await supabase
      .from('poster_event_links')
      .select('event_id, created_at, poster_uploads(file_path)')
      .order('created_at', { ascending: false })

    if (fallbackLinks.error) return jsonError(fallbackLinks.error.message, 500)
    links = (fallbackLinks.data || []) as LinkRow[]
  }

  const latestPosterPathByEvent = new Map<string, string>()
  const latestSeenAtByEvent = new Map<string, string>()
  for (const row of (links || []) as LinkRow[]) {
    if (latestPosterPathByEvent.has(row.event_id)) continue
    const upload = Array.isArray(row.poster_uploads) ? row.poster_uploads[0] : row.poster_uploads
    if (!upload?.file_path) continue
    latestPosterPathByEvent.set(row.event_id, upload.file_path)
    const seenAt = upload.seen_at_label || upload.seen_at_name || null
    if (seenAt) latestSeenAtByEvent.set(row.event_id, seenAt)
  }

  const enriched = events.map((event) => {
    const filePath = latestPosterPathByEvent.get(event.id)
    const poster_public_url = filePath
      ? supabase.storage.from('posters').getPublicUrl(filePath).data.publicUrl
      : null

    return {
      id: event.id,
      title: event.title,
      location: event.location,
      start_at: event.start_at,
      status: event.status,
      created_at: event.created_at,
      is_recurring: Boolean(event.is_recurring),
      recurrence_rule: event.recurrence_rule || null,
      poster_public_url,
      seen_at_label: latestSeenAtByEvent.get(event.id) || null,
    }
  })

  const now = new Date()
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const todayKey = nyDateKey(now)

  const recurring = enriched.filter((e) => e.is_recurring)
  const oneTime = enriched.filter((e) => !e.is_recurring)

  const today = oneTime.filter((e) => nyDateKey(new Date(e.start_at)) === todayKey)
  const thisWeek = oneTime.filter((e) => {
    const ts = new Date(e.start_at).getTime()
    return ts > now.getTime() && ts <= weekLater.getTime() && nyDateKey(new Date(e.start_at)) !== todayKey
  })
  const upcoming = oneTime.filter((e) => new Date(e.start_at).getTime() > weekLater.getTime())

  return NextResponse.json({
    today,
    this_week: thisWeek,
    upcoming,
    recurring,
  })
}
