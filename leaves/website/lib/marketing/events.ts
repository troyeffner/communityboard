export type MarketingEventName =
  | "page_view"
  | "prompt_choice"
  | "false_door_click"
  | "cta_click"
  | "email_capture"

export type MarketingEvent = {
  name: MarketingEventName
  path: string
  ts: string
  // optional payload
  meta?: Record<string, unknown>
  // optional anon session id
  sid?: string
}

/**
 * Phase 0 storage: just log.
 * Phase 1: write to DB (Supabase).
 * Phase 2: aggregate metrics + dashboards.
 */
export async function recordMarketingEvent(evt: MarketingEvent) {
  // eslint-disable-next-line no-console
  console.log("[marketing-event]", JSON.stringify(evt))
}

/**
 * Phase 0 summary: returns "not implemented" until DB exists.
 * If you want a quick in-memory aggregator, we can add it,
 * but it resets on reload (dev server restart).
 */
export async function marketingSummary() {
  return {
    ok: true,
    note: "Summary not persisted yet. Events are logged to server console.",
  }
}
