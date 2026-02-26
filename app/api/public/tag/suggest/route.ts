import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function fingerprintFromRequest(req: Request) {
  const cbVid = req.headers.get('x-cb-vid')?.trim()
  if (cbVid) return `cb_vid:${cbVid}`
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown-ip'
  const ua = req.headers.get('user-agent') || 'unknown-ua'
  return createHash('sha256').update(`${ip}|${ua}`).digest('hex')
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80)
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return jsonError('Invalid JSON')

  const eventId = String(body.event_id || '').trim()
  const rawLabel = String(body.label || '').trim()
  const kindRaw = String(body.kind || 'attribute').trim().toLowerCase()
  if (!eventId) return jsonError('event_id is required')
  if (!rawLabel) return jsonError('label is required')
  const kind = kindRaw === 'category' || kindRaw === 'audience' ? kindRaw : 'attribute'
  const slug = toSlug(rawLabel)
  if (!slug) return jsonError('label must contain letters or numbers')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return jsonError('Missing Supabase env vars', 500)
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const existingTag = await supabase
    .from('tags')
    .select('id,label,kind,slug')
    .eq('slug', slug)
    .maybeSingle()
  if (existingTag.error) return jsonError(existingTag.error.message, 500)

  let tagId = existingTag.data?.id as string | undefined
  if (!tagId) {
    const insertTag = await supabase.from('tags').insert([{ label: rawLabel, kind, slug }]).select('id').single()
    if (insertTag.error) {
      if (insertTag.error.code === '23505') {
        const retry = await supabase.from('tags').select('id').eq('slug', slug).single()
        if (retry.error) return jsonError(retry.error.message, 500)
        tagId = retry.data?.id as string | undefined
      } else {
        return jsonError(insertTag.error.message, 500)
      }
    } else {
      tagId = insertTag.data?.id as string | undefined
    }
  }
  if (!tagId) return jsonError('Failed to resolve tag id', 500)

  const fingerprint = fingerprintFromRequest(req)
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const recentVotes = await supabase
    .from('tag_votes')
    .select('event_id', { count: 'exact', head: true })
    .eq('voter_fingerprint', fingerprint)
    .gte('created_at', cutoff)
  if (recentVotes.error) return jsonError(recentVotes.error.message, 500)
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

  return NextResponse.json({
    ok: true,
    tag: { id: tagId, label: existingTag.data?.label || rawLabel, kind: existingTag.data?.kind || kind, slug },
    votes,
    promoted,
  })
}
