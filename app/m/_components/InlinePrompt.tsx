"use client"

import * as React from "react"
import { track } from "./marketingClient"

type Choice = { id: string; label: string }

export function InlinePrompt(props: {
  path: string
  promptId: string
  title: string
  description?: string
  choices: Choice[]
}) {
  const { path, promptId, title, description, choices } = props
  const [picked, setPicked] = React.useState<string | null>(null)

  async function pick(id: string) {
    setPicked(id)
    await track("prompt_choice", path, { promptId, choiceId: id })
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      <div className="space-y-1">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        {description ? <div className="text-sm text-slate-600">{description}</div> : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {choices.map((c) => (
          <button
            key={c.id}
            onClick={() => pick(c.id)}
            className={[
              "px-3 py-1.5 text-sm rounded-full border",
              picked === c.id
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
            ].join(" ")}
          >
            {c.label}
          </button>
        ))}
      </div>

      {picked ? (
        <div className="text-xs text-slate-500">
          Noted. This page is being shaped by real signal, not assumptions.
        </div>
      ) : null}
    </div>
  )
}
