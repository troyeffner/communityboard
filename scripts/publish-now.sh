#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$HOME/Dropbox/DEV/communityboard}"
cd "$REPO"

echo "== Repo =="
pwd
echo ""

echo "== 0) Confirm branch & remote =="
git rev-parse --abbrev-ref HEAD
git remote -v | sed -n '1,2p'
echo ""

echo "== 1) Show current git status (dirty check) =="
git status --short || true
echo ""

DIRTY_COUNT="$(git status --porcelain | wc -l | tr -d ' ')"
if [[ "${DIRTY_COUNT}" == "0" ]]; then
  echo "OK: working tree is clean."
else
  echo "WARNING: working tree is NOT clean (${DIRTY_COUNT} changes)."
  echo ""
  echo "Top of diff (tracked changes):"
  git --no-pager diff --stat || true
  echo ""
  echo "Untracked files:"
  git ls-files --others --exclude-standard || true
  echo ""
  echo "Choose what to do:"
  echo "  1) Commit ALL current changes (tracked + untracked) and continue"
  echo "  2) Stash ALL current changes (tracked + untracked) and continue (publish only what's already committed)"
  echo "  3) Discard ALL local changes + delete untracked files (DANGEROUS) and continue"
  echo "  4) Abort (I'll handle git manually)"
  echo ""
  read -r -p "Enter 1/2/3/4: " CHOICE

  case "${CHOICE}" in
    1)
      echo ""
      echo "== Commit all changes =="
      git add -A
      echo ""
      echo "Staged changes:"
      git --no-pager diff --cached --stat
      echo ""
      read -r -p "Commit message: " MSG
      git commit -m "${MSG}"
      ;;
    2)
      echo ""
      echo "== Stash all changes =="
      git stash push -u -m "publish-now: stash $(date -Iseconds)"
      ;;
    3)
      echo ""
      echo "== DISCARD ALL local changes (DANGEROUS) =="
      read -r -p "Type DISCARD to confirm: " CONFIRM
      if [[ "${CONFIRM}" != "DISCARD" ]]; then
        echo "Abort: did not confirm discard."
        exit 1
      fi
      git reset --hard
      git clean -fd
      ;;
    4)
      echo "Abort."
      exit 1
      ;;
    *)
      echo "Invalid choice."
      exit 1
      ;;
  esac
fi

echo ""
echo "== 2) Final verification: publish-verify =="
if [[ -x "./scripts/publish-verify.sh" ]]; then
  ./scripts/publish-verify.sh
else
  echo "ERROR: ./scripts/publish-verify.sh not found or not executable."
  exit 1
fi

echo ""
echo "== 3) Confirm git clean AFTER verify =="
git status --short || true
POST_DIRTY="$(git status --porcelain | wc -l | tr -d ' ')"
if [[ "${POST_DIRTY}" != "0" ]]; then
  echo ""
  echo "ERROR: repo is dirty after verification. Not pushing."
  echo "Resolve git status first, then re-run this script."
  exit 1
fi

echo ""
echo "== 4) Push =="
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
echo "Ready to push branch: ${BRANCH}"
read -r -p "Push now? (y/N): " PUSH
if [[ "${PUSH}" == "y" || "${PUSH}" == "Y" ]]; then
  git push origin "${BRANCH}"
  echo "Pushed."
else
  echo "Skipped push."
fi

echo ""
echo "Done."
