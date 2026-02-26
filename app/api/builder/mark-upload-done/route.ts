import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireBuilder } from '@/lib/builder-auth'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(req: Request) {
  const auth = await requireBuilder(req)
  if (!auth.ok) return auth.response

  const body = await req.json().catch(() => null)
  if (!body) return jsonError('Invalid JSON')
  const posterUploadId = String(body.poster_upload_id || '').trim()
  const isDone = Boolean(body.is_done)
  if (!posterUploadId) return jsonError('poster_upload_id is required')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.DEV_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DEV_SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return jsonError('Missing Supabase env vars', 500)
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const update = await supabase
    .from('poster_uploads')
    .update({ is_done: isDone, done: isDone, processed_at: isDone ? new Date().toISOString() : null })
    .eq('id', posterUploadId)
  if (update.error) return jsonError(update.error.message, 500)

  return NextResponse.json({ ok: true, is_done: isDone })
}
