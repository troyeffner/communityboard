'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { ITEM_TYPES, type ItemType, normalizeItemType } from '@/lib/itemTypes'
import { POSTER_STATUSES, eventStatusLabel, posterStatusLabel, normalizePosterStatus } from '@/lib/statuses'
import { BoardHeader, BoardLayout } from '@/app/components/layout/BoardLayout'
import { Panel } from '@/app/components/layout/Panel'
import { PosterDetailsList, PosterDetailsRail } from '@/app/components/layout/RightRail'

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

type Poster = Upload

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
    return 'Required database fields are unavailable in this environment. Verify /api/health/schema.'
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

export default function CreateClient({
  initialPosterId,
  initialManualMode = false,
}: {
  initialPosterId: string | null
  initialManualMode?: boolean
}) {
  const manualMode = initialManualMode

  const [uploads, setUploads] = useState<Upload[]>([])
  const [selectedPoster, setSelectedPoster] = useState<Poster | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [rows, setRows] = useState<PosterEventRow[]>([])
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
  const dragRef = useRef<{ x: number; y: number } | null>(null)
  const didDragRef = useRef(false)
  const [imageNatural, setImageNatural] = useState({ width: 1, height: 1 })
  const [stageSize, setStageSize] = useState({ width: 1, height: 1 })

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteMode, setDeleteMode] = useState<'unlink' | 'delete_with_events'>('unlink')
  const [deletingPoster, setDeletingPoster] = useState(false)
  const [savingSeenAt, setSavingSeenAt] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [formBaseline, setFormBaseline] = useState(() => getFormFingerprint(getNewItemFormState()))

  useEffect(() => {
    document.title = 'Create posters'
  }, [])

  const selectedRow = useMemo(() => rows.find((row) => row.link_id === selectedItemId) || null, [rows, selectedItemId])
  const editingEventId = selectedRow?.event.id || null

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
    if (!res.ok) {
      setError(friendlyError(data?.error, 'Failed to load posters'))
      return [] as Upload[]
    }
    const nextUploads = (data.uploads || []) as Upload[]
    setUploads(nextUploads)
    setSelectedPoster((prev) => {
      if (!prev) return prev
      return nextUploads.find((u) => u.id === prev.id) || null
    })
    return nextUploads
  }

  async function loadRows(posterId: string | null) {
    if (!posterId) {
      setRows([])
      return
    }
    const res = await fetch(`/api/manage/poster-events?poster_upload_id=${encodeURIComponent(posterId)}`)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(friendlyError(data?.error, 'Failed to load items on poster'))
      return
    }
    setRows((data.rows || []) as PosterEventRow[])
  }

  async function selectPosterById(posterId: string, sourceUploads?: Upload[]) {
    if (selectedPoster?.id !== posterId && !shouldDiscardUnsavedChanges('Switch posters')) return
    const from = sourceUploads || uploads
    const poster = from.find((u) => u.id === posterId) || null
    const nextForm = getNewItemFormState()

    setSelectedPoster(poster)
    setSelectedItemId(null)
    setPoint(null)
    setError('')
    setMessage('')
    setZoom(1)
    setPan({ x: 0, y: 0 })
    applyFormState(nextForm)
    setFormBaselineTo(nextForm)
    setSeenAtName(poster?.seen_at_name || '')
    await loadRows(posterId)
  }

  useEffect(() => {
    loadUploads().then((nextUploads) => {
      if (!initialPosterId) return
      const exists = nextUploads.find((u) => u.id === initialPosterId)
      if (exists) selectPosterById(exists.id, nextUploads)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!manualMode) return
    try {
      const savedSeenAt = window.localStorage.getItem('submit_seen_at_name') || ''
      if (savedSeenAt && !seenAtName) setSeenAtName(savedSeenAt)
    } catch {
      // ignore localStorage failures
    }
  }, [manualMode, seenAtName])

  useEffect(() => {
    if (!stageRef.current) return
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect
      if (!box) return
      setStageSize({ width: box.width || 1, height: box.height || 1 })
    })
    observer.observe(stageRef.current)
    return () => observer.disconnect()
  }, [selectedPoster?.id])

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
  }, [stageSize.width, stageSize.height, imageNatural.width, imageNatural.height])

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

  useEffect(() => {
    if (!selectedPoster?.public_url) return
    setPan((prev) => clampPan(prev, zoom))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPoster?.public_url, zoom, stageSize.width, stageSize.height, imageNatural.width, imageNatural.height])

  function centerOnPoint(pointToCenter: { x: number; y: number }, targetZoom = zoom) {
    const panX = stageMetrics.stageW / 2 - (stageMetrics.offsetX + pointToCenter.x * stageMetrics.baseW) * targetZoom
    const panY = stageMetrics.stageH / 2 - (stageMetrics.offsetY + pointToCenter.y * stageMetrics.baseH) * targetZoom
    setZoom(Number(targetZoom.toFixed(2)))
    setPan({ x: Number(panX.toFixed(1)), y: Number(panY.toFixed(1)) })
  }

  function fitToItems() {
    const pins = rows.filter((row) => row.bbox).map((row) => row.bbox!)
    if (pins.length === 0) return
    if (pins.length === 1) {
      centerOnPoint(pins[0], Math.max(1.6, zoom))
      return
    }

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

    const boxWpx = boxWidth * stageMetrics.baseW
    const boxHpx = boxHeight * stageMetrics.baseH
    const targetZoom = Math.max(1, Math.min(5, Math.min(stageMetrics.stageW / boxWpx, stageMetrics.stageH / boxHpx)))
    centerOnPoint({ x: Math.min(1, startX + boxWidth / 2), y: Math.min(1, startY + boxHeight / 2) }, targetZoom)
  }

  function centerSelected() {
    const active = rows.find((row) => row.link_id === selectedItemId && row.bbox)?.bbox || point
    if (!active) return
    centerOnPoint(active, Math.max(1.8, zoom))
  }

  function startEdit(row: PosterEventRow) {
    if (selectedItemId === row.link_id) return
    if (!shouldDiscardUnsavedChanges('Switch items')) return
    const nextForm = rowToFormState(row)
    setSelectedItemId(row.link_id)
    setPoint(null)
    applyFormState(nextForm)
    setFormBaselineTo(nextForm)
    setSeenAtName(selectedPoster?.seen_at_name || '')
  }

  function resetFormToNew() {
    const nextForm = getNewItemFormState()
    setSelectedItemId(null)
    setPoint(null)
    applyFormState(nextForm)
    setFormBaselineTo(nextForm)
  }

  async function saveSeenAt() {
    if (!selectedPoster?.id || !seenAtName.trim()) return true
    setSavingSeenAt(true)
    try {
      const res = await fetch('/api/manage/update-poster', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poster_upload_id: selectedPoster.id, seen_at_name: seenAtName }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(friendlyError(data?.error, 'Failed to save Found at'))
        return false
      }
      try {
        window.localStorage.setItem('submit_seen_at_name', seenAtName.trim())
      } catch {
        // ignore localStorage failures
      }
      const nextUploads = await loadUploads()
      if (selectedPoster) {
        const refreshed = nextUploads.find((u) => u.id === selectedPoster.id) || null
        setSelectedPoster(refreshed)
      }
      return true
    } finally {
      setSavingSeenAt(false)
    }
  }

  async function saveEvent() {
    setError('')
    setMessage('')

    if (isTimeBoundType(itemType) && !startAt.trim()) {
      setError('Start time is required for this item type.')
      return
    }

    if (!selectedPoster) {
      setError('Select a poster and place a pin before saving.')
      return
    }

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
        if (!res.ok) {
          setError(friendlyError(data?.error, 'Failed to update item'))
          return
        }
        setMessage('Updated.')
        await loadRows(selectedPoster?.id || null)
        await loadUploads()
        setFormBaselineToCurrent()
        return
      }

      if (!point) {
        setError('Click the poster to place a pin before saving.')
        return
      }

      const res = await fetch('/api/builder/create-event-from-poster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poster_upload_id: selectedPoster.id,
          bbox: point,
          type: itemType,
          title: effectiveTitle,
          location,
          description,
          start_at: startAt,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(friendlyError(data?.error, 'Failed to create item'))
        return
      }

      setMessage('Saved. Place another pin to add another item.')
      setPoint(null)
      setFormBaselineToCurrent()
      await loadRows(selectedPoster.id)
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
      const signed = await fetch('/api/submit/signed-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_type: 'image/jpeg' }),
      })
      const signedData = await signed.json().catch(() => ({}))
      if (!signed.ok) {
        setError(friendlyError(signedData?.error, 'Upload failed'))
        return
      }

      const pubUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!pubUrl || !anon) {
        setError('Missing public Supabase upload config')
        return
      }

      const browserSupabase = createClient(pubUrl, anon)
      const uploadRes = await browserSupabase.storage
        .from('posters')
        .uploadToSignedUrl(String(signedData.path), String(signedData.token), resized)
      if (uploadRes.error) {
        setError(friendlyError(uploadRes.error.message, 'Upload failed'))
        return
      }

      const finalize = await fetch('/api/submit/finalize-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_path: signedData.path, seen_at_name: seenAtName.trim() || null }),
      })
      const data = await finalize.json().catch(() => ({}))
      if (!finalize.ok) {
        setError(friendlyError(data?.error, 'Upload failed'))
        return
      }

      fetch('/api/submit/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poster_upload_id: data?.poster_upload_id || data?.id || null }),
      }).catch(() => {})

      const newPosterId = String(data?.poster_upload_id || data?.id || '').trim()
      if (!newPosterId) {
        setError('Upload succeeded but missing poster ID')
        return
      }

      setMessage('Poster uploaded.')
      setUploadFile(null)
      if (uploadInputRef.current) uploadInputRef.current.value = ''
      const nextUploads = await loadUploads()
      await selectPosterById(newPosterId, nextUploads)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploadingPoster(false)
    }
  }

  async function goToNextUntendedPoster() {
    const res = await fetch('/api/builder/next-poster')
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(friendlyError(data?.error, 'Failed to load next poster'))
      return
    }

    const nextId = data?.poster?.id as string | undefined
    if (!nextId) {
      setMessage('No untended posters in queue.')
      return
    }

    const nextUploads = await loadUploads()
    await selectPosterById(nextId, nextUploads)
  }

  async function deleteItemRow(row: PosterEventRow) {
    const choice = prompt('Type "unlink" to remove only this pin link, or "cascade" to delete link + item.', 'unlink')
    if (!choice) return
    const mode = choice.trim().toLowerCase()
    if (mode !== 'unlink' && mode !== 'cascade') {
      setError('Delete cancelled. Use unlink or cascade.')
      return
    }
    if (!confirm(mode === 'cascade' ? 'Delete link and item?' : 'Remove link only?')) return

    const res = await fetch('/api/builder/delete-poster-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ link_id: row.link_id, mode }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(friendlyError(data?.error, 'Delete failed'))
      return
    }

    if (selectedItemId === row.link_id) resetFormToNew()
    await loadRows(selectedPoster?.id || null)
    await loadUploads()
  }

  async function markDone() {
    if (!selectedPoster?.id) return
    const res = await fetch('/api/builder/mark-upload-done', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poster_upload_id: selectedPoster.id, is_done: true }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(friendlyError(data?.error, 'Failed to mark done'))
      return
    }

    setSelectedPoster(null)
    setSelectedItemId(null)
    setRows([])
    setPoint(null)
    await loadUploads()
  }

  async function deletePoster(mode: 'unlink' | 'delete_with_events') {
    if (!selectedPoster?.id) return
    setDeletingPoster(true)
    setError('')
    setMessage('')

    try {
      const res = await fetch('/api/manage/delete-poster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poster_upload_id: selectedPoster.id, mode }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(friendlyError(data?.error, 'Failed to delete poster'))
        return
      }

      setDeleteModalOpen(false)
      setSelectedPoster(null)
      setSelectedItemId(null)
      setRows([])
      setPoint(null)
      setMessage(mode === 'delete_with_events' ? 'Poster and linked items deleted.' : 'Poster deleted. Linked items were unlinked.')
      await loadUploads()
    } finally {
      setDeletingPoster(false)
    }
  }

  async function handleDeletePosterClick() {
    if (!selectedPoster) return
    const linkedCount = selectedPoster.linked_count ?? selectedPoster.event_count ?? 0
    if (linkedCount === 0) {
      if (!confirm('Delete this poster?')) return
      await deletePoster('unlink')
      return
    }
    setDeleteMode('unlink')
    setDeleteModalOpen(true)
  }

  const needsPinForNew = Boolean(selectedPoster && !editingEventId)
  const canSubmitItem = !saving && (!needsPinForNew || Boolean(point))
  const placedItemsCount = useMemo(() => rows.filter((row) => Boolean(row.bbox)).length, [rows])
  const activeRows = useMemo(() => {
    if (!selectedItemId) return rows
    const lead = rows.find((row) => row.link_id === selectedItemId)
    if (!lead) return rows
    return [lead, ...rows.filter((row) => row.link_id !== selectedItemId)]
  }, [rows, selectedItemId])

  const visibleUploads = uploads.filter((u) => !Boolean(u.is_done) && normalizePosterStatus(u.status) !== POSTER_STATUSES.DONE)

  function SubmissionsPanel() {
    return (
      <Panel
        title="Submissions"
        subtitle="Choose a poster, then place pins and draft items."
        className="cbSubmissionsNoHeaderDivider"
        testId="builder-panel-submissions"
      >
        <input
          ref={uploadInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
          className="cbUploadInput"
        />
        <div className="cbRow cbSubmissionsHeaderActions">
          <button type="button" data-variant="secondary" onClick={() => uploadInputRef.current?.click()} disabled={uploadingPoster}>
            {uploadFile ? 'Change file' : 'Choose file'}
          </button>
          <button className="cbActionPrimary" onClick={uploadFromCreate} disabled={!uploadFile || uploadingPoster}>
            {uploadingPoster ? 'Uploading...' : 'Upload and select'}
          </button>
        </div>
        <hr className="cbDivider cbSubmissionsPrimaryDivider" />

        <div className="cbRow cbSubmissionsSecondaryActions">
          <button data-variant="secondary" onClick={goToNextUntendedPoster}>Next untended poster</button>
          <button data-variant="secondary" onClick={loadUploads}>Refresh</button>
        </div>

        <div className="cbSubmissionList">
          {visibleUploads.map((upload) => {
            const isSelected = selectedPoster?.id === upload.id
            const itemsCount = upload.linked_count ?? upload.event_count ?? 0
            return (
              <button key={upload.id} type="button" className={isSelected ? 'cbSubmissionCard cbSubmissionCardActive' : 'cbSubmissionCard'} onClick={() => selectPosterById(upload.id)}>
                <div className="cbSubmissionMeta">
                  <div><span>Captured:</span> {formatCaptureHour(upload.created_at)}</div>
                  <div><span>Status:</span> {posterStatusLabel(upload.status)}</div>
                  <div><span>Found at:</span> {upload.seen_at_name || '—'}</div>
                  <div><span>Items count:</span> {itemsCount}</div>
                </div>
                {upload.public_url ? <img src={upload.public_url} alt="Poster thumbnail" className="cbSubmissionThumb" /> : <div className="cbSubmissionThumb cbSubmissionThumbEmpty">No image</div>}
              </button>
            )
          })}
          {visibleUploads.length === 0 ? <p className="cb-muted-text">No submissions available.</p> : null}
        </div>
      </Panel>
    )
  }

  function WorkspacePanel() {
    return (
      <Panel title="Workspace" subtitle="Place pins on the poster, then edit details in Poster details." testId="builder-panel-workspace">
        {!selectedPoster ? (
          <div className="cbCenteredState">Select a poster from Submissions.</div>
        ) : (
          <>
              <div className="cbMetaStrip">
                <div className="cbMetaCell">
                  <span className="cbMetaLabel">Captured</span>
                  <strong className="cbMetaValue">{formatCaptureHour(selectedPoster.created_at)}</strong>
                </div>
                <div className="cbMetaCell">
                  <span className="cbMetaLabel">Found at</span>
                  <div className="cbFoundAtEditor">
                    <input value={seenAtName} onChange={(e) => setSeenAtName(e.target.value)} placeholder="Found at" />
                    <button type="button" data-variant="secondary" onClick={saveSeenAt} disabled={savingSeenAt}>
                      {savingSeenAt ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
                <div className="cbMetaCell">
                  <span className="cbMetaLabel">Items count</span>
                  <strong className="cbMetaValue">{rows.length}</strong>
                </div>
                <div className="cbMetaCell">
                  <span className="cbMetaLabel">Pins placed</span>
                  <strong className="cbMetaValue">{placedItemsCount}</strong>
                </div>
              </div>

              <div className="cbControlRow">
                <button data-variant="secondary" onClick={() => setZoom((z) => Math.max(1, Number((z - 0.2).toFixed(2))))}>Zoom -</button>
                <button data-variant="secondary" onClick={() => setZoom((z) => Math.min(5, Number((z + 0.2).toFixed(2))))}>Zoom +</button>
                <button data-variant="secondary" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}>Reset</button>
                <button data-variant="secondary" onClick={fitToItems} disabled={placedItemsCount === 0}>Fit to items</button>
                <button data-variant="secondary" onClick={centerSelected} disabled={!selectedItemId && !point}>Center selected</button>
              </div>

              <div
                ref={stageRef}
                className="cbPosterStage"
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
              >
                <div className="cbPosterTransform" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
                  {selectedPoster.public_url ? (
                    <img
                      src={selectedPoster.public_url}
                      alt="Poster"
                      className="cbPosterImage"
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

                        const rect = e.currentTarget.getBoundingClientRect()
                        const x = (e.clientX - rect.left) / rect.width
                        const y = (e.clientY - rect.top) / rect.height

                        setPoint({ x: Number(Math.max(0, Math.min(1, x)).toFixed(4)), y: Number(Math.max(0, Math.min(1, y)).toFixed(4)) })
                        setSelectedItemId(null)
                        if (editingEventId) setFormBaselineToCurrent()
                      }}
                      style={{
                        left: `${stageMetrics.offsetX}px`,
                        top: `${stageMetrics.offsetY}px`,
                        width: `${stageMetrics.baseW}px`,
                        height: `${stageMetrics.baseH}px`,
                      }}
                    />
                  ) : null}

                  {rows.filter((row) => row.bbox).map((row) => {
                    const active = selectedItemId === row.link_id
                    return (
                      <button
                        key={row.link_id}
                        type="button"
                        title={row.event.title}
                        onClick={(e) => {
                          e.stopPropagation()
                          startEdit(row)
                        }}
                        className={active ? 'cbPin cbPinActive' : 'cbPin'}
                        style={{
                          left: `${stageMetrics.offsetX + row.bbox!.x * stageMetrics.baseW}px`,
                          top: `${stageMetrics.offsetY + row.bbox!.y * stageMetrics.baseH}px`,
                        }}
                      />
                    )
                  })}

                  {!editingEventId && point ? (
                    <div
                      className="cbPinDraft"
                      style={{
                        left: `${stageMetrics.offsetX + point.x * stageMetrics.baseW}px`,
                        top: `${stageMetrics.offsetY + point.y * stageMetrics.baseH}px`,
                      }}
                    />
                  ) : null}
                </div>
              </div>

              <div className="cbActionRow">
                <button className="cbActionPrimary" onClick={markDone}>Mark done</button>
                <button className="cbActionDanger" data-variant="danger" onClick={handleDeletePosterClick}>Delete poster</button>
              </div>
          </>
        )}
      </Panel>
    )
  }

  function PosterDetailsPanel() {
    return (
      <PosterDetailsRail
        title="Poster details"
        subtitle="Create or edit items linked to required poster coordinates."
        testId="builder-panel-inspector"
      >
        <PosterDetailsList>
          {!selectedPoster ? (
            <div className="cbCenteredState">Select a submission to begin.</div>
          ) : (
            <>
              {error ? <p className="cbErrorMsg">{error}</p> : null}
              {message ? <p className="cbInfoMsg">{message}</p> : null}

              <section className="cbFormCard">
                <h3 className="cbSubhead">{editingEventId ? 'Edit item' : 'Create item'}</h3>
                <div className="cbFormGrid">
                  <label>
                    Item type
                    <select value={itemType} onChange={(e) => setItemType(normalizeItemType(e.target.value, 'event'))}>
                      {ITEM_TYPES.map((type) => (
                        <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Title
                    <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
                  </label>

                  <label>
                    Event at
                    <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Event at" />
                  </label>

                  <label>
                    Description
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Description" />
                  </label>

                  {isTimeBoundType(itemType) ? (
                    <label>
                      Start time
                      <input type="datetime-local" step={1800} value={startAt} onChange={(e) => setStartAt(e.target.value)} />
                    </label>
                  ) : null}

                  {itemType === 'recurring_event' ? (
                    <fieldset className="cbRecurrenceFieldset">
                      <legend>Recurring cadence</legend>
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
                    </fieldset>
                  ) : null}

                  {!editingEventId && !point ? <p className="cb-muted-text">Click the poster to place a pin before saving.</p> : null}

                  <div className="cbRow">
                    <button className="cbActionPrimary" onClick={saveEvent} disabled={!canSubmitItem}>{saving ? 'Saving...' : editingEventId ? 'Save changes' : 'Add item'}</button>
                    {(editingEventId || point || isFormDirty) ? (
                      <button className="cbActionSecondary" data-variant="secondary" onClick={() => resetFormToNew()}>Cancel</button>
                    ) : null}
                  </div>
                </div>
              </section>

              <hr className="cbDivider" />

              <section>
                <h3 className="cbSubhead">Items</h3>
                <div className="cbItemsList">
                  {activeRows.length === 0 ? (
                    <p className="cb-muted-text">No items yet. Click image to add a new pin and item.</p>
                  ) : (
                    activeRows.map((row) => {
                      const parsedStart = new Date(row.event.start_at)
                      const startLabel = Number.isNaN(parsedStart.getTime()) ? 'No date/time yet' : parsedStart.toLocaleString()
                      const recurrenceLabel = row.event.item_type === 'recurring_event'
                        ? `${row.event.recurrence_mode === 'monthly' ? (row.event.recurrence_month_ordinal || 'first') : 'weekly'} ${row.event.recurrence_weekday || 'monday'}`
                        : null

                      return (
                        <article key={row.link_id} className={selectedItemId === row.link_id ? 'cbItemCard cbItemCardActive' : 'cbItemCard'} onClick={() => startEdit(row)}>
                          <h4>{row.event.title || '(Draft item)'}</h4>
                          <p><strong>Status:</strong> {statusLabel(row.event.status)} • {(row.event.item_type || 'event').replaceAll('_', ' ')}</p>
                          <p><strong>Date/time:</strong> {startLabel}</p>
                          <p><strong>Found at:</strong> {selectedPoster.seen_at_name || '—'}</p>
                          <p><strong>Event at:</strong> {row.event.location || '—'}</p>
                          <p><strong>Description:</strong> {row.event.description || '—'}</p>
                          {recurrenceLabel ? <p><strong>Cadence:</strong> {recurrenceLabel}</p> : null}
                          <div className="cbRow">
                            <button className="cbActionSecondary" data-variant="secondary" onClick={(e) => { e.stopPropagation(); startEdit(row) }}>Edit</button>
                            <button className="cbActionDanger" data-variant="danger" onClick={(e) => { e.stopPropagation(); deleteItemRow(row) }}>Delete</button>
                          </div>
                        </article>
                      )
                    })
                  )}
                </div>
              </section>
            </>
          )}
        </PosterDetailsList>
      </PosterDetailsRail>
    )
  }

  return (
    <>
      <BoardLayout
        testId="builder-create-panels"
        header={(
          <BoardHeader
            title="Create posters"
            subtitle="Use one board skeleton to review submissions, place pins, and edit poster details."
            leftLink={{ href: '/', label: 'Return to Community Board' }}
            rightLink={{ href: '/browse', label: 'Browse posters' }}
          />
        )}
        left={<SubmissionsPanel />}
        center={<WorkspacePanel />}
        right={<PosterDetailsPanel />}
      />

      {deleteModalOpen && selectedPoster ? (
        <div className="cbModalBackdrop" onClick={() => !deletingPoster && setDeleteModalOpen(false)}>
          <div className="cbModalCard" onClick={(e) => e.stopPropagation()}>
            <h3>Delete poster</h3>
            <div className="cbModalMeta">
              <div>Created: {new Date(selectedPoster.created_at).toLocaleString()}</div>
              <div>Found at: {selectedPoster.seen_at_name || '—'}</div>
              <div>Linked items: {selectedPoster.linked_count ?? selectedPoster.event_count ?? 0}</div>
            </div>

            <label className="cbModalOption">
              <input type="radio" name="delete_mode" checked={deleteMode === 'unlink'} onChange={() => setDeleteMode('unlink')} />
              <span>Delete poster only (keep linked items)</span>
            </label>
            <label className="cbModalOption">
              <input type="radio" name="delete_mode" checked={deleteMode === 'delete_with_events'} onChange={() => setDeleteMode('delete_with_events')} />
              <span>Delete poster and linked items</span>
            </label>

            <div className="cbRow cbRowEnd">
              <button data-variant="secondary" onClick={() => setDeleteModalOpen(false)} disabled={deletingPoster}>Cancel</button>
              <button data-variant="danger" onClick={() => deletePoster(deleteMode)} disabled={deletingPoster}>
                {deletingPoster ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
