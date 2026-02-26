import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
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

  // Read file into a Buffer
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Store with a unique path
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(ext) ? ext : 'jpg'
  const filePath = `uploads/${Date.now()}-${Math.random().toString(16).slice(2)}.${safeExt}`

  // Upload to Storage bucket "posters"
  const { error: uploadErr } = await supabase.storage
    .from('posters')
    .upload(filePath, buffer, {
      contentType: file.type || 'image/jpeg',
      upsert: false,
    })

  if (uploadErr) return jsonError(uploadErr.message, 500)

  // Insert poster_uploads row
  const { data: row, error: insertErr } = await supabase
    .from('poster_uploads')
    .insert([{ file_path: filePath, status: 'uploaded' }])
    .select('id')
    .single()

  if (insertErr) return jsonError(insertErr.message, 500)

  return NextResponse.json({ ok: true, id: row.id })
}
