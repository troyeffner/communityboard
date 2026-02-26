'use client'

import { useState } from 'react'

export default function SubmitPage() {
  const [file, setFile] = useState<File | null>(null)
  const [message, setMessage] = useState<string>('')

  async function onSubmit() {
    if (!file) {
      setMessage('Pick an image first.')
      return
    }

    setMessage('Uploading...')

    const form = new FormData()
    form.append('file', file)

    const res = await fetch('/api/submit/upload', {
      method: 'POST',
      body: form,
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setMessage(data?.error || 'Upload failed')
      return
    }

    setMessage('Submitted. You can now process it in /manage.')
    setFile(null)  }

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 800 }}>
      <h1>Submit</h1>
      <p style={{ opacity: 0.8 }}>
        Upload a poster photo. It will appear in <code>/manage</code> for processing.
      </p>

      <input
        id="file"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        style={{ display: 'block', marginTop: 16 }}
      />

      <button
        onClick={onSubmit}
        style={{ marginTop: 16, padding: '10px 14px' }}
        disabled={!file}
      >
        Submit image
      </button>

      {message && <p style={{ marginTop: 12 }}>{message}</p>}
    </main>
  )
}
