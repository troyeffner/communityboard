import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'unknown error'
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)')
  }

  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const link_id = body?.link_id as string | undefined

    if (!link_id) {
      return NextResponse.json({ error: 'link_id is required' }, { status: 400 })
    }

    const supabase = getAdminClient()

    // 1) Load the link (to get event_id)
    const { data: linkRow, error: linkErr } = await supabase
      .from('poster_event_links')
      .select('id,event_id')
      .eq('id', link_id)
      .maybeSingle()

    if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 })
    if (!linkRow) return NextResponse.json({ error: 'link not found' }, { status: 404 })

    const eventId = linkRow.event_id

    // 2) Delete the link first
    const { error: delLinkErr } = await supabase
      .from('poster_event_links')
      .delete()
      .eq('id', link_id)

    if (delLinkErr) return NextResponse.json({ error: delLinkErr.message }, { status: 500 })

    // 3) Delete the event (since you said “in case of errors”)
    // If later you want “unlink only”, we can switch this behavior.
    const { error: delEventErr } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)

    if (delEventErr) return NextResponse.json({ error: delEventErr.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
