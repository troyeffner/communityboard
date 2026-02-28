'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PosterControls from '@/app/components/poster/PosterControls'
import PosterStage from '@/app/components/poster/PosterStage'
import ItemCard from '@/app/components/poster/ItemCard'
import { eventStatusLabel } from '@/lib/statuses'
import { ensureCbVid } from '@/lib/viewer-id'

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

type Pin = {
  link_id: string
  event_id: string
  title: string
  start_at: string
  location: string | null
  status: string | null
  item_type: string | null
  upvote_count?: number
  did_upvote?: boolean
  bbox: { x: number; y: number } | null
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

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function isCalendarType(type?: string | null) {
  const value = (type || 'event').toLowerCase()
  return value === 'event' || value === 'recurring_event' || value === 'class_program'
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

function pinStatusLabel(value?: string | null) {
  return eventStatusLabel(value || 'draft')
}

export default function BrowseClient({
  initialPoster,
  initialSeenAt,
  initialTags,
  initialItem,
}: {
  initialPoster: string
  initialSeenAt: string
  initialTags: string
  initialItem: string
}) {
  const router = useRouter()
  const stageRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{ x: number; y: number } | null>(null)
  const hasAutoCenteredRef = useRef(false)

  const [posterParam, setPosterParam] = useState(initialPoster)
  const [seenAt, setSeenAt] = useState(initialSeenAt)
  const [tags] = useState(initialTags)
  const [itemParam, setItemParam] = useState(initialItem)

  const [posters, setPosters] = useState<PosterRow[]>([])
  const [facets, setFacets] = useState<string[]>([])
  const [items, setItems] = useState<ItemRow[]>([])
  const [activePosterId, setActivePosterId] = useState(initialPoster)
  const [error, setError] = useState('')

  const [stageSize, setStageSize] = useState({ width: 1, height: 1 })
  const [imageNatural, setImageNatural] = useState({ width: 1, height: 1 })
  const [imageIndex, setImageIndex] = useState(0)
  const [allFailed, setAllFailed] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [selectedEventId, setSelectedEventId] = useState<string | null>(() => initialItem || null)
  const [pinVotes, setPinVotes] = useState<Record<string, { upvote_count: number; did_upvote: boolean }>>({})
  const [isMobile, setIsMobile] = useState(false)

  const activePoster = useMemo(() => posters.find((p) => p.id === activePosterId) || null, [posters, activePosterId])

  function updateUrl(next: { poster?: string; seenAt?: string; tags?: string; item?: string }) {
    const params = new URLSearchParams()
    const poster = next.poster ?? posterParam
    const nextSeenAt = next.seenAt ?? seenAt
    const nextTags = next.tags ?? tags
    const nextItem = next.item ?? itemParam
    if (poster) params.set('poster', poster)
    if (nextSeenAt) params.set('seenAt', nextSeenAt)
    if (nextTags) params.set('tags', nextTags)
    if (nextItem) params.set('item', nextItem)
    router.replace(`/browse${params.toString() ? `?${params.toString()}` : ''}`)
  }

  useEffect(() => {
    if (!stageRef.current) return
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect
      if (!box) return
      setStageSize({
        width: Math.max(1, box.width),
        height: Math.max(1, box.height),
      })
    })
    observer.observe(stageRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 980)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

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
    return () => {
      cancelled = true
    }
  }, [posterParam, seenAt, tags])

  useEffect(() => {
    if (!selectedEventId && itemParam) setSelectedEventId(itemParam)
  }, [selectedEventId, itemParam])

  useEffect(() => {
    if (items.length === 0) return
    if (!itemParam) return
    if (items.some((item) => item.id === itemParam)) return
    setItemParam('')
    setSelectedEventId(null)
    updateUrl({ item: '' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, itemParam])

  const imageUrls = activePoster?.public_url ? [activePoster.public_url] : []
  const pinRows: Pin[] = useMemo(() => {
    return items.map((item) => ({
      link_id: `item-${item.id}`,
      event_id: item.id,
      title: item.title,
      start_at: item.start_at || '',
      location: item.location_text,
      status: item.status || 'published',
      item_type: item.type || 'event',
      upvote_count: item.upvote_count || 0,
      did_upvote: item.did_upvote || false,
      bbox: { x: item.x, y: item.y },
    }))
  }, [items])

  const validPins = useMemo(
    () => pinRows.filter((p): p is Pin & { bbox: { x: number; y: number } } => Boolean(p.bbox)),
    [pinRows],
  )

  const effectiveSelectedEventId = useMemo(() => {
    const selected = itemParam || selectedEventId || null
    if (selected && pinRows.some((pin) => pin.event_id === selected)) return selected
    return pinRows[0]?.event_id || null
  }, [itemParam, selectedEventId, pinRows])

  const selectedPin = useMemo(() => {
    if (effectiveSelectedEventId) return pinRows.find((pin) => pin.event_id === effectiveSelectedEventId) || null
    return pinRows[0] || null
  }, [effectiveSelectedEventId, pinRows])

  const orderedPins = useMemo(() => {
    if (!effectiveSelectedEventId) return [...pinRows]
    const lead = pinRows.find((pin) => pin.event_id === effectiveSelectedEventId)
    if (!lead) return [...pinRows]
    return [lead, ...pinRows.filter((pin) => pin.event_id !== effectiveSelectedEventId)]
  }, [pinRows, effectiveSelectedEventId])

  const imageUrl = allFailed ? '' : (imageUrls[imageIndex] || imageUrls[0] || '')

  const stageMetrics = useMemo(() => {
    const stageW = stageSize.width || 1
    const stageH = stageSize.height || 1
    const naturalRatio = imageNatural.width / Math.max(1, imageNatural.height)
    const stageRatio = stageW / stageH

    let baseW = stageW
    let baseH = stageH
    if (naturalRatio > stageRatio) {
      baseW = stageW
      baseH = stageW / naturalRatio
    } else {
      baseH = stageH
      baseW = stageH * naturalRatio
    }

    const offsetX = (stageW - baseW) / 2
    const offsetY = (stageH - baseH) / 2
    return { stageW, stageH, baseW, baseH, offsetX, offsetY }
  }, [stageSize, imageNatural])

  function clampPan(nextPan: { x: number; y: number }, nextZoom = zoom) {
    const renderedW = stageMetrics.baseW * nextZoom
    const renderedH = stageMetrics.baseH * nextZoom
    const offsetScaledX = stageMetrics.offsetX * nextZoom
    const offsetScaledY = stageMetrics.offsetY * nextZoom

    let clampedX = nextPan.x
    let clampedY = nextPan.y

    if (renderedW <= stageMetrics.stageW) {
      clampedX = (stageMetrics.stageW - renderedW) / 2 - offsetScaledX
    } else {
      const minX = stageMetrics.stageW - (offsetScaledX + renderedW)
      const maxX = -offsetScaledX
      clampedX = Math.max(minX, Math.min(maxX, clampedX))
    }

    if (renderedH <= stageMetrics.stageH) {
      clampedY = (stageMetrics.stageH - renderedH) / 2 - offsetScaledY
    } else {
      const minY = stageMetrics.stageH - (offsetScaledY + renderedH)
      const maxY = -offsetScaledY
      clampedY = Math.max(minY, Math.min(maxY, clampedY))
    }

    return { x: Number(clampedX.toFixed(1)), y: Number(clampedY.toFixed(1)) }
  }

  function selectPin(pin: Pin) {
    setSelectedEventId(pin.event_id)
    setItemParam(pin.event_id)
    if (pin.bbox) centerOnPin(pin, Math.max(1.4, zoom))
    updateUrl({ item: pin.event_id })
  }

  function centerOnPin(pin: Pin, targetZoom = Math.max(1.8, zoom)) {
    if (!pin.bbox) return
    const panX = stageMetrics.stageW / 2 - (stageMetrics.offsetX + pin.bbox.x * stageMetrics.baseW) * targetZoom
    const panY = stageMetrics.stageH / 2 - (stageMetrics.offsetY + pin.bbox.y * stageMetrics.baseH) * targetZoom
    const normalizedZoom = Number(targetZoom.toFixed(2))
    setZoom(normalizedZoom)
    setPan(clampPan({ x: Number(panX.toFixed(1)), y: Number(panY.toFixed(1)) }, normalizedZoom))
  }

  function fitToItems() {
    if (validPins.length === 0) return
    if (validPins.length === 1) {
      centerOnPin(validPins[0], 1.6)
      return
    }

    const points = validPins.map((pin) => pin.bbox!)
    const minX = Math.min(...points.map((p) => p.x))
    const minY = Math.min(...points.map((p) => p.y))
    const maxX = Math.max(...points.map((p) => p.x))
    const maxY = Math.max(...points.map((p) => p.y))

    const padding = 0.08
    const boxW = Math.max(0.05, Math.min(1, maxX - minX + padding * 2))
    const boxH = Math.max(0.05, Math.min(1, maxY - minY + padding * 2))
    const targetZoom = clamp(
      Math.min(stageMetrics.stageW / (boxW * stageMetrics.baseW), stageMetrics.stageH / (boxH * stageMetrics.baseH)),
      1,
      5,
    )
    const centerX = clamp(minX + (maxX - minX) / 2, 0, 1)
    const centerY = clamp(minY + (maxY - minY) / 2, 0, 1)
    const panX = stageMetrics.stageW / 2 - (stageMetrics.offsetX + centerX * stageMetrics.baseW) * targetZoom
    const panY = stageMetrics.stageH / 2 - (stageMetrics.offsetY + centerY * stageMetrics.baseH) * targetZoom
    const normalizedZoom = Number(targetZoom.toFixed(2))
    setZoom(normalizedZoom)
    setPan(clampPan({ x: Number(panX.toFixed(1)), y: Number(panY.toFixed(1)) }, normalizedZoom))
  }

  async function toggleUpvote(pin: Pin) {
    const state = pinVotes[pin.event_id] || {
      upvote_count: Number(pin.upvote_count || 0),
      did_upvote: Boolean(pin.did_upvote),
    }
    const method = state.did_upvote ? 'DELETE' : 'POST'
    const viewerId = ensureCbVid()
    const res = await fetch(`/api/items/${encodeURIComponent(pin.event_id)}/upvote`, {
      method,
      headers: { 'x-cb-vid': viewerId },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return

    setPinVotes((prev) => ({
      ...prev,
      [pin.event_id]: {
        upvote_count: Number(data.upvotes || 0),
        did_upvote: Boolean(data.votedByMe),
      },
    }))
  }

  const focused = Boolean(itemParam || posterParam || seenAt)

  function clearFocus() {
    setItemParam('')
    setSelectedEventId(null)
    setPosterParam('')
    setActivePosterId('')
    setSeenAt('')
    setZoom(1)
    setPan({ x: 0, y: 0 })
    updateUrl({ item: '', poster: '', seenAt: '' })
  }

  return (
    <main className="cb-page-container">
      <div
        className="cbCreateGrid"
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '320px minmax(0, 1fr) 400px',
          gap: 16,
          minHeight: 'calc(100vh - 80px)',
        }}
      >
        <section className="cbPanel">
          <header className="cbPanelHeader">
            <h1 className="cb-section-header">Browse</h1>
            <p className="cb-muted-text">Filter posters, choose a board, then review details.</p>
          </header>
          <div className="cbPanelScroll" style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
            <div className="cbFormCard" style={{ gap: 8 }}>
              <Link href="/" style={{ color: '#1d4ed8', textDecoration: 'none', fontWeight: 600 }}>
                ← Return to Community Board
              </Link>
              {focused ? <button data-variant="secondary" onClick={clearFocus}>Clear focus</button> : null}
            </div>

            <div className="cbFormCard" style={{ gap: 8 }}>
              <div className="cb-muted-text" style={{ margin: 0, fontWeight: 600 }}>Found at</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button
                  data-variant="secondary"
                  onClick={() => {
                    setSeenAt('')
                    setPosterParam('')
                    setItemParam('')
                    setSelectedEventId(null)
                    updateUrl({ seenAt: '', poster: '', item: '' })
                  }}
                >
                  All
                </button>
                {facets.map((facet) => (
                  <button
                    key={facet}
                    data-variant="secondary"
                    onClick={() => {
                      setSeenAt(facet)
                      setPosterParam('')
                      setActivePosterId('')
                      setItemParam('')
                      setSelectedEventId(null)
                      updateUrl({ seenAt: facet, poster: '', item: '' })
                    }}
                    style={seenAt === facet ? { borderColor: '#1d4ed8', color: '#1d4ed8' } : undefined}
                  >
                    {facet}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              {posters.map((poster) => (
                <button
                  key={poster.id}
                  type="button"
                  onClick={() => {
                    setPosterParam(poster.id)
                    setActivePosterId(poster.id)
                    setItemParam('')
                    setSelectedEventId(null)
                    hasAutoCenteredRef.current = false
                    updateUrl({ poster: poster.id, item: '' })
                  }}
                  style={{
                    border: activePosterId === poster.id ? '2px solid #1d4ed8' : '1px solid #dbe2ea',
                    borderRadius: 12,
                    padding: 10,
                    background: '#fff',
                    display: 'grid',
                    gridTemplateColumns: '96px minmax(0, 1fr)',
                    gap: 10,
                    alignItems: 'start',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  {poster.public_url ? (
                    <img
                      src={poster.public_url}
                      alt="Poster thumbnail"
                      style={{ width: 96, height: 96, borderRadius: 8, border: '1px solid #e5e7eb', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ width: 96, height: 96, borderRadius: 8, border: '1px solid #e5e7eb', background: '#f8fafc' }} />
                  )}
                  <div style={{ minWidth: 0, display: 'grid', gap: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {poster.seen_at_name || 'Unknown'}
                    </div>
                    <div className="cb-muted-text" style={{ margin: 0, fontSize: 12 }}>Captured: {formatCaptureHour(poster.created_at)}</div>
                    <div className="cb-muted-text" style={{ margin: 0, fontSize: 12 }}>Items: {poster.item_count}</div>
                    <div className="cb-muted-text" style={{ margin: 0, fontSize: 12 }}>Status: {poster.status || 'uploaded'}</div>
                  </div>
                </button>
              ))}
              {posters.length === 0 ? <p className="cb-muted-text" style={{ margin: 0 }}>No posters found.</p> : null}
            </div>
          </div>
        </section>

        <section className="cbPanel">
          <header className="cbPanelHeader">
            <h2 className="cb-section-header">Workspace</h2>
            <p className="cb-muted-text">Zoom and inspect pin placement on the selected poster.</p>
          </header>
          <div className="cbPanelScroll cbWorkspaceBody">
            {error ? <p style={{ color: 'crimson', margin: 0 }}>{error}</p> : null}

            <PosterControls>
              <button data-variant="secondary" onClick={() => {
                const nextZoom = clamp(Number((zoom - 0.2).toFixed(2)), 1, 5)
                if (selectedPin) centerOnPin(selectedPin, nextZoom)
                else setZoom(nextZoom)
              }}>Zoom -</button>
              <button data-variant="secondary" onClick={() => {
                const nextZoom = clamp(Number((zoom + 0.2).toFixed(2)), 1, 5)
                if (selectedPin) centerOnPin(selectedPin, nextZoom)
                else setZoom(nextZoom)
              }}>Zoom +</button>
              <button data-variant="secondary" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}>Reset</button>
              <button data-variant="secondary" onClick={fitToItems} disabled={validPins.length === 0}>Fit to items</button>
              <button data-variant="secondary" onClick={() => selectedPin && centerOnPin(selectedPin)} disabled={!selectedPin}>Center selected</button>
            </PosterControls>

            <PosterStage
              stageRef={stageRef}
              imageUrl={imageUrl}
              loadError={loadError}
              pan={pan}
              zoom={zoom}
              stageMetrics={stageMetrics}
              pins={validPins}
              selectedEventId={effectiveSelectedEventId}
              onStageMouseDown={(e) => { dragRef.current = { x: e.clientX, y: e.clientY } }}
              onStageMouseMove={(e) => {
                if (!dragRef.current) return
                const dx = e.clientX - dragRef.current.x
                const dy = e.clientY - dragRef.current.y
                setPan((prev) => clampPan({ x: prev.x + dx, y: prev.y + dy }))
                dragRef.current = { x: e.clientX, y: e.clientY }
              }}
              onStageMouseUp={() => { dragRef.current = null }}
              onStageMouseLeave={() => { dragRef.current = null }}
              onImageLoad={(e) => {
                setImageNatural({
                  width: Math.max(1, e.currentTarget.naturalWidth || 1),
                  height: Math.max(1, e.currentTarget.naturalHeight || 1),
                })
                setLoadError('')
                if (!hasAutoCenteredRef.current && selectedPin?.bbox) {
                  hasAutoCenteredRef.current = true
                  centerOnPin(selectedPin, Math.max(1.4, zoom))
                }
              }}
              onImageError={() => {
                if (imageIndex < imageUrls.length - 1) {
                  setImageIndex((prev) => prev + 1)
                  return
                }
                setAllFailed(true)
                setLoadError('Failed to load poster image.')
              }}
              onPinClick={(pin) => {
                const selected = validPins.find((candidate) => candidate.link_id === pin.link_id)
                if (selected) selectPin(selected)
              }}
            />
          </div>
        </section>

        <section className="cbPanel">
          <header className="cbPanelHeader">
            <h2 className="cb-section-header">Poster details</h2>
            <p className="cb-muted-text">Selected item is shown first.</p>
          </header>
          <div className="cbPanelScroll" style={{ display: 'grid', gap: 8 }}>
            {orderedPins.map((pin) => {
              const foundAtLabel = activePoster?.seen_at_name || '—'
              const eventAtLabel = pin.location || '—'
              const showBothLocations = foundAtLabel !== '—' && eventAtLabel !== '—' && foundAtLabel !== eventAtLabel
              return (
                <ItemCard
                  key={pin.link_id}
                  onClick={() => selectPin(pin)}
                  selected={effectiveSelectedEventId === pin.event_id}
                  testId={`browse-item-${pin.event_id}`}
                  title={pin.title?.trim() || '(Untitled item)'}
                  subtitle={pin.start_at ? `Date/time: ${new Date(pin.start_at).toLocaleString()}` : 'Date/time: —'}
                  status={pinStatusLabel(pin.status)}
                  typeLabel={(pin.item_type || 'event').replace(/_/g, ' ')}
                  location={`Found at: ${foundAtLabel}`}
                >
                  {showBothLocations ? (
                    <div style={{ fontSize: 12, marginBottom: 6, color: '#64748b' }}>
                      Event at: {eventAtLabel}
                    </div>
                  ) : null}

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleUpvote(pin)
                      }}
                    >
                      Upvote · {pinVotes[pin.event_id]?.upvote_count ?? pin.upvote_count ?? 0}
                    </button>
                  </div>

                  {isCalendarType(pin.item_type) && pin.start_at ? (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <a
                        href={toGoogleCalendarUrl({ title: pin.title, start_at: pin.start_at, location: pin.location })}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ display: 'inline-block', padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', textDecoration: 'none', color: '#111827', fontWeight: 600 }}
                      >
                        Add to Google Calendar
                      </a>
                      <a
                        href={`/api/items/${encodeURIComponent(pin.event_id)}/ics`}
                        onClick={(e) => e.stopPropagation()}
                        style={{ display: 'inline-block', padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', textDecoration: 'none', color: '#111827', fontWeight: 600 }}
                      >
                        Download .ics
                      </a>
                    </div>
                  ) : null}
                </ItemCard>
              )
            })}
            {orderedPins.length === 0 ? <p className="cb-muted-text" style={{ margin: 0 }}>No items yet.</p> : null}
          </div>
        </section>
      </div>
    </main>
  )
}
