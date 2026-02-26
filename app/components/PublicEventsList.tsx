'use client'
import { useState } from 'react'

type PublicEventRow = {
  id: string
  title: string
  location: string | null
  seen_at_label: string | null
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
          <li key={e.id} style={{ marginBottom: 10 }}>
            <article
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                padding: 14,
                background: '#fff',
              }}
            >
              <div style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.2 }}>{e.title}</div>
              <div style={{ marginTop: 6, fontSize: 16, color: '#111827' }}>
                {formatNY(e.start_at, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </div>
            {e.location && <div style={{ marginTop: 4, fontSize: 15, color: '#1f2937' }}>Location: {e.location}</div>}
            {e.seen_at_label && (
              <div style={{ fontSize: 14, opacity: 0.9, marginTop: 6 }}>
                Seen at: {e.seen_at_label}
              </div>
            )}
            <div style={{ fontSize: 13, opacity: 0.75, marginTop: 6 }}>
              Created: {formatNY(e.created_at)}
            </div>
            {e.is_recurring && (
              <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>
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
                      minHeight: 44,
                      lineHeight: '30px',
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
                    description: e.seen_at_label ? `Seen at: ${e.seen_at_label}` : '',
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
                    minHeight: 44,
                    lineHeight: '30px',
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
                    minHeight: 44,
                    lineHeight: '30px',
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
                    minHeight: 44,
                    lineHeight: '30px',
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
                    minHeight: 44,
                    lineHeight: '30px',
                  }}
                >
                  Download .ics
                </a>
              </div>
            )}
            </article>
          </li>
        ))}
      </ul>
    </>
  )
}

export default function PublicEventsList({ sections }: { sections: Sections }) {
  const [collapsed, setCollapsed] = useState({
    today: false,
    thisWeek: false,
    upcoming: false,
    recurring: false,
  })

  function renderSection(key: 'today' | 'thisWeek' | 'upcoming' | 'recurring', title: string, rows: PublicEventRow[]) {
    const isCollapsed = collapsed[key]
    return (
      <section style={{ border: '1px solid #dbe3f0', borderRadius: 12, padding: 12, background: '#f8fafc' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>{title}</h2>
          <button
            data-variant="secondary"
            onClick={() => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))}
            style={{ minHeight: 40, padding: '6px 10px' }}
          >
            {isCollapsed ? 'Show' : 'Hide'}
          </button>
        </div>
        {!isCollapsed && <div style={{ marginTop: 8 }}><EventList rows={rows} /></div>}
      </section>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {renderSection('today', 'Today', sections.today)}
      {renderSection('thisWeek', 'This Week', sections.thisWeek)}
      {renderSection('upcoming', 'Upcoming', sections.upcoming)}
      {renderSection('recurring', 'Recurring', sections.recurring)}
    </div>
  )
}
