> **SUPERSEDED** — 2026-03-09. WoW v3.60.0 propagated to all Custodians. This dispatch predates v3.59.0. No action required.

# Dispatch: Infrastructure Update — All QBs
From: Coach
To: All QBs
Date: 2026-03-04
Priority: High

## What changed

### 1. Vercel is the deployment platform — not GitHub Pages
All projects are now deployed via Vercel. GitHub Pages is deprecated for this ecosystem.
- Do NOT reference GitHub Pages, GitHub Actions CI, or `isCI` build flags
- Do NOT use `output: 'export'` or `basePath` GitHub Pages config in next.config
- Standard Vercel Next.js config only

### 2. divergent-networks.com is the portfolio home
The public-facing portfolio lives at **divergent-networks.com** (Divergent Networks brand site).
- Each product has a detail page at `divergent-networks.com/work/<slug>`
- Your product's detail page is owned by you — you write the copy, Coach applies it
- The portfolio is the external signal for all products

### 3. Your live URL
Each product has a Vercel deployment URL. Use these as the canonical live URLs:
- Livability: https://livability-alpha.vercel.app
- SmallBiz: https://smallbiz-peach.vercel.app
- CommunityBoard: https://uticacommunityboard.vercel.app
- All others: check your project's .vercel/project.json or ask Coach

### 4. Screenshots are now required in returns
Every QB return package must include 2 screenshots (d_056):
- `QB/OUTBOX/screenshots/<slug>-mobile.png` — 390px viewport, scroll:0
- `QB/OUTBOX/screenshots/<slug>-desktop.png` — 1280px viewport, primary panel open

## Action required
Update any internal docs, CLAUDE.md, or session context that references GitHub Pages or old deployment assumptions.
