'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ensureCbVid } from '@/lib/viewer-id'
import PosterControls from '@/app/components/poster/PosterControls'
import PosterStage from '@/app/components/poster/PosterStage'
import ItemCard from '@/app/components/poster/ItemCard'
import { BoardHeader, BoardLayout } from '@/app/components/layout/BoardLayout'
import { Panel, PanelSection } from '@/app/components/layout/Panel'
import { PosterDetailsList, PosterDetailsRail } from '@/app/components/layout/RightRail'

type Pin = {
  link_id: string
  event_id: string
  title: string
  start_at: string
  location: string | null
  status?: string | null
  item_type?: string | null
  upvote_count?: number
  did_upvote?: boolean
  bbox: { x: number; y: number } | null
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function isCalendarType(type?: string | null) {
  const value = (type || 'event').toLowerCase()
  return value === 'event' || value === 'recurring_event' || value === 'class_program'
}

function formatPhotoTakenHour(value?: string | null) {
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

export default function PosterViewer({
  imageUrls,
  pins,
  activeEventId,
  photoTakenAt,
  seenAt,
  seenAtHref = '',
  selectionParam = 'event_id',
  onSelectEventId,
}: {
  imageUrls: string[]
  pins: Pin[]
  activeEventId: string | null
  photoTakenAt?: string | null
  seenAt?: string | null
  seenAtHref?: string
  selectionParam?: string
  onSelectEventId?: (eventId: string) => void
}) {
  const router = useRouter()
  const stageRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{ x: number; y: number } | null>(null)
  const hasAutoCenteredRef = useRef(false)

  const [stageSize, setStageSize] = useState({ width: 1, height: 1 })
  const [imageNatural, setImageNatural] = useState({ width: 1, height: 1 })
  const [imageIndex, setImageIndex] = useState(0)
  const [allFailed, setAllFailed] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [pinVotes, setPinVotes] = useState<Record<string, { upvote_count: number; did_upvote: boolean }>>({})

  const foundAtLabel = seenAt || 'Unknown'
  const heading = `Found at: ${foundAtLabel}`

  useEffect(() => {
    document.title = heading
  }, [heading])

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

  const validPins = useMemo(
    () => pins.filter((p): p is Pin & { bbox: { x: number; y: number } } => Boolean(p.bbox)),
    [pins],
  )

  const effectiveSelectedEventId = useMemo(() => {
    if (activeEventId) return activeEventId
    if (selectedEventId && pins.some((pin) => pin.event_id === selectedEventId)) return selectedEventId
    return pins[0]?.event_id || null
  }, [activeEventId, selectedEventId, pins])

  useEffect(() => {
    if (activeEventId) hasAutoCenteredRef.current = false
  }, [activeEventId])

  const selectedPin = useMemo(() => {
    if (effectiveSelectedEventId) return pins.find((pin) => pin.event_id === effectiveSelectedEventId) || null
    return pins[0] || null
  }, [effectiveSelectedEventId, pins])

  const orderedPins = useMemo(() => {
    if (!effectiveSelectedEventId) return [...pins]
    const lead = pins.find((pin) => pin.event_id === effectiveSelectedEventId)
    if (!lead) return [...pins]
    return [lead, ...pins.filter((pin) => pin.event_id !== effectiveSelectedEventId)]
  }, [pins, effectiveSelectedEventId])

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
    if (onSelectEventId) onSelectEventId(pin.event_id)
    const params = new URLSearchParams(window.location.search)
    params.set(selectionParam, pin.event_id)
    router.replace(`?${params.toString()}`, { scroll: false })
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
    const state = pinVotes[pin.event_id] || { upvote_count: Number(pin.upvote_count || 0), did_upvote: Boolean(pin.did_upvote) }
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

  const leftPanel = (
    <Panel title="Poster" subtitle="Found at context and quick actions." testId="poster-panel-left">
      <PanelSection>
        <div className="cbPanelMetaGrid">
          <div><strong>Captured:</strong> {formatPhotoTakenHour(photoTakenAt)}</div>
          <div>
            <strong>Found at:</strong>{' '}
            {seenAt
              ? (seenAtHref ? <Link href={seenAtHref}>{seenAt}</Link> : seenAt)
              : '—'}
          </div>
        </div>
      </PanelSection>

    </Panel>
  )

  const centerPanel = (
    <Panel title="Workspace" subtitle="Poster stage for zooming and pin review." testId="poster-panel-center">
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
    <PosterDetailsRail subtitle="Selected item appears first." testId="poster-panel-right">
      <PosterDetailsList>
        {orderedPins.map((pin) => {
          const eventAtLabel = pin.location || '—'
          const showBothLocations = foundAtLabel !== '—' && eventAtLabel !== '—' && foundAtLabel !== eventAtLabel
          return (
            <ItemCard
              key={pin.link_id}
              onClick={() => selectPin(pin)}
              selected={effectiveSelectedEventId === pin.event_id}
              testId={`poster-item-${pin.event_id}`}
              title={pin.title?.trim() || '(Untitled item)'}
              subtitle={pin.start_at ? `Date/time: ${new Date(pin.start_at).toLocaleString()}` : 'Date/time: —'}
              typeLabel={(pin.item_type || 'event').replace(/_/g, ' ')}
              location={`Found at: ${foundAtLabel}`}
            >
              {showBothLocations ? <div className="cbItemMetaSecondary">Event at: {eventAtLabel}</div> : null}
              <div className="cbItemActionRow">
                <button
                  className="cbActionPrimary"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleUpvote(pin)
                  }}
                >
                  Upvote · {pinVotes[pin.event_id]?.upvote_count ?? pin.upvote_count ?? 0}
                </button>
              </div>
              {isCalendarType(pin.item_type) && pin.start_at ? (
                <div className="cbItemActionRow">
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
                    Download .ics
                  </a>
                </div>
              ) : null}
            </ItemCard>
          )
        })}
        {orderedPins.length === 0 ? <p className="cbPanelEmptyState">No items yet.</p> : null}
      </PosterDetailsList>
    </PosterDetailsRail>
  )

  return (
    <BoardLayout
      testId="poster-view-grid"
      header={
        <BoardHeader
          title={heading}
          subtitle="Public poster view"
          leftLink={{ href: '/', label: 'Return to Community Board' }}
          rightLink={{ href: '/browse', label: 'Browse posters' }}
        />
      }
      left={leftPanel}
      center={centerPanel}
      right={rightPanel}
    />
  )
}
