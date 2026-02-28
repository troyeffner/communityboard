"use client"

import * as React from "react"
import { track } from "./marketingClient"

export function FalseDoorCTA(props: {
  path: string
  ctaId: string
  label: string
  detail?: string
}) {
  const { path, ctaId, label, detail } = props
  const [open, setOpen] = React.useState(false)

  async function click() {
    await track("false_door_click", path, { ctaId })
    setOpen(true)
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      <button
        onClick={click}
        className="w-full rounded-lg bg-slate-900 text-white text-sm font-medium py-2 hover:bg-slate-800"
      >
        {label}
      </button>

      {detail ? <div className="text-sm text-slate-600">{detail}</div> : null}

      {open ? (
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700">
          This is not live yet. Your click still counted — it tells me what to build next.
        </div>
      ) : null}
    </div>
  )
}
