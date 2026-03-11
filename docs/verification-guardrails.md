---
type: verification-guardrails
from: communityboard-docs
date: 2026-03-10
status: active
topics: [testing, release-readiness, schema-health]
fractals: [communityboard]
cluster: quality-gates
---

# Verification Guardrails

## CI Commands

Run this sequence on pull requests and before deploy:

```bash
npm test
npm run lint
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

Single command equivalent:

```bash
npm run verify:guardrails
```

## Schema Health Gate

This is a required pre-deploy gate:

```bash
curl http://localhost:3000/api/health/schema
```

Expected payload:

```json
{ "ok": true, "missing": [] }
```

If `ok` is `false`, do not deploy. Resolve missing columns first.

## Manual Smoke Checklist

### `/poster/[id]`
- Load poster page and confirm image + pin markers render.
- Click an item card and confirm the matching pin becomes active.
- Click a pin and confirm matching item card becomes selected.
- Confirm no horizontal page overflow at `390px`, `768px`, `1280px`.

### `/builder/create`
- Page loads with 3 panels visible: `Submissions`, `Poster workspace`, `Inspector`.
- Confirm no horizontal page overflow at `390px`, `768px`, `1280px`.
- Trigger an intentional API failure in dev and verify UI stays friendly and includes schema-health link.

### `/api/health/schema`
- Verify endpoint returns JSON with `ok` boolean and `missing` array.
- Verify deploy gate passes only when `ok: true`.

## Definition Of Done (PR Merge)

- All CI guardrail commands pass.
- Playwright smoke tests pass for poster + builder create.
- API contract test for `/api/health/schema` passes.
- Schema health gate is green (`ok: true`) in target environment.
- Manual smoke checklist has been completed by reviewer or author.
