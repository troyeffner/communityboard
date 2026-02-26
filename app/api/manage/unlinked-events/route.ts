import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

type UnlinkedEventRow = {
  id: string
  title: string
  location: string | null
  start_at: string
  status: 'draft' | 'published'
  created_at: string
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return jsonError('Missing Supabase env vars', 500)

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

  const { data, error } = await supabase
    .from('events')
    .select('id, title, location, start_at, status, created_at, poster_event_links!left(id)')
    .is('poster_event_links.id', null)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return jsonError(error.message, 500)

  const rows = ((data || []) as Array<UnlinkedEventRow & { poster_event_links?: unknown }>)
    .map((row) => ({
      id: row.id,
      title: row.title,
      location: row.location,
      start_at: row.start_at,
      status: row.status,
      created_at: row.created_at,
    }))

  return NextResponse.json({ rows })
}
