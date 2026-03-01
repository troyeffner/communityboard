# UI Evaluation Gap Report

- Timestamp: 2026-03-01T00:23:17.002Z
- Git HEAD: 0b24a2a
- Base URL: http://127.0.0.1:3000

## Per-route Snapshot + Diff

| Route | Desktop | Desktop diff | Mobile | Mobile diff | Max ratio |
|---|---|---|---|---|---|
| `/` | [home-desktop.png](../../test-results/ui-eval/20260228-1923/home-desktop.png) | [home-desktop-diff.png](../../test-results/ui-eval/20260228-1923/home-desktop-diff.png) | [home-mobile.png](../../test-results/ui-eval/20260228-1923/home-mobile.png) | [home-mobile-diff.png](../../test-results/ui-eval/20260228-1923/home-mobile-diff.png) | 0.000000 |
| `/submit` | [submit-desktop.png](../../test-results/ui-eval/20260228-1923/submit-desktop.png) | [submit-desktop-diff.png](../../test-results/ui-eval/20260228-1923/submit-desktop-diff.png) | [submit-mobile.png](../../test-results/ui-eval/20260228-1923/submit-mobile.png) | [submit-mobile-diff.png](../../test-results/ui-eval/20260228-1923/submit-mobile-diff.png) | 0.000000 |
| `/browse` | [browse-desktop.png](../../test-results/ui-eval/20260228-1923/browse-desktop.png) | [browse-desktop-diff.png](../../test-results/ui-eval/20260228-1923/browse-desktop-diff.png) | [browse-mobile.png](../../test-results/ui-eval/20260228-1923/browse-mobile.png) | [browse-mobile-diff.png](../../test-results/ui-eval/20260228-1923/browse-mobile-diff.png) | 0.000000 |
| `/builder/create` | [create-desktop.png](../../test-results/ui-eval/20260228-1923/create-desktop.png) | [create-desktop-diff.png](../../test-results/ui-eval/20260228-1923/create-desktop-diff.png) | [create-mobile.png](../../test-results/ui-eval/20260228-1923/create-mobile.png) | [create-mobile-diff.png](../../test-results/ui-eval/20260228-1923/create-mobile-diff.png) | 0.000000 |
| `/poster/e2e-fixture` | [poster-desktop.png](../../test-results/ui-eval/20260228-1923/poster-desktop.png) | [poster-desktop-diff.png](../../test-results/ui-eval/20260228-1923/poster-desktop-diff.png) | [poster-mobile.png](../../test-results/ui-eval/20260228-1923/poster-mobile.png) | [poster-mobile-diff.png](../../test-results/ui-eval/20260228-1923/poster-mobile-diff.png) | 0.000000 |

## Title Check

- `/submit`: expected `Submit`, observed `Submit a poster photo`

## Gaps

- No image diffs above ratio threshold `0.001`.

## Manual Checklist Stub

- [ ] Board skeleton parity across browse/create/poster
- [ ] Panel chrome parity (header, subtitle, card rhythm)
- [ ] Right rail single list container
- [ ] Title/tab naming parity
