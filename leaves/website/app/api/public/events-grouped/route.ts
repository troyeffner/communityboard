import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getPosterSeenAt } from '@/lib/seenAt'
import { internalServerError, jsonError } from '@/lib/apiErrors'
import { loadInteractionReadmodels, readFromTrunkEnabled } from '@/lib/trunk/readmodels'

type EventStatus = 'draft' | 'published'

type EventRow = {
  id: string
  title: string
  location: string | null
  start_at: string
  status: EventStatus
  created_at: string
}

type LinkRow = {
  event_id: string
  created_at: string
  poster_uploads: { file_path: string; seen_at_name?: string | null } | { file_path: string; seen_at_name?: string | null }[] | null
}

function isMissingRecurrenceColumnError(error: { code?: string; message?: string } | null | undefined) {
  const message = (error?.message || '').toLowerCase()
  return (
    error?.code === '42703' ||
    message.includes('seen_at_name') ||
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
  const useTrunkRead = readFromTrunkEnabled()
  const interactionModels = useTrunkRead
    ? await loadInteractionReadmodels().catch(() => ({
        eventVotes: new Map<string, number>(),
        tagVotes: new Map<string, number>(),
        itemUpvotes: new Map<string, number>(),
      }))
    : null

  const primary = await supabase
    .from('events')
    .select('id,title,location,start_at,status,created_at')
    .eq('status', 'published')
    .order('start_at', { ascending: true })

  let events: EventRow[] = []
  if (primary.error) {
    if (!isMissingRecurrenceColumnError(primary.error)) return internalServerError('public/events-grouped primary events query failed', primary.error)

    const fallback = await supabase
      .from('events')
      .select('id,title,location,start_at,status,created_at')
      .eq('status', 'published')
      .order('start_at', { ascending: true })

    if (fallback.error) return internalServerError('public/events-grouped fallback events query failed', fallback.error)

    events = (fallback.data || []) as EventRow[]
  } else {
    events = (primary.data || []) as EventRow[]
  }

  const linksPrimary = await supabase
    .from('poster_event_links')
    .select('event_id, created_at, poster_uploads(file_path,seen_at_name)')
    .order('created_at', { ascending: false })

  let links = linksPrimary.data as LinkRow[] | null
  if (linksPrimary.error) {
    const message = (linksPrimary.error.message || '').toLowerCase()
    const missingSeenLabel =
      linksPrimary.error.code === '42703' ||
      message.includes('seen_at_name') ||
      message.includes('schema cache')

    if (!missingSeenLabel) return internalServerError('public/events-grouped links query failed', linksPrimary.error)

    const fallbackLinks = await supabase
      .from('poster_event_links')
      .select('event_id, created_at, poster_uploads(file_path)')
      .order('created_at', { ascending: false })

    if (fallbackLinks.error) return internalServerError('public/events-grouped fallback links query failed', fallbackLinks.error)
    links = (fallbackLinks.data || []) as LinkRow[]
  }

  const latestPosterPathByEvent = new Map<string, string>()
  const latestSeenAtByEvent = new Map<string, string>()
  for (const row of (links || []) as LinkRow[]) {
    if (latestPosterPathByEvent.has(row.event_id)) continue
    const upload = Array.isArray(row.poster_uploads) ? row.poster_uploads[0] : row.poster_uploads
    if (!upload?.file_path) continue
    latestPosterPathByEvent.set(row.event_id, upload.file_path)
    const seenAt = getPosterSeenAt(upload)
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
      poster_public_url,
      seen_at_name: latestSeenAtByEvent.get(event.id) || null,
      upvotes: interactionModels?.eventVotes.get(event.id) || 0,
    }
  })

  const now = new Date()
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const todayKey = nyDateKey(now)

  const recurring = [] as typeof enriched
  const oneTime = enriched

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
    read_source: useTrunkRead ? 'trunk-overlay-with-legacy-fallback' : 'legacy',
  })
}
