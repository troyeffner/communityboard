import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 })
  }

  const supabase = createClient(url, serviceKey)

  const { data, error } = await supabase
    .from('poster_uploads')
    .select('id, file_path, status, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const uploadsWithUrls = (data || []).map((u) => {
    const { data: pub } = supabase.storage.from('posters').getPublicUrl(u.file_path)
    return { ...u, public_url: pub.publicUrl }
  })

  return NextResponse.json({ uploads: uploadsWithUrls })
}
