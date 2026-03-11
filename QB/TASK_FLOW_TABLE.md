---
type: document
from: communityboard-qb
date: 2026-03-10
status: active
topics: [qb, governance, documentation]
fractals: [communityboard]
cluster: qb-docs
---

# QB Task Flow Table

Purpose: canonical flow table for governance planning; tied to hypotheses, assumptions, personas, JTBD, and page routes.

## Flows
| flow_id | flow_name | trigger_context | primary_persona | start_route | desired_outcome | linked_hypotheses |
|---|---|---|---|---|---|---|
| flow_public_discover_and_open_poster | Public discover and open poster | User wants to find something relevant now | Public viewer | /browse | do_clear_public_discovery | h_20260301_viewpoint_fairness_filter_signal, h_20260301_mobile_browse_above_fold, h_20260301_upvote_activation, h_20260301_filter_pill_taxonomy |
| flow_public_submit_photo | Public submit poster photo | User finds a poster and wants to contribute capture | Public submitter | /submit | do_fast_mobile_submit | h_20260301_mobile_browse_above_fold |
| flow_builder_create_draft_from_pin | Builder create draft from pin | Builder processes poster into pinned draft item | Community builder | /builder/create | do_item_pin_accuracy | (future mapping) |
| flow_builder_tend_and_pin | Builder tend and pin item | Builder reviews and promotes draft quality | Community builder | /builder/tend | do_safe_board_curation | h_20260301_viewpoint_fairness_filter_signal |
| flow_builder_capture_seen_at | Builder capture seen-at metadata | Poster context metadata missing or needs correction | Community builder | /builder/create | do_high_metadata_integrity | (future mapping) |

## Notes
- Machine-readable source is `/Users/troyeffner/Dropbox/DEV/communityboard/QB/poc/communityboard_poc.db` tables:
  - `task_flows`
  - `task_flow_steps`
  - `persona_task_flow`
  - `hypothesis_task_flow`
- Device dimension is now included for flow/hypothesis/persona filtering:
  - `device_context`
  - `persona_device_context`
  - `hypothesis_device_context`
  - `task_flow_device_context`
- Hypothesis assumptions remain canonical in `/Users/troyeffner/Dropbox/DEV/communityboard/QB/HYPOTHESIS_REGISTER.md`.
