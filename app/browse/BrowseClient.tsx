'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PosterViewer from '../poster/[id]/PosterViewer'

type PosterRow = {
  id: string
  created_at: string
  status: string
  item_count: number
  seen_at_name: string | null
  public_url: string | null
}

type ItemRow = {
  id: string
  title: string
  type: string
  status: string
  start_at: string | null
  location_text: string | null
  x: number
  y: number
  upvote_count: number
  did_upvote: boolean
}

function formatCaptureHour(value?: string | null) {
  if (!value) return 'Unknown'
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return 'Unknown'
  return dt.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
  })
}

export default function BrowseClient({
  initialPoster,
  initialSeenAt,
  initialTags,
}: {
  initialPoster: string
  initialSeenAt: string
  initialTags: string
}) {
  const router = useRouter()
  const [posterParam, setPosterParam] = useState(initialPoster)
  const [seenAt, setSeenAt] = useState(initialSeenAt)
  const [tags] = useState(initialTags)
  const [posters, setPosters] = useState<PosterRow[]>([])
  const [facets, setFacets] = useState<string[]>([])
  const [items, setItems] = useState<ItemRow[]>([])
  const [activePosterId, setActivePosterId] = useState<string>(initialPoster)
  const [error, setError] = useState('')

  const activePoster = useMemo(() => posters.find((p) => p.id === activePosterId) || null, [posters, activePosterId])

  function updateUrl(next: { poster?: string; seenAt?: string; tags?: string }) {
    const params = new URLSearchParams()
    const poster = next.poster ?? posterParam
    const nextSeenAt = next.seenAt ?? seenAt
    const nextTags = next.tags ?? tags
    if (poster) params.set('poster', poster)
    if (nextSeenAt) params.set('seenAt', nextSeenAt)
    if (nextTags) params.set('tags', nextTags)
    router.replace(`/browse${params.toString() ? `?${params.toString()}` : ''}`)
  }

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const params = new URLSearchParams()
      if (posterParam) params.set('poster', posterParam)
      if (seenAt) params.set('seenAt', seenAt)
      if (tags) params.set('tags', tags)
      const res = await fetch(`/api/public/browse?${params.toString()}`)
      const data = await res.json().catch(() => ({}))
      if (cancelled) return
      if (!res.ok) {
        setError(data?.error || 'Failed to load browse data')
        return
      }
      setError('')
      setPosters((data.posters || []) as PosterRow[])
      setFacets((data.seen_at_facets || []) as string[])
      setItems((data.items || []) as ItemRow[])
      const nextPoster = String(data.active_poster_id || '')
      setActivePosterId(nextPoster)
      if (nextPoster !== posterParam) setPosterParam(nextPoster)
    }
    run()
    return () => { cancelled = true }
  }, [posterParam, seenAt, tags])

  const imageUrls = activePoster?.public_url ? [activePoster.public_url] : []
  const pinRows = items.map((item) => ({
    link_id: `item-${item.id}`,
    event_id: item.id,
    title: item.title,
    start_at: item.start_at || '',
    location: item.location_text,
    item_type: item.type,
    upvote_count: item.upvote_count || 0,
    did_upvote: item.did_upvote || false,
    bbox: { x: item.x, y: item.y },
  }))

  return (
    <main className="cb-page-container cbBrowsePage">
      <header className="cb-panel cbBrowseHeader">
        <div className="cbBrowseHeaderNav">
          <Link href="/" className="cbBrowseBackLink">← Return to Community Board</Link>
        </div>
        <h1 className="cbBrowseTitle">Browse Posters</h1>
        <p className="cbBrowseSubtitle">Review captured boards and open items in a consistent board-style layout.</p>
      </header>
      <div className="cbBrowseLayout">
        <section className="cb-panel cbBrowseRail">
          <h2 className="cb-section-header cbBrowsePanelTitle">Browse</h2>
          <div>
            <div className="cbBrowseMicroLabel">Seen at</div>
            <div className="cbBrowseFacetRow">
              <button
                data-variant="secondary"
                className={!seenAt ? 'cbBrowseFacetButton cbBrowseFacetButtonActive' : 'cbBrowseFacetButton'}
                onClick={() => {
                  setSeenAt('')
                  updateUrl({ seenAt: '', poster: '' })
                }}
              >
                All
              </button>
              {facets.map((facet) => (
                <button
                  key={facet}
                  data-variant="secondary"
                  className={seenAt === facet ? 'cbBrowseFacetButton cbBrowseFacetButtonActive' : 'cbBrowseFacetButton'}
                  onClick={() => {
                    setSeenAt(facet)
                    setPosterParam('')
                    updateUrl({ seenAt: facet, poster: '' })
                  }}
                >
                  {facet}
                </button>
              ))}
            </div>
          </div>
          <div className="cbBrowsePosterList">
            {posters.map((poster) => (
              <button
                key={poster.id}
                type="button"
                onClick={() => {
                  setPosterParam(poster.id)
                  setActivePosterId(poster.id)
                  updateUrl({ poster: poster.id })
                }}
                className={`cbBrowsePosterCard ${activePosterId === poster.id ? 'cbBrowsePosterCardSelected' : ''}`}
              >
                {poster.public_url ? (
                  <img src={poster.public_url} alt="Poster thumbnail" className="cbBrowsePosterThumb" />
                ) : (
                  <div className="cbBrowsePosterThumb cbBrowsePosterThumbFallback" />
                )}
                <div>
                  <div className="cbBrowsePosterSeenAt">{poster.seen_at_name || 'Unknown seen at'}</div>
                  <div className="cbBrowsePosterMeta">Captured: {formatCaptureHour(poster.created_at)}</div>
                  <div className="cbBrowsePosterMeta">Items: {poster.item_count}</div>
                  <div className="cbBrowsePosterMeta">Status: {poster.status || 'uploaded'}</div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="cbBrowseWorkspace">
          {error ? <p className="cbBrowseError">{error}</p> : null}
          <PosterViewer
            imageUrls={imageUrls}
            pins={pinRows}
            activeEventId={pinRows[0]?.event_id || null}
            photoTakenAt={activePoster?.created_at || null}
            seenAt={activePoster?.seen_at_name || null}
          />
        </section>
      </div>
    </main>
  )
}
