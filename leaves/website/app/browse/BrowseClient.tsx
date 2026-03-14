'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BoardHeader, BoardLayout } from '@/app/components/layout/BoardLayout'
import { Panel, PanelSection } from '@/app/components/layout/Panel'
import { PosterDetailsList, PosterDetailsRail } from '@/app/components/layout/RightRail'
import PosterControls from '@/app/components/poster/PosterControls'
import PosterStage from '@/app/components/poster/PosterStage'
import ItemCard from '@/app/components/poster/ItemCard'

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
  const [isLoading, setIsLoading] = useState(true)

  const [stageSize, setStageSize] = useState({ width: 1, height: 1 })
  const [imageNatural, setImageNatural] = useState({ width: 1, height: 1 })
  const [imageIndex, setImageIndex] = useState(0)
  const [allFailed, setAllFailed] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [selectedEventId, setSelectedEventId] = useState<string | null>(() => initialItem || null)
  const itemCardRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    document.title = 'Browse posters'
  }, [])

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
      setStageSize({ width: Math.max(1, box.width), height: Math.max(1, box.height) })
    })
    observer.observe(stageRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (posterParam) params.set('poster', posterParam)
      if (seenAt) params.set('seenAt', seenAt)
      if (tags) params.set('tags', tags)

      const res = await fetch(`/api/public/browse?${params.toString()}`)
      const data = await res.json().catch(() => ({}))
      if (cancelled) return

      if (!res.ok) {
        setError(data?.error || 'Failed to load browse data')
        setIsLoading(false)
        return
      }

      setError('')
      setPosters((data.posters || []) as PosterRow[])
      setFacets((data.seen_at_facets || []) as string[])
      setItems((data.items || []) as ItemRow[])

      const nextPoster = String(data.active_poster_id || '')
      setActivePosterId(nextPoster)
      if (nextPoster !== posterParam) setPosterParam(nextPoster)
      setIsLoading(false)
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

  const orderedPins = useMemo(() => [...pinRows], [pinRows])

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
    if (pin.bbox) centerOnPin(pin, Math.max(1.4, zoom))
    setItemParam(pin.event_id)
    updateUrl({ item: pin.event_id })
  }

  function centerOnPin(pin: Pin, targetZoom = Math.max(1.8, zoom)) {
    if (!pin.bbox) return
    const panX = stageMetrics.stageW / 2 - (stageMetrics.offsetX + pin.bbox.x * stageMetrics.baseW) * targetZoom
    const panY = stageMetrics.stageH / 2 - (stageMetrics.offsetY + pin.bbox.y * stageMetrics.baseH) * targetZoom
    setZoom(targetZoom)
    setPan(clampPan({ x: panX, y: panY }, targetZoom))
  }

  function fitToItems() {
    if (validPins.length === 0) return
    const xs = validPins.map((p) => p.bbox.x)
    const ys = validPins.map((p) => p.bbox.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const spreadX = Math.max(0.1, maxX - minX)
    const spreadY = Math.max(0.1, maxY - minY)
    const nextZoom = clamp(Math.min(4, 0.85 / Math.max(spreadX, spreadY)), 1, 5)
    const target = {
      bbox: { x: minX + spreadX / 2, y: minY + spreadY / 2 },
    } as Pin
    centerOnPin(target, nextZoom)
  }

  useEffect(() => {
    const selectedId = effectiveSelectedEventId
    if (!selectedId) return
    const el = itemCardRefs.current[selectedId]
    if (!el) return
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [effectiveSelectedEventId])

  const selectedTypeLabel = useMemo(
    () => (selectedPin?.item_type || 'item').replace(/_/g, ' '),
    [selectedPin],
  )
  const centerTitle = useMemo(
    () => selectedPin?.title?.trim() || `${selectedTypeLabel} view`,
    [selectedPin, selectedTypeLabel],
  )
  const centerSubtitle = useMemo(
    () => `Zoom and inspect ${selectedTypeLabel} placement on the selected board.`,
    [selectedTypeLabel],
  )
  const rightTitle = useMemo(
    () => `${selectedTypeLabel} details`,
    [selectedTypeLabel],
  )

  function getDetailLocation(seenAtLabel: string, eventLocation: string | null) {
    const eventAt = eventLocation || '—'
    if (!seenAtLabel) return `Location: ${eventAt}`
    if (eventAt !== '—' && eventAt !== seenAtLabel) return `Seen at: ${seenAtLabel}`
    return `Seen at: ${seenAtLabel}`
  }

  const leftPanel = (
    <Panel title="Browse" subtitle="Search, filter, and choose a poster board." testId="browse-panel-left">
      <PanelSection>
        <p className="cbPanelMicroLabel">Seen at</p>
        <div className="cbTokenWrap">
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
            Clear
          </button>
          {facets.map((facet) => (
            <button
              key={facet}
              data-variant="secondary"
              className={seenAt === facet ? 'cbFilterToken cbFilterTokenActive' : 'cbFilterToken'}
              onClick={() => {
                setSeenAt(facet)
                setPosterParam('')
                setActivePosterId('')
                setItemParam('')
                setSelectedEventId(null)
                updateUrl({ seenAt: facet, poster: '', item: '' })
              }}
            >
              {facet}
            </button>
          ))}
        </div>
      </PanelSection>

      <div className="cbBrowsePosterList">
        {isLoading ? (
          <>
            <div className="cbSkeleton cbSkeletonCard" />
            <div className="cbSkeleton cbSkeletonCard" />
            <div className="cbSkeleton cbSkeletonCard" />
          </>
        ) : (
          <>
            {posters.map((poster) => (
              <button
                key={poster.id}
                type="button"
                className={activePosterId === poster.id ? 'cbBrowsePosterCard cbBrowsePosterCardActive' : 'cbBrowsePosterCard'}
                onClick={() => {
                  setPosterParam(poster.id)
                  setActivePosterId(poster.id)
                  setItemParam('')
                  setSelectedEventId(null)
                  hasAutoCenteredRef.current = false
                  updateUrl({ poster: poster.id, item: '' })
                }}
              >
                {poster.public_url ? (
                  <img src={poster.public_url} alt="Poster thumbnail" className="cbBrowsePosterThumb" />
                ) : (
                  <div className="cbBrowsePosterThumb cbBrowsePosterThumbEmpty" />
                )}
                <div className="cbBrowsePosterMeta">
                  <div className="cbBrowsePosterName">{poster.seen_at_name || 'Unknown'}</div>
                  <div className="cb-muted-text">Captured: {formatCaptureHour(poster.created_at)}</div>
                  <div className="cb-muted-text">Items: {poster.item_count}</div>
                </div>
              </button>
            ))}
            {posters.length === 0 ? <p className="cb-muted-text">No posters found.</p> : null}
          </>
        )}
      </div>
    </Panel>
  )

  const centerPanel = (
    <Panel title={centerTitle} subtitle={centerSubtitle} testId="browse-panel-center">
      {error ? <p className="cbErrorMsg">{error}</p> : null}
      {isLoading && !imageUrl ? (
        <div className="cbSkeleton cbSkeletonStage" />
      ) : null}
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
        <button data-variant="secondary" onClick={fitToItems} disabled={validPins.length === 0}>Fit</button>
        <button data-variant="secondary" onClick={() => selectedPin && centerOnPin(selectedPin)} disabled={!selectedPin}>Center</button>
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
    </Panel>
  )

  const rightPanel = (
    <PosterDetailsRail title={rightTitle} subtitle="Select any card to center and inspect." testId="browse-panel-right">
      <PosterDetailsList>
        {isLoading ? (
          <>
            <div className="cbSkeleton cbSkeletonItemCard" />
            <div className="cbSkeleton cbSkeletonItemCard" />
            <div className="cbSkeleton cbSkeletonItemCard" />
            <div className="cbSkeleton cbSkeletonItemCard" />
          </>
        ) : null}
        {!isLoading && orderedPins.map((pin) => {
          const seenAtLabel = activePoster?.seen_at_name || ''
          const eventAtLabel = pin.location || '—'
          const showBothLocations = Boolean(seenAtLabel && eventAtLabel !== '—' && seenAtLabel !== eventAtLabel)
          return (
            <div key={pin.link_id} ref={(el) => { itemCardRefs.current[pin.event_id] = el }}>
              <ItemCard
                onClick={() => selectPin(pin)}
                selected={effectiveSelectedEventId === pin.event_id}
                testId={`browse-item-${pin.event_id}`}
                title={pin.title?.trim() || '(Untitled item)'}
                subtitle={pin.start_at ? `Date/time: ${new Date(pin.start_at).toLocaleString()}` : 'Date/time: —'}
                typeLabel={(pin.item_type || 'event').replace(/_/g, ' ')}
                location={getDetailLocation(seenAtLabel, pin.location)}
              >
                {showBothLocations ? <div className="cbItemMetaSecondary">Event at: {eventAtLabel}</div> : null}
              {isCalendarType(pin.item_type) && pin.start_at ? (
                <div className="cbItemActionRow cbCalendarLinkRow">
                  <a
                    href={toGoogleCalendarUrl({ title: pin.title, start_at: pin.start_at, location: pin.location })}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="cbActionLink cbActionSecondary"
                  >
                    Add to Google Calendar
                  </a>
                  <a
                    href={`/api/items/${encodeURIComponent(pin.event_id)}/ics`}
                    onClick={(e) => e.stopPropagation()}
                    className="cbActionLink cbActionSecondary"
                  >
                    Download ICS
                  </a>
                </div>
              ) : null}
              </ItemCard>
            </div>
          )
        })}
        {!isLoading && orderedPins.length === 0 ? <p className="cbPanelEmptyState">No items yet.</p> : null}
      </PosterDetailsList>
    </PosterDetailsRail>
  )

  return (
    <BoardLayout
      testId="browse-board-layout"
      header={
        <BoardHeader
          title="Browse posters"
          subtitle="Search and inspect boards with a shared three-panel shell."
          leftLink={{ href: '/', label: 'Return to Community Board' }}
        />
      }
      left={leftPanel}
      center={centerPanel}
      right={rightPanel}
    />
  )
}
