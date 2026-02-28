#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$HOME/Dropbox/DEV/communityboard}"
cd "$REPO"

echo "== Latest commits =="
git --no-pager log -n 5 --oneline
echo ""

echo "== GitHub remote =="
git remote get-url origin
echo ""

echo "== Verification suite =="
npm run test
npm run lint
npx playwright test --reporter=line --workers=1
npm run eval:ui

echo ""
echo "== Validate UI gates =="
LATEST_UI_DIR="$(ls -1 test-results/ui-eval | sort | tail -n 1)"
SUMMARY_PATH="test-results/ui-eval/${LATEST_UI_DIR}/diff-summary.json"
META_PATH="test-results/ui-eval/${LATEST_UI_DIR}/meta.json"

node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));const max=Math.max(0,...(d.images||[]).map(i=>Number(i.ratio||0)));if(max>0.01){console.error('UI diff gate failed: max ratio',max.toFixed(6),'exceeds 0.01');process.exit(1)}console.log('UI diff gate passed: max ratio',max.toFixed(6));" "$SUMMARY_PATH"

node -e "const fs=require('fs');const m=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));const mismatches=m.title_mismatches||[];if(mismatches.length>0){console.error('Title gate failed with',mismatches.length,'mismatch(es)');for(const mm of mismatches){console.error('-',mm.route,'expected:',mm.expected,'actual:',mm.actual)}process.exit(1)}console.log('Title gate passed')" "$META_PATH"

echo ""
echo "Verification complete: $LATEST_UI_DIR"
