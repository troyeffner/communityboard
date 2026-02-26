'use client'

import { useEffect, useRef, useState } from 'react'

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
  const [seenAtName, setSeenAtName] = useState('')
  const [reuseSeenAt, setReuseSeenAt] = useState(true)

  useEffect(() => {
    const saved = window.localStorage.getItem('submit_seen_at_name')
    if (saved) setSeenAtName(saved)
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
      form.append('seen_at_name', seenAtName)
      if (reuseSeenAt) {
        window.localStorage.setItem('submit_seen_at_name', seenAtName.trim())
      } else {
        window.localStorage.removeItem('submit_seen_at_name')
      }

      setMessage('Uploading...')
      const res = await fetch('/api/submit/upload', { method: 'POST', body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage(data?.error || 'Upload failed')
        return
      }

      setMessage('Submitted.')
      setFile(null)
      if (!reuseSeenAt) setSeenAtName('')
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    } catch {
      setMessage('Upload failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: 24, fontFamily: 'sans-serif' }}>
      <h1 style={{ margin: 0 }}>Submit</h1>
      <p style={{ marginTop: 8, opacity: 0.75 }}>Capture a poster photo and submit.</p>

      <section style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: 24, display: 'grid', gap: 16, marginTop: 16 }}>
        <p style={{ margin: 0, fontWeight: 600 }}>Take as clear a shot as possible.</p>
        <div style={{ opacity: 0.75 }}>
          <p style={{ margin: 0 }}>Fill frame</p>
          <p style={{ margin: '8px 0 0 0' }}>Avoid glare</p>
          <p style={{ margin: '8px 0 0 0' }}>Ensure text readable</p>
        </div>

        <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: 18 }}>Seen at</h3>
          <label style={{ display: 'block', marginTop: 8 }}>Seen at (optional)
            <input value={seenAtName} onChange={(e) => setSeenAtName(e.target.value)} placeholder="e.g., Emmerson Cafe Community Board" style={{ width: '100%', marginTop: 4, padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }} />
          </label>
          <label style={{ display: 'block', marginTop: 8, fontSize: 13 }}>
            <input type="checkbox" checked={reuseSeenAt} onChange={(e) => setReuseSeenAt(e.target.checked)} /> Use same seen-at for next submit
          </label>
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
        </div>

        {file && <p style={{ margin: 0, color: '#166534', fontWeight: 600 }}>✓ Photo selected</p>}
        {previewUrl && <img src={previewUrl} alt="Poster preview" style={{ width: '100%', borderRadius: 8, border: '1px solid #e5e7eb' }} />}

        <button onClick={submitPhoto} style={{ width: '100%', minHeight: 44 }} disabled={!file || submitting}>
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
      </section>

      {message && <p style={{ marginTop: 12 }}>{message}</p>}
    </main>
  )
}
