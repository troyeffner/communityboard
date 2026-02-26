import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function fingerprintFromRequest(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown-ip'
  const ua = req.headers.get('user-agent') || 'unknown-ua'
  return createHash('sha256').update(`${ip}|${ua}`).digest('hex')
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return jsonError('Invalid JSON')
  const eventId = String(body.event_id || '').trim()
  const tagId = String(body.tag_id || '').trim()
  if (!eventId || !tagId) return jsonError('event_id and tag_id are required')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.DEV_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DEV_SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return jsonError('Missing Supabase env vars', 500)
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  const fingerprint = fingerprintFromRequest(req)

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const recentVotes = await supabase
    .from('tag_votes')
    .select('event_id', { count: 'exact', head: true })
    .eq('voter_fingerprint', fingerprint)
    .gte('created_at', cutoff)
  if (recentVotes.error) {
    const message = (recentVotes.error.message || '').toLowerCase()
    if (message.includes('relation "tag_votes"')) return jsonError('Tag voting is not enabled yet. Run migrations.', 500)
    return jsonError(recentVotes.error.message, 500)
  }
  if ((recentVotes.count || 0) >= 30) return jsonError('Vote limit reached (30 per 24h).', 429)

  const insertVote = await supabase
    .from('tag_votes')
    .upsert([{ event_id: eventId, tag_id: tagId, voter_fingerprint: fingerprint }], { onConflict: 'event_id,tag_id,voter_fingerprint' })
  if (insertVote.error) return jsonError(insertVote.error.message, 500)

  const countVotes = await supabase
    .from('tag_votes')
    .select('event_id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('tag_id', tagId)
  if (countVotes.error) return jsonError(countVotes.error.message, 500)

  const votes = countVotes.count || 0
  let promoted = false
  if (votes >= 3) {
    const promote = await supabase
      .from('event_tags')
      .upsert([{ event_id: eventId, tag_id: tagId, source: 'community' }], { onConflict: 'event_id,tag_id' })
    if (promote.error) return jsonError(promote.error.message, 500)
    promoted = true
  }

  return NextResponse.json({ ok: true, votes, promoted })
}
