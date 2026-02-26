import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type EventStatus = 'draft' | 'published'

type EventRow = {
  id: string
  title: string
  location: string | null
  description?: string | null
  source_type?: string | null
  source_place?: string | null
  source_detail?: string | null
  start_at: string
  status: EventStatus
}

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

function sourceTypeLabel(value: string | null | undefined) {
  if (!value) return 'Unknown source'
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function isMissingColumns(error: { code?: string; message?: string } | null | undefined) {
  const message = (error?.message || '').toLowerCase()
  return (
    error?.code === '42703' ||
    message.includes('description') ||
    message.includes('source_type') ||
    message.includes('source_place') ||
    message.includes('source_detail') ||
    message.includes('schema cache')
  )
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
    .select('id,title,location,description,source_type,source_place,source_detail,start_at,status')
    .eq('id', id)
    .eq('status', 'published')
    .limit(1)

  let row: EventRow | null = null
  if (primary.error) {
    if (!isMissingColumns(primary.error)) {
      return NextResponse.json({ error: primary.error.message }, { status: 500 })
    }
    const fallback = await supabase
      .from('events')
      .select('id,title,location,start_at,status')
      .eq('id', id)
      .eq('status', 'published')
      .limit(1)
    if (fallback.error) {
      return NextResponse.json({ error: fallback.error.message }, { status: 500 })
    }
    row = (fallback.data?.[0] || null) as EventRow | null
  } else {
    row = (primary.data?.[0] || null) as EventRow | null
  }

  if (!row) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const descriptionLines: string[] = []
  if (row.description) descriptionLines.push(row.description)
  if (row.source_place) {
    const sourceLine = `Poster found: ${row.source_place} — ${sourceTypeLabel(row.source_type)}`
    descriptionLines.push(row.source_detail ? `${sourceLine} (${row.source_detail})` : sourceLine)
  }

  const dtstamp = toIcsDateTime(new Date().toISOString())
  const dtstart = toIcsDateTime(row.start_at)
  const uid = `${row.id}@communityboard`
  const summary = escapeIcsText(row.title)
  const location = escapeIcsText(row.location || '')
  const description = escapeIcsText(descriptionLines.join('\n'))

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CommunityBoard//Events//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `SUMMARY:${summary}`,
    `LOCATION:${location}`,
    `DESCRIPTION:${description}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n')

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="event-${row.id}.ics"`,
      'Cache-Control': 'no-store',
    },
  })
}
