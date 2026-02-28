#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$HOME/Dropbox/DEV/communityboard}"
MSG="${2:-Publish marketing + analytics + e2e fixture}"

cd "$REPO"

echo "== Repo =="; pwd
echo ""

echo "== Ensure we don't commit noise =="
rm -rf test-results .next 2>/dev/null || true

# Add common ignores if missing
touch .gitignore
for entry in ".next" "test-results" "*.bak.*" "/tmp" ; do
  if ! grep -qxF "$entry" .gitignore; then
    echo "$entry" >> .gitignore
  fi
done

echo "== Status (before) =="
git status --porcelain
echo ""

if [[ -z "$(git status --porcelain)" ]]; then
  echo "Nothing to commit. Pushing any existing commits..."
  git push
  exit 0
fi

echo "== Staging =="
git add -A

echo "== Committing =="
git commit -m "$MSG"

echo "== Pushing =="
BRANCH="$(git branch --show-current)"
UPSTREAM="$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || true)"
if [[ -z "$UPSTREAM" ]]; then
  git push -u origin "$BRANCH"
else
  git push
fi

echo ""
echo "Done. Committed + pushed:"
git --no-pager log -n 3 --oneline
