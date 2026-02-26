import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type EventRow = {
  id: string
  title: string
  location: string | null
  description?: string | null
  start_at: string
  status?: 'draft' | 'published'
}

export const runtime = 'nodejs'

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

function toIcsDateTime(iso: string) {
  const dt = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return [
    dt.getUTCFullYear(),
    pad(dt.getUTCMonth() + 1),
    pad(dt.getUTCDate()),
    'T',
    pad(dt.getUTCHours()),
    pad(dt.getUTCMinutes()),
    pad(dt.getUTCSeconds()),
    'Z',
  ].join('')
}

function sanitizeTitleForFilename(title: string) {
  return title
    .replace(/[\/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

function nyDateForFilename(iso: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso))
  const year = parts.find((p) => p.type === 'year')?.value || '0000'
  const month = parts.find((p) => p.type === 'month')?.value || '00'
  const day = parts.find((p) => p.type === 'day')?.value || '00'
  return `${year}-${month}-${day}`
}

function isMissingDescriptionColumn(error: { code?: string; message?: string } | null | undefined) {
  const message = (error?.message || '').toLowerCase()
  return error?.code === '42703' || message.includes('description') || message.includes('schema cache')
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 })
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })
  const primary = await supabase
    .from('events')
    .select('id,title,location,description,start_at,status')
    .eq('id', id)
    .limit(1)

  let row: EventRow | null = null
  if (primary.error) {
    if (!isMissingDescriptionColumn(primary.error)) {
      return NextResponse.json({ error: primary.error.message }, { status: 500 })
    }
    const fallback = await supabase
      .from('events')
      .select('id,title,location,start_at,status')
      .eq('id', id)
      .limit(1)
    if (fallback.error) return NextResponse.json({ error: fallback.error.message }, { status: 500 })
    row = (fallback.data?.[0] || null) as EventRow | null
  } else {
    row = (primary.data?.[0] || null) as EventRow | null
  }

  if (!row) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const start = new Date(row.start_at)
  const end = new Date(start.getTime() + 90 * 60 * 1000)
  const safeTitle = sanitizeTitleForFilename(row.title || 'event') || 'event'
  const filename = `${nyDateForFilename(row.start_at)} - ${safeTitle}.ics`

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CommunityBoard//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${row.id}@communityboard`,
    `DTSTAMP:${toIcsDateTime(new Date().toISOString())}`,
    `DTSTART:${toIcsDateTime(start.toISOString())}`,
    `DTEND:${toIcsDateTime(end.toISOString())}`,
    `SUMMARY:${escapeIcsText(row.title || 'Event')}`,
    `DESCRIPTION:${escapeIcsText(row.description || '')}`,
    `LOCATION:${escapeIcsText(row.location || '')}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n')

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
