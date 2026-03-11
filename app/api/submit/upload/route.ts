import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { buildPosterUploadInsertCandidates, isUploadInsertRetryable } from '@/lib/trunk/uploadPolicy'

export const runtime = 'nodejs'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function isMissingColumn(error: { code?: string; message?: string } | null | undefined, column: string) {
  const message = (error?.message || '').toLowerCase()
  return error?.code === '42703' || message.includes(column.toLowerCase()) || message.includes('schema cache')
}

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return jsonError('Missing Supabase env vars', 500)

  const supabase = createClient(url, serviceKey)

  const form = await req.formData().catch(() => null)
  if (!form) return jsonError('Invalid form data')

  const file = form.get('file')
  if (!file || !(file instanceof File)) return jsonError('Missing file (field name: file)')
  if (!file.type.startsWith('image/')) return jsonError('File must be an image')

  const seen_at_name = String(form.get('seen_at_name') || '').trim() || null
  if (!seen_at_name) return jsonError('Seen at is required')

  // Read file into a Buffer
  const arrayBuffer = await file.arrayBuffer()
  const inputBuffer = Buffer.from(arrayBuffer)

  // Server-side safety resize/compression: longest edge ~1600px, JPEG quality 80.
  const outputBuffer = await sharp(inputBuffer)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer()

  // Store with a unique path
  const filePath = `uploads/${Date.now()}-${Math.random().toString(16).slice(2)}.jpg`

  // Upload to Storage bucket "posters"
  const { error: uploadErr } = await supabase.storage
    .from('posters')
    .upload(filePath, outputBuffer, {
      contentType: 'image/jpeg',
      upsert: false,
    })

  if (uploadErr) return jsonError(uploadErr.message, 500)

  // Insert poster_uploads row
  const insertCandidates = buildPosterUploadInsertCandidates(filePath, seen_at_name)

  let row: { id?: string } | null = null
  let insertErr: { code?: string; message?: string } | null = null

  for (const candidate of insertCandidates) {
    const attempt = await supabase
      .from('poster_uploads')
      .insert([candidate as never])
      .select('id')
      .single()
    if (!attempt.error && attempt.data) {
      row = attempt.data
      insertErr = null
      break
    }
    insertErr = attempt.error
    if (!attempt.error) continue
    if (isUploadInsertRetryable(attempt.error, isMissingColumn)) {
      continue
    }
    return jsonError(attempt.error.message, 500)
  }

  if (insertErr) return jsonError(insertErr.message || 'Failed to create upload record', 500)
  if (!row?.id) return jsonError('Failed to create upload record', 500)

  return NextResponse.json({ ok: true, id: row.id, poster_upload_id: row.id })
}
