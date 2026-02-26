import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireBuilder } from '@/lib/builder-auth'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

type Row = {
  id: string
  title: string
  description: string | null
  location: string | null
  start_at: string
  end_at: string | null
  status: string
  is_recurring: boolean | null
  recurrence_rule: string | null
  created_at: string
  event_location_name: string | null
  event_location_address: string | null
}

export async function GET(req: Request) {
  const auth = await requireBuilder(req)
  if (!auth.ok) return auth.response

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.DEV_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DEV_SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return jsonError('Missing Supabase env vars', 500)
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const params = new URL(req.url).searchParams
  const status = params.get('status')
  const linked = params.get('linked')
  const recurring = params.get('recurring')
  const q = params.get('q')?.trim().toLowerCase() || ''

  const eventsResult = await supabase
    .from('events')
    .select('id,title,description,location,start_at,end_at,status,is_recurring,recurrence_rule,created_at,event_location_name,event_location_address')
    .order('created_at', { ascending: false })
    .limit(300)
  if (eventsResult.error) return jsonError(eventsResult.error.message, 500)

  const linksResult = await supabase.from('poster_event_links').select('event_id,poster_upload_id')
  if (linksResult.error) return jsonError(linksResult.error.message, 500)
  const linkCounts = new Map<string, number>()
  const posterByEvent = new Map<string, string>()
  for (const row of (linksResult.data || []) as Array<{ event_id: string; poster_upload_id: string }>) {
    linkCounts.set(row.event_id, (linkCounts.get(row.event_id) || 0) + 1)
    if (!posterByEvent.has(row.event_id)) posterByEvent.set(row.event_id, row.poster_upload_id)
  }

  const rows = ((eventsResult.data || []) as Row[])
    .map((row) => ({
      ...row,
      is_recurring: Boolean(row.is_recurring),
      linked_count: linkCounts.get(row.id) || 0,
      is_linked: (linkCounts.get(row.id) || 0) > 0,
      poster_upload_id: posterByEvent.get(row.id) || null,
    }))
    .filter((row) => {
      if (status && row.status !== status) return false
      if (linked === 'linked' && !row.is_linked) return false
      if (linked === 'unlinked' && row.is_linked) return false
      if (recurring === 'true' && !row.is_recurring) return false
      if (q) {
        const haystack = `${row.title} ${row.description || ''} ${row.location || ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })

  return NextResponse.json({ rows })
}
