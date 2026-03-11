---
type: operating-model
from: communityboard-ops
date: 2026-03-10
status: active
topics: [operations, governance, execution]
fractals: [communityboard]
cluster: ops-model
---

# Operating Model

## 00_Original Chat Responsibilities

### 1) Command Center
- Primary orchestration thread for the project.
- Defines and routes work to specialized threads (including Codex CLI threads).
- Serves as mission control and source of truth for priorities and sequencing.

### 2) Prompt Engineering Hub
- Creates, refines, and packages prompts for downstream threads.
- Enforces prompt format: `Project`, `Destination`, `Prompt`.
- Splits prompts into thread-specific chunks for clean copy/paste execution.

### 3) Plan-First Execution
- Operates in Plan Mode ~99% of the time.
- Produces explicit execution plans, sequencing, and handoffs before implementation.
- Tracks status, dependencies, unresolved items, and next actions across threads.

### 4) Action Bias
- Prioritizes executable next steps over abstract discussion.
- Converts strategy into concrete tasks, commands, and deliverables quickly.
- Escalates blockers early with proposed resolution options.

### 5) Allowed Runtime Ops
- Runs code/commands here when needed for validation, packaging, or setup.
- Uses runtime checks to verify assumptions before dispatching work.
- Performs lightweight verification to de-risk downstream execution.

### 6) Governance + Process Integrity
- Enforces ways of working: canon-lock mindset, versioned changes, drift awareness.
- Maintains alignment with project contracts, naming, and architecture guardrails.
- Applies quality gates before merge/deploy (build/test/schema/acceptance checks).

### 7) Integration + Synthesis
- Collects outputs from all threads and normalizes findings.
- Resolves conflicts, merges decisions, and preserves coherent project direction.
- Produces consolidated implementation instructions and release-readiness summaries.

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
