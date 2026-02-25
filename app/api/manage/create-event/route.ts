import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return badRequest('Invalid JSON')

  const { password, title, start_at, status } = body as {
    password?: string
    title?: string
    start_at?: string
    status?: 'draft' | 'published'
  }

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return badRequest('Unauthorized', 401)
  }
  if (!title?.trim()) return badRequest('Title is required')
  if (!start_at?.trim()) return badRequest('start_at is required')
  if (status !== 'draft' && status !== 'published') return badRequest('Invalid status')

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    return badRequest('Server is missing Supabase env vars', 500)
  }

  // Convert datetime-local (YYYY-MM-DDTHH:mm) into an ISO string interpreted as America/New_York
  // We store as timestamptz. For Phase 1, we treat the input as NY local time.
  const nyIsoGuess = start_at.length === 16 ? `${start_at}:00` : start_at

  const supabaseAdmin = createClient(url, serviceKey)

  const { error } = await supabaseAdmin.from('events').insert([
    {
      title: title.trim(),
      start_at: nyIsoGuess,
      status,
    },
  ])

  if (error) return badRequest(error.message, 500)

  return NextResponse.json({ ok: true })
}
