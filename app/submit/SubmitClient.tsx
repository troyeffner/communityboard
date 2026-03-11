'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { compressPosterImage, type CompressedImageResult } from '@/lib/imageCompress'

function bytesToMB(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function makeUploadFile(compressed: CompressedImageResult) {
  return new File([compressed.blob], 'poster.jpg', { type: compressed.mime || 'image/jpeg' })
}

function formatSubmitError(rawMessage: string, status: number) {
  const msg = rawMessage.toLowerCase()
  if (msg.includes('missing supabase env vars')) return 'Upload service is not configured yet. Please try again later.'
  if (msg.includes('file must be an image')) return 'That file type is not supported. Please choose a photo.'
  if (msg.includes('missing file')) return 'No photo was attached. Please pick a photo again.'
  if (msg.includes('run migration')) return 'Upload storage is not ready yet. Please notify the admin.'
  if (msg.includes('payload too large') || status === 413) return 'Photo is still too large after compression. Try a closer crop or lower-resolution photo.'
  return rawMessage || `Upload failed (HTTP ${status}). You can retry without reselecting.`
}

export default function SubmitClient() {
  const cameraInputRef = useRef<HTMLInputElement | null>(null)
  const pickerInputRef = useRef<HTMLInputElement | null>(null)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [compressed, setCompressed] = useState<CompressedImageResult | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('')
  const [errorText, setErrorText] = useState('')
  const [successText, setSuccessText] = useState('')
  const [seenAtName, setSeenAtName] = useState('')
  const [reuseSeenAt, setReuseSeenAt] = useState(true)

  useEffect(() => {
    const saved = window.localStorage.getItem('submit_seen_at_name')
    if (saved) setSeenAtName(saved)
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  async function prepareCompressed(nextFile: File) {
    setCompressing(true)
    setStatusText('Compressing photo...')
    setProgress(10)
    try {
      const result = await compressPosterImage(nextFile, 2_000_000)
      const nextUrl = URL.createObjectURL(result.blob)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(nextUrl)
      setCompressed(result)
      setStatusText('Ready to upload')
      setProgress(35)
    } catch (err) {
      setCompressed(null)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
      setStatusText('')
      setProgress(0)
      setErrorText(err instanceof Error ? err.message : 'Failed to prepare image. Try another photo.')
    } finally {
      setCompressing(false)
    }
  }

  async function onFileSelected(nextFile: File | null) {
    setErrorText('')
    setSuccessText('')
    setStatusText('')
    setProgress(0)
    setSelectedFile(nextFile)
    if (!nextFile) {
      setCompressed(null)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
      return
    }
    await prepareCompressed(nextFile)
  }

  const originalStats = useMemo(() => {
    if (!selectedFile || !compressed) return null
    return {
      size: bytesToMB(selectedFile.size),
      width: compressed.originalWidth,
      height: compressed.originalHeight,
    }
  }, [selectedFile, compressed])

  const compressedStats = useMemo(() => {
    if (!compressed) return null
    return {
      size: bytesToMB(compressed.bytes),
      width: compressed.width,
      height: compressed.height,
      withinTarget: compressed.bytes <= compressed.targetMaxBytes,
    }
  }, [compressed])

  async function submitPhoto() {
    if (!compressed) {
      setErrorText('Take or choose a photo first.')
      return
    }
    if (!seenAtName.trim()) {
      setErrorText('Seen at is required.')
      return
    }

    setSubmitting(true)
    setErrorText('')
    setSuccessText('')
    setStatusText('Uploading photo...')
    setProgress(55)
    try {
      const trimmedSeenAt = seenAtName.trim()
      if (reuseSeenAt) {
        window.localStorage.setItem('submit_seen_at_name', trimmedSeenAt)
      } else {
        window.localStorage.removeItem('submit_seen_at_name')
      }

      const form = new FormData()
      form.append('file', makeUploadFile(compressed))
      form.append('seen_at_name', trimmedSeenAt)

      const upload = await fetch('/api/submit/upload', {
        method: 'POST',
        body: form,
      })
      const uploadData = await upload.json().catch(() => ({}))
      if (!upload.ok) {
        setStatusText('Upload failed')
        setProgress(40)
        setErrorText(formatSubmitError(String(uploadData?.error || ''), upload.status))
        return
      }

      setStatusText('Processing...')
      setProgress(88)
      fetch('/api/submit/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poster_upload_id: uploadData?.poster_upload_id || uploadData?.id || null }),
      }).catch(() => {})

      setProgress(100)
      setStatusText('Submitted')
      setSuccessText('Submitted.')
      setSelectedFile(null)
      setCompressed(null)
      if (!reuseSeenAt) setSeenAtName('')
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
      if (cameraInputRef.current) cameraInputRef.current.value = ''
      if (pickerInputRef.current) pickerInputRef.current.value = ''
    } catch (err) {
      setStatusText('Upload failed')
      setProgress(40)
      setErrorText(`${err instanceof Error ? err.message : 'Upload failed'}. You can retry without reselecting.`)
    } finally {
      setSubmitting(false)
    }
  }

  function openCamera() {
    if (!cameraInputRef.current) return
    cameraInputRef.current.value = ''
    cameraInputRef.current.click()
  }

  function openPicker() {
    if (!pickerInputRef.current) return
    pickerInputRef.current.value = ''
    pickerInputRef.current.click()
  }

  const canRetry = Boolean(compressed && errorText && !compressing && !submitting)
  const targetSizeLabel = compressed ? bytesToMB(compressed.targetMaxBytes) : null

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 28px', fontFamily: 'sans-serif' }}>
      <h1 style={{ margin: 0 }}>Submit</h1>
      <p style={{ marginTop: 8, opacity: 0.75 }}>Take or choose a poster photo, then upload.</p>

      <section style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: 16, display: 'grid', gap: 12, marginTop: 14 }}>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: 18 }}>Seen at</h3>
          <label style={{ display: 'block' }}>
            Seen at
            <input
              value={seenAtName}
              onChange={(e) => setSeenAtName(e.target.value)}
              placeholder="e.g., Emmerson Cafe Community Board"
              style={{ width: '100%', marginTop: 4, padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }}
            />
          </label>
          <label style={{ display: 'block', marginTop: 8, fontSize: 13 }}>
            <input type="checkbox" checked={reuseSeenAt} onChange={(e) => setReuseSeenAt(e.target.checked)} /> Use same Seen at for next submit
          </label>
        </div>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => onFileSelected(e.target.files?.[0] || null)}
          style={{ display: 'none' }}
        />
        <input
          ref={pickerInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => onFileSelected(e.target.files?.[0] || null)}
          style={{ display: 'none' }}
        />

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button data-variant="secondary" onClick={openCamera} disabled={submitting || compressing} style={{ minHeight: 44 }}>
            Take photo
          </button>
          <button data-variant="secondary" onClick={openPicker} disabled={submitting || compressing} style={{ minHeight: 44 }}>
            Choose photo
          </button>
        </div>

        {compressing ? <p style={{ margin: 0 }}>Preparing image...</p> : null}
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Compressed preview" style={{ width: '100%', borderRadius: 8, border: '1px solid #e5e7eb' }} />
        ) : null}

        {(originalStats && compressedStats) ? (
          <div style={{ fontSize: 13, opacity: 0.85, display: 'grid', gap: 4 }}>
            <div>Original: {originalStats.size} ({originalStats.width} x {originalStats.height})</div>
            <div>Compressed: {compressedStats.size} ({compressedStats.width} x {compressedStats.height})</div>
            <div style={{ color: compressedStats.withinTarget ? '#166534' : '#92400e' }}>
              Target: {targetSizeLabel} max {compressedStats.withinTarget ? 'met' : 'not met; best effort used'}
            </div>
          </div>
        ) : null}

        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, background: '#fff' }}>
          <div style={{ height: 8, borderRadius: 999, background: '#e5e7eb', overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: '#2563eb', transition: 'width 160ms ease' }} />
          </div>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>{statusText || 'Waiting for photo'}</div>
        </div>

        <button onClick={submitPhoto} style={{ width: '100%', minHeight: 44 }} disabled={!compressed || submitting || compressing}>
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
        {canRetry ? (
          <button data-variant="secondary" onClick={submitPhoto} style={{ width: '100%', minHeight: 44 }} disabled={submitting || compressing}>
            Retry upload
          </button>
        ) : null}
      </section>

      {errorText ? <p style={{ marginTop: 12, color: '#b91c1c' }}>{errorText}</p> : null}
      {successText ? <p style={{ marginTop: 12, color: '#166534' }}>{successText}</p> : null}
    </main>
  )
}
