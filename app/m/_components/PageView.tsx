"use client"

import * as React from "react"
import { track } from "./marketingClient"

export function PageView({ path }: { path: string }) {
  React.useEffect(() => {
    void track("page_view", path)
  }, [path])
  return null
}
