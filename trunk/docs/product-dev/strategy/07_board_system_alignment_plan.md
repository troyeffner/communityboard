---
type: document
from: communityboard-docs
date: 2026-03-10
status: active
topics: [documentation, product, operations]
fractals: [communityboard]
cluster: docs
---

# Board System Alignment Plan (Browse / Poster / Builder)

## Goal
Converge:
- `/browse`
- `/poster/[id]`
- `/builder/create`

Into one coherent Board System.

## Structural Requirements

### 1) One Layout Primitive
`BoardLayout`:
- Left panel
- Center workspace
- Right rail (Poster details)

No conditional structural rendering.
Empty states live inside panels.

### 2) One Panel Component
Consistent:
- Header spacing
- Subtitle position
- Border / shadow rhythm
- Padding
- Section spacing

No visual drift between pages.

### 3) One Right Rail Pattern
Title: `Poster details`

Single scroll container.
No `Other items` sections.
Selected item surfaces first.
Same card rhythm everywhere.

### 4) Title Pattern Lock
`document.title == H1` meaning.

Examples:
- `Browse posters`
- `Found at: Tramontane Cafe`
- `Create contribution`

No tab ambiguity.

### 5) Selection Style Standardization
Single selection token:
- Subtle background tint
- Soft border
- Left accent stripe

Remove:
- Loud blue
- Solid red
- Hard fills

Apply to:
- Submissions
- Browse cards
- Right rail item cards

### 6) Action Hierarchy
Explicit levels:

Primary:
- One per local context

Secondary:
- Neutral bordered

Destructive:
- Isolated, danger styling

Consistent across:
- Item cards
- Builder form
- Workspace actions

### 7) Microcopy Tightening
Keep OOUX vocabulary stable:

- Contribution (builder)
- AnchoredItem (internal concept)
- Poster / Item (public surface)
- Pin = placement
- Upvote = signal

Remove:
- Debug labels
- Placeholder stats
- Status noise

### 8) Mobile Pass (390x844)
Must ensure:
- No horizontal overflow
- Predictable panel stacking
- Center workspace remains usable
- Controls reachable
- Consistent stacking order

### 9) Definition of Done
All 3 routes:
- Visually read as one system
- Identical selection behavior
- Identical action hierarchy
- Title alignment consistent
- Mobile stable
- Snapshot baseline intentional
