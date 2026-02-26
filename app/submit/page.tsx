'use client'

import { useEffect, useRef, useState } from 'react'
import { OBJECT_TYPES } from '@/lib/taxonomy'

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

export default function SubmitPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [objectType, setObjectType] = useState('event_poster')
  const [seenAtLabel, setSeenAtLabel] = useState('')
  const [seenAtNotes, setSeenAtNotes] = useState('')
  const [reuseSeenAt, setReuseSeenAt] = useState(true)
  const [seenAtLat, setSeenAtLat] = useState<number | null>(null)
  const [seenAtLng, setSeenAtLng] = useState<number | null>(null)
  const [locationStatus, setLocationStatus] = useState('')
  const [lastPosterUploadId, setLastPosterUploadId] = useState<string | null>(null)

  useEffect(() => {
    const saved = window.localStorage.getItem('submit_seen_at_label')
    if (saved) setSeenAtLabel(saved)
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
      form.append('seen_at_label', seenAtLabel)
      form.append('seen_at_notes', seenAtNotes)
      if (seenAtLat !== null) form.append('seen_at_lat', String(seenAtLat))
      if (seenAtLng !== null) form.append('seen_at_lng', String(seenAtLng))
      const confidence = seenAtLat !== null && seenAtLng !== null ? 'gps' : seenAtLabel.trim() ? 'typed' : 'unknown'
      form.append('seen_at_confidence', confidence)
      if (reuseSeenAt) {
        window.localStorage.setItem('submit_seen_at_label', seenAtLabel.trim())
        window.localStorage.setItem('submit_object_type', objectType)
      } else {
        window.localStorage.removeItem('submit_seen_at_label')
      }

      setMessage('Uploading...')
      const res = await fetch('/api/submit/upload', { method: 'POST', body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage(data?.error || 'Upload failed')
        return
      }

      setMessage('Submitted.')
      setLastPosterUploadId(data?.poster_upload_id || data?.id || null)
      setFile(null)
      setSeenAtNotes('')
      setSeenAtLat(null)
      setSeenAtLng(null)
      setLocationStatus('')
      if (!reuseSeenAt) setSeenAtLabel('')
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

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: 24, fontFamily: 'sans-serif' }}>
      <h1 style={{ margin: 0 }}>Submit</h1>
      <p style={{ marginTop: 8, opacity: 0.75 }}>Create a submission, then finish details in Builder.</p>

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
          <label style={{ display: 'block', marginTop: 8 }}>Object type
            <select value={objectType} onChange={(e) => setObjectType(e.target.value)} style={{ width: '100%', marginTop: 4, padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }}>
              {OBJECT_TYPES.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label style={{ display: 'block', marginTop: 8 }}>Notes (optional)
            <input value={seenAtNotes} onChange={(e) => setSeenAtNotes(e.target.value)} style={{ width: '100%', marginTop: 4, padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
          </label>
          <label style={{ display: 'block', marginTop: 8, fontSize: 13 }}>
            <input type="checkbox" checked={reuseSeenAt} onChange={(e) => setReuseSeenAt(e.target.checked)} /> Use same seen-at for next submit
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

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => fileInputRef.current?.click()} style={{ minHeight: 44 }} disabled={submitting}>
            Take photo / Upload
          </button>
          <a
            href="/builder/create?manual=1"
            style={{
              display: 'inline-block',
              minHeight: 44,
              lineHeight: '26px',
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              color: '#111827',
              textDecoration: 'none',
              background: '#fff',
            }}
          >
            Manual entry (no photo)
          </a>
        </div>

        {file && <p style={{ margin: 0, color: '#166534', fontWeight: 600 }}>✓ Photo selected</p>}
        {previewUrl && <img src={previewUrl} alt="Poster preview" style={{ width: '100%', borderRadius: 8, border: '1px solid #e5e7eb' }} />}

        <button onClick={submitPhoto} style={{ width: '100%', minHeight: 44 }} disabled={!file || submitting}>
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
      </section>

      {message && <p style={{ marginTop: 12 }}>{message}</p>}
      {lastPosterUploadId && (
        <div style={{ marginTop: 12 }}>
          <a
            href={`/builder/create?poster_upload_id=${encodeURIComponent(lastPosterUploadId)}`}
            style={{
              display: 'inline-block',
              minHeight: 44,
              lineHeight: '26px',
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #2563eb',
              background: '#eff6ff',
              color: '#1d4ed8',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Help fill details
          </a>
        </div>
      )}
    </main>
  )
}
