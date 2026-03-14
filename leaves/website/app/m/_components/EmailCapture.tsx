"use client"

import * as React from "react"
import { track } from "./marketingClient"

export function EmailCapture({ path }: { path: string }) {
  const [email, setEmail] = React.useState("")
  const [sent, setSent] = React.useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    await track("email_capture", path, { email })
    setSent(true)
    setEmail("")
  }

  if (sent) {
    return (
      <div className="text-sm text-slate-700">
        Noted. If/when this becomes real, you’ll be the first to know.
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        placeholder="Email for updates (optional)"
      />
      <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
        Send
      </button>
    </form>
  )
}
