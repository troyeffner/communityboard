"use client"

function sid() {
  try {
    const key = "cb_marketing_sid"
    const existing = localStorage.getItem(key)
    if (existing) return existing
    const fresh = crypto.randomUUID()
    localStorage.setItem(key, fresh)
    return fresh
  } catch {
    return undefined
  }
}

export async function track(
  name: "page_view" | "prompt_choice" | "false_door_click" | "cta_click" | "email_capture",
  path: string,
  meta?: Record<string, unknown>
) {
  await fetch("/api/marketing/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      path,
      ts: new Date().toISOString(),
      sid: sid(),
      meta: meta || {},
    }),
  })
}
