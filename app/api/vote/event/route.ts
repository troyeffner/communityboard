import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function isMissingVotesTable(error: { code?: string; message?: string } | null | undefined) {
  const lower = (error?.message || '').toLowerCase()
  return error?.code === '42P01' || lower.includes('event_votes')
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return jsonError('Invalid JSON')

  const eventId = String(body.event_id || '').trim()
  if (!eventId) return jsonError('event_id is required')

  const voterVid = req.headers.get('x-cb-vid')?.trim() || ''
  if (!voterVid) return jsonError('x-cb-vid header is required')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return jsonError('Missing Supabase env vars', 500)

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const insert = await supabase
    .from('event_votes')
    .insert([{ event_id: eventId, voter_vid: voterVid }])

  if (insert.error) {
    // Unique (event_id, voter_vid): treat repeated upvote as success.
    if (insert.error.code === '23505') {
      // no-op
    } else {
      if (isMissingVotesTable(insert.error)) return jsonError('event_votes table is missing. Run migrations.', 500)
      return jsonError(insert.error.message, 500)
    }
  }

  const countResult = await supabase
    .from('event_votes')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)

  if (countResult.error) return jsonError(countResult.error.message, 500)

  return NextResponse.json({ upvotes: countResult.count || 0, votedByMe: true })
}
