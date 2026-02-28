#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$HOME/Dropbox/DEV/communityboard}"
cd "$REPO"

echo "== Repo =="; pwd
echo ""

echo "== Branch + remotes =="
git branch --show-current
git remote -v
echo ""

echo "== Local status =="
git status
echo ""

echo "== Commits not pushed =="
UPSTREAM="$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || true)"
if [[ -n "$UPSTREAM" ]]; then
  git --no-pager log --oneline --decorate "${UPSTREAM}..HEAD" || true
else
  echo "No upstream set for this branch. Will push with -u origin <branch>."
fi
echo ""

BRANCH="$(git branch --show-current)"

if [[ -z "$UPSTREAM" ]]; then
  echo "== Pushing (set upstream) =="
  git push -u origin "$BRANCH"
else
  echo "== Pushing =="
  git push
fi

echo ""
echo "Done. Your commits are now on origin."
