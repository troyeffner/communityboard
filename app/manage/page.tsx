'use client'

import { useEffect, useMemo, useState } from 'react'

type PosterUpload = {
  id: string
  file_path: string
  status: string
  created_at: string
  public_url?: string
}

type BBoxPoint = { x: number; y: number } // normalized 0..1

export default function ManagePage() {
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [startAt, setStartAt] = useState('')
  const [status, setStatus] = useState<'draft' | 'published'>('draft')
  const [message, setMessage] = useState('')
  const [selectedPosterId, setSelectedPosterId] = useState<string | null>(null)

  const [uploads, setUploads] = useState<PosterUpload[]>([])
  const [uploadsError, setUploadsError] = useState('')

  const selectedUpload = useMemo(
    () => uploads.find((u) => u.id === selectedPosterId) || null,
    [uploads, selectedPosterId]
  )

  const [point, setPoint] = useState<BBoxPoint | null>(null)

  async function loadUploads() {
    setUploadsError('')
    const res = await fetch('/api/manage/list-uploads')
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setUploadsError(data?.error || 'Failed to load uploads')
      return
    }
    setUploads(data.uploads || [])
  }

  useEffect(() => {
    loadUploads()
  }, [])

  useEffect(() => {
    setPoint(null)
  }, [selectedPosterId])

  function handleImageClick(e: React.MouseEvent<HTMLImageElement>) {
    const img = e.currentTarget
    const rect = img.getBoundingClientRect()

    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height

    const nx = Math.max(0, Math.min(1, x))
    const ny = Math.max(0, Math.min(1, y))

    setPoint({ x: Number(nx.toFixed(4)), y: Number(ny.toFixed(4)) })
    setMessage('')
  }

  async function submitEvent() {
    if (!selectedPosterId) {
      setMessage('Select a submission first.')
      return
    }
    if (!point) {
      setMessage('Click on the image to set the event location.')
      return
    }

    setMessage('Saving...')

    const res = await fetch('/api/manage/create-event-from-poster', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        poster_upload_id: selectedPosterId,
        title,
        location,
        start_at: startAt,
        status,
        bbox: point,
      }),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setMessage(data?.error || 'Error')
      return
    }

    setMessage('Saved.')
    setTitle('')
    setLocation('')
    setStartAt('')
    setStatus('draft')
  }

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 1100 }}>
      <h1>Manage</h1>

      <section
        style={{
          marginTop: 16,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 24,
        }}
      >
        <div>
          <h2>Create event from submission</h2>

          <p style={{ opacity: 0.7 }}>
            Selected poster ID: {selectedPosterId || 'none'}
          </p>

          <label style={{ display: 'block', marginTop: 12 }}>
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ display: 'block', width: '100%', padding: 8, marginTop: 6 }}
              placeholder="e.g., Open Mic Night"
            />
          </label>

          <label style={{ display: 'block', marginTop: 12 }}>
            Location
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              style={{ display: 'block', width: '100%', padding: 8, marginTop: 6 }}
              placeholder="e.g., Tramontane Café"
            />
          </label>

          <label style={{ display: 'block', marginTop: 12 }}>
            Start (America/New_York)
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              style={{ display: 'block', width: '100%', padding: 8, marginTop: 6 }}
            />
          </label>

          <label style={{ display: 'block', marginTop: 12 }}>
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              style={{ display: 'block', width: '100%', padding: 8, marginTop: 6 }}
            >
              <option value="draft">draft</option>
              <option value="published">published</option>
            </select>
          </label>

          <p style={{ marginTop: 12, opacity: 0.7 }}>
            Image pin: {point ? `x=${point.x}, y=${point.y}` : 'click on image'}
          </p>

          <button
            onClick={submitEvent}
            style={{ marginTop: 12, padding: '10px 14px' }}
            disabled={!title || !startAt || !selectedPosterId}
          >
            Create event
          </button>

          {message && <p style={{ marginTop: 12 }}>{message}</p>}
        </div>

        <div>
          <h2>Selected image</h2>

          {!selectedUpload && (
            <p style={{ opacity: 0.7 }}>Select a submission to view it.</p>
          )}

          {selectedUpload && !selectedUpload.public_url && (
            <p style={{ color: 'crimson' }}>
              No public_url returned for this upload.
            </p>
          )}

          {selectedUpload?.public_url && (
            <div style={{ border: '1px solid #ddd', padding: 12 }}>
              <p style={{ marginTop: 0, opacity: 0.7 }}>
                Click on the image to drop a pin for this event.
              </p>

              <div style={{ position: 'relative' }}>
                <img
                  src={selectedUpload.public_url}
                  alt="Poster upload"
                  onClick={handleImageClick}
                  style={{
                    width: '100%',
                    height: 'auto',
                    cursor: 'crosshair',
                    display: 'block',
                  }}
                />

                {point && (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${point.x * 100}%`,
                      top: `${point.y * 100}%`,
                      transform: 'translate(-50%, -50%)',
                      width: 14,
                      height: 14,
                      borderRadius: 999,
                      background: 'red',
                      border: '2px solid white',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <hr style={{ margin: '2rem 0' }} />

      <section>
        <h2>Submissions</h2>

        <button onClick={loadUploads} style={{ padding: '8px 12px' }}>
          Refresh submissions
        </button>

        {uploadsError && (
          <p style={{ marginTop: 12, color: 'crimson' }}>{uploadsError}</p>
        )}

        {uploads.length > 0 && (
          <table style={{ width: '100%', marginTop: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>
                  Created
                </th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>
                  Status
                </th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>
                  File
                </th>
                <th style={{ borderBottom: '1px solid #ddd', padding: 8 }}></th>
              </tr>
            </thead>
            <tbody>
              {uploads.map((u) => (
                <tr key={u.id}>
                  <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>
                    {new Date(u.created_at).toLocaleString()}
                  </td>
                  <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>{u.status}</td>
                  <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>
                    <code style={{ fontSize: 12 }}>{u.file_path}</code>
                  </td>
                  <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>
                    <button onClick={() => setSelectedPosterId(u.id)}>Select</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  )
}
