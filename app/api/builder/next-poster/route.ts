import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    .neq('status', 'done')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (query.error) return jsonError(query.error.message, 500)
  return NextResponse.json({ poster: query.data || null })
}
