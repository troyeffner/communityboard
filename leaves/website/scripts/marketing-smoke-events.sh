#!/usr/bin/env bash
set -euo pipefail

BASE="${1:-http://localhost:3000}"

post () {
  curl -fsS -X POST "$BASE/api/marketing/event" \
    -H "content-type: application/json" \
    -d "$1" >/dev/null
}

post '{"name":"marketing_fake_door_click","path":"/marketing/stewards","meta":{"doorId":"stewards_interest","doorLabel":"I would contribute as a steward"}}'
post '{"name":"marketing_fake_door_submit","path":"/marketing/stewards","meta":{"doorId":"stewards_interest","doorLabel":"I would contribute as a steward","email":"test@example.com","note":"This would help me track events without Facebook."}}'

echo "OK: posted 2 sample events."
echo "Now check:"
echo "  $BASE/marketing/admin"
echo "Or tail:"
echo "  ./scripts/marketing-tail-events.sh"
