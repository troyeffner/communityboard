#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$HOME/Dropbox/DEV/communityboard}"
cd "$REPO"

FILE="app/api/marketing/event/route.ts"
mkdir -p "$(dirname "$FILE")"

if [[ -f "$FILE" ]]; then
  echo "OK: endpoint already exists at $FILE"
  exit 0
fi

cat > "$FILE" <<'TS'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

type MarketingEvent = {
  name: string
  path?: string
  ref?: string
  meta?: Record<string, unknown>
  ts?: string
}

export async function POST(req: Request) {
  let evt: MarketingEvent | null = null
  try {
    evt = (await req.json()) as MarketingEvent
  } catch {
    // ignore
  }

  // baseline log
  console.log('[marketing-event]', JSON.stringify({
    ...evt,
    ts: evt?.ts ?? new Date().toISOString(),
  }))

  return NextResponse.json({ ok: true })
}
TS

echo "CREATED: $FILE"
echo ""
echo "Next:"
echo "  ./scripts/marketing-enable-rollup.sh"
