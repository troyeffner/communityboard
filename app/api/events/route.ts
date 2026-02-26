import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ATTRIBUTES, AUDIENCE, EVENT_CATEGORIES, asStringArray, toSet } from '@/lib/taxonomy'

type EventRow = {
  id: string
  title: string
  location: string | null
  description: string | null
  start_at: string
  status: 'draft' | 'published' | 'unpublished'
  created_at: string
  is_recurring?: boolean | null
  recurrence_rule?: string | null
  event_category?: string | null
  event_attributes?: string[] | null
  event_audience?: string[] | null
  event_location_name?: string | null
}

type LinkRow = {
  event_id: string
  created_at: string
  poster_upload_id: string
  poster_uploads:
    | { file_path: string; seen_at_name?: string | null }
    | Array<{ file_path: string; seen_at_name?: string | null }>
    | null
}

type EventVoteRow = { event_id: string; voter_vid?: string | null }

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function nyDateKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export async function GET(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return jsonError('Missing Supabase env vars', 500)

  const params = new URL(req.url).searchParams
  const category = params.get('category')
  const q = params.get('q')?.trim().toLowerCase() || ''
  const attrs = asStringArray(params.get('attr'))
  const audience = asStringArray(params.get('aud'))
  const recurringOnly = params.get('recurringOnly') === 'true'

  const categorySet = toSet(EVENT_CATEGORIES)
  const attrSet = toSet(ATTRIBUTES)
  const audSet = toSet(AUDIENCE)
  const selectedCategory = category && categorySet.has(category) ? category : null
  const selectedAttrs = attrs.filter((tag) => attrSet.has(tag))
  const selectedAudience = audience.filter((tag) => audSet.has(tag))

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  const voterVid = req.headers.get('x-cb-vid')?.trim() || null
  const primaryEvents = await supabase
    .from('events')
    .select('id,title,location,description,start_at,status,created_at,is_recurring,recurrence_rule,event_category,event_attributes,event_audience,event_location_name')
    .eq('status', 'published')
    .order('start_at', { ascending: true })

  if (primaryEvents.error) return jsonError(primaryEvents.error.message, 500)

  const linksResult = await supabase
    .from('poster_event_links')
    .select('event_id,poster_upload_id,created_at,poster_uploads(file_path,seen_at_name)')
    .order('created_at', { ascending: false })

  let links: LinkRow[] = []
  if (!linksResult.error) links = (linksResult.data || []) as LinkRow[]

  const latestPosterPathByEvent = new Map<string, string>()
  const latestPosterUploadByEvent = new Map<string, string>()
  const latestSeenAtByEvent = new Map<string, string>()
  const upvotesByEvent = new Map<string, number>()
  const votedByMeEventIds = new Set<string>()

  for (const row of links) {
    if (latestPosterPathByEvent.has(row.event_id)) continue
    const upload = Array.isArray(row.poster_uploads) ? row.poster_uploads[0] : row.poster_uploads
    if (!upload?.file_path) continue
    latestPosterPathByEvent.set(row.event_id, upload.file_path)
    latestPosterUploadByEvent.set(row.event_id, row.poster_upload_id)
    const seenAt = upload.seen_at_name || null
    if (seenAt) latestSeenAtByEvent.set(row.event_id, seenAt)
  }

  const eventsData = (primaryEvents.data || []) as EventRow[]
  if (eventsData.length > 0) {
    const eventIds = eventsData.map((event) => event.id)
    const votesResult = await supabase
      .from('event_votes')
      .select('event_id')
      .in('event_id', eventIds)

    if (!votesResult.error) {
      for (const row of (votesResult.data || []) as EventVoteRow[]) {
        upvotesByEvent.set(row.event_id, (upvotesByEvent.get(row.event_id) || 0) + 1)
      }
    }

    if (voterVid) {
      const myVotesResult = await supabase
        .from('event_votes')
        .select('event_id')
        .in('event_id', eventIds)
        .eq('voter_vid', voterVid)
      if (!myVotesResult.error) {
        for (const row of (myVotesResult.data || []) as EventVoteRow[]) {
          votedByMeEventIds.add(row.event_id)
        }
      }
    }
  }

  const filtered = eventsData.filter((event) => {
    if (recurringOnly && !event.is_recurring) return false
    if (selectedCategory && event.event_category !== selectedCategory) return false
    const eventAttrs = event.event_attributes || []
    const eventAudience = event.event_audience || []
    if (selectedAttrs.length > 0 && !selectedAttrs.every((tag) => eventAttrs.includes(tag))) return false
    if (selectedAudience.length > 0 && !selectedAudience.every((tag) => eventAudience.includes(tag))) return false
    if (q) {
      const haystack = `${event.title} ${event.description || ''} ${event.location || ''}`.toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  }).map((event) => {
    const filePath = latestPosterPathByEvent.get(event.id)
    const posterPublicUrl = filePath ? supabase.storage.from('posters').getPublicUrl(filePath).data.publicUrl : null
    return {
      ...event,
      is_recurring: Boolean(event.is_recurring),
      recurrence_rule: event.recurrence_rule || null,
      event_category: event.event_category || null,
      event_attributes: event.event_attributes || [],
      event_audience: event.event_audience || [],
      poster_public_url: posterPublicUrl,
      poster_upload_id: latestPosterUploadByEvent.get(event.id) || null,
      seen_at_name: latestSeenAtByEvent.get(event.id) || null,
      upvotes: upvotesByEvent.get(event.id) || 0,
      votedByMe: votedByMeEventIds.has(event.id),
    }
  })

  const now = new Date()
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const todayKey = nyDateKey(now)
  const recurring = filtered.filter((e) => e.is_recurring)
  const oneTime = filtered.filter((e) => !e.is_recurring)
  const today = oneTime.filter((e) => nyDateKey(new Date(e.start_at)) === todayKey)
  const thisWeek = oneTime.filter((e) => {
    const ts = new Date(e.start_at).getTime()
    return ts > now.getTime() && ts <= weekLater.getTime() && nyDateKey(new Date(e.start_at)) !== todayKey
  })
  const upcoming = oneTime.filter((e) => new Date(e.start_at).getTime() > weekLater.getTime())

  return NextResponse.json({ rows: filtered, today, this_week: thisWeek, upcoming, recurring })
}
