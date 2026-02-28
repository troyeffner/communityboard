#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$HOME/Dropbox/DEV/communityboard}"
cd "$REPO"

# If you already have a next.config.ts, keep it; we'll only write next.config.mjs.
# We'll back up next.config.mjs if present.
if [[ -f next.config.mjs ]]; then
  cp next.config.mjs "next.config.mjs.bak.$(date +%s)"
fi

cat > next.config.mjs <<'MJS'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    // Force Turbopack workspace root to THIS repo
    root: __dirname,
  },
}

export default nextConfig
MJS

echo "Wrote next.config.mjs (ESM-safe turbopack.root)."
