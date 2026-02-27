'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { EVENT_STATUSES, POSTER_STATUSES, normalizeEventStatus, normalizePosterStatus } from '@/lib/statuses'
import { createClient } from '@supabase/supabase-js'

type Upload = {
  id: string
  created_at: string
  status: string
  public_url?: string
  seen_at_name?: string | null
  is_done?: boolean
  event_count: number
  linked_count?: number
}

type PosterEventRow = {
  link_id: string
  bbox: { x: number; y: number } | null
  created_at: string
  event: {
    id: string
    item_type?: string | null
    title: string
    location: string | null
    description?: string | null
    recurrence_mode?: 'weekly' | 'monthly' | null
    recurrence_weekday?: string | null
    recurrence_month_ordinal?: 'first' | 'second' | 'third' | 'fourth' | null
    start_at: string
    status: string
  }
}

async function resizeImageForUpload(file: File): Promise<File> {
  const imageUrl = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = imageUrl
    })
    const maxEdge = 2000
    const longest = Math.max(image.width, image.height)
    const scale = longest > maxEdge ? maxEdge / longest : 1
    const width = Math.max(1, Math.round(image.width * scale))
    const height = Math.max(1, Math.round(image.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas unavailable')
    ctx.drawImage(image, 0, 0, width, height)
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((out) => (out ? resolve(out) : reject(new Error('Encoding failed'))), 'image/jpeg', 0.78)
    })
    return new File([blob], 'poster.jpg', { type: 'image/jpeg' })
  } finally {
    URL.revokeObjectURL(imageUrl)
  }
}

function defaultStartAt2pmLocal() {
  const d = new Date()
  d.setHours(14, 0, 0, 0)
  const offsetMs = d.getTimezoneOffset() * 60_000
  return new Date(d.getTime() - offsetMs).toISOString().slice(0, 16)
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return defaultStartAt2pmLocal()
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return defaultStartAt2pmLocal()
  const offsetMs = dt.getTimezoneOffset() * 60_000
  return new Date(dt.getTime() - offsetMs).toISOString().slice(0, 16)
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

function statusLabel(statusValue: string) {
  const normalized = normalizeEventStatus(statusValue, EVENT_STATUSES.DRAFT)
  if (normalized === EVENT_STATUSES.PLANTED) return 'Recently planted'
  if (normalized === EVENT_STATUSES.PUBLISHED) return 'Published'
  if (normalized === EVENT_STATUSES.UNPUBLISHED) return 'Returned for revision'
  if (normalized === EVENT_STATUSES.DRAFT) return 'Draft'
  return statusValue
}

function isTimeBoundType(type: string) {
  return type === 'event' || type === 'recurring_event' || type === 'class_program'
}

function friendlyError(message: string | undefined, fallback: string) {
  const msg = (message || '').toLowerCase()
  if (msg.includes('enum')) return 'Status value is not supported by this environment yet.'
  if (msg.includes('schema cache') || msg.includes('column')) return 'Database schema is out of date for this action.'
  return message || fallback
}

export default function BuilderCreatePage({
  initialPosterId,
  initialManualMode = false,
}: {
  initialPosterId: string | null
  initialManualMode?: boolean
}) {
  const manualMode = initialManualMode
  const posterUploadFromQuery = initialPosterId

  const [uploads, setUploads] = useState<Upload[]>([])
  const [selectedPosterId, setSelectedPosterId] = useState<string | null>(null)
  const selectedUpload = useMemo(() => uploads.find((u) => u.id === selectedPosterId) || null, [uploads, selectedPosterId])
  const [rows, setRows] = useState<PosterEventRow[]>([])
  const [activeLinkId, setActiveLinkId] = useState<string | null>(null)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null)

  const [title, setTitle] = useState('')
  const [itemType, setItemType] = useState<'event' | 'recurring_event' | 'class_program' | 'business_service' | 'opportunity' | 'announcement'>('event')
  const [recurrenceMode, setRecurrenceMode] = useState<'weekly' | 'monthly'>('weekly')
  const [recurrenceWeekday, setRecurrenceWeekday] = useState<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'>('monday')
  const [recurrenceMonthOrdinal, setRecurrenceMonthOrdinal] = useState<'first' | 'second' | 'third' | 'fourth'>('first')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [startAt, setStartAt] = useState(defaultStartAt2pmLocal())
  const [seenAtName, setSeenAtName] = useState('')
  const uploadInputRef = useRef<HTMLInputElement | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadingPoster, setUploadingPoster] = useState(false)

  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const stageRef = useRef<HTMLDivElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const [imageNatural, setImageNatural] = useState({ width: 1, height: 1 })
  const dragRef = useRef<{ x: number; y: number } | null>(null)
  const didDragRef = useRef(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteMode, setDeleteMode] = useState<'unlink' | 'delete_with_events'>('unlink')
  const [deletingPoster, setDeletingPoster] = useState(false)
  const [savingSeenAt, setSavingSeenAt] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [inspectorTab, setInspectorTab] = useState<'event' | 'business' | 'posterMeta'>('event')
  const [isMobile, setIsMobile] = useState(false)
  const panelsRef = useRef<HTMLDivElement | null>(null)
  const [stageSize, setStageSize] = useState({ width: 1, height: 1 })
  const posterControlButtonStyle = {
    height: 40,
    minHeight: 40,
    padding: '0 12px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    whiteSpace: 'nowrap' as const,
    flex: '0 0 auto',
  }

  async function loadUploads() {
    const res = await fetch('/api/manage/list-uploads-with-counts')
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return setError(friendlyError(data?.error, 'Failed to load posters'))
    setUploads((data.uploads || []) as Upload[])
  }

  async function loadRows(uploadId: string | null) {
    if (!uploadId) {
      setRows([])
      return
    }
    const res = await fetch(`/api/manage/poster-events?poster_upload_id=${encodeURIComponent(uploadId)}`)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return setError(friendlyError(data?.error, 'Failed to load events on poster'))
    setRows((data.rows || []) as PosterEventRow[])
  }

  useEffect(() => {
    loadUploads()
  }, [])

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 980)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => {
    if (!stageRef.current) return
    const stage = stageRef.current
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect
      if (!box) return
      setStageSize({ width: box.width || 1, height: box.height || 1 })
    })
    observer.observe(stage)
    return () => observer.disconnect()
  }, [selectedPosterId])

  useEffect(() => {
    if (!posterUploadFromQuery || selectedPosterId) return
    const exists = uploads.find((u) => u.id === posterUploadFromQuery)
    if (exists) {
      selectPoster(posterUploadFromQuery)
    }
  }, [posterUploadFromQuery, selectedPosterId, uploads])

  useEffect(() => {
    if (!manualMode) return
    try {
      const savedSeenAt = window.localStorage.getItem('submit_seen_at_name') || ''
      if (savedSeenAt && !seenAtName) setSeenAtName(savedSeenAt)
    } catch {
      // ignore localStorage failures
    }
  }, [manualMode, seenAtName])

  async function goToNextUntendedPoster() {
    const res = await fetch('/api/builder/next-poster')
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return setError(friendlyError(data?.error, 'Failed to load next poster'))
    const nextId = data?.poster?.id as string | undefined
    if (!nextId) return setMessage('No untended posters in queue.')
    await loadUploads()
    await selectPoster(nextId)
  }

  async function selectPoster(posterId: string) {
    const upload = uploads.find((u) => u.id === posterId) || null
    setSelectedPosterId(posterId)
    setError('')
    setMessage('')
    setActiveLinkId(null)
    setEditingEventId(null)
    setPoint(null)
    setTitle('')
    setLocation('')
    setDescription('')
    setStartAt(defaultStartAt2pmLocal())
    setSeenAtName(upload?.seen_at_name || '')
    setZoom(1)
    setPan({ x: 0, y: 0 })
    await loadRows(posterId)
    if (isMobile && panelsRef.current) {
      panelsRef.current.scrollTo({ left: panelsRef.current.clientWidth, behavior: 'smooth' })
    }
  }

  function startEdit(row: PosterEventRow) {
    setEditingEventId(row.event.id)
    setActiveLinkId(row.link_id)
    setPoint(null)
    setTitle(row.event.title || '')
    setItemType((row.event.item_type as typeof itemType) || 'event')
    setRecurrenceMode(row.event.recurrence_mode || 'weekly')
    setRecurrenceWeekday((row.event.recurrence_weekday as typeof recurrenceWeekday) || 'monday')
    setRecurrenceMonthOrdinal((row.event.recurrence_month_ordinal as typeof recurrenceMonthOrdinal) || 'first')
    setLocation(row.event.location || '')
    setDescription(row.event.description || '')
    setStartAt(toDateTimeLocal(row.event.start_at))
    setSeenAtName(selectedUpload?.seen_at_name || '')
    setInspectorTab('event')
    if (isMobile && panelsRef.current) {
      panelsRef.current.scrollTo({ left: panelsRef.current.clientWidth * 2, behavior: 'smooth' })
    }
  }

  function resetFormToNew() {
    setEditingEventId(null)
    setActiveLinkId(null)
    setTitle('')
    setItemType('event')
    setRecurrenceMode('weekly')
    setRecurrenceWeekday('monday')
    setRecurrenceMonthOrdinal('first')
    setLocation('')
    setDescription('')
    setStartAt(defaultStartAt2pmLocal())
  }

  async function saveSeenAt() {
    if (!selectedPosterId || !seenAtName.trim()) return true
    setSavingSeenAt(true)
    try {
      const res = await fetch('/api/manage/update-poster', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poster_upload_id: selectedPosterId,
          seen_at_name: seenAtName,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(friendlyError(data?.error, 'Failed to save Seen at'))
        return false
      }
      try {
        window.localStorage.setItem('submit_seen_at_name', seenAtName.trim())
      } catch {
        // ignore localStorage failures
      }
      await loadUploads()
      return true
    } finally {
      setSavingSeenAt(false)
    }
  }

  async function saveEvent() {
    setError('')
    setMessage('')
    if (isTimeBoundType(itemType) && !startAt.trim()) return setError('Start time is required for this item type.')
    if (!selectedPosterId && !manualMode) return setError('Select a poster first.')
    const effectiveTitle = title.trim() || 'Untitled draft'

    setSaving(true)
    try {
      if (editingEventId) {
        const res = await fetch('/api/builder/update-event', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_id: editingEventId,
            type: itemType,
            title: effectiveTitle,
            recurrence_mode: itemType === 'recurring_event' ? recurrenceMode : null,
            recurrence_weekday: itemType === 'recurring_event' ? recurrenceWeekday : null,
            recurrence_month_ordinal: itemType === 'recurring_event' && recurrenceMode === 'monthly' ? recurrenceMonthOrdinal : null,
            location,
            description,
            start_at: startAt,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) return setError(friendlyError(data?.error, 'Failed to update event'))
        setMessage('Updated.')
        await loadRows(selectedPosterId)
        await loadUploads()
        return
      }

      if (!selectedPosterId) {
        const manualRes = await fetch('/api/submit/manual-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: effectiveTitle,
            recurrence_mode: itemType === 'recurring_event' ? recurrenceMode : null,
            recurrence_weekday: itemType === 'recurring_event' ? recurrenceWeekday : null,
            recurrence_month_ordinal: itemType === 'recurring_event' && recurrenceMode === 'monthly' ? recurrenceMonthOrdinal : null,
            location,
            description,
            start_at: startAt,
          }),
        })
        const manualData = await manualRes.json().catch(() => ({}))
        if (!manualRes.ok) return setError(friendlyError(manualData?.error, 'Failed to create draft event'))
        setMessage('Saved as draft.')
        resetFormToNew()
        return
      }

      if (!point) return setError('Click image to place a pin for new event.')
      const res = await fetch('/api/builder/create-event-from-poster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poster_upload_id: selectedPosterId,
          bbox: point,
          type: itemType,
          title: effectiveTitle,
          location,
          description,
          start_at: startAt,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return setError(friendlyError(data?.error, 'Failed to create event'))
      setMessage('Saved.')
      setPoint(null)
      resetFormToNew()
      await loadRows(selectedPosterId)
      await loadUploads()
    } finally {
      setSaving(false)
    }
  }

  async function uploadFromCreate() {
    if (!uploadFile) return
    setUploadingPoster(true)
    setError('')
    setMessage('')
    try {
      const resized = await resizeImageForUpload(uploadFile)
      const before = Math.round(uploadFile.size / 1024)
      const after = Math.round(resized.size / 1024)
      console.info(`Upload compression: ${before}KB -> ${after}KB`)

      const signed = await fetch('/api/submit/signed-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_type: 'image/jpeg' }),
      })
      const signedData = await signed.json().catch(() => ({}))
      if (!signed.ok) return setError(friendlyError(signedData?.error, 'Upload failed'))

      const pubUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!pubUrl || !anon) return setError('Missing public Supabase upload config')
      const browserSupabase = createClient(pubUrl, anon)
      const uploadRes = await browserSupabase.storage
        .from('posters')
        .uploadToSignedUrl(String(signedData.path), String(signedData.token), resized)
      if (uploadRes.error) return setError(friendlyError(uploadRes.error.message, 'Upload failed'))

      const finalize = await fetch('/api/submit/finalize-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_path: signedData.path, seen_at_name: seenAtName.trim() || null }),
      })
      const data = await finalize.json().catch(() => ({}))
      if (!finalize.ok) return setError(friendlyError(data?.error, 'Upload failed'))
      fetch('/api/submit/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poster_upload_id: data?.poster_upload_id || data?.id || null }),
      }).catch(() => {})
      const newPosterId = String(data?.poster_upload_id || data?.id || '').trim()
      if (!newPosterId) return setError('Upload succeeded but missing poster ID')
      setMessage('Poster uploaded.')
      setUploadFile(null)
      if (uploadInputRef.current) uploadInputRef.current.value = ''
      await loadUploads()
      await selectPoster(newPosterId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploadingPoster(false)
    }
  }

  async function deleteEventRow(row: PosterEventRow) {
    const choice = prompt('Type "unlink" to remove only this pin link, or "cascade" to delete link + event.', 'unlink')
    if (!choice) return
    const mode = choice.trim().toLowerCase()
    if (mode !== 'unlink' && mode !== 'cascade') return setError('Delete cancelled. Use unlink or cascade.')
    if (!confirm(mode === 'cascade' ? 'Delete link and event?' : 'Remove link only?')) return

    setError('')
    const res = await fetch('/api/builder/delete-poster-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ link_id: row.link_id, mode }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return setError(friendlyError(data?.error, 'Delete failed'))
    if (editingEventId === row.event.id) resetFormToNew()
    setPoint(null)
    await loadRows(selectedPosterId)
    await loadUploads()
  }

  async function markDone() {
    if (!selectedPosterId) return
    const res = await fetch('/api/builder/mark-upload-done', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poster_upload_id: selectedPosterId, is_done: true }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return setError(friendlyError(data?.error, 'Failed to mark done'))
    setSelectedPosterId(null)
    setRows([])
    await loadUploads()
  }

  function getStageMetrics() {
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
  }

  function clampPan(nextPan: { x: number; y: number }, nextZoom = zoom) {
    const m = getStageMetrics()
    if (!m) return nextPan

    const renderedW = m.baseW * nextZoom
    const renderedH = m.baseH * nextZoom
    const offsetScaledX = m.offsetX * nextZoom
    const offsetScaledY = m.offsetY * nextZoom

    let clampedX = nextPan.x
    let clampedY = nextPan.y

    if (renderedW <= m.stageW) {
      clampedX = (m.stageW - renderedW) / 2 - offsetScaledX
    } else {
      const minX = m.stageW - (offsetScaledX + renderedW)
      const maxX = -offsetScaledX
      clampedX = Math.max(minX, Math.min(maxX, clampedX))
    }

    if (renderedH <= m.stageH) {
      clampedY = (m.stageH - renderedH) / 2 - offsetScaledY
    } else {
      const minY = m.stageH - (offsetScaledY + renderedH)
      const maxY = -offsetScaledY
      clampedY = Math.max(minY, Math.min(maxY, clampedY))
    }

    return { x: Number(clampedX.toFixed(1)), y: Number(clampedY.toFixed(1)) }
  }

  useEffect(() => {
    if (!selectedUpload?.public_url) return
    setPan((prev) => clampPan(prev, zoom))
  }, [selectedUpload?.public_url, zoom, stageSize.width, stageSize.height, imageNatural.width, imageNatural.height])

  function centerOnPoint(pointToCenter: { x: number; y: number }, targetZoom = zoom) {
    const m = getStageMetrics()
    if (!m) return
    const panX = m.stageW / 2 - (m.offsetX + pointToCenter.x * m.baseW) * targetZoom
    const panY = m.stageH / 2 - (m.offsetY + pointToCenter.y * m.baseH) * targetZoom
    setZoom(Number(targetZoom.toFixed(2)))
    setPan({ x: Number(panX.toFixed(1)), y: Number(panY.toFixed(1)) })
  }

  function fitToPins() {
    const pins = rows.filter((row) => row.bbox).map((row) => row.bbox!)
    if (pins.length === 0) return
    if (pins.length === 1) {
      centerOnPoint(pins[0], Math.max(1.6, zoom))
      return
    }

    const m = getStageMetrics()
    if (!m) return
    const minX = Math.min(...pins.map((p) => p.x))
    const minY = Math.min(...pins.map((p) => p.y))
    const maxX = Math.max(...pins.map((p) => p.x))
    const maxY = Math.max(...pins.map((p) => p.y))

    const paddingX = 0.08
    const paddingY = 0.08
    const startX = Math.max(0, minX - paddingX)
    const startY = Math.max(0, minY - paddingY)
    const boxWidth = Math.max(0.04, Math.min(1, maxX - minX + paddingX * 2))
    const boxHeight = Math.max(0.04, Math.min(1, maxY - minY + paddingY * 2))

    const boxWpx = boxWidth * m.baseW
    const boxHpx = boxHeight * m.baseH
    const targetZoom = Math.max(1, Math.min(5, Math.min(m.stageW / boxWpx, m.stageH / boxHpx)))
    const centerPoint = {
      x: Math.min(1, startX + boxWidth / 2),
      y: Math.min(1, startY + boxHeight / 2),
    }
    centerOnPoint(centerPoint, targetZoom)
  }

  function centerOnActivePin() {
    const active = rows.find((row) => row.link_id === activeLinkId && row.bbox)?.bbox || point
    if (!active) return
    centerOnPoint(active, Math.max(1.8, zoom))
  }

  async function deletePoster(mode: 'unlink' | 'delete_with_events') {
    if (!selectedPosterId) return
    setDeletingPoster(true)
    setError('')
    setMessage('')
    try {
      const res = await fetch('/api/manage/delete-poster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poster_upload_id: selectedPosterId, mode }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return setError(friendlyError(data?.error, 'Failed to delete poster'))

      setDeleteModalOpen(false)
      setSelectedPosterId(null)
      setRows([])
      setActiveLinkId(null)
      setEditingEventId(null)
      setPoint(null)
      setMessage(mode === 'delete_with_events' ? 'Poster and linked events deleted.' : 'Poster deleted. Linked events were unlinked.')
      await loadUploads()
    } finally {
      setDeletingPoster(false)
    }
  }

  async function handleDeletePosterClick() {
    if (!selectedUpload) return
    const linkedCount = selectedUpload.linked_count ?? selectedUpload.event_count ?? 0
    if (linkedCount === 0) {
      if (!confirm('Delete this poster?')) return
      await deletePoster('unlink')
      return
    }
    setDeleteMode('unlink')
    setDeleteModalOpen(true)
  }

  const needsPinForNew = Boolean(selectedPosterId && !editingEventId)
  const canSubmitItem = !saving && (!needsPinForNew || Boolean(point))

  return (
    <main
      ref={panelsRef}
      style={{
        padding: 16,
        fontFamily: 'sans-serif',
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(3, calc(100vw - 32px))' : '320px minmax(640px, 1fr) 420px',
        gap: 12,
        minHeight: 'calc(100vh - 64px)',
        overflowX: isMobile ? 'auto' : 'visible',
        scrollSnapType: isMobile ? 'x mandatory' : 'none',
      }}
    >
      <section style={{ border: '1px solid #ddd', borderRadius: 10, padding: 10, overflow: 'auto', scrollSnapAlign: isMobile ? 'start' : 'none' }}>
        <h1 style={{ marginTop: 0, marginBottom: 8 }}>Submissions</h1>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, marginBottom: 8 }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              data-variant="secondary"
              onClick={() => uploadInputRef.current?.click()}
              disabled={uploadingPoster}
            >
              {uploadFile ? 'Change photo' : 'Choose file'}
            </button>
            {uploadFile ? <div style={{ fontSize: 12, color: '#166534' }}>Photo selected</div> : null}
            <button onClick={uploadFromCreate} disabled={!uploadFile || uploadingPoster}>
              {uploadingPoster ? 'Uploading...' : 'Upload and select'}
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button data-variant="secondary" onClick={goToNextUntendedPoster}>Next untended poster</button>
              <button data-variant="secondary" onClick={loadUploads}>Refresh</button>
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {uploads.filter((u) => !Boolean(u.is_done) && normalizePosterStatus(u.status) !== POSTER_STATUSES.DONE).map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => selectPoster(u.id)}
              style={{
                border: selectedPosterId === u.id ? '2px solid #2563eb' : '1px solid #e5e7eb',
                borderRadius: 8,
                padding: 8,
                background: '#fff',
                color: '#0f172a',
                display: 'grid',
                gridTemplateColumns: '108px 1fr',
                gap: 10,
                alignItems: 'center',
                textAlign: 'left',
              }}
            >
              {u.public_url ? (
                <img
                  src={u.public_url}
                  alt="Poster thumb"
                  style={{ width: '100%', maxWidth: 108, height: 108, objectFit: 'cover', borderRadius: 6, border: '1px solid #e5e7eb' }}
                />
              ) : (
                <div style={{ width: '100%', maxWidth: 108, height: 108, borderRadius: 6, border: '1px solid #e5e7eb', background: '#f8fafc' }} />
              )}
              <div style={{ minWidth: 0, display: 'grid', gap: 4 }}>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Captured</div>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {formatCaptureHour(u.created_at)}
                </div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Seen at</div>
                <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.seen_at_name || '—'}
                </div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Status / Items</div>
                <div style={{ fontSize: 13 }}>
                  {normalizePosterStatus(u.status)} / {u.linked_count ?? u.event_count ?? 0}
                </div>
              </div>
            </button>
          ))}
          {uploads.length === 0 && <p style={{ opacity: 0.7 }}>No incomplete posters.</p>}
        </div>
      </section>

      <section style={{ border: '1px solid #ddd', borderRadius: 10, padding: 10, display: 'grid', gridTemplateRows: 'auto auto auto auto', minHeight: 0, overflow: 'hidden', scrollSnapAlign: isMobile ? 'start' : 'none' }}>
        <h2 style={{ marginTop: 0 }}>Poster workspace</h2>
        {!selectedUpload?.public_url && <p style={{ opacity: 0.7 }}>{manualMode ? 'Manual mode: no poster selected.' : 'Select a poster from the left list.'}</p>}
        {selectedUpload?.public_url && (
          <>
            <div style={{ minHeight: 64, border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8, alignItems: 'start', marginBottom: 8 }}>
              <div><div style={{ fontSize: 12, opacity: 0.75 }}>Captured</div><div style={{ fontSize: 13 }}>{formatCaptureHour(selectedUpload.created_at)}</div></div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, opacity: 0.75 }}>Seen at</div>
                <input
                  value={seenAtName}
                  onChange={(e) => setSeenAtName(e.target.value)}
                  placeholder="Seen at"
                  style={{ width: '100%', marginTop: 4, padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13 }}
                />
                <button
                  data-variant="secondary"
                  type="button"
                  onClick={saveSeenAt}
                  disabled={!selectedPosterId || savingSeenAt}
                  style={{ marginTop: 6, height: 32, minHeight: 32, padding: '0 10px', fontSize: 12 }}
                >
                  {savingSeenAt ? 'Saving...' : 'Save'}
                </button>
              </div>
              <div><div style={{ fontSize: 12, opacity: 0.75 }}>Status</div><div style={{ fontSize: 13 }}>{normalizePosterStatus(selectedUpload.status)}</div></div>
              <div><div style={{ fontSize: 12, opacity: 0.75 }}>Items</div><div style={{ fontSize: 13 }}>{rows.length}</div></div>
            </div>
              <div style={{ marginBottom: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', alignContent: 'flex-start', minHeight: 40 }}>
              <button data-variant="secondary" style={posterControlButtonStyle} onClick={() => setZoom((z) => Math.max(1, Number((z - 0.2).toFixed(2))))}>Zoom out</button>
              <button data-variant="secondary" style={posterControlButtonStyle} onClick={() => setZoom((z) => Math.min(5, Number((z + 0.2).toFixed(2))))}>Zoom in</button>
              <button data-variant="secondary" style={posterControlButtonStyle} onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}>Reset</button>
              <button data-variant="secondary" style={posterControlButtonStyle} onClick={fitToPins} disabled={rows.filter((r) => r.bbox).length === 0}>Fit-to-pins</button>
              <button data-variant="secondary" style={posterControlButtonStyle} onClick={centerOnActivePin} disabled={!activeLinkId && !point}>Center active pin</button>
            </div>
            <div
              ref={stageRef}
              onMouseDown={(e) => { dragRef.current = { x: e.clientX, y: e.clientY }; didDragRef.current = false }}
              onMouseMove={(e) => {
                if (!dragRef.current) return
                const dx = e.clientX - dragRef.current.x
                const dy = e.clientY - dragRef.current.y
                if (Math.abs(dx) > 2 || Math.abs(dy) > 2) didDragRef.current = true
                setPan((prev) => clampPan({ x: prev.x + dx, y: prev.y + dy }))
                dragRef.current = { x: e.clientX, y: e.clientY }
              }}
              onMouseUp={() => { dragRef.current = null }}
              onMouseLeave={() => { dragRef.current = null }}
              style={{
                position: 'relative',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                overflow: 'hidden',
                width: '100%',
                height: 'clamp(420px, 62vh, 720px)',
                aspectRatio: '16 / 9',
              }}
            >
              <div style={{ position: 'absolute', inset: 0, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'top left' }}>
                <img
                  ref={imageRef}
                  src={selectedUpload.public_url}
                  alt="Poster"
                  onLoad={(e) => {
                    setImageNatural({
                      width: Math.max(1, e.currentTarget.naturalWidth || 1),
                      height: Math.max(1, e.currentTarget.naturalHeight || 1),
                    })
                  }}
                  onClick={(e) => {
                    if (didDragRef.current) {
                      didDragRef.current = false
                      return
                    }
                    const m = getStageMetrics()
                    if (!m) return
                    const rect = e.currentTarget.getBoundingClientRect()
                    const x = (e.clientX - rect.left) / rect.width
                    const y = (e.clientY - rect.top) / rect.height
                    setPoint({ x: Number(Math.max(0, Math.min(1, x)).toFixed(4)), y: Number(Math.max(0, Math.min(1, y)).toFixed(4)) })
                    setActiveLinkId(null)
                    setEditingEventId(null)
                    setInspectorTab('event')
                  }}
                  style={{
                    position: 'absolute',
                    left: `${getStageMetrics()?.offsetX || 0}px`,
                    top: `${getStageMetrics()?.offsetY || 0}px`,
                    width: `${getStageMetrics()?.baseW || 0}px`,
                    height: `${getStageMetrics()?.baseH || 0}px`,
                    objectFit: 'contain',
                    display: 'block',
                  }}
                />
                {rows.filter((row) => row.bbox).map((row) => {
                  const active = activeLinkId === row.link_id
                  return (
                    <button
                      key={row.link_id}
                      type="button"
                      title={row.event.title}
                      onClick={(e) => {
                        e.stopPropagation()
                        startEdit(row)
                      }}
                      style={{
                        position: 'absolute',
                        left: `${(getStageMetrics()?.offsetX || 0) + row.bbox!.x * (getStageMetrics()?.baseW || 0)}px`,
                        top: `${(getStageMetrics()?.offsetY || 0) + row.bbox!.y * (getStageMetrics()?.baseH || 0)}px`,
                        transform: 'translate(-50%, -50%)',
                        width: active ? 16 : 12,
                        height: active ? 16 : 12,
                        borderRadius: 999,
                        background: active ? '#ef4444' : '#22c55e',
                        border: '2px solid #fff',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                        cursor: 'pointer',
                      }}
                    />
                  )
                })}
                {!editingEventId && point && (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${(getStageMetrics()?.offsetX || 0) + point.x * (getStageMetrics()?.baseW || 0)}px`,
                      top: `${(getStageMetrics()?.offsetY || 0) + point.y * (getStageMetrics()?.baseH || 0)}px`,
                      transform: 'translate(-50%, -50%)',
                      width: 14,
                      height: 14,
                      borderRadius: 999,
                      background: '#ef4444',
                      border: '2px solid #fff',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                    }}
                  />
                )}
              </div>
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <button onClick={markDone}>Mark Done</button>
              <button data-variant="danger" onClick={handleDeletePosterClick}>Delete poster...</button>
            </div>
          </>
        )}
      </section>

      <section style={{ border: '1px solid #ddd', borderRadius: 10, padding: 10, overflow: 'auto', scrollSnapAlign: isMobile ? 'start' : 'none' }}>
        <h2 style={{ marginTop: 0 }}>Inspector</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          {!selectedPosterId && <p style={{ margin: 0, opacity: 0.75 }}>Select a submission to begin.</p>}
          {selectedPosterId && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setInspectorTab('event')}
                  style={{
                    border: inspectorTab === 'event' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    borderRadius: 8,
                    padding: '8px 10px',
                    background: inspectorTab === 'event' ? '#eff6ff' : '#fff',
                    fontWeight: 600,
                    color: '#0f172a',
                  }}
                >
                  Item
                </button>
                <button
                  type="button"
                  onClick={() => setInspectorTab('business')}
                  style={{
                    border: inspectorTab === 'business' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    borderRadius: 8,
                    padding: '8px 10px',
                    background: inspectorTab === 'business' ? '#eff6ff' : '#fff',
                    fontWeight: 600,
                    color: '#0f172a',
                  }}
                >
                  Business/Service
                </button>
                <button
                  type="button"
                  onClick={() => setInspectorTab('posterMeta')}
                  style={{
                    border: inspectorTab === 'posterMeta' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    borderRadius: 8,
                    padding: '8px 10px',
                    background: inspectorTab === 'posterMeta' ? '#eff6ff' : '#fff',
                    fontWeight: 600,
                    color: '#0f172a',
                  }}
                >
                  Poster meta
                </button>
              </div>
              <div>
                <h3 style={{ margin: '6px 0 8px 0' }}>{editingEventId ? 'Edit item' : 'New item'}</h3>
              </div>
            </>
          )}
          {error && <p style={{ color: 'crimson', margin: 0 }}>{error}</p>}
          {message && <p style={{ margin: 0 }}>{message}</p>}
          {selectedPosterId && inspectorTab === 'posterMeta' && (
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 10 }}>
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Captured</div>
                <div>{formatCaptureHour(selectedUpload?.created_at || null)}</div>
                <p style={{ margin: 0, opacity: 0.75 }}>Edit poster metadata in the Poster workspace section above the image.</p>
              </div>
            </div>
          )}
          {selectedPosterId && inspectorTab === 'business' && (
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 10 }}>
              <p style={{ margin: 0, opacity: 0.75 }}>Business/Service editor is coming soon. Use Event tab for now.</p>
            </div>
          )}
          {selectedPosterId && inspectorTab === 'event' && (
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 10 }}>
              <div style={{ display: 'grid', gap: 8 }}>
                <label style={{ display: 'grid', gap: 4 }}>
                  <span style={{ fontSize: 12, opacity: 0.8 }}>Item type</span>
                  <select value={itemType} onChange={(e) => setItemType(e.target.value as typeof itemType)} style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }}>
                    <option value="event">event</option>
                    <option value="recurring_event">recurring event</option>
                    <option value="class_program">class/program</option>
                    <option value="business_service">business/service</option>
                    <option value="opportunity">opportunity</option>
                    <option value="announcement">announcement</option>
                  </select>
                </label>
                <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>Item details</div>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
                <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Description" style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8, resize: 'vertical' }} />
                {isTimeBoundType(itemType) ? (
                  <input type="datetime-local" step={1800} value={startAt} onChange={(e) => setStartAt(e.target.value)} style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
                ) : null}
                {itemType === 'recurring_event' ? (
                  <div style={{ display: 'grid', gap: 8, border: '1px solid #e5e7eb', borderRadius: 8, padding: 10 }}>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>Recurring cadence</div>
                    <select value={recurrenceMode} onChange={(e) => setRecurrenceMode(e.target.value as typeof recurrenceMode)} style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }}>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                    {recurrenceMode === 'monthly' ? (
                      <select value={recurrenceMonthOrdinal} onChange={(e) => setRecurrenceMonthOrdinal(e.target.value as typeof recurrenceMonthOrdinal)} style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }}>
                        <option value="first">First</option>
                        <option value="second">Second</option>
                        <option value="third">Third</option>
                        <option value="fourth">Fourth</option>
                      </select>
                    ) : null}
                    <select value={recurrenceWeekday} onChange={(e) => setRecurrenceWeekday(e.target.value as typeof recurrenceWeekday)} style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }}>
                      <option value="monday">Monday</option>
                      <option value="tuesday">Tuesday</option>
                      <option value="wednesday">Wednesday</option>
                      <option value="thursday">Thursday</option>
                      <option value="friday">Friday</option>
                      <option value="saturday">Saturday</option>
                      <option value="sunday">Sunday</option>
                    </select>
                  </div>
                ) : null}
                {!editingEventId && !point ? <p style={{ margin: 0, color: '#92400e', fontSize: 13 }}>Click the poster to place a pin.</p> : null}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={saveEvent} disabled={!canSubmitItem}>{saving ? 'Saving...' : editingEventId ? 'Save changes' : 'Add item'}</button>
                  {(editingEventId || point) && <button data-variant="secondary" onClick={() => { resetFormToNew(); setPoint(null) }}>Cancel</button>}
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <h3 style={{ margin: '6px 0 8px 0' }}>Items on this poster</h3>
                {rows.length === 0 ? (
                  <p style={{ opacity: 0.75, margin: 0 }}>No items yet. Click image to add a new pin and item.</p>
                ) : (
                  <div style={{ display: 'grid', gap: 8, maxHeight: 260, overflow: 'auto' }}>
                    {rows.map((row) => {
                      const parsedStart = new Date(row.event.start_at)
                      const startLabel = Number.isNaN(parsedStart.getTime()) ? 'No date/time yet' : parsedStart.toLocaleString()
                      const recurrenceLabel = row.event.item_type === 'recurring_event'
                        ? `${row.event.recurrence_mode === 'monthly' ? (row.event.recurrence_month_ordinal || 'first') : 'weekly'} ${row.event.recurrence_weekday || 'monday'}`
                        : null
                      return (
                        <div key={row.link_id} style={{ border: activeLinkId === row.link_id ? '2px solid #ef4444' : '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}>
                          <button
                            type="button"
                            onClick={() => startEdit(row)}
                            style={{ textAlign: 'left', border: 'none', padding: 0, background: 'transparent', width: '100%', color: '#0f172a' }}
                          >
                            <div style={{ fontWeight: 600 }}>{row.event.title || '(Draft item)'}</div>
                            <div style={{ fontSize: 12, opacity: 0.85 }}>
                              {startLabel} • {(row.event.item_type || 'event').replaceAll('_', ' ')} • {statusLabel(row.event.status)}
                            </div>
                            {recurrenceLabel ? <div style={{ fontSize: 12, opacity: 0.75 }}>Cadence: {recurrenceLabel}</div> : null}
                          </button>
                          <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                            <button data-variant="secondary" onClick={() => startEdit(row)}>Edit</button>
                            <button data-variant="danger" onClick={() => deleteEventRow(row)}>Delete</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {deleteModalOpen && selectedUpload && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.45)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 50,
            padding: 16,
          }}
          onClick={() => !deletingPoster && setDeleteModalOpen(false)}
        >
          <div
            style={{ background: '#fff', width: '100%', maxWidth: 520, borderRadius: 12, border: '1px solid #e5e7eb', padding: 14 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 10px 0' }}>Delete poster</h3>
            <div style={{ fontSize: 14, marginBottom: 8 }}>
              <div>Created: {new Date(selectedUpload.created_at).toLocaleString()}</div>
              {selectedUpload.seen_at_name ? <div>Seen at: {selectedUpload.seen_at_name}</div> : null}
              <div>Linked events: {selectedUpload.linked_count ?? selectedUpload.event_count ?? 0}</div>
            </div>
            <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <input
                  type="radio"
                  name="delete_mode"
                  checked={deleteMode === 'unlink'}
                  onChange={() => setDeleteMode('unlink')}
                />
                <span>
                  <strong>Delete poster only</strong>
                  <br />
                  Unlink linked events and keep events.
                </span>
              </label>
              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <input
                  type="radio"
                  name="delete_mode"
                  checked={deleteMode === 'delete_with_events'}
                  onChange={() => setDeleteMode('delete_with_events')}
                />
                <span>
                  <strong>Delete poster + linked events</strong>
                  <br />
                  Remove this poster and all events linked from it.
                </span>
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button data-variant="secondary" onClick={() => setDeleteModalOpen(false)} disabled={deletingPoster}>Cancel</button>
              <button data-variant="danger" onClick={() => deletePoster(deleteMode)} disabled={deletingPoster}>
                {deletingPoster ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
