import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getViewerIdFromCookie } from '@/lib/viewer-id'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function getViewerId(req: Request) {
  const header = req.headers.get('x-cb-vid') || ''
  if (header.trim()) return header.trim()
  return getViewerIdFromCookie(req.headers.get('cookie'))
}

async function countAndStatus(supabase: any, itemId: string, viewerId: string) {
  const [countRes, mineRes] = await Promise.all([
    supabase.from('poster_item_upvotes').select('*', { count: 'exact', head: true }).eq('poster_item_id', itemId),
    supabase.from('poster_item_upvotes').select('id').eq('poster_item_id', itemId).eq('viewer_id', viewerId).limit(1),
  ])
  const upvotes = Number(countRes.count || 0)
  const votedByMe = !mineRes.error && (mineRes.data || []).length > 0
  await supabase
    .from('poster_items' as never)
    .update({ upvote_count: upvotes } as never)
    .eq('id', itemId)
  return { upvotes, votedByMe }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const itemId = String(id || '').trim()
  if (!itemId) return jsonError('item id is required')

  const viewerId = getViewerId(req)
  if (!viewerId) return jsonError('Missing viewer id', 400)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return jsonError('Missing Supabase env vars', 500)
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const insert = await supabase
    .from('poster_item_upvotes')
    .insert([{ poster_item_id: itemId, viewer_id: viewerId }])
  if (insert.error && insert.error.code !== '23505') return jsonError(insert.error.message, 500)

  const status = await countAndStatus(supabase, itemId, viewerId)
  return NextResponse.json(status)
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const itemId = String(id || '').trim()
  if (!itemId) return jsonError('item id is required')

  const viewerId = getViewerId(req)
  if (!viewerId) return jsonError('Missing viewer id', 400)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return jsonError('Missing Supabase env vars', 500)
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const del = await supabase
    .from('poster_item_upvotes')
    .delete()
    .eq('poster_item_id', itemId)
    .eq('viewer_id', viewerId)
  if (del.error) return jsonError(del.error.message, 500)

  const status = await countAndStatus(supabase, itemId, viewerId)
  return NextResponse.json(status)
}
