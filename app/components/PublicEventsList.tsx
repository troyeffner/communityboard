'use client'

type PublicEventRow = {
  id: string
  title: string
  location: string | null
  source_type: string | null
  source_place: string | null
  source_detail: string | null
  start_at: string
  status: 'draft' | 'published'
  created_at: string
  is_recurring: boolean
  recurrence_rule: string | null
  poster_public_url: string | null
  poster_upload_id: string | null
}

type Sections = {
  today: PublicEventRow[]
  thisWeek: PublicEventRow[]
  upcoming: PublicEventRow[]
  recurring: PublicEventRow[]
}

function formatNY(iso: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(options || {}),
  }).format(new Date(iso))
}

function humanizeRecurrence(rule: string | null, startAt: string) {
  if (!rule) return 'Recurring'

  const time = formatNY(startAt, { hour: 'numeric', minute: '2-digit' })
  const weekly = /^weekly:(\w+)$/i.exec(rule)
  if (weekly) {
    const day = weekly[1].charAt(0).toUpperCase() + weekly[1].slice(1)
    return `Every ${day} at ${time}`
  }

  const monthly = /^monthly:(first|second|third|fourth):(\w+)$/i.exec(rule)
  if (monthly) {
    const ord = monthly[1].charAt(0).toUpperCase() + monthly[1].slice(1)
    const day = monthly[2].charAt(0).toUpperCase() + monthly[2].slice(1)
    return `${ord} ${day} of the month at ${time}`
  }

  return rule
}

function sourceTypeLabel(value: string | null) {
  if (!value) return 'Unknown source'
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function toGoogleCalendarUrl({
  title,
  start_at,
  location,
  description,
}: {
  title: string
  start_at: string
  location?: string | null
  description?: string | null
}) {
  const start = new Date(start_at)
  const end = new Date(start.getTime() + 90 * 60 * 1000)
  const toGoogleDate = (value: Date) => value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title || 'Event',
    dates: `${toGoogleDate(start)}/${toGoogleDate(end)}`,
    details: description || '',
    location: location || '',
    ctz: 'America/New_York',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function EventList({ rows }: { rows: PublicEventRow[] }) {
  if (rows.length === 0) return <p style={{ opacity: 0.7 }}>None.</p>

  return (
    <>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {rows.map((e) => (
          <li key={e.id} style={{ borderBottom: '1px solid #eee', padding: '12px 0' }}>
            <div>
              <strong>{e.title}</strong> — {formatNY(e.start_at, { hour: 'numeric', minute: '2-digit' })}
              {e.location ? ` • ${e.location}` : ''}
            </div>
            {e.source_place && (
              <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
                Poster found: {e.source_place} — {sourceTypeLabel(e.source_type)}
                {e.source_detail ? ` (${e.source_detail})` : ''}
              </div>
            )}
            <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>
              Created: {formatNY(e.created_at)}
            </div>
            {e.is_recurring && (
              <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
                {humanizeRecurrence(e.recurrence_rule, e.start_at)}
              </div>
            )}
            {e.poster_public_url && (
              <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {e.poster_upload_id && (
                  <a
                    href={`/poster/${encodeURIComponent(e.poster_upload_id)}?event_id=${encodeURIComponent(e.id)}`}
                    style={{
                      display: 'inline-block',
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: '1px solid #2563eb',
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    View Poster
                  </a>
                )}
                <a
                  href={toGoogleCalendarUrl({
                    title: e.title,
                    start_at: e.start_at,
                    location: e.location,
                    description: e.source_place ? `Poster found: ${e.source_place}` : '',
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
                  href={`/api/events/${encodeURIComponent(e.id)}/ics`}
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
            {!e.poster_public_url && (
              <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <a
                  href={toGoogleCalendarUrl({
                    title: e.title,
                    start_at: e.start_at,
                    location: e.location,
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
                  href={`/api/events/${encodeURIComponent(e.id)}/ics`}
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
          </li>
        ))}
      </ul>
    </>
  )
}

export default function PublicEventsList({ sections }: { sections: Sections }) {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}>
        <h2 style={{ marginTop: 0, marginBottom: 8 }}>Today</h2>
        <EventList rows={sections.today} />
      </section>
      <section style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}>
        <h2 style={{ marginTop: 0, marginBottom: 8 }}>This Week</h2>
        <EventList rows={sections.thisWeek} />
      </section>
      <section style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}>
        <h2 style={{ marginTop: 0, marginBottom: 8 }}>Upcoming</h2>
        <EventList rows={sections.upcoming} />
      </section>
      <section style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}>
        <h2 style={{ marginTop: 0, marginBottom: 8 }}>Recurring</h2>
        <EventList rows={sections.recurring} />
      </section>
    </div>
  )
}
