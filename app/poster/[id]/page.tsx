import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import PosterViewer from './PosterViewer'
import PosterTagVoting from './PosterTagVoting'
import { getPosterSeenAt } from '@/lib/seenAt'

type PosterRow = {
  id: string
  file_path: string
  created_at?: string
  seen_at_name?: string | null
}

type LinkRow = {
  id: string
  title: string
  type: string | null
  status: string | null
  start_date: string | null
  time_of_day: string | null
  location_text: string | null
  x: number
  y: number
  upvote_count?: number | null
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

function PosterPageHeader({
  browseHref,
  title,
  kind,
  showIdentifyBoard,
}: {
  browseHref: string
  title: string
  kind: string
  showIdentifyBoard?: boolean
}) {
  return (
    <header className="cb-panel cbPosterPageHeader">
      <div className="cbPosterPageNav">
        <Link href="/" className="cbPosterPageNavLink cbPosterPageNavLinkStrong">
          ← Return to Community Board
        </Link>
        <a href={browseHref} className="cbPosterPageNavLink">
          Browse posters
        </a>
      </div>
      <h1 className="cbPosterPageTitle">{title}</h1>
      <p className="cbPosterPageKind">{kind}</p>
      {showIdentifyBoard ? (
        <div className="cbPosterPageIdentify">
          <p className="cbPosterPageKind">Location not yet identified</p>
          <a href="#help-identify-board" className="cbPosterPageIdentifyLink">
            Help identify this board
          </a>
        </div>
      ) : null}
    </header>
  )
}

function renderLoadError(scope: string, detail: string) {
  console.error(`[poster/page] ${scope} failed:`, detail)
  return (
    <main className="cbPosterPageFullBleed">

      {/* E2E nav guardrails (keep labels stable) */}
      <div className="cbPosterPageNav cbPosterPageErrorNav">
        <Link href="/" className="cbPosterPageNavLink cbPosterPageNavLinkStrong">← Return to Community Board</Link>
        <Link href="/browse" className="cbPosterPageNavLink">← Browse posters</Link>
      </div>

      <p className="cbPosterPageErrorTitle">We could not load this poster right now.</p>
      <p className="cbPosterPageErrorDetail">{scope}: {detail}</p>
      <Link href="/api/health/schema" className="cbPosterPageNavLink cbPosterPageNavLinkStrong">
        Check schema health
      </Link>
    </main>
  )
}

function getE2eFixturePoster(id: string) {
  if (process.env.E2E_MOCK_POSTER_DATA !== '1') return null
  if (id !== 'e2e-fixture') return null

  return {
    poster: {
      id,
      file_path:
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="100%" height="100%" fill="%23eef2ff"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="56" fill="%23334155">E2E Poster Fixture</text></svg>',
      created_at: '2026-02-27T14:00:00.000Z',
      seen_at_name: 'E2E Community Board',
    } as PosterRow,
    pins: [
      {
        link_id: 'e2e-link-1',
        event_id: 'e2e-event-1',
        title: 'Neighborhood Cleanup',
        start_at: '2026-03-07T14:00:00',
        location: 'Main Street Plaza',
        status: 'published',
        item_type: 'event',
        upvote_count: 3,
        did_upvote: false,
        bbox: { x: 0.24, y: 0.31 },
      },
      {
        link_id: 'e2e-link-2',
        event_id: 'e2e-event-2',
        title: 'Open Studio Night',
        start_at: '2026-03-08T18:30:00',
        location: 'Cedar Arts',
        status: 'published',
        item_type: 'event',
        upvote_count: 6,
        did_upvote: false,
        bbox: { x: 0.71, y: 0.58 },
      },
    ],
    tagsByEvent: {
      'e2e-event-1': { official: [{ id: 't1', label: 'volunteer', kind: 'topic', slug: 'volunteer' }], suggested: [] },
      'e2e-event-2': { official: [{ id: 't2', label: 'arts', kind: 'topic', slug: 'arts' }], suggested: [] },
    } as Record<string, EventTagBundle>,
  }
}

export default async function PosterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ event_id?: string; seenAt?: string; tags?: string; poster?: string; debug?: string }>
}) {
  const { id } = await params
  const currentParams = await searchParams
  const { event_id } = currentParams
  const debug = currentParams.debug === '1'
  const fixture = getE2eFixturePoster(id)
  if (fixture) {
    const browseParams = new URLSearchParams()
    Object.entries(currentParams || {}).forEach(([key, value]) => {
      if (!value || key === 'poster') return
      if (key === 'event_id') return
      browseParams.set(key, String(value))
    })
    const browseHref = `/browse${browseParams.toString() ? `?${browseParams.toString()}` : ''}`
    const seenAtParams = new URLSearchParams(browseParams.toString())
    seenAtParams.set('seenAt', fixture.poster.seen_at_name || '')
    const seenAtHref = `/browse${seenAtParams.toString() ? `?${seenAtParams.toString()}` : ''}`
    return (
      <main className="cb-page-container cbPosterPage" style={{ scrollBehavior: 'smooth' }}>
        <PosterPageHeader browseHref={browseHref} title={fixture.poster.seen_at_name || 'Community Board'} kind="Community Board" />
        <PosterViewer
          key={`${id}:${event_id || 'none'}`}
          imageUrls={[fixture.poster.file_path]}
          pins={fixture.pins}
          activeEventId={event_id || null}
          photoTakenAt={fixture.poster.created_at || null}
          seenAt={fixture.poster.seen_at_name || null}
          seenAtHref={seenAtHref}
          debug={debug}
        />
        <PosterTagVoting
          events={fixture.pins.map((pin) => ({ event_id: pin.event_id, title: pin.title }))}
          initialTagsByEvent={fixture.tagsByEvent}
        />
      </main>
    )
  }

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
      return renderLoadError('Poster query', primary.error.message)
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
        return renderLoadError('Poster fallback query', fallback.error.message)
      }
      poster = (fallback.data?.[0] || null) as PosterRow | null
    }
  }

  if (!poster) return <main style={{ padding: 24, fontFamily: 'sans-serif' }}>Poster not found</main>

  const itemsRes = await supabase
    .from('poster_items')
    .select('id,title,type,status,start_date,time_of_day,location_text,x,y,upvote_count')
    .eq('poster_id', id)
    .eq('status', 'published')

  let pins = ((itemsRes.data || []) as LinkRow[])
    .map((row) => ({
      link_id: row.id,
      event_id: row.id,
      title: row.title || 'Item',
      start_at: row.start_date ? `${row.start_date}T${row.time_of_day || '14:00:00'}` : '',
      location: row.location_text || null,
      status: row.status || null,
      item_type: row.type || 'event',
      upvote_count: Number(row.upvote_count || 0),
      did_upvote: false,
      bbox: { x: row.x, y: row.y },
    }))

  if (itemsRes.error) {
    const legacy = await supabase
      .from('poster_event_links')
      .select('id,event_id,bbox,events(id,title,start_at,location,status)')
      .eq('poster_upload_id', id)
    if (legacy.error) {
      return renderLoadError('Poster pins query', legacy.error.message)
    }
    pins = (legacy.data || [])
      .map((row) => {
        const event = Array.isArray(row.events) ? row.events[0] : row.events
        if (!event || !row.bbox) return null
        if ((event.status || '').toLowerCase() !== 'published') return null
        return {
          link_id: row.id,
          event_id: row.event_id,
          title: event.title || 'Item',
          start_at: event.start_at || '',
          location: event.location || null,
          status: event.status || null,
          item_type: 'event',
          upvote_count: 0,
          did_upvote: false,
          bbox: row.bbox,
        }
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
  }

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
      return renderLoadError('Poster tags query', officialRes.error.message)
    }
    if (votesRes.error && !hasMissingTagTables(votesRes.error.message || '')) {
      return renderLoadError('Poster tag votes query', votesRes.error.message)
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
  const browseParams = new URLSearchParams()
  Object.entries(currentParams || {}).forEach(([key, value]) => {
    if (!value || key === 'poster') return
    if (key === 'event_id') return
    browseParams.set(key, String(value))
  })
  const browseHref = `/browse${browseParams.toString() ? `?${browseParams.toString()}` : ''}`
  const seenAtParams = new URLSearchParams(browseParams.toString())
  const seenAtValue = getPosterSeenAt(poster)
  const hasSeenAt = Boolean(seenAtValue)
  const pageTitle = hasSeenAt ? seenAtValue! : 'Community Board'
  const boardKindLabel = pins.length > 1 ? 'Community Board' : 'Poster'
  if (seenAtValue) seenAtParams.set('seenAt', seenAtValue)
  const seenAtHref = `/browse${seenAtParams.toString() ? `?${seenAtParams.toString()}` : ''}`
  return (
    <main className="cb-page-container cbPosterPage" style={{ scrollBehavior: 'smooth' }}>
      <PosterPageHeader
        browseHref={browseHref}
        title={pageTitle}
        kind={boardKindLabel}
        showIdentifyBoard={!hasSeenAt}
      />
      <PosterViewer
        key={`${id}:${event_id || 'none'}`}
        imageUrls={imageUrls}
        pins={pins}
        activeEventId={event_id || null}
        photoTakenAt={poster.created_at || null}
        seenAt={seenAtValue}
        seenAtHref={seenAtHref}
        debug={debug}
      />
      <PosterTagVoting
        events={pins.map((pin) => ({ event_id: pin.event_id, title: pin.title }))}
        initialTagsByEvent={tagsByEvent}
      />
    </main>
  )
}
