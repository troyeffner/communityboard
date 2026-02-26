import { createClient } from '@supabase/supabase-js'
import PosterViewer from './PosterViewer'

type PosterRow = {
  id: string
  file_path: string
  seen_at_name?: string | null
  seen_at_type?: string | null
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

function formatSourceType(value?: string | null) {
  if (!value) return null
  return value.replace(/_/g, ' ')
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

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.DEV_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DEV_SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    return <main style={{ padding: 24, fontFamily: 'sans-serif' }}>Missing Supabase env vars</main>
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

  const primary = await supabase
    .from('poster_uploads')
    .select('id,file_path,seen_at_name,seen_at_type')
    .eq('id', id)
    .limit(1)

  let poster = (primary.data?.[0] || null) as PosterRow | null
  if (primary.error) {
    const message = (primary.error.message || '').toLowerCase()
    const missingSeen = primary.error.code === '42703' || message.includes('seen_at_') || message.includes('schema cache')
    if (!missingSeen) {
      return <main style={{ padding: 24, fontFamily: 'sans-serif' }}>Failed to load poster: {primary.error.message}</main>
    }
    const fallback = await supabase
      .from('poster_uploads')
      .select('id,file_path')
      .eq('id', id)
      .limit(1)
    if (fallback.error) {
      return <main style={{ padding: 24, fontFamily: 'sans-serif' }}>Failed to load poster: {fallback.error.message}</main>
    }
    poster = (fallback.data?.[0] || null) as PosterRow | null
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

  const imageUrl = supabase.storage.from('posters').getPublicUrl(poster.file_path).data.publicUrl
  const sourceLabel = poster.seen_at_name
    ? `Seen at: ${poster.seen_at_name}${poster.seen_at_type ? ` (${formatSourceType(poster.seen_at_type)})` : ''}`
    : null

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: 24, fontFamily: 'sans-serif' }}>
      <h1 style={{ marginTop: 0, marginBottom: 8 }}>{selectedEvent?.title || 'Poster View'}</h1>
      {selectedEvent?.start_at && (
        <p style={{ margin: '0 0 4px 0', opacity: 0.8 }}>
          {new Date(selectedEvent.start_at).toLocaleString()}
          {selectedEvent.location ? ` • ${selectedEvent.location}` : ''}
        </p>
      )}
      {selectedEvent && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
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
      <PosterViewer key={`${id}:${event_id || 'none'}`} imageUrl={imageUrl} pins={pins} activeEventId={event_id || null} />
      {sourceLabel && <p style={{ marginTop: 10, fontSize: 14 }}>{sourceLabel}</p>}
    </main>
  )
}
