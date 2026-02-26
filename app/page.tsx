export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import PublicEventsList from './components/PublicEventsList'

type EventStatus = 'planted' | 'on_board' | 'archived' | 'draft' | 'published' | 'unpublished'

type EventRow = {
  id: string
  title: string
  location: string | null
  description?: string | null
  start_at: string
  status: EventStatus
  created_at: string
  is_recurring?: boolean | null
  recurrence_rule?: string | null
  event_category?: string | null
  event_attributes?: string[] | null
  event_audience?: string[] | null
  event_location_name?: string | null
  published_by?: string | null
  published_at?: string | null
}

type LinkRow = {
  event_id: string
  poster_upload_id: string
  created_at: string
  poster_uploads: { file_path: string; seen_at_label?: string | null; seen_at_name?: string | null; seen_at_category?: string | null } | { file_path: string; seen_at_label?: string | null; seen_at_name?: string | null; seen_at_category?: string | null }[] | null
}

function nyDateKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export default async function Home() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    return (
      <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
        <h1>Utica Community Board</h1>
        <pre style={{ whiteSpace: 'pre-wrap' }}>Error: Missing Supabase env vars</pre>
      </main>
    )
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

  const primary = await supabase
    .from('events')
    .select('id, title, location, description, start_at, status, created_at, is_recurring, recurrence_rule, event_category, event_attributes, event_audience, event_location_name,published_by,published_at')
    .eq('status', 'on_board')
    .order('start_at', { ascending: true })

  let events: EventRow[] = []
  let errorMessage: string | null = null

  if (primary.error) {
    if (primary.error.code !== '42703') {
      errorMessage = primary.error.message
    } else {
      const fallback = await supabase
        .from('events')
        .select('id, title, location, description, start_at, status, created_at,published_by,published_at')
        .eq('status', 'on_board')
        .order('start_at', { ascending: true })

      if (fallback.error) {
        errorMessage = fallback.error.message
      } else {
        events = ((fallback.data || []) as EventRow[]).map((row) => ({
          ...row,
          is_recurring: false,
          recurrence_rule: null,
        }))
      }
    }
  } else {
    events = (primary.data || []) as EventRow[]
  }

  const linksPrimary = await supabase
    .from('poster_event_links')
    .select('event_id, poster_upload_id, created_at, poster_uploads(file_path,seen_at_label,seen_at_name,seen_at_category)')
    .order('created_at', { ascending: false })

  let links = linksPrimary.data as LinkRow[] | null
  if (linksPrimary.error) {
    const message = (linksPrimary.error.message || '').toLowerCase()
    const missingSeenLabel =
      linksPrimary.error.code === '42703' ||
      message.includes('seen_at_label') ||
      message.includes('schema cache')

    if (!missingSeenLabel) {
      errorMessage = errorMessage || linksPrimary.error.message
      links = []
    } else {
      const fallbackLinks = await supabase
        .from('poster_event_links')
        .select('event_id, poster_upload_id, created_at, poster_uploads(file_path,seen_at_category)')
        .order('created_at', { ascending: false })

      if (fallbackLinks.error) {
        errorMessage = errorMessage || fallbackLinks.error.message
        links = []
      } else {
        links = (fallbackLinks.data || []) as LinkRow[]
      }
    }
  }

  const latestPosterPathByEvent = new Map<string, string>()
  const latestPosterUploadByEvent = new Map<string, string>()
  const latestSeenAtByEvent = new Map<string, string>()
  const latestSeenAtCategoryByEvent = new Map<string, string>()
  const publisherIds = Array.from(new Set(events.map((e) => e.published_by).filter(Boolean))) as string[]
  const publisherNameById = new Map<string, string>()
  if (publisherIds.length > 0) {
    const usersResult = await supabase.from('users').select('id,name').in('id', publisherIds)
    if (!usersResult.error) {
      for (const row of (usersResult.data || []) as Array<{ id: string; name: string | null }>) {
        publisherNameById.set(row.id, row.name || 'Community Builder')
      }
    }
  }
  for (const row of (links || []) as LinkRow[]) {
    if (latestPosterPathByEvent.has(row.event_id)) continue
    const upload = Array.isArray(row.poster_uploads) ? row.poster_uploads[0] : row.poster_uploads
    if (!upload?.file_path) continue
    latestPosterPathByEvent.set(row.event_id, upload.file_path)
    latestPosterUploadByEvent.set(row.event_id, row.poster_upload_id)
    const seenAt = upload.seen_at_label || upload.seen_at_name || null
    if (seenAt) latestSeenAtByEvent.set(row.event_id, seenAt)
    if (upload.seen_at_category) latestSeenAtCategoryByEvent.set(row.event_id, upload.seen_at_category)
  }

  const enriched = events.map((event) => {
    const filePath = latestPosterPathByEvent.get(event.id)
    const poster_public_url = filePath
      ? supabase.storage.from('posters').getPublicUrl(filePath).data.publicUrl
      : null

    return {
      ...event,
      is_recurring: Boolean(event.is_recurring),
      recurrence_rule: event.recurrence_rule || null,
      poster_public_url,
      poster_upload_id: latestPosterUploadByEvent.get(event.id) || null,
      seen_at_label: latestSeenAtByEvent.get(event.id) || null,
      seen_at_category: latestSeenAtCategoryByEvent.get(event.id) || null,
      event_category: event.event_category || null,
      event_attributes: event.event_attributes || [],
      event_audience: event.event_audience || [],
      event_location_name: event.event_location_name || null,
      description: event.description || null,
      published_by_name: event.published_by ? publisherNameById.get(event.published_by) || 'Community Builder' : null,
      published_at: event.published_at || null,
    }
  })

  const now = new Date()
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const todayKey = nyDateKey(now)

  const recurring = enriched.filter((e) => e.is_recurring)
  const oneTime = enriched.filter((e) => !e.is_recurring)

  const today = oneTime.filter((e) => nyDateKey(new Date(e.start_at)) === todayKey)
  const thisWeek = oneTime.filter((e) => {
    const t = new Date(e.start_at).getTime()
    return t > now.getTime() && t <= weekLater.getTime() && nyDateKey(new Date(e.start_at)) !== todayKey
  })
  const upcoming = oneTime.filter((e) => new Date(e.start_at).getTime() > weekLater.getTime())

  return (
    <main
      style={{
        padding: '16px clamp(16px, 4vw, 28px) 32px',
        fontFamily: 'sans-serif',
        maxWidth: 760,
        margin: '0 auto',
        fontSize: 16,
      }}
    >
      <h1>Utica Community Board</h1>
      <p style={{ marginTop: 0, marginBottom: 12 }}>
        <a href="/businesses">Browse Businesses & Services</a>
      </p>

      {errorMessage && <pre style={{ whiteSpace: 'pre-wrap' }}>Error: {errorMessage}</pre>}

      {!errorMessage && (
        <PublicEventsList
          sections={{
            today,
            thisWeek,
            upcoming,
            recurring,
          }}
        />
      )}
    </main>
  )
}
