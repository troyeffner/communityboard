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

  const query = await supabase
    .from('poster_uploads')
    .select('id,created_at,status')
    .order('created_at', { ascending: true })
    .limit(200)

  if (query.error) return jsonError(query.error.message, 500)
  const rows = (query.data || []) as Array<{ id: string; created_at: string; status: string | null }>
  const next = rows.find((row) => normalizePosterStatus(row.status || '') !== POSTER_STATUSES.DONE) || null
  return NextResponse.json({ poster: next })
}
