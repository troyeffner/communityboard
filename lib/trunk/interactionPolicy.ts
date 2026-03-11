export type InteractionPolicy = {
  voteLimitPer24h: number
  tagPromotionThreshold: number
}

const DEFAULT_POLICY: InteractionPolicy = {
  voteLimitPer24h: 30,
  tagPromotionThreshold: 3,
}

function positiveInt(raw: string | undefined, fallback: number) {
  if (!raw) return fallback
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return n
}

export function getInteractionPolicy(): InteractionPolicy {
  return {
    voteLimitPer24h: positiveInt(process.env.CB_VOTE_LIMIT_PER_24H, DEFAULT_POLICY.voteLimitPer24h),
    tagPromotionThreshold: positiveInt(process.env.CB_TAG_PROMOTION_THRESHOLD, DEFAULT_POLICY.tagPromotionThreshold),
  }
}

