import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.DEV_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DEV_SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 })
  }

  const supabase = createClient(url, serviceKey)

  const isMissingOptionalColumns = (message: string) => {
    const lower = message.toLowerCase()
    return (
      lower.includes('done') ||
      lower.includes('seen_at_label') ||
      lower.includes('seen_at_name') ||
      lower.includes('schema cache')
    )
  }

  const { data, error } = await supabase
    .from('poster_uploads')
    .select('id, file_path, status, created_at, done, seen_at_label, seen_at_name')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    if (error.code !== '42703' && !isMissingOptionalColumns(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const fallbackWithSeenAtName = await supabase
      .from('poster_uploads')
      .select('id, file_path, status, created_at, seen_at_name')
      .order('created_at', { ascending: false })
      .limit(20)

    if (!fallbackWithSeenAtName.error) {
      const uploadsWithUrls = (fallbackWithSeenAtName.data || []).map((u) => {
        const { data: pub } = supabase.storage.from('posters').getPublicUrl(u.file_path)
        return { ...u, done: false, seen_at_label: u.seen_at_name || null, seen_at_name: u.seen_at_name || null, public_url: pub.publicUrl }
      })

      return NextResponse.json({ uploads: uploadsWithUrls })
    }

    const fallback = await supabase
      .from('poster_uploads')
      .select('id, file_path, status, created_at')
      .order('created_at', { ascending: false })
      .limit(20)

    if (fallback.error) return NextResponse.json({ error: fallback.error.message }, { status: 500 })

    const uploadsWithUrls = (fallback.data || []).map((u) => {
      const { data: pub } = supabase.storage.from('posters').getPublicUrl(u.file_path)
      return { ...u, done: false, seen_at_label: null, seen_at_name: null, public_url: pub.publicUrl }
    })

    return NextResponse.json({ uploads: uploadsWithUrls })
  }

  const uploadsWithUrls = (data || []).map((u) => {
    const { data: pub } = supabase.storage.from('posters').getPublicUrl(u.file_path)
    return { ...u, seen_at_label: u.seen_at_label || u.seen_at_name || null, public_url: pub.publicUrl }
  })

  return NextResponse.json({ uploads: uploadsWithUrls })
}
