import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { OBJECT_TYPES, toSet } from '@/lib/taxonomy'

export const runtime = 'nodejs'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.DEV_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DEV_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return jsonError('Missing Supabase env vars', 500)

  const supabase = createClient(url, serviceKey)

  const form = await req.formData().catch(() => null)
  if (!form) return jsonError('Invalid form data')

  const file = form.get('file')
  if (!file || !(file instanceof File)) return jsonError('Missing file (field name: file)')
  if (!file.type.startsWith('image/')) return jsonError('File must be an image')

  const seen_at_type = String(form.get('seen_at_type') || '').trim().toLowerCase() || null
  const object_typeRaw = String(form.get('object_type') || 'event_poster').trim().toLowerCase()
  const seen_at_label = String(form.get('seen_at_label') || form.get('seen_at_name') || '').trim() || null
  const seen_at_notes = String(form.get('seen_at_notes') || '').trim() || null
  const seen_at_confidence = String(form.get('seen_at_confidence') || '').trim().toLowerCase() || 'unknown'
  const objectTypeSet = toSet(OBJECT_TYPES)
  const object_type = objectTypeSet.has(object_typeRaw) ? object_typeRaw : 'event_poster'

  const latRaw = String(form.get('seen_at_lat') || '').trim()
  const lngRaw = String(form.get('seen_at_lng') || '').trim()
  const seen_at_lat = latRaw ? Number(latRaw) : null
  const seen_at_lng = lngRaw ? Number(lngRaw) : null
  if (latRaw && Number.isNaN(seen_at_lat)) return jsonError('seen_at_lat must be numeric')
  if (lngRaw && Number.isNaN(seen_at_lng)) return jsonError('seen_at_lng must be numeric')

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
  const insertPayload = {
    file_path: filePath,
    status: 'uploaded',
    seen_at_type,
    seen_at_label,
    seen_at_name: seen_at_label,
    seen_at_notes,
    seen_at_lat,
    seen_at_lng,
    seen_at_confidence,
    object_type,
    is_done: false,
  }

  const insert = await supabase
    .from('poster_uploads')
    .insert([insertPayload])
    .select('id')
    .single()

  let row = insert.data
  let insertErr = insert.error
  if (insertErr) {
    const message = (insertErr.message || '').toLowerCase()
    const missingSeenAtLabel =
      insertErr.code === '42703' ||
      message.includes('seen_at_label') ||
      message.includes('schema cache')

    if (!missingSeenAtLabel && !message.includes('seen_at_') && !message.includes('done')) {
      return jsonError(insertErr.message, 500)
    }

    // Backward-compatible retry when seen_at_label is not present yet.
    const fallbackWithoutLabel = await supabase
      .from('poster_uploads')
      .insert([
        {
          file_path: filePath,
          status: 'uploaded',
          seen_at_name: seen_at_label,
          seen_at_type,
          seen_at_notes,
          seen_at_lat,
          seen_at_lng,
          seen_at_confidence,
        },
      ])
      .select('id')
      .single()

    row = fallbackWithoutLabel.data
    insertErr = fallbackWithoutLabel.error

    if (insertErr) {
      const fallbackPlain = await supabase
        .from('poster_uploads')
        .insert([{ file_path: filePath, status: 'uploaded' }])
        .select('id')
        .single()

      row = fallbackPlain.data
      insertErr = fallbackPlain.error
    }
  }

  if (insertErr) return jsonError(insertErr.message, 500)
  if (!row?.id) return jsonError('Failed to create upload record', 500)

  return NextResponse.json({ ok: true, id: row.id, poster_upload_id: row.id })
}
