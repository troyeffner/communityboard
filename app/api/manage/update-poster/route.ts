import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function isMissingSeenAtName(error: { code?: string; message?: string } | null | undefined) {
  const message = (error?.message || '').toLowerCase()
  return (
    error?.code === '42703' ||
    message.includes('seen_at_name') ||
    message.includes('schema cache')
  )
}

async function handleUpdatePoster(body: unknown) {
  if (!body || typeof body !== 'object') return jsonError('Invalid JSON')
  const payload = body as Record<string, unknown>

  const posterUploadId = String(payload.poster_upload_id || '').trim()
  if (!posterUploadId) return jsonError('poster_upload_id is required')

  const updates: { seen_at_name?: string | null; status?: string } = {}
  if (typeof payload.seen_at_name === 'string') {
    const trimmed = payload.seen_at_name.trim()
    if (trimmed) updates.seen_at_name = trimmed
  }
  if (typeof payload.status === 'string' && payload.status.trim()) {
    updates.status = payload.status.trim()
  }
  if (Object.keys(updates).length === 0) {
    return jsonError('No valid fields to update')
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return jsonError('Missing Supabase env vars', 500)
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

  const result = await supabase
    .from('poster_uploads')
    .update(updates)
    .eq('id', posterUploadId)
    .select('id,file_path,status,created_at,seen_at_name')
    .maybeSingle()

  if (result.error && isMissingSeenAtName(result.error)) {
    return jsonError('Run migration: poster_uploads.seen_at_name', 500)
  }

  if (result.error) return jsonError(result.error.message, 500)
  if (!result.data) return jsonError('Poster not found', 404)

  return NextResponse.json({ ok: true, row: result.data })
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null)
  return handleUpdatePoster(body)
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  return handleUpdatePoster(body)
}
