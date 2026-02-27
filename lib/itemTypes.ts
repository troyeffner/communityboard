export const ITEM_TYPES = [
  'event',
  'recurring_event',
  'class_program',
  'business_service',
  'opportunity',
  'announcement',
] as const

export type ItemType = (typeof ITEM_TYPES)[number]

const ITEM_TYPE_SET = new Set<string>(ITEM_TYPES)

export function normalizeItemType(raw: unknown, fallback: ItemType = 'event'): ItemType {
  const value = String(raw || '').trim().toLowerCase()
  if (ITEM_TYPE_SET.has(value)) return value as ItemType
  return fallback
}

export function isValidItemType(raw: unknown): raw is ItemType {
  return ITEM_TYPE_SET.has(String(raw || '').trim().toLowerCase())
}

