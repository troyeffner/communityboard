#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$HOME/Dropbox/DEV/communityboard}"
cd "$REPO"

CSS="app/globals.css"
test -f "$CSS" || { echo "ERROR: missing $CSS"; exit 1; }

MARK="/* marketing:mk */"
if grep -q "$MARK" "$CSS"; then
  echo "OK: marketing styles already present in $CSS"
  exit 0
fi

cat >> "$CSS" <<'CSS'

/* marketing:mk */
.mk-page { min-height: 100vh; }
.mk-container { max-width: 980px; margin: 0 auto; padding: 0 16px; }
.mk-hero { padding: 48px 0 24px; }
.mk-kicker { font-size: 12px; letter-spacing: .08em; text-transform: uppercase; opacity: .7; }
.mk-h1 { font-size: 34px; line-height: 1.1; margin: 10px 0 8px; }
.mk-h2 { font-size: 18px; margin: 0 0 10px; }
.mk-lede { font-size: 16px; line-height: 1.5; opacity: .9; max-width: 70ch; }
.mk-body { font-size: 14px; line-height: 1.5; opacity: .9; max-width: 75ch; }
.mk-section { padding: 18px 0; }
.mk-grid2 { display: grid; grid-template-columns: 1fr; gap: 14px; }
.mk-grid3 { display: grid; grid-template-columns: 1fr; gap: 14px; }
@media (min-width: 860px) {
  .mk-grid2 { grid-template-columns: 1fr 1fr; }
  .mk-grid3 { grid-template-columns: 1fr 1fr 1fr; }
}
.mk-card { border: 1px solid rgba(0,0,0,.1); border-radius: 12px; padding: 14px; background: rgba(255,255,255,.8); }
.mk-stat { font-size: 32px; font-weight: 700; }
.mk-list { margin: 0; padding-left: 18px; }
.mk-ctaRow { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.mk-btn { display: inline-flex; align-items: center; justify-content: center; height: 40px; padding: 0 14px; border-radius: 10px; border: 1px solid rgba(0,0,0,.14); text-decoration: none; cursor: pointer; background: transparent; }
.mk-btnPrimary { background: rgba(0,0,0,.9); color: white; border-color: rgba(0,0,0,.9); }
.mk-btnGhost { background: transparent; }
.mk-field { display: block; margin-bottom: 10px; }
.mk-label { font-size: 12px; opacity: .75; margin-bottom: 6px; }
.mk-input, .mk-textarea { width: 100%; border: 1px solid rgba(0,0,0,.14); border-radius: 10px; padding: 10px 12px; background: rgba(255,255,255,.9); }
.mk-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.mk-table th, .mk-table td { border-bottom: 1px solid rgba(0,0,0,.1); padding: 8px; vertical-align: top; text-align: left; }
CSS

echo "PATCHED: appended basic mk-* styles to $CSS"
