export const EVENT_CATEGORIES = [
  'music',
  'performance',
  'arts',
  'film',
  'talk',
  'workshop',
  'community',
  'civic',
  'education',
  'spiritual',
  'sports',
  'family',
  'market',
  'food_drink',
] as const

export const BUSINESS_CATEGORIES = [
  'therapy_coaching',
  'healthcare',
  'legal',
  'finance',
  'real_estate',
  'home_services',
  'creative_services',
  'events_venue',
  'nonprofit',
  'education_services',
  'pets',
  'auto',
  'retail',
  'hospitality',
] as const

export const ATTRIBUTES = [
  'free',
  'donation',
  'ticketed',
  'in_person',
  'online',
  'hybrid',
  'reservation_required',
  'walk_in',
  'limited_capacity',
  'social',
  'networking',
  'support_group',
  'family_friendly',
  'morning',
  'afternoon',
  'evening',
  'late_night',
] as const

export const AUDIENCE = [
  'kids',
  'teens',
  'college',
  'adults',
  'seniors',
  'parents',
  'lgbtq',
  'newcomers',
  'small_business',
  'artists_makers',
] as const

export type EventCategory = (typeof EVENT_CATEGORIES)[number]
export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number]
export type AttributeTag = (typeof ATTRIBUTES)[number]
export type AudienceTag = (typeof AUDIENCE)[number]

export function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
  }
  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean)
  }
  return []
}

export function toSet(values: readonly string[]) {
  return new Set(values)
}
