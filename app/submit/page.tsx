'use client'

import { useEffect, useRef, useState } from 'react'
import { EVENT_CATEGORIES, ATTRIBUTES, AUDIENCE, OBJECT_TYPES, SEEN_AT_CATEGORIES } from '@/lib/taxonomy'

async function resizeImage(file: File): Promise<File> {
  const imageUrl = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = imageUrl
    })

    const maxEdge = 1600
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
      canvas.toBlob((out) => (out ? resolve(out) : reject(new Error('Encoding failed'))), 'image/jpeg', 0.8)
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

export default function SubmitPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [mode, setMode] = useState<'photo' | 'manual'>('photo')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [startAt, setStartAt] = useState(defaultStartAt2pmLocal())
  const [description, setDescription] = useState('')
  const [manualCategory, setManualCategory] = useState('')
  const [manualAttributes, setManualAttributes] = useState<string[]>([])
  const [manualAudience, setManualAudience] = useState<string[]>([])
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrenceRule, setRecurrenceRule] = useState('')

  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [objectType, setObjectType] = useState('event_poster')
  const [seenAtCategory, setSeenAtCategory] = useState('community_board')
  const [seenAtLabel, setSeenAtLabel] = useState('')
  const [seenAtNotes, setSeenAtNotes] = useState('')
  const [reuseSeenAt, setReuseSeenAt] = useState(true)
  const [seenAtLat, setSeenAtLat] = useState<number | null>(null)
  const [seenAtLng, setSeenAtLng] = useState<number | null>(null)
  const [locationStatus, setLocationStatus] = useState('')

  useEffect(() => {
    const saved = window.localStorage.getItem('submit_seen_at_label')
    if (saved) setSeenAtLabel(saved)
    const savedCategory = window.localStorage.getItem('submit_seen_at_category')
    if (savedCategory) setSeenAtCategory(savedCategory)
    const savedObjectType = window.localStorage.getItem('submit_object_type')
    if (savedObjectType) setObjectType(savedObjectType)
  }, [])

  function onFileChange(nextFile: File | null) {
    setFile(nextFile)
    setMessage('')
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(nextFile ? URL.createObjectURL(nextFile) : null)
  }

  async function submitPhoto() {
    if (!file) {
      setMessage('Pick a photo first.')
      return
    }

    setSubmitting(true)
    setMessage('Preparing image...')
    try {
      const resized = await resizeImage(file)
      const form = new FormData()
      form.append('file', resized)
      form.append('object_type', objectType)
      form.append('seen_at_category', seenAtCategory)
      form.append('seen_at_label', seenAtLabel)
      form.append('seen_at_notes', seenAtNotes)
      if (seenAtLat !== null) form.append('seen_at_lat', String(seenAtLat))
      if (seenAtLng !== null) form.append('seen_at_lng', String(seenAtLng))
      const confidence = seenAtLat !== null && seenAtLng !== null ? 'gps' : seenAtLabel.trim() ? 'typed' : 'unknown'
      form.append('seen_at_confidence', confidence)
      if (reuseSeenAt) {
        window.localStorage.setItem('submit_seen_at_label', seenAtLabel.trim())
        window.localStorage.setItem('submit_seen_at_category', seenAtCategory)
        window.localStorage.setItem('submit_object_type', objectType)
      } else {
        window.localStorage.removeItem('submit_seen_at_label')
        window.localStorage.removeItem('submit_seen_at_category')
      }

      setMessage('Uploading...')
      const res = await fetch('/api/submit/upload', { method: 'POST', body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage(data?.error || 'Upload failed')
        return
      }

      setMessage('Poster submitted successfully.')
      setFile(null)
      setSeenAtNotes('')
      setSeenAtLat(null)
      setSeenAtLng(null)
      setLocationStatus('')
      if (!reuseSeenAt) {
        setSeenAtLabel('')
        setSeenAtCategory('community_board')
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    } catch {
      setMessage('Upload failed')
    } finally {
      setSubmitting(false)
    }
  }

  function captureLocation() {
    if (!navigator.geolocation) {
      setLocationStatus('GPS unavailable on this device/browser.')
      return
    }
    setLocationStatus('Capturing location...')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6))
        const lng = Number(pos.coords.longitude.toFixed(6))
        setSeenAtLat(lat)
        setSeenAtLng(lng)
        setLocationStatus(`Location captured (${lat}, ${lng})`)
      },
      () => {
        setLocationStatus('Location not captured. You can still submit without GPS.')
      },
      { enableHighAccuracy: true, timeout: 12000 }
    )
  }

  async function submitManual() {
    if (!title.trim()) {
      setMessage('Title is required.')
      return
    }

    setSubmitting(true)
    setMessage('Submitting...')
    try {
      const res = await fetch('/api/submit/manual-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          location,
          description,
          start_at: startAt,
          event_category: manualCategory || null,
          event_attributes: manualAttributes,
          event_audience: manualAudience,
          is_recurring: isRecurring,
          recurrence_rule: isRecurring ? recurrenceRule : null,
          // manual entries remain draft/unpublished in backend
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage(data?.error || 'Manual submission failed')
        return
      }

      setTitle('')
      setLocation('')
      setDescription('')
      setManualCategory('')
      setManualAttributes([])
      setManualAudience([])
      setIsRecurring(false)
      setRecurrenceRule('')
      setStartAt(defaultStartAt2pmLocal())
      setMessage('Manual event submitted to approval queue.')
    } catch {
      setMessage('Manual submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  function toggleTag(values: string[], setter: (next: string[]) => void, tag: string) {
    setter(values.includes(tag) ? values.filter((v) => v !== tag) : [...values, tag])
  }

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: 24, fontFamily: 'sans-serif' }}>
      <h1 style={{ margin: 0 }}>Submit a Poster</h1>
      <p style={{ marginTop: 8, opacity: 0.75 }}>Upload a photo or submit an event manually.</p>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button data-variant="secondary" onClick={() => setMode('photo')} disabled={mode === 'photo'}>Photo Upload</button>
        <button data-variant="secondary" onClick={() => setMode('manual')} disabled={mode === 'manual'}>Manual Entry</button>
      </div>

      {mode === 'photo' && (
        <section style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: 24, display: 'grid', gap: 16, marginTop: 16 }}>
          <p style={{ margin: 0, fontWeight: 600 }}>Take as clear a shot as possible.</p>
          <div style={{ opacity: 0.75 }}>
            <p style={{ margin: 0 }}>Fill frame</p>
            <p style={{ margin: '8px 0 0 0' }}>Avoid glare</p>
            <p style={{ margin: '8px 0 0 0' }}>Ensure text readable</p>
          </div>

          <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 18 }}>Seen at</h3>
            <label style={{ display: 'block', marginTop: 8 }}>Seen at (where you found this poster)
              <input value={seenAtLabel} onChange={(e) => setSeenAtLabel(e.target.value)} placeholder="e.g., Emmerson Cafe Community Board" style={{ width: '100%', marginTop: 4, padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
            </label>
            <label style={{ display: 'block', marginTop: 8 }}>Seen at category
              <select value={seenAtCategory} onChange={(e) => setSeenAtCategory(e.target.value)} style={{ width: '100%', marginTop: 4, padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }}>
                {SEEN_AT_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
            <label style={{ display: 'block', marginTop: 8 }}>Object type
              <select value={objectType} onChange={(e) => setObjectType(e.target.value)} style={{ width: '100%', marginTop: 4, padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }}>
                {OBJECT_TYPES.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label style={{ display: 'block', marginTop: 8 }}>Notes (optional)
              <input value={seenAtNotes} onChange={(e) => setSeenAtNotes(e.target.value)} style={{ width: '100%', marginTop: 4, padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
            </label>
            <label style={{ display: 'block', marginTop: 8, fontSize: 13 }}>
              <input type="checkbox" checked={reuseSeenAt} onChange={(e) => setReuseSeenAt(e.target.checked)} /> Use same seen-at for next upload
            </label>
            <button type="button" data-variant="secondary" onClick={captureLocation} style={{ marginTop: 10 }}>
              Use my current location
            </button>
            {locationStatus && <p style={{ margin: '8px 0 0 0', fontSize: 13, opacity: 0.8 }}>{locationStatus}</p>}
          </div>

          <input
            ref={fileInputRef}
            id="file"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => onFileChange(e.target.files?.[0] || null)}
            style={{ display: 'none' }}
          />

          <button onClick={() => fileInputRef.current?.click()} style={{ width: '100%', minHeight: 44 }} disabled={submitting}>
            Take or Upload Photo
          </button>

          {file && <p style={{ margin: 0, color: '#166534', fontWeight: 600 }}>✓ Photo selected</p>}

          {previewUrl && <img src={previewUrl} alt="Poster preview" style={{ width: '100%', borderRadius: 8, border: '1px solid #e5e7eb' }} />}

          <button onClick={submitPhoto} style={{ width: '100%', minHeight: 44 }} disabled={!file || submitting}>
            {submitting ? 'Submitting...' : 'Submit Poster'}
          </button>
        </section>
      )}

      {mode === 'manual' && (
        <section style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: 24, display: 'grid', gap: 12, marginTop: 16 }}>
          <label>Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', marginTop: 4, padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
          </label>
          <label>Location
            <input value={location} onChange={(e) => setLocation(e.target.value)} style={{ width: '100%', marginTop: 4, padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
          </label>
          <label>Start
            <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} style={{ width: '100%', marginTop: 4, padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
          </label>
          <label>Description
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} style={{ width: '100%', marginTop: 4, padding: 10, border: '1px solid #cbd5e1', borderRadius: 8, resize: 'vertical' }} />
          </label>
          <label>Category
            <select value={manualCategory} onChange={(e) => setManualCategory(e.target.value)} style={{ width: '100%', marginTop: 4, padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }}>
              <option value="">Select category</option>
              {EVENT_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 10 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Attributes</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
              {ATTRIBUTES.map((tag) => (
                <label key={tag} style={{ fontSize: 12, fontWeight: 500 }}>
                  <input type="checkbox" checked={manualAttributes.includes(tag)} onChange={() => toggleTag(manualAttributes, setManualAttributes, tag)} /> {tag}
                </label>
              ))}
            </div>
          </div>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 10 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Audience</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
              {AUDIENCE.map((tag) => (
                <label key={tag} style={{ fontSize: 12, fontWeight: 500 }}>
                  <input type="checkbox" checked={manualAudience.includes(tag)} onChange={() => toggleTag(manualAudience, setManualAudience, tag)} /> {tag}
                </label>
              ))}
            </div>
          </div>
          <label style={{ fontSize: 13 }}>
            <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} /> Recurring event
          </label>
          {isRecurring && (
            <label>Recurrence rule
              <input value={recurrenceRule} onChange={(e) => setRecurrenceRule(e.target.value)} placeholder="e.g., monthly:first:tuesday" style={{ width: '100%', marginTop: 4, padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
            </label>
          )}

          <button onClick={submitManual} style={{ width: '100%', minHeight: 44 }} disabled={!title || submitting}>
            {submitting ? 'Submitting...' : 'Submit Manual Event'}
          </button>
        </section>
      )}

      {message && <p style={{ marginTop: 12 }}>{message === 'Poster submitted successfully.' ? 'Submitted.' : message}</p>}
    </main>
  )
}
