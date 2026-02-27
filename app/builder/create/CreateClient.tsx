'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { POSTER_STATUSES, eventStatusLabel, posterStatusLabel, normalizePosterStatus } from '@/lib/statuses'
import { ITEM_TYPES, type ItemType, normalizeItemType } from '@/lib/itemTypes'
import { createClient } from '@supabase/supabase-js'
import PosterMetaStrip from '@/app/components/poster/PosterMetaStrip'
import PosterItemsList from '@/app/components/poster/PosterItemsList'
import ItemCard from '@/app/components/poster/ItemCard'
import PosterImageViewer from '@/app/components/poster/PosterImageViewer'

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

type ItemFormState = {
  title: string
  itemType: ItemType
  recurrenceMode: 'weekly' | 'monthly'
  recurrenceWeekday: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
  recurrenceMonthOrdinal: 'first' | 'second' | 'third' | 'fourth'
  location: string
  description: string
  startAt: string
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
  return eventStatusLabel(statusValue)
}

function isTimeBoundType(type: string) {
  return type === 'event' || type === 'recurring_event' || type === 'class_program'
}

function friendlyError(message: string | undefined, fallback: string) {
  const raw = message || ''
  const msg = raw.toLowerCase()
  if (raw) console.error('[builder/create] API error:', raw)
  if (msg.includes('enum')) return 'Status value is not supported by this environment yet.'
  if (msg.includes('seen_at_name') || msg.includes('42703') || msg.includes('schema cache') || msg.includes('column')) {
    return 'Database schema is out of date for this action. Run /api/health/schema to inspect missing columns.'
  }
  return message || fallback
}

function getNewItemFormState(): ItemFormState {
  return {
    title: '',
    itemType: 'event',
    recurrenceMode: 'weekly',
    recurrenceWeekday: 'monday',
    recurrenceMonthOrdinal: 'first',
    location: '',
    description: '',
    startAt: defaultStartAt2pmLocal(),
  }
}

function getFormFingerprint(form: ItemFormState) {
  return JSON.stringify(form)
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
  const [itemType, setItemType] = useState<ItemType>('event')
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
  const [schemaStatus, setSchemaStatus] = useState('')
  const [formBaseline, setFormBaseline] = useState(() => getFormFingerprint(getNewItemFormState()))
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

  function getCurrentFormState(): ItemFormState {
    return {
      title,
      itemType,
      recurrenceMode,
      recurrenceWeekday,
      recurrenceMonthOrdinal,
      location,
      description,
      startAt,
    }
  }

  function applyFormState(form: ItemFormState) {
    setTitle(form.title)
    setItemType(form.itemType)
    setRecurrenceMode(form.recurrenceMode)
    setRecurrenceWeekday(form.recurrenceWeekday)
    setRecurrenceMonthOrdinal(form.recurrenceMonthOrdinal)
    setLocation(form.location)
    setDescription(form.description)
    setStartAt(form.startAt)
  }

  function setFormBaselineTo(form: ItemFormState) {
    setFormBaseline(getFormFingerprint(form))
  }

  function setFormBaselineToCurrent() {
    setFormBaseline(getFormFingerprint(getCurrentFormState()))
  }

  const isFormDirty = getFormFingerprint(getCurrentFormState()) !== formBaseline

  function shouldDiscardUnsavedChanges(nextAction: string) {
    if (!isFormDirty) return true
    return confirm(`You have unsaved item changes. ${nextAction} and discard them?`)
  }

  function rowToFormState(row: PosterEventRow): ItemFormState {
    return {
      title: row.event.title || '',
      itemType: normalizeItemType(row.event.item_type, 'event'),
      recurrenceMode: row.event.recurrence_mode || 'weekly',
      recurrenceWeekday: (row.event.recurrence_weekday as ItemFormState['recurrenceWeekday']) || 'monday',
      recurrenceMonthOrdinal: (row.event.recurrence_month_ordinal as ItemFormState['recurrenceMonthOrdinal']) || 'first',
      location: row.event.location || '',
      description: row.event.description || '',
      startAt: toDateTimeLocal(row.event.start_at),
    }
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
    if (process.env.NODE_ENV === 'production') return
    let cancelled = false
    const run = async () => {
      try {
        const res = await fetch('/api/health/schema')
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (res.ok) setSchemaStatus('Schema OK')
        else {
          const missing = Array.isArray(data?.missing) ? data.missing.join(', ') : 'poster_uploads.seen_at_name'
          setSchemaStatus(`Schema missing: ${missing} (run migration)`)
        }
      } catch {
        if (!cancelled) setSchemaStatus('Schema check unavailable')
      }
    }
    run()
    return () => {
      cancelled = true
    }
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
    if (posterId !== selectedPosterId && !shouldDiscardUnsavedChanges('Switch posters')) return
    const upload = uploads.find((u) => u.id === posterId) || null
    const nextForm = getNewItemFormState()
    setSelectedPosterId(posterId)
    setError('')
    setMessage('')
    setActiveLinkId(null)
    setEditingEventId(null)
    setPoint(null)
    applyFormState(nextForm)
    setFormBaselineTo(nextForm)
    setSeenAtName(upload?.seen_at_name || '')
    setZoom(1)
    setPan({ x: 0, y: 0 })
    await loadRows(posterId)
    if (isMobile && panelsRef.current) {
      panelsRef.current.scrollTo({ left: panelsRef.current.clientWidth, behavior: 'smooth' })
    }
  }

  function startEdit(row: PosterEventRow) {
    if (editingEventId === row.event.id && activeLinkId === row.link_id) {
      setInspectorTab('event')
      return
    }
    if (!shouldDiscardUnsavedChanges('Switch items')) return
    const nextForm = rowToFormState(row)
    setEditingEventId(row.event.id)
    setActiveLinkId(row.link_id)
    setPoint(null)
    applyFormState(nextForm)
    setFormBaselineTo(nextForm)
    setSeenAtName(selectedUpload?.seen_at_name || '')
    setInspectorTab('event')
    if (isMobile && panelsRef.current) {
      panelsRef.current.scrollTo({ left: panelsRef.current.clientWidth * 2, behavior: 'smooth' })
    }
  }

  function resetFormToNew() {
    const nextForm = getNewItemFormState()
    setEditingEventId(null)
    setActiveLinkId(null)
    applyFormState(nextForm)
    setFormBaselineTo(nextForm)
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
        setFormBaselineToCurrent()
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
      setMessage('Saved. Place another pin to add another item.')
      setPoint(null)
      setFormBaselineToCurrent()
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
      className="cb-page-container"
      data-testid="builder-create-panels"
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(3, calc(100vw - 32px))' : 'minmax(260px, 280px) minmax(0, 1fr) minmax(320px, 360px)',
        gap: 16,
        minHeight: 'calc(100vh - 64px)',
        overflowX: isMobile ? 'auto' : 'hidden',
        scrollSnapType: isMobile ? 'x mandatory' : 'none',
      }}
    >
      <section data-testid="builder-panel-submissions" className="cb-panel" style={{ minWidth: 0, overflow: 'auto', scrollSnapAlign: isMobile ? 'start' : 'none' }}>
        <h1 className="cb-section-header" style={{ marginTop: 0, marginBottom: 8 }}>Submissions</h1>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <a
            href="/builder/create"
            className="cb-tab-button cb-tab-button-active"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            Create drafts
          </a>
          <a
            href="/builder/tend"
            className="cb-tab-button"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            Pin to board
          </a>
        </div>
        {process.env.NODE_ENV !== 'production' && schemaStatus ? (
          <p className="cb-muted-text" style={{ margin: '0 0 8px 0' }}>{schemaStatus}</p>
        ) : null}
        <div className="cb-surface" style={{ padding: 10, marginBottom: 10 }}>
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
            {uploadFile ? <div className="cb-muted-text">Photo selected</div> : null}
            <button onClick={uploadFromCreate} disabled={!uploadFile || uploadingPoster}>
              {uploadingPoster ? 'Uploading...' : 'Upload and select'}
            </button>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button data-variant="secondary" onClick={goToNextUntendedPoster}>Next untended poster</button>
              <button data-variant="secondary" onClick={loadUploads}>Refresh</button>
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {uploads.filter((u) => !Boolean(u.is_done) && normalizePosterStatus(u.status) !== POSTER_STATUSES.DONE).map((u) => (
            <ItemCard
              key={u.id}
              onClick={() => selectPoster(u.id)}
              selected={selectedPosterId === u.id}
              title={formatCaptureHour(u.created_at)}
              subtitle={`Status: ${posterStatusLabel(u.status)}`}
              location={`Seen at: ${u.seen_at_name || '—'}`}
              status={`Items: ${u.linked_count ?? u.event_count ?? 0}`}
            >
              {u.public_url ? (
                <img
                  src={u.public_url}
                  alt="Poster thumb"
                  style={{ width: '100%', height: 112, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }}
                />
              ) : null}
            </ItemCard>
          ))}
          {uploads.length === 0 && <p className="cb-muted-text" style={{ margin: 0 }}>No incomplete posters.</p>}
        </div>
      </section>

      <section
        data-testid="builder-panel-workspace"
        className="cb-panel"
        style={{
          minWidth: 0,
          overflow: 'hidden',
          minHeight: 'clamp(560px, 78vh, 920px)',
          display: 'grid',
          gridTemplateRows: 'auto auto 1fr',
          gap: 8,
          scrollSnapAlign: isMobile ? 'start' : 'none',
        }}
      >
        <h2 className="cb-section-header">Poster workspace</h2>
        {!selectedUpload?.public_url && <p className="cb-muted-text">{manualMode ? 'Manual mode: no poster selected.' : 'Select a poster from the left list.'}</p>}
        {selectedUpload?.public_url && (
          <>
            <PosterMetaStrip
              items={[
                { label: 'Captured', value: formatCaptureHour(selectedUpload.created_at) },
                {
                  label: 'Seen at',
                  value: (
                    <div style={{ minWidth: 0 }}>
                      <input
                        value={seenAtName}
                        onChange={(e) => setSeenAtName(e.target.value)}
                        placeholder="Seen at"
                        style={{ width: '100%', marginTop: 4, padding: '6px 8px' }}
                      />
                      <button
                        data-variant="secondary"
                        type="button"
                        onClick={saveSeenAt}
                        disabled={!selectedPosterId || savingSeenAt}
                        style={{ marginTop: 6, height: 32, minHeight: 32, padding: '0 10px' }}
                      >
                        {savingSeenAt ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  ),
                },
                { label: 'Status', value: posterStatusLabel(selectedUpload.status) },
                { label: 'Items', value: rows.length },
              ]}
            />
            <PosterImageViewer
              controls={(
                <>
                  <button data-variant="secondary" style={posterControlButtonStyle} onClick={() => setZoom((z) => Math.max(1, Number((z - 0.2).toFixed(2))))}>Zoom -</button>
                  <button data-variant="secondary" style={posterControlButtonStyle} onClick={() => setZoom((z) => Math.min(5, Number((z + 0.2).toFixed(2))))}>Zoom +</button>
                  <button data-variant="secondary" style={posterControlButtonStyle} onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}>Reset</button>
                  <button data-variant="secondary" style={posterControlButtonStyle} onClick={fitToPins} disabled={rows.filter((r) => r.bbox).length === 0}>Fit to pinned items</button>
                  <button data-variant="secondary" style={posterControlButtonStyle} onClick={centerOnActivePin} disabled={!activeLinkId && !point}>Center selected</button>
                </>
              )}
              footer={(
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={markDone}>Mark Done</button>
                  <button data-variant="danger" onClick={handleDeletePosterClick}>Delete poster...</button>
                </div>
              )}
            >
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
                  width: '100%',
                  maxWidth: '100%',
                  minWidth: 0,
                  border: '1px solid #e5e7eb',
                  borderRadius: 10,
                  overflow: 'hidden',
                  minHeight: 320,
                  height: '100%',
                  background: '#f8fafc',
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
                      if (editingEventId && !shouldDiscardUnsavedChanges('Start a new item')) return
                      const m = getStageMetrics()
                      if (!m) return
                      const rect = e.currentTarget.getBoundingClientRect()
                      const x = (e.clientX - rect.left) / rect.width
                      const y = (e.clientY - rect.top) / rect.height
                      setPoint({ x: Number(Math.max(0, Math.min(1, x)).toFixed(4)), y: Number(Math.max(0, Math.min(1, y)).toFixed(4)) })
                      setActiveLinkId(null)
                      setEditingEventId(null)
                      if (editingEventId) setFormBaselineToCurrent()
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
            </PosterImageViewer>
          </>
        )}
      </section>

      <section data-testid="builder-panel-inspector" className="cb-panel" style={{ minWidth: 0, overflow: 'auto', scrollSnapAlign: isMobile ? 'start' : 'none' }}>
        <h2 className="cb-section-header" style={{ marginTop: 0, marginBottom: 8 }}>Inspector</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          {!selectedPosterId && <p className="cb-muted-text" style={{ margin: 0 }}>Select a submission to begin.</p>}
          {selectedPosterId && (
            <>
              <div className="cb-surface" style={{ padding: 8 }}>
                <div className="cb-section-tabs">
                  <button
                    type="button"
                    className={inspectorTab === 'event' ? 'cb-tab-button cb-tab-button-active' : 'cb-tab-button'}
                    onClick={() => setInspectorTab('event')}
                  >
                    Item
                  </button>
                  <button
                    type="button"
                    className={inspectorTab === 'business' ? 'cb-tab-button cb-tab-button-active' : 'cb-tab-button'}
                    onClick={() => setInspectorTab('business')}
                  >
                    Business/Service
                  </button>
                  <button
                    type="button"
                    className={inspectorTab === 'posterMeta' ? 'cb-tab-button cb-tab-button-active' : 'cb-tab-button'}
                    onClick={() => setInspectorTab('posterMeta')}
                  >
                    Poster meta
                  </button>
                </div>
              </div>
              <div className="cb-surface" style={{ padding: 10 }}>
                <h3 style={{ margin: '6px 0 8px 0' }}>{editingEventId ? 'Edit item' : 'New item'}</h3>
              </div>
            </>
          )}
          {error && (
            <p style={{ color: 'crimson', margin: 0 }}>
              {error}{' '}
              <a href="/api/health/schema" target="_blank" rel="noreferrer" style={{ color: '#991b1b', textDecoration: 'underline' }}>
                Check schema health
              </a>
            </p>
          )}
          {message && <p style={{ margin: 0 }}>{message}</p>}
          {selectedPosterId && inspectorTab === 'posterMeta' && (
            <div className="cb-surface" style={{ padding: 12 }}>
              <div style={{ display: 'grid', gap: 8 }}>
                <div className="cb-meta-label">Captured</div>
                <div>{formatCaptureHour(selectedUpload?.created_at || null)}</div>
                <p className="cb-muted-text" style={{ margin: 0 }}>Edit poster metadata in the Poster workspace section above the image.</p>
              </div>
            </div>
          )}
          {selectedPosterId && inspectorTab === 'business' && (
            <div className="cb-surface" style={{ padding: 12 }}>
              <p className="cb-muted-text" style={{ margin: 0 }}>Business/Service editor is coming soon. Use Event tab for now.</p>
            </div>
          )}
          {selectedPosterId && inspectorTab === 'event' && (
            <div className="cb-surface" style={{ padding: 12 }}>
              <div style={{ display: 'grid', gap: 8 }}>
                <label style={{ display: 'grid', gap: 4 }}>
                  <span className="cb-meta-label">Item type</span>
                  <select value={itemType} onChange={(e) => setItemType(normalizeItemType(e.target.value, 'event'))}>
                    {ITEM_TYPES.map((type) => (
                      <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>
                    ))}
                  </select>
                </label>
                <div className="cb-meta-label" style={{ marginTop: 2 }}>Item details</div>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
                <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" />
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Description" style={{ resize: 'vertical' }} />
                {isTimeBoundType(itemType) ? (
                  <input type="datetime-local" step={1800} value={startAt} onChange={(e) => setStartAt(e.target.value)} />
                ) : null}
                {itemType === 'recurring_event' ? (
                  <div style={{ display: 'grid', gap: 8, border: '1px solid #e5e7eb', borderRadius: 8, padding: 10 }}>
                    <div className="cb-meta-label">Recurring cadence</div>
                    <select value={recurrenceMode} onChange={(e) => setRecurrenceMode(e.target.value as typeof recurrenceMode)}>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                    {recurrenceMode === 'monthly' ? (
                      <select value={recurrenceMonthOrdinal} onChange={(e) => setRecurrenceMonthOrdinal(e.target.value as typeof recurrenceMonthOrdinal)}>
                        <option value="first">First</option>
                        <option value="second">Second</option>
                        <option value="third">Third</option>
                        <option value="fourth">Fourth</option>
                      </select>
                    ) : null}
                    <select value={recurrenceWeekday} onChange={(e) => setRecurrenceWeekday(e.target.value as typeof recurrenceWeekday)}>
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
                {!editingEventId && !point ? <p className="cb-muted-text" style={{ margin: 0 }}>Click the poster to place a pin.</p> : null}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={saveEvent} disabled={!canSubmitItem}>{saving ? 'Saving...' : editingEventId ? 'Save changes' : 'Add item'}</button>
                  {(editingEventId || point || isFormDirty) && <button data-variant="secondary" onClick={() => { resetFormToNew(); setPoint(null) }}>Cancel</button>}
                </div>
              </div>
              <PosterItemsList title="Items on this poster" maxHeight={260}>
                {rows.length === 0 ? (
                  <p className="cb-muted-text" style={{ margin: 0 }}>No items yet. Click image to add a new pin and item.</p>
                ) : (
                  rows.map((row) => {
                    const parsedStart = new Date(row.event.start_at)
                    const startLabel = Number.isNaN(parsedStart.getTime()) ? 'No date/time yet' : parsedStart.toLocaleString()
                    const recurrenceLabel = row.event.item_type === 'recurring_event'
                      ? `${row.event.recurrence_mode === 'monthly' ? (row.event.recurrence_month_ordinal || 'first') : 'weekly'} ${row.event.recurrence_weekday || 'monday'}`
                      : null
                    return (
                      <ItemCard
                        key={row.link_id}
                        selected={activeLinkId === row.link_id}
                        title={row.event.title || '(Draft item)'}
                        subtitle={`${startLabel} • ${(row.event.item_type || 'event').replaceAll('_', ' ')}`}
                        status={statusLabel(row.event.status)}
                        onClick={() => startEdit(row)}
                        location={row.event.location ? `Location: ${row.event.location}` : 'Location: —'}
                      >
                        {recurrenceLabel ? <div className="cb-muted-text" style={{ marginBottom: 6 }}>Cadence: {recurrenceLabel}</div> : null}
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button data-variant="secondary" onClick={(e) => { e.stopPropagation(); startEdit(row) }}>Edit</button>
                          <button data-variant="danger" onClick={(e) => { e.stopPropagation(); deleteEventRow(row) }}>Delete</button>
                        </div>
                      </ItemCard>
                    )
                  })
                )}
              </PosterItemsList>
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
            className="cb-panel"
            style={{ width: '100%', maxWidth: 520, padding: 14 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 10px 0' }}>Delete poster</h3>
            <div style={{ marginBottom: 8 }}>
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
