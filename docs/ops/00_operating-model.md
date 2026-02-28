# Operating Model

## Recommended Split: Codex Desktop vs Codex CLI
- Codex Desktop: design, planning, strategy discussions, canon updates, and UX direction.
- Codex CLI: execution-only implementation, scripts, checks, commits, and release prep.

## Thread Map
- Thread 02: Marketing MVP tracking + smoke/publish scripts.
- Thread 07: Strategy Canon freeze (jobs, desired outcomes, metaphor stack) - Status Locked.
- Thread 03/04: Create + Poster UI redesign pass (Trello-like / card balance).
- Thread 08: Infra/tooling (Next/Turbopack root, EPERM mitigation, scripts).

## Constraints
- No cross-thread edits in a single change set.
- Strategy canon is the source of truth for product direction and terminology.
- CLI is execution-only; strategy decisions are made in Desktop and reflected in canon docs.

## Operating Principle
Design in Desktop. Execute in CLI. Freeze strategy before scaling.
