import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { POSTER_STATUSES, normalizePosterStatus } from '@/lib/statuses'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return jsonError('Missing Supabase env vars', 500)

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

  const primary = await supabase
    .from('poster_uploads')
    .select('id,created_at,status,done,is_done,processed_at')
    .order('created_at', { ascending: true })
    .limit(200)

  let rows: Array<{ id: string; created_at: string; status: string | null; done?: boolean | null; is_done?: boolean | null; processed_at?: string | null }> = []

  if (primary.error) {
    const message = (primary.error.message || '').toLowerCase()
    const missingDone = primary.error.code === '42703' || message.includes('done') || message.includes('is_done') || message.includes('processed_at') || message.includes('schema cache')
    if (!missingDone) return jsonError(primary.error.message, 500)
    const fallback = await supabase
      .from('poster_uploads')
      .select('id,created_at,status')
      .order('created_at', { ascending: true })
      .limit(200)
    if (fallback.error) return jsonError(fallback.error.message, 500)
    rows = (fallback.data || []) as Array<{ id: string; created_at: string; status: string | null }>
  } else {
    rows = (primary.data || []) as Array<{ id: string; created_at: string; status: string | null; done?: boolean | null; is_done?: boolean | null; processed_at?: string | null }>
  }
  const next = rows.find((row) => {
    const doneByStatus = normalizePosterStatus(row.status || '') === POSTER_STATUSES.DONE
    const doneByFlags = Boolean(row.done ?? row.is_done ?? row.processed_at)
    return !doneByStatus && !doneByFlags
  }) || null
  return NextResponse.json({ poster: next })
}
