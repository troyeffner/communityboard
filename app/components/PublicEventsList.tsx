'use client'
import { useEffect, useState } from 'react'
import { ATTRIBUTES, AUDIENCE } from '@/lib/taxonomy'

type PublicEventRow = {
  id: string
  title: string
  location: string | null
  seen_at_name: string | null
  start_at: string
  status: 'draft' | 'published'
  created_at: string
  event_attributes?: string[]
  event_audience?: string[]
  event_location_name?: string | null
  description?: string | null
  published_by_name?: string | null
  published_at?: string | null
  poster_public_url: string | null
  poster_upload_id: string | null
  upvotes?: number
  votedByMe?: boolean
}

type Sections = {
  today: PublicEventRow[]
  thisWeek: PublicEventRow[]
  upcoming: PublicEventRow[]
  recurring: PublicEventRow[]
}

type VoteState = {
  upvotes: number
  votedByMe: boolean
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

function EventList({
  rows,
  votes,
  pendingVoteIds,
  onVote,
  onOpenPoster,
}: {
  rows: PublicEventRow[]
  votes: Record<string, VoteState>
  pendingVoteIds: Record<string, boolean>
  onVote: (eventId: string) => void
  onOpenPoster: () => void
}) {
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
            {(e.event_location_name || e.location) && <div style={{ marginTop: 4, fontSize: 15, color: '#1f2937' }}>Location: {e.event_location_name || e.location}</div>}
            {e.event_attributes && e.event_attributes.length > 0 && (
              <div style={{ marginTop: 4, fontSize: 13, opacity: 0.85 }}>
                {e.event_attributes.slice(0, 4).join(' • ')}
              </div>
            )}
            {e.seen_at_name && (
              <div style={{ fontSize: 14, opacity: 0.9, marginTop: 6 }}>
                Seen at: {e.seen_at_name}
              </div>
            )}
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>Tended by Community Builders</span>
              <span
                aria-label={`Posted by ${e.published_by_name || 'Community Builder'}`}
                title={`Posted by ${e.published_by_name || 'Community Builder'}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 16,
                  height: 16,
                  borderRadius: 999,
                  border: '1px solid #94a3b8',
                  fontSize: 11,
                  fontWeight: 700,
                  lineHeight: 1,
                  cursor: 'help',
                }}
              >
                i
              </span>
            </div>
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button
                data-variant="secondary"
                onClick={() => onVote(e.id)}
                disabled={Boolean(votes[e.id]?.votedByMe) || Boolean(pendingVoteIds[e.id])}
                title={votes[e.id]?.votedByMe ? 'This item is pinned' : 'Pin this item to the board'}
              >
                {votes[e.id]?.votedByMe ? 'Pinned' : 'Pin to board'} · {votes[e.id]?.upvotes || 0}
              </button>
              <span style={{ fontSize: 12, opacity: 0.75 }}>Pinning helps the community surface useful items.</span>
            </div>
            {e.poster_public_url && (
              <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {e.poster_upload_id && (
                  <a
                    href={`/poster/${encodeURIComponent(e.poster_upload_id)}?event_id=${encodeURIComponent(e.id)}`}
                    onClick={onOpenPoster}
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
                    description: [e.description || '', e.seen_at_name ? `Seen at: ${e.seen_at_name}` : ''].filter(Boolean).join('\n'),
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
  const [searchText, setSearchText] = useState('')
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([])
  const [selectedAudience, setSelectedAudience] = useState<string[]>([])
  const [filtersCollapsed, setFiltersCollapsed] = useState(true)
  const [collapsed, setCollapsed] = useState({
    today: false,
    thisWeek: false,
    upcoming: false,
    recurring: false,
  })
  const [voteState, setVoteState] = useState<Record<string, VoteState>>({})
  const [pendingVoteIds, setPendingVoteIds] = useState<Record<string, boolean>>({})
  const [cbVid, setCbVid] = useState<string>('')
  const RETURN_SCROLL_KEY = 'communityboard:return-scroll'

  useEffect(() => {
    let vid = ''
    try {
      vid = window.localStorage.getItem('cb_vid') || ''
      if (!vid) {
        vid = (typeof crypto !== 'undefined' && crypto.randomUUID)
          ? crypto.randomUUID()
          : `cb_${Date.now()}_${Math.random().toString(16).slice(2)}`
        window.localStorage.setItem('cb_vid', vid)
      }
      setCbVid(vid)
    } catch {
      setCbVid('')
    }
  }, [])

  useEffect(() => {
    const next: Record<string, VoteState> = {}
    for (const row of [...sections.today, ...sections.thisWeek, ...sections.upcoming, ...sections.recurring]) {
      if (!next[row.id]) {
        next[row.id] = {
          upvotes: row.upvotes || 0,
          votedByMe: Boolean(row.votedByMe),
        }
      }
    }
    setVoteState((prev) => ({ ...next, ...prev }))
  }, [sections])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(RETURN_SCROLL_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as { path?: string; y?: number }
      const current = `${window.location.pathname}${window.location.search}`
      if (parsed?.path === current && typeof parsed?.y === 'number') {
        window.requestAnimationFrame(() => window.scrollTo({ top: parsed.y, behavior: 'auto' }))
      }
      window.localStorage.removeItem(RETURN_SCROLL_KEY)
    } catch {
      // ignore storage errors
    }
  }, [])

  function toggleTag(values: string[], setValues: (next: string[]) => void, tag: string) {
    setValues(values.includes(tag) ? values.filter((value) => value !== tag) : [...values, tag])
  }

  function applyFilters(rows: PublicEventRow[]) {
    const search = searchText.trim().toLowerCase()
    return rows.filter((row) => {
      if (selectedAttributes.length > 0 && !selectedAttributes.every((tag) => (row.event_attributes || []).includes(tag))) return false
      if (selectedAudience.length > 0 && !selectedAudience.every((tag) => (row.event_audience || []).includes(tag))) return false
      if (search) {
        const haystack = `${row.title} ${row.description || ''} ${row.location || ''}`.toLowerCase()
        if (!haystack.includes(search)) return false
      }
      return true
    })
  }

  function rememberCommunityBoardScroll() {
    try {
      const payload = {
        path: `${window.location.pathname}${window.location.search}`,
        y: window.scrollY || 0,
      }
      window.localStorage.setItem(RETURN_SCROLL_KEY, JSON.stringify(payload))
    } catch {
      // ignore storage errors
    }
  }

  async function handleVote(eventId: string) {
    if (!cbVid || voteState[eventId]?.votedByMe || pendingVoteIds[eventId]) return
    setPendingVoteIds((prev) => ({ ...prev, [eventId]: true }))
    try {
      const res = await fetch('/api/vote/event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cb-vid': cbVid,
        },
        body: JSON.stringify({ event_id: eventId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return
      setVoteState((prev) => ({
        ...prev,
        [eventId]: {
          upvotes: Number(data.upvotes || 0),
          votedByMe: true,
        },
      }))
    } finally {
      setPendingVoteIds((prev) => ({ ...prev, [eventId]: false }))
    }
  }

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
        {!isCollapsed && (
          <div style={{ marginTop: 8 }}>
            <EventList rows={applyFilters(rows)} votes={voteState} pendingVoteIds={pendingVoteIds} onVote={handleVote} onOpenPoster={rememberCommunityBoardScroll} />
          </div>
        )}
      </section>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section style={{ border: '1px solid #dbe3f0', borderRadius: 12, padding: 12, background: '#f8fafc' }}>
        <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: 20 }}>Search</h2>
        <div style={{ display: 'grid', gap: 8 }}>
          <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search title, description, location" style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
          <details
            open={!filtersCollapsed}
            onToggle={(e) => setFiltersCollapsed(!(e.currentTarget as HTMLDetailsElement).open)}
            style={{ border: '1px solid #dbe3f0', borderRadius: 8, padding: 8, background: '#fff' }}
          >
            <summary style={{ cursor: 'pointer', fontWeight: 600, userSelect: 'none' }}>
              {filtersCollapsed ? '▸ Filters' : '▾ Filters'}
            </summary>
            <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ATTRIBUTES.filter((tag) => ['free', 'donation', 'ticketed', 'in_person', 'online', 'hybrid'].includes(tag)).map((tag) => (
                  <button key={tag} data-variant={selectedAttributes.includes(tag) ? undefined : 'secondary'} onClick={() => toggleTag(selectedAttributes, setSelectedAttributes, tag)}>{tag}</button>
                ))}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {AUDIENCE.map((tag) => (
                  <button key={tag} data-variant={selectedAudience.includes(tag) ? undefined : 'secondary'} onClick={() => toggleTag(selectedAudience, setSelectedAudience, tag)}>{tag}</button>
                ))}
              </div>
            </div>
          </details>
        </div>
      </section>
      {renderSection('today', 'Today', sections.today)}
      {renderSection('thisWeek', 'This Week', sections.thisWeek)}
      {renderSection('upcoming', 'Upcoming', sections.upcoming)}
      {renderSection('recurring', 'Recurring', sections.recurring)}
    </div>
  )
}
