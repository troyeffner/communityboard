---
type: document
from: communityboard-docs
date: 2026-03-10
status: active
topics: [documentation, product, operations]
fractals: [communityboard]
cluster: docs
---

# Ideal Board-System Spec

Updated: 2026-02-28  
Status: Canonical target for public and builder board surfaces.

## Scope
This spec governs:
- `/browse`
- `/poster/[id]` (public)
- `/builder/create`

## 1) Shared Skeleton Rule
All board routes must render the same structural shell:
- `BoardLayout`
- `BoardHeader`
- Three persistent panels (left, center, right)

Structural rendering is never conditional. Empty/no-selection states are rendered inside panel bodies only.

## 2) Panel Order + Structure
### Desktop
- Left rail: fixed-width context/navigation/filter or queue panel
- Center: workspace hero (stage + controls)
- Right rail: `PosterDetailsRail` with exactly one `PosterDetailsList` scrolling container

### Mobile (`390x844` target)
Stack order is fixed:
1. Center (workspace hero)
2. Left
3. Right

Rationale: keeps poster stage immediately reachable while preserving full panel parity.

## 3) Route Contracts
### `/browse`
- Header title: `Browse posters`
- Header subtitle: browse/search intent sentence
- Header links: `Return to Community Board`
- Left: browse filters + poster list
- Center: stage workspace
- Right: poster details list (selected item first)

### `/poster/[id]`
- Header title meaning: `Found at: <seen_at_name|Community Board>`
- Header subtitle: public poster intent sentence
- Header links: `Return to Community Board`, `Browse posters`
- Left: poster context metadata
- Center: stage workspace
- Right: poster details list (selected item first)

### `/builder/create`
- Header title: `Create posters`
- Header subtitle: create/tend intent sentence
- Header links: `Return to Community Board`, `Browse posters`
- Left: submissions queue + upload controls
- Center: pin placement workspace
- Right: poster details rail with form and item cards inside one list container

## 4) Title Pattern (H1 + Subtitle + Tab Title)
Per route, browser tab title must match page H1 meaning:
- `/browse`: `Browse posters`
- `/builder/create`: `Create posters`
- `/poster/[id]`: `Found at: <seen_at_name|Community Board>`

Subtitle is explanatory text and must not change core title meaning.

## 5) Selection Pattern Tokens
Use one selection pattern everywhere (submission cards, browse poster cards, item cards):
- Subtle background tint
- Soft border
- Left accent stripe

Canonical visuals:
- Border: `1px solid #93c5fd`
- Background: `#eff6ff`
- Accent: `inset 3px 0 0 #3b82f6`

Canonical classes:
- `cbSelectionCard`
- `cbSelectionCardSelected`

## 6) Action Hierarchy Rules
Three allowed action tiers:
- Primary: filled brand button (`button` default)
- Secondary: neutral bordered (`button[data-variant="secondary"]` or `.cbActionLink`)
- Destructive: danger (`button[data-variant="danger"]`)

Rules:
- Exactly one primary action per local action group.
- Secondary actions may be multiple.
- Destructive actions must be isolated and visually separated from primary.
- Calendar actions must render as separate secondary links, never run-on text.

## 7) Right-Rail Container Pattern
Right rail must always use:
- `PosterDetailsRail`
- one `PosterDetailsList`

No alternate/secondary details sections like “Other items” containers.
All details cards, forms, and empty states remain within `PosterDetailsList`.

## 8) Typography + Copy
Panel titles/subtitles follow shared `Panel` component structure and spacing.

OOUX vocabulary constraints:
- `Item` is the listing object.
- Pin is required geometry (not optional CTA language).
- Upvote is the public signal action.

Avoid placeholder/debug copy (`Stats #?`, `debug`, migration instructions on public surfaces).

## 9) Mobile Rules (`390x844`)
Required:
- No horizontal overflow
- Workspace controls reachable without overflow clipping
- Predictable stack order (center, left, right)
- Right-rail list remains readable and tappable

## 10) Snapshot Targets (Playwright)
Container snapshots must target stable surface containers only:

- Board root:
  - `data-testid="browse-board-layout"`
  - `data-testid="poster-view-grid"`
  - `data-testid="builder-create-panels"`
- Workspace panel:
  - `data-testid="browse-panel-center"`
  - `data-testid="poster-panel-center"`
  - `data-testid="builder-panel-workspace"`
- Details rail:
  - `data-testid="browse-panel-right"`
  - `data-testid="poster-panel-right"`
  - `data-testid="builder-panel-inspector"`

Avoid full-page snapshots unless explicitly needed for regression guardrails.
