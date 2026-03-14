export type PosterSeenAtShape = {
  seen_at_name?: string | null
}

export function getPosterSeenAt(upload: PosterSeenAtShape | null | undefined): string | null {
  const value = upload?.seen_at_name
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}
