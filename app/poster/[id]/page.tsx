import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import PosterViewer from './PosterViewer'
import PosterTagVoting from './PosterTagVoting'

type PosterRow = {
  id: string
  file_path: string
  created_at?: string
  seen_at_name?: string | null
}

type LinkRow = {
  id: string
  event_id: string
  bbox: { x: number; y: number } | null
  events:
    | { id: string; title: string; start_at: string; location: string | null }
    | { id: string; title: string; start_at: string; location: string | null }[]
    | null
}

type TagRow = {
  id: string
  label: string
  kind?: string | null
  slug?: string | null
}

type EventTagRow = {
  event_id: string
  tag_id: string
  tags: TagRow | TagRow[] | null
}

type TagVoteRow = {
  event_id: string
  tag_id: string
  tags: TagRow | TagRow[] | null
}

type EventTagBundle = {
  official: TagRow[]
  suggested: Array<TagRow & { votes: number }>
}

function toGoogleCalendarUrl({
  title,
  start_at,
  location,
}: {
  title: string
  start_at: string
  location?: string | null
}) {
  const start = new Date(start_at)
  const end = new Date(start.getTime() + 90 * 60 * 1000)
  const toGoogleDate = (value: Date) => value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title || 'Event',
    dates: `${toGoogleDate(start)}/${toGoogleDate(end)}`,
    details: '',
    location: location || '',
    ctz: 'America/New_York',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export default async function PosterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ event_id?: string }>
}) {
  const { id } = await params
  const { event_id } = await searchParams

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    return <main style={{ padding: 24, fontFamily: 'sans-serif' }}>Missing Supabase env vars</main>
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

  const primary = await supabase
    .from('poster_uploads')
    .select('id,file_path,created_at,seen_at_name')
    .eq('id', id)
    .limit(1)

  let poster = (primary.data?.[0] || null) as PosterRow | null
  if (primary.error) {
    const message = (primary.error.message || '').toLowerCase()
    const missingSeen = primary.error.code === '42703' || message.includes('seen_at_') || message.includes('schema cache')
    if (!missingSeen) {
      return <main style={{ padding: 24, fontFamily: 'sans-serif' }}>Failed to load poster: {primary.error.message}</main>
    }
    const fallbackWithName = await supabase
      .from('poster_uploads')
      .select('id,file_path,created_at,seen_at_name')
      .eq('id', id)
      .limit(1)
    if (!fallbackWithName.error) {
      poster = (fallbackWithName.data?.[0] || null) as PosterRow | null
    } else {
      const fallback = await supabase
        .from('poster_uploads')
        .select('id,file_path,created_at')
        .eq('id', id)
        .limit(1)
      if (fallback.error) {
        return <main style={{ padding: 24, fontFamily: 'sans-serif' }}>Failed to load poster: {fallback.error.message}</main>
      }
      poster = (fallback.data?.[0] || null) as PosterRow | null
    }
  }

  if (!poster) return <main style={{ padding: 24, fontFamily: 'sans-serif' }}>Poster not found</main>

  const { data: linkData, error: linkError } = await supabase
    .from('poster_event_links')
    .select('id,event_id,bbox,events(id,title,start_at,location)')
    .eq('poster_upload_id', id)

  if (linkError) {
    return <main style={{ padding: 24, fontFamily: 'sans-serif' }}>Failed to load pins: {linkError.message}</main>
  }

  const pins = ((linkData || []) as LinkRow[]).map((row) => {
    const event = Array.isArray(row.events) ? row.events[0] : row.events
    return {
      link_id: row.id,
      event_id: row.event_id,
      title: event?.title || 'Event',
      start_at: event?.start_at || '',
      location: event?.location || null,
      bbox: row.bbox,
    }
  })

  const selectedEvent =
    (event_id ? pins.find((pin) => pin.event_id === event_id) : pins[0]) || null

  const uniqueEventIds = Array.from(new Set(pins.map((pin) => pin.event_id)))
  const tagsByEvent: Record<string, EventTagBundle> = {}
  for (const eventId of uniqueEventIds) tagsByEvent[eventId] = { official: [], suggested: [] }

  if (uniqueEventIds.length > 0) {
    const [officialRes, votesRes] = await Promise.all([
      supabase
        .from('event_tags')
        .select('event_id,tag_id,tags(id,label,kind,slug)')
        .in('event_id', uniqueEventIds),
      supabase
        .from('tag_votes')
        .select('event_id,tag_id,tags(id,label,kind,slug)')
        .in('event_id', uniqueEventIds),
    ])

    const hasMissingTagTables = (message: string) => {
      const lower = message.toLowerCase()
      return (
        lower.includes('schema cache') ||
        lower.includes('relation "event_tags"') ||
        lower.includes('relation "tag_votes"') ||
        lower.includes('relation "tags"')
      )
    }

    if (officialRes.error && !hasMissingTagTables(officialRes.error.message || '')) {
      return <main style={{ padding: 24, fontFamily: 'sans-serif' }}>Failed to load tags: {officialRes.error.message}</main>
    }
    if (votesRes.error && !hasMissingTagTables(votesRes.error.message || '')) {
      return <main style={{ padding: 24, fontFamily: 'sans-serif' }}>Failed to load tags: {votesRes.error.message}</main>
    }

    const officialRows = (officialRes.data || []) as EventTagRow[]
    const officialKeySet = new Set<string>()
    for (const row of officialRows) {
      const tag = Array.isArray(row.tags) ? row.tags[0] : row.tags
      if (!tag || !tagsByEvent[row.event_id]) continue
      const key = `${row.event_id}:${row.tag_id}`
      officialKeySet.add(key)
      if (!tagsByEvent[row.event_id].official.some((t) => t.id === tag.id)) {
        tagsByEvent[row.event_id].official.push({
          id: tag.id,
          label: tag.label,
          kind: tag.kind || null,
          slug: tag.slug || null,
        })
      }
    }

    const voteRows = (votesRes.data || []) as TagVoteRow[]
    const voteMap = new Map<string, { event_id: string; tag_id: string; tag: TagRow; votes: number }>()
    for (const row of voteRows) {
      const tag = Array.isArray(row.tags) ? row.tags[0] : row.tags
      if (!tag || !tagsByEvent[row.event_id]) continue
      const key = `${row.event_id}:${row.tag_id}`
      if (officialKeySet.has(key)) continue
      const existing = voteMap.get(key)
      if (existing) {
        existing.votes += 1
      } else {
        voteMap.set(key, {
          event_id: row.event_id,
          tag_id: row.tag_id,
          tag: { id: tag.id, label: tag.label, kind: tag.kind || null, slug: tag.slug || null },
          votes: 1,
        })
      }
    }
    for (const value of voteMap.values()) {
      tagsByEvent[value.event_id].suggested.push({
        ...value.tag,
        votes: value.votes,
      })
    }
    for (const eventId of uniqueEventIds) {
      tagsByEvent[eventId].suggested.sort((a, b) => b.votes - a.votes || a.label.localeCompare(b.label))
      tagsByEvent[eventId].official.sort((a, b) => a.label.localeCompare(b.label))
    }
  }

  const rawPath = (poster.file_path || '').trim()
  const normalizedA = rawPath.replace(/^posters\//, '')
  const normalizedB = normalizedA.replace(/^\//, '')
  const candidates = [rawPath, normalizedA, normalizedB].filter(Boolean)
  const publicUrls = candidates.map((path) => supabase.storage.from('posters').getPublicUrl(path).data.publicUrl)
  const directUrl = rawPath.startsWith('http://') || rawPath.startsWith('https://') ? rawPath : ''
  const imageUrls = Array.from(new Set([directUrl, ...publicUrls].filter(Boolean)))
  const seenAt = poster.seen_at_name || null
  const sourceLabel = seenAt ? `Seen at: ${seenAt}` : null

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '16px 16px 24px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div>
          <h1 style={{ marginTop: 0, marginBottom: 8, fontSize: 28 }}>{selectedEvent?.title || 'Poster View'}</h1>
          {selectedEvent?.start_at && (
            <p style={{ margin: '0 0 4px 0', opacity: 0.85, fontSize: 16 }}>
              {new Date(selectedEvent.start_at).toLocaleString()}
              {selectedEvent.location ? ` • ${selectedEvent.location}` : ''}
            </p>
          )}
        </div>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            minHeight: 44,
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid #cbd5e1',
            background: '#fff',
            color: '#111827',
            textDecoration: 'none',
            fontWeight: 600,
            lineHeight: '24px',
          }}
        >
          Close
        </Link>
      </div>

      {selectedEvent && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '8px 0 12px' }}>
          <a
            href={toGoogleCalendarUrl({
              title: selectedEvent.title,
              start_at: selectedEvent.start_at,
              location: selectedEvent.location,
            })}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-block',
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#111827',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Add to Google Calendar
          </a>
          <a
            href={`/api/events/${encodeURIComponent(selectedEvent.event_id)}/ics`}
            style={{
              display: 'inline-block',
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#111827',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Download .ics
          </a>
        </div>
      )}
      {poster.created_at && (
        <p style={{ margin: '0 0 8px 0', opacity: 0.85, fontSize: 14 }}>
          Photo taken: {new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/New_York',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          }).format(new Date(poster.created_at))}
        </p>
      )}
      {sourceLabel && <p style={{ margin: '0 0 8px 0', fontSize: 14 }}>{sourceLabel}</p>}
      <PosterViewer key={`${id}:${event_id || 'none'}`} imageUrls={imageUrls} pins={pins} activeEventId={event_id || null} />
      <PosterTagVoting
        events={pins.map((pin) => ({ event_id: pin.event_id, title: pin.title }))}
        initialTagsByEvent={tagsByEvent}
      />
    </main>
  )
}
