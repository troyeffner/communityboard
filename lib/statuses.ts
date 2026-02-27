export const POSTER_STATUSES = {
  NEW: 'new',
  UPLOADED: 'uploaded',
  TENDING: 'tending',
  DONE: 'processed',
} as const

export const EVENT_STATUSES = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  PLANTED: 'draft',
  UNPUBLISHED: 'draft',
} as const

export type PosterStatus = (typeof POSTER_STATUSES)[keyof typeof POSTER_STATUSES]
export type EventStatus = (typeof EVENT_STATUSES)[keyof typeof EVENT_STATUSES]

export const POSTER_STATUS_VALUES: PosterStatus[] = Object.values(POSTER_STATUSES)
export const EVENT_STATUS_VALUES: EventStatus[] = Object.values(EVENT_STATUSES)

export function normalizePosterStatus(raw: unknown, fallback: PosterStatus = POSTER_STATUSES.NEW): PosterStatus {
  const value = String(raw || '').trim().toLowerCase()
  if (value === 'done') return POSTER_STATUSES.DONE
  if (POSTER_STATUS_VALUES.includes(value as PosterStatus)) return value as PosterStatus
  return fallback
}

export function normalizeEventStatus(raw: unknown, fallback: EventStatus = EVENT_STATUSES.DRAFT): EventStatus {
  const value = String(raw || '').trim().toLowerCase()
  if (value === 'on_board') return EVENT_STATUSES.PUBLISHED
  if (value === 'planted' || value === 'unpublished') return EVENT_STATUSES.DRAFT
  if (EVENT_STATUS_VALUES.includes(value as EventStatus)) return value as EventStatus
  return fallback
}

export function eventStatusLabel(raw: unknown) {
  const normalized = normalizeEventStatus(raw, EVENT_STATUSES.DRAFT)
  return normalized === EVENT_STATUSES.PUBLISHED ? 'Pinned' : 'Draft'
}

export function posterStatusLabel(raw: unknown) {
  const normalized = normalizePosterStatus(raw, POSTER_STATUSES.NEW)
  if (normalized === POSTER_STATUSES.DONE) return 'done'
  if (normalized === POSTER_STATUSES.TENDING) return 'tending'
  if (normalized === POSTER_STATUSES.UPLOADED) return 'uploaded'
  return 'new'
}
