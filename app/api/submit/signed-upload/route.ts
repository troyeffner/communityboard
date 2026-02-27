import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const contentType = String(body?.content_type || 'image/jpeg')

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return jsonError('Missing Supabase env vars', 500)

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })
  const path = `uploads/${Date.now()}-${Math.random().toString(16).slice(2)}.jpg`
  const signed = await supabase.storage.from('posters').createSignedUploadUrl(path)
  if (signed.error) return jsonError(signed.error.message, 500)

  return NextResponse.json({
    ok: true,
    path,
    token: signed.data.token,
    signed_url: signed.data.signedUrl,
    content_type: contentType,
  })
}
