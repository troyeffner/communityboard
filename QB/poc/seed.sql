INSERT INTO frameworks (id, name, description) VALUES
('fw_jtbd', 'JTBD', 'Map initiative impact to user jobs and outcomes.'),
('fw_ooux', 'OOUX', 'Map initiative impact to objects, actions, and relationships.'),
('fw_page_ia', 'Page IA', 'Map initiative impact to routes and information architecture.'),
('fw_governance_risk', 'Governance/Risk', 'Map initiative impact to fairness, policy, and trust risk.'),
('fw_release_readiness', 'Release Readiness', 'Map initiative impact to blockers, gates, and sequencing.'),
('fw_desired_outcomes', 'Desired Outcomes', 'Map initiative impact to intended user/system outcomes and evidence signals.');

INSERT INTO personas (id, name, actor_id, description, primary_goal) VALUES
('persona_public_viewer', 'Public viewer', 'actor_public_viewer', 'Discovers relevant community items quickly and safely.', 'Find something useful to do with trusted context.'),
('persona_public_submitter', 'Public submitter', 'actor_public_submitter', 'Captures and submits poster photos with minimal friction.', 'Submit clear poster photos with context in one pass.'),
('persona_community_builder', 'Community builder', 'actor_community_builder', 'Curates submitted posters into pinned board items.', 'Create drafts, pin quality items, and maintain board quality.');

INSERT INTO jobs (id, name) VALUES
('job_discover_board_items', 'Discover relevant board items'),
('job_submit_poster_photo', 'Submit a poster photo for tending'),
('job_capture_board_context', 'Capture board context (seen-at + photo time)'),
('job_draft_item_from_poster', 'Create draft items pinned to poster coordinates'),
('job_tend_and_pin_board', 'Tend draft items and pin them to board'),
('job_review_poster_items', 'Inspect all items on a poster and act');

INSERT INTO pages (id, route, label) VALUES
('page_public_home', '/', 'Community Board home'),
('page_public_submit', '/submit', 'Submit a poster photo'),
('page_public_browse', '/browse', 'Browse posters'),
('page_public_poster', '/poster/[id]', 'Poster view'),
('page_builder_create', '/builder/create', 'Create drafts workspace'),
('page_builder_tend', '/builder/tend', 'Tend board workspace'),
('page_manage_admin', '/manage', 'Legacy manage admin page');

INSERT INTO ooux_objects (id, name) VALUES
('obj_community_board', 'Community board feed'),
('obj_poster_upload', 'Poster upload'),
('obj_poster_image', 'Poster image'),
('obj_poster_item', 'Poster item'),
('obj_pin', 'Pin coordinate'),
('obj_seen_at', 'Seen-at location text'),
('obj_upvote', 'Anonymous upvote'),
('obj_tag', 'Community tag');

INSERT INTO ooux_actions (id, name) VALUES
('act_submit_photo', 'Submit poster photo'),
('act_select_poster', 'Select poster'),
('act_place_pin', 'Place pin on poster'),
('act_create_draft_item', 'Create draft item'),
('act_edit_item', 'Edit item'),
('act_delete_item', 'Delete item or link'),
('act_pin_to_board', 'Pin item to board (publish)'),
('act_mark_poster_done', 'Mark poster done'),
('act_save_seen_at', 'Save seen-at metadata'),
('act_search_board', 'Search board content'),
('act_filter_by_seen_at', 'Filter by seen-at'),
('act_select_item', 'Select item card/pin'),
('act_upvote_item', 'Upvote item'),
('act_suggest_tag', 'Suggest tag'),
('act_open_google_calendar', 'Open Google calendar action'),
('act_download_ics', 'Download ICS file');

INSERT INTO ooux_outcomes (id, name) VALUES
('outcome_fast_mobile_submit', 'Fast mobile capture and submit'),
('outcome_item_pin_accuracy', 'Items accurately mapped to poster coordinates'),
('outcome_clear_public_discovery', 'Public can discover useful items quickly'),
('outcome_high_metadata_integrity', 'Seen-at and poster metadata stay consistent'),
('outcome_safe_board_curation', 'Builders can curate without data loss');

INSERT INTO desired_outcomes (id, ooux_outcome_id, name, desired_signal, metric_hint) VALUES
('do_fast_mobile_submit', 'outcome_fast_mobile_submit', 'Fast mobile submit with low friction', 'users can submit without retries or abandonment', 'time_to_submit, retry_rate'),
('do_item_pin_accuracy', 'outcome_item_pin_accuracy', 'Pins accurately represent item locations', 'selected item/pin parity holds under zoom and selection', 'pin_selection_error_rate'),
('do_clear_public_discovery', 'outcome_clear_public_discovery', 'Public discovery is relevant and trustworthy', 'users find relevant items quickly and report trust', 'time_to_relevance, trust_score'),
('do_high_metadata_integrity', 'outcome_high_metadata_integrity', 'Poster metadata remains consistent', 'seen_at and capture metadata stay canonical and stable', 'metadata_mismatch_rate'),
('do_safe_board_curation', 'outcome_safe_board_curation', 'Builder curation is safe and efficient', 'builders can tend/pin without data loss or regressions', 'curation_completion_rate, rollback_incidents');

INSERT INTO capabilities (id, name) VALUES
('cap_submit_compress_upload', 'Client compress + upload poster photo'),
('cap_builder_create_item', 'Create item from poster + pin'),
('cap_builder_edit_item', 'Edit existing item'),
('cap_builder_delete_item', 'Delete item or poster link'),
('cap_builder_pin_item', 'Pin item to board'),
('cap_builder_poster_queue', 'Fetch next untended poster'),
('cap_builder_save_poster_meta', 'Save seen-at / poster status metadata'),
('cap_public_browse_posters', 'Browse posters + item pins'),
('cap_public_events_feed', 'Render public items from pinned status'),
('cap_public_item_upvote', 'Anonymous upvote per viewer'),
('cap_public_calendar_export', 'Calendar deep links + ICS generation'),
('cap_schema_healthcheck', 'Schema health endpoint for seen-at guardrail');

INSERT INTO blockers (id, title, severity) VALUES
('b1', 'Vocabulary drift in runtime UI', 'high'),
('b2', 'Seen-at schema mismatch in some environments', 'blocking'),
('b3', 'Poster IA inconsistencies on /poster/[id]', 'high'),
('b4', 'Primary CTA canonical mappings incomplete', 'high'),
('b5', 'Dual-model fallback drift risk', 'medium'),
('b6', 'Pin selection reorders cards instead of selecting in place', 'high'),
('b7', 'Browse filter visual hierarchy is noisy (extra Found-at container)', 'medium'),
('b8', 'Filter interaction pattern not locked to pill + clear-link behavior', 'medium'),
('b9', 'Upvote design/process not fully activated and verified in production flow', 'high'),
('b12', 'Mobile browse poster lands with browse section expanded, pushing workspace below first viewport', 'medium'),
('b13', 'Filter taxonomy/content model not yet specified for scalable discovery UX', 'medium'),
('b14', 'Community preference + disagreement handling model not yet defined (filter-level signal path)', 'medium'),
('b15', 'Potential perceived partisan suppression risk (Republican/Democrat visibility concerns)', 'high');

INSERT INTO work_items (id, title, category, priority, owner, status, decision_due, notes) VALUES
('wq_401', 'Schema parity DEV/PROD for seen_at_name', 'release_readiness', 'p0', 'Troy', 'queued', '2026-03-02', 'Blocks downstream readiness phases.'),
('wq_402', 'Vocabulary lock pass on core routes', 'ux_copy_governance', 'p0', 'Troy', 'queued', '2026-03-03', 'Depends on wq_401.'),
('wq_409', 'Upvote design + process activation', 'engagement', 'p0', 'Troy', 'queued', '2026-03-02', 'ASAP priority for visible trust signal.'),
('wq_412', 'Mobile browse panel default collapse', 'mobile_ux', 'p1', 'Troy', 'queued', '2026-03-03', 'Improve above-the-fold workspace visibility.'),
('wq_413', 'Taxonomy + filter pill content spec', 'product_taxonomy', 'p1', 'Troy', 'queued', '2026-03-05', 'Defines filter semantics + labels.'),
('wq_414', 'Explore filter-level upvote model', 'product_exploration', 'p2', 'Troy', 'queued', '2026-03-08', 'Compares filter-level vs item-level signal ranking.'),
('wq_415', 'Viewpoint fairness risk model', 'policy_governance', 'p0', 'Troy', 'queued', '2026-03-05', 'Address representation and trust concerns.'),
('wq_416', 'Fairness hypothesis test design and run', 'research_ops', 'p1', 'Troy', 'queued', '2026-03-10', 'Depends on wq_413, wq_414, wq_415.'),
('wq_417', 'Backfill hypothesis mapping rows', 'governance', 'p1', 'Troy', 'queued', '2026-03-06', 'Populate machine-readable map for active hypotheses.'),
('wq_418', 'Operationalize Phase 2 learning loop checklist', 'governance', 'p1', 'Troy', 'queued', '2026-03-07', 'Pre-dispatch checklist for design->assumption loop.'),
('wq_419', 'Codify research owner lane conventions', 'governance', 'p2', 'Troy', 'queued', '2026-03-07', 'Add explicit research owner routing (e.g., Matt).');

INSERT INTO hypotheses (id, status, priority, owner, assumption, problem_to_solve, opportunity, hypothesis_text, decision_rule) VALUES
('h_20260301_viewpoint_fairness_filter_signal', 'proposed', 'p1', 'PM',
 'Users across differing viewpoints will distrust discovery if they perceive suppression.',
 'Discovery signals may not reflect individual preference intent, creating fairness concerns.',
 'Transparent filter-level signal ranking could improve trust, relevance, and agency.',
 'If ranking includes user-selectable filter-level signals alongside item-level signals, users will report higher fairness and faster relevance discovery.',
 'Primary metrics improve while guardrails do not regress more than 10% adverse from baseline.'),
('h_20260301_mobile_browse_above_fold', 'proposed', 'p1', 'PM',
 'Mobile users abandon when core workspace starts below first viewport.',
 'Browse panel defaults expanded on mobile and pushes key content too far down.',
 'Collapsed-by-default browse panel should improve first-view utility and engagement.',
 'If mobile browse panel is collapsed by default, users will reach poster workspace faster and complete more interactions per session.',
 'Adopt if time-to-first-workspace-view and interaction depth improve without increased confusion reports.'),
('h_20260301_upvote_activation', 'proposed', 'p0', 'PM',
 'Visible upvotes can help users identify useful content quickly.',
 'Upvote process is not consistently active/clear in production surfaces.',
 'A reliable upvote flow can improve community signal quality and item discovery confidence.',
 'If upvote flow is reliable and visible on browse/poster surfaces, users will engage with ranking signals and trust surfaced items more.',
 'Adopt if upvote usage increases and no abuse/double-vote regressions appear.'),
('h_20260301_filter_pill_taxonomy', 'proposed', 'p1', 'PM',
 'Filter quality depends on consistent taxonomy and chip semantics.',
 'Current filter naming/structure lacks a locked taxonomy model.',
 'A clear taxonomy spec can reduce ambiguity and improve filter effectiveness.',
 'If taxonomy and filter pills are canonized, users will apply filters more accurately and discover relevant items faster.',
 'Adopt if filter usage quality improves and ambiguity complaints decline.');

INSERT INTO hypothesis_persona (hypothesis_id, persona_id) VALUES
('h_20260301_viewpoint_fairness_filter_signal', 'persona_public_viewer'),
('h_20260301_viewpoint_fairness_filter_signal', 'persona_community_builder'),
('h_20260301_mobile_browse_above_fold', 'persona_public_viewer'),
('h_20260301_mobile_browse_above_fold', 'persona_public_submitter'),
('h_20260301_upvote_activation', 'persona_public_viewer'),
('h_20260301_upvote_activation', 'persona_community_builder'),
('h_20260301_filter_pill_taxonomy', 'persona_public_viewer'),
('h_20260301_filter_pill_taxonomy', 'persona_community_builder');

INSERT INTO hypothesis_job (hypothesis_id, job_id) VALUES
('h_20260301_viewpoint_fairness_filter_signal', 'job_discover_board_items'),
('h_20260301_viewpoint_fairness_filter_signal', 'job_review_poster_items'),
('h_20260301_viewpoint_fairness_filter_signal', 'job_tend_and_pin_board'),
('h_20260301_mobile_browse_above_fold', 'job_discover_board_items'),
('h_20260301_mobile_browse_above_fold', 'job_review_poster_items'),
('h_20260301_mobile_browse_above_fold', 'job_submit_poster_photo'),
('h_20260301_upvote_activation', 'job_discover_board_items'),
('h_20260301_upvote_activation', 'job_review_poster_items'),
('h_20260301_filter_pill_taxonomy', 'job_discover_board_items'),
('h_20260301_filter_pill_taxonomy', 'job_review_poster_items');

INSERT INTO hypothesis_page (hypothesis_id, page_id, role) VALUES
('h_20260301_viewpoint_fairness_filter_signal', 'page_public_browse', 'primary'),
('h_20260301_viewpoint_fairness_filter_signal', 'page_public_poster', 'primary'),
('h_20260301_viewpoint_fairness_filter_signal', 'page_builder_tend', 'secondary'),
('h_20260301_mobile_browse_above_fold', 'page_public_browse', 'primary'),
('h_20260301_mobile_browse_above_fold', 'page_public_poster', 'secondary'),
('h_20260301_upvote_activation', 'page_public_browse', 'primary'),
('h_20260301_upvote_activation', 'page_public_poster', 'primary'),
('h_20260301_upvote_activation', 'page_builder_tend', 'secondary'),
('h_20260301_filter_pill_taxonomy', 'page_public_browse', 'primary'),
('h_20260301_filter_pill_taxonomy', 'page_public_poster', 'secondary');

INSERT INTO hypothesis_object (hypothesis_id, object_id) VALUES
('h_20260301_viewpoint_fairness_filter_signal', 'obj_community_board'),
('h_20260301_viewpoint_fairness_filter_signal', 'obj_poster_item'),
('h_20260301_viewpoint_fairness_filter_signal', 'obj_tag'),
('h_20260301_viewpoint_fairness_filter_signal', 'obj_upvote'),
('h_20260301_mobile_browse_above_fold', 'obj_community_board'),
('h_20260301_mobile_browse_above_fold', 'obj_poster_upload'),
('h_20260301_mobile_browse_above_fold', 'obj_poster_item'),
('h_20260301_upvote_activation', 'obj_upvote'),
('h_20260301_upvote_activation', 'obj_poster_item'),
('h_20260301_filter_pill_taxonomy', 'obj_tag'),
('h_20260301_filter_pill_taxonomy', 'obj_community_board');

INSERT INTO hypothesis_action (hypothesis_id, action_id) VALUES
('h_20260301_viewpoint_fairness_filter_signal', 'act_search_board'),
('h_20260301_viewpoint_fairness_filter_signal', 'act_filter_by_seen_at'),
('h_20260301_viewpoint_fairness_filter_signal', 'act_select_item'),
('h_20260301_viewpoint_fairness_filter_signal', 'act_upvote_item'),
('h_20260301_viewpoint_fairness_filter_signal', 'act_suggest_tag'),
('h_20260301_mobile_browse_above_fold', 'act_select_poster'),
('h_20260301_mobile_browse_above_fold', 'act_select_item'),
('h_20260301_mobile_browse_above_fold', 'act_search_board'),
('h_20260301_upvote_activation', 'act_upvote_item'),
('h_20260301_upvote_activation', 'act_select_item'),
('h_20260301_upvote_activation', 'act_search_board'),
('h_20260301_filter_pill_taxonomy', 'act_filter_by_seen_at'),
('h_20260301_filter_pill_taxonomy', 'act_search_board'),
('h_20260301_filter_pill_taxonomy', 'act_suggest_tag');

INSERT INTO hypothesis_outcome (hypothesis_id, outcome_id) VALUES
('h_20260301_viewpoint_fairness_filter_signal', 'outcome_clear_public_discovery'),
('h_20260301_mobile_browse_above_fold', 'outcome_clear_public_discovery'),
('h_20260301_mobile_browse_above_fold', 'outcome_fast_mobile_submit'),
('h_20260301_upvote_activation', 'outcome_clear_public_discovery'),
('h_20260301_filter_pill_taxonomy', 'outcome_clear_public_discovery');

INSERT INTO hypothesis_capability (hypothesis_id, capability_id) VALUES
('h_20260301_viewpoint_fairness_filter_signal', 'cap_public_browse_posters'),
('h_20260301_viewpoint_fairness_filter_signal', 'cap_public_events_feed'),
('h_20260301_viewpoint_fairness_filter_signal', 'cap_public_item_upvote'),
('h_20260301_mobile_browse_above_fold', 'cap_public_browse_posters'),
('h_20260301_mobile_browse_above_fold', 'cap_public_events_feed'),
('h_20260301_upvote_activation', 'cap_public_item_upvote'),
('h_20260301_upvote_activation', 'cap_public_events_feed'),
('h_20260301_filter_pill_taxonomy', 'cap_public_browse_posters');

INSERT INTO hypothesis_blocker (hypothesis_id, blocker_id) VALUES
('h_20260301_viewpoint_fairness_filter_signal', 'b13'),
('h_20260301_viewpoint_fairness_filter_signal', 'b14'),
('h_20260301_viewpoint_fairness_filter_signal', 'b15'),
('h_20260301_mobile_browse_above_fold', 'b12'),
('h_20260301_upvote_activation', 'b9'),
('h_20260301_filter_pill_taxonomy', 'b8'),
('h_20260301_filter_pill_taxonomy', 'b13');

INSERT INTO hypothesis_work_item (hypothesis_id, work_item_id) VALUES
('h_20260301_viewpoint_fairness_filter_signal', 'wq_413'),
('h_20260301_viewpoint_fairness_filter_signal', 'wq_414'),
('h_20260301_viewpoint_fairness_filter_signal', 'wq_415'),
('h_20260301_viewpoint_fairness_filter_signal', 'wq_416'),
('h_20260301_mobile_browse_above_fold', 'wq_412'),
('h_20260301_upvote_activation', 'wq_409'),
('h_20260301_filter_pill_taxonomy', 'wq_413');

INSERT INTO persona_job (persona_id, job_id, relevance_rank) VALUES
('persona_public_viewer', 'job_discover_board_items', 1),
('persona_public_viewer', 'job_review_poster_items', 2),
('persona_public_submitter', 'job_submit_poster_photo', 1),
('persona_public_submitter', 'job_capture_board_context', 2),
('persona_community_builder', 'job_draft_item_from_poster', 1),
('persona_community_builder', 'job_tend_and_pin_board', 2),
('persona_community_builder', 'job_capture_board_context', 3);

INSERT INTO persona_page (persona_id, page_id, relevance_rank) VALUES
('persona_public_viewer', 'page_public_home', 1),
('persona_public_viewer', 'page_public_browse', 2),
('persona_public_viewer', 'page_public_poster', 3),
('persona_public_submitter', 'page_public_submit', 1),
('persona_public_submitter', 'page_builder_create', 2),
('persona_community_builder', 'page_builder_create', 1),
('persona_community_builder', 'page_builder_tend', 2),
('persona_community_builder', 'page_manage_admin', 3);

INSERT INTO framework_implication (framework_id, hypothesis_id, implication) VALUES
('fw_jtbd', 'h_20260301_viewpoint_fairness_filter_signal', 'Primary JTBD impact is discoverability trust and preference-aligned relevance.'),
('fw_ooux', 'h_20260301_viewpoint_fairness_filter_signal', 'Core object/action tension sits between tag, upvote, and filter interactions.'),
('fw_page_ia', 'h_20260301_viewpoint_fairness_filter_signal', 'Main IA surfaces are /browse and /poster/[id], with governance support in /builder/tend.'),
('fw_governance_risk', 'h_20260301_viewpoint_fairness_filter_signal', 'High fairness and representation risk if ranking is perceived as partisan suppression.'),
('fw_release_readiness', 'h_20260301_viewpoint_fairness_filter_signal', 'Blocked by taxonomy, model spec, policy, and experiment design queue items.'),
('fw_jtbd', 'h_20260301_mobile_browse_above_fold', 'Supports quick orientation and reduced friction for discovery and review jobs on mobile.'),
('fw_ooux', 'h_20260301_mobile_browse_above_fold', 'Selection and browsing actions should not hide the primary poster workspace object.'),
('fw_page_ia', 'h_20260301_mobile_browse_above_fold', 'Requires mobile IA default state changes on /browse and possibly /poster/[id].'),
('fw_governance_risk', 'h_20260301_mobile_browse_above_fold', 'Low policy risk; primary risk is discoverability drop from poor default state.'),
('fw_release_readiness', 'h_20260301_mobile_browse_above_fold', 'Gated by completion of wq_412 plus viewport smoke evidence.'),
('fw_jtbd', 'h_20260301_upvote_activation', 'Improves user confidence in surfaced content for discovery/review jobs.'),
('fw_ooux', 'h_20260301_upvote_activation', 'Depends on stable Upvote object behavior and item association integrity.'),
('fw_page_ia', 'h_20260301_upvote_activation', 'Must be coherent on /browse, /poster/[id], and governance checks in /builder/tend.'),
('fw_governance_risk', 'h_20260301_upvote_activation', 'Abuse and perceived manipulation risk requires anti-double-vote controls.'),
('fw_release_readiness', 'h_20260301_upvote_activation', 'Priority P0 path through wq_409 with end-to-end verification evidence.'),
('fw_jtbd', 'h_20260301_filter_pill_taxonomy', 'Enables users to consistently express intent via filters.'),
('fw_ooux', 'h_20260301_filter_pill_taxonomy', 'Clarifies tag/filter semantics and reduces object-language drift.'),
('fw_page_ia', 'h_20260301_filter_pill_taxonomy', 'Directly impacts browse filtering design and poster context filters.'),
('fw_governance_risk', 'h_20260301_filter_pill_taxonomy', 'Taxonomy choices can over/under-represent groups if poorly defined.'),
('fw_release_readiness', 'h_20260301_filter_pill_taxonomy', 'Depends on taxonomy spec completion and acceptance evidence in wq_413.');
INSERT INTO framework_implication (framework_id, hypothesis_id, implication) VALUES
('fw_desired_outcomes', 'h_20260301_viewpoint_fairness_filter_signal', 'Should improve discovery trust outcomes without fairness guardrail regressions.'),
('fw_desired_outcomes', 'h_20260301_mobile_browse_above_fold', 'Should improve fast discovery and reduce mobile orientation friction.'),
('fw_desired_outcomes', 'h_20260301_upvote_activation', 'Should improve trust and discovery confidence through visible social signal quality.'),
('fw_desired_outcomes', 'h_20260301_filter_pill_taxonomy', 'Should improve relevance precision via consistent filter semantics.');

INSERT INTO device_context (id, device_class, input_mode, viewport_bucket, network_tier, label) VALUES
('dc_mobile_touch_small_good', 'mobile', 'touch', '<=430', 'good', 'Mobile touch small viewport (good network)'),
('dc_mobile_touch_small_constrained', 'mobile', 'touch', '<=430', 'constrained', 'Mobile touch small viewport (constrained network)'),
('dc_tablet_touch_medium_good', 'tablet', 'touch', '431-1024', 'good', 'Tablet touch medium viewport'),
('dc_desktop_pointer_large_good', 'desktop', 'mouse_keyboard', '>1024', 'good', 'Desktop large viewport');

INSERT INTO task_flows (id, name, trigger_context, start_page_id, success_outcome_id, notes) VALUES
('flow_public_discover_and_open_poster', 'Public discover and open poster', 'User wants to find something relevant now.', 'page_public_browse', 'outcome_clear_public_discovery', 'Search/filter, select poster, inspect items, act via calendar or upvote.'),
('flow_public_submit_photo', 'Public submit poster photo', 'User finds a poster and wants to contribute capture.', 'page_public_submit', 'outcome_fast_mobile_submit', 'Camera/library upload with context metadata.'),
('flow_builder_create_draft_from_pin', 'Builder create draft from pin', 'Builder processes poster into pinned draft item.', 'page_builder_create', 'outcome_item_pin_accuracy', 'Select poster, place pin, add draft item.'),
('flow_builder_tend_and_pin', 'Builder tend and pin item', 'Builder reviews and promotes draft quality.', 'page_builder_tend', 'outcome_safe_board_curation', 'Edit draft, verify, pin to board.'),
('flow_builder_capture_seen_at', 'Builder capture seen-at metadata', 'Poster context metadata missing or needs correction.', 'page_builder_create', 'outcome_high_metadata_integrity', 'Save seen-at without blocking item workflow.');

INSERT INTO task_flow_steps (flow_id, step_order, page_id, action_id, object_id) VALUES
('flow_public_discover_and_open_poster', 1, 'page_public_browse', 'act_search_board', 'obj_community_board'),
('flow_public_discover_and_open_poster', 2, 'page_public_browse', 'act_filter_by_seen_at', 'obj_community_board'),
('flow_public_discover_and_open_poster', 3, 'page_public_browse', 'act_select_poster', 'obj_poster_upload'),
('flow_public_discover_and_open_poster', 4, 'page_public_poster', 'act_select_item', 'obj_poster_item'),
('flow_public_discover_and_open_poster', 5, 'page_public_poster', 'act_open_google_calendar', 'obj_poster_item'),
('flow_public_submit_photo', 1, 'page_public_submit', 'act_submit_photo', 'obj_poster_upload'),
('flow_public_submit_photo', 2, 'page_public_submit', 'act_save_seen_at', 'obj_seen_at'),
('flow_builder_create_draft_from_pin', 1, 'page_builder_create', 'act_select_poster', 'obj_poster_upload'),
('flow_builder_create_draft_from_pin', 2, 'page_builder_create', 'act_place_pin', 'obj_pin'),
('flow_builder_create_draft_from_pin', 3, 'page_builder_create', 'act_create_draft_item', 'obj_poster_item'),
('flow_builder_tend_and_pin', 1, 'page_builder_tend', 'act_edit_item', 'obj_poster_item'),
('flow_builder_tend_and_pin', 2, 'page_builder_tend', 'act_pin_to_board', 'obj_poster_item'),
('flow_builder_capture_seen_at', 1, 'page_builder_create', 'act_select_poster', 'obj_poster_upload'),
('flow_builder_capture_seen_at', 2, 'page_builder_create', 'act_save_seen_at', 'obj_seen_at');

INSERT INTO persona_task_flow (persona_id, flow_id, relevance_rank) VALUES
('persona_public_viewer', 'flow_public_discover_and_open_poster', 1),
('persona_public_submitter', 'flow_public_submit_photo', 1),
('persona_community_builder', 'flow_builder_create_draft_from_pin', 1),
('persona_community_builder', 'flow_builder_tend_and_pin', 2),
('persona_community_builder', 'flow_builder_capture_seen_at', 3),
('persona_public_viewer', 'flow_public_submit_photo', 2);

INSERT INTO hypothesis_task_flow (hypothesis_id, flow_id, confidence, rationale) VALUES
('h_20260301_viewpoint_fairness_filter_signal', 'flow_public_discover_and_open_poster', 'high', 'Fairness signal quality is observed directly in discover/filter/select workflow.'),
('h_20260301_viewpoint_fairness_filter_signal', 'flow_builder_tend_and_pin', 'medium', 'Builder pinning decisions influence visible inventory and perceived representation.'),
('h_20260301_mobile_browse_above_fold', 'flow_public_discover_and_open_poster', 'high', 'Above-the-fold browse behavior directly affects discovery efficiency.'),
('h_20260301_upvote_activation', 'flow_public_discover_and_open_poster', 'high', 'Upvote actions occur during browse/poster discovery path.'),
('h_20260301_filter_pill_taxonomy', 'flow_public_discover_and_open_poster', 'high', 'Filter taxonomy and chip semantics are part of this user flow.');

INSERT INTO hypothesis_desired_outcome (hypothesis_id, desired_outcome_id, contribution_type) VALUES
('h_20260301_viewpoint_fairness_filter_signal', 'do_clear_public_discovery', 'primary'),
('h_20260301_mobile_browse_above_fold', 'do_clear_public_discovery', 'primary'),
('h_20260301_mobile_browse_above_fold', 'do_fast_mobile_submit', 'secondary'),
('h_20260301_upvote_activation', 'do_clear_public_discovery', 'primary'),
('h_20260301_filter_pill_taxonomy', 'do_clear_public_discovery', 'primary');

INSERT INTO task_flow_desired_outcome (flow_id, desired_outcome_id, contribution_type) VALUES
('flow_public_discover_and_open_poster', 'do_clear_public_discovery', 'primary'),
('flow_public_submit_photo', 'do_fast_mobile_submit', 'primary'),
('flow_builder_create_draft_from_pin', 'do_item_pin_accuracy', 'primary'),
('flow_builder_tend_and_pin', 'do_safe_board_curation', 'primary'),
('flow_builder_capture_seen_at', 'do_high_metadata_integrity', 'primary');

INSERT INTO persona_desired_outcome (persona_id, desired_outcome_id, relevance_rank) VALUES
('persona_public_viewer', 'do_clear_public_discovery', 1),
('persona_public_viewer', 'do_item_pin_accuracy', 2),
('persona_public_submitter', 'do_fast_mobile_submit', 1),
('persona_public_submitter', 'do_high_metadata_integrity', 2),
('persona_community_builder', 'do_safe_board_curation', 1),
('persona_community_builder', 'do_item_pin_accuracy', 2),
('persona_community_builder', 'do_high_metadata_integrity', 3);

INSERT INTO page_desired_outcome (page_id, desired_outcome_id, influence_level) VALUES
('page_public_submit', 'do_fast_mobile_submit', 'high'),
('page_public_browse', 'do_clear_public_discovery', 'high'),
('page_public_poster', 'do_clear_public_discovery', 'high'),
('page_public_poster', 'do_item_pin_accuracy', 'medium'),
('page_builder_create', 'do_item_pin_accuracy', 'high'),
('page_builder_create', 'do_high_metadata_integrity', 'high'),
('page_builder_tend', 'do_safe_board_curation', 'high');

INSERT INTO hypothesis_device_context (hypothesis_id, device_context_id, relevance_rank) VALUES
('h_20260301_viewpoint_fairness_filter_signal', 'dc_mobile_touch_small_good', 1),
('h_20260301_viewpoint_fairness_filter_signal', 'dc_desktop_pointer_large_good', 2),
('h_20260301_mobile_browse_above_fold', 'dc_mobile_touch_small_good', 1),
('h_20260301_mobile_browse_above_fold', 'dc_mobile_touch_small_constrained', 2),
('h_20260301_upvote_activation', 'dc_mobile_touch_small_good', 1),
('h_20260301_upvote_activation', 'dc_desktop_pointer_large_good', 2),
('h_20260301_filter_pill_taxonomy', 'dc_mobile_touch_small_good', 1),
('h_20260301_filter_pill_taxonomy', 'dc_tablet_touch_medium_good', 2),
('h_20260301_filter_pill_taxonomy', 'dc_desktop_pointer_large_good', 3);

INSERT INTO task_flow_device_context (flow_id, device_context_id, relevance_rank) VALUES
('flow_public_discover_and_open_poster', 'dc_mobile_touch_small_good', 1),
('flow_public_discover_and_open_poster', 'dc_mobile_touch_small_constrained', 2),
('flow_public_discover_and_open_poster', 'dc_desktop_pointer_large_good', 3),
('flow_public_submit_photo', 'dc_mobile_touch_small_good', 1),
('flow_public_submit_photo', 'dc_mobile_touch_small_constrained', 2),
('flow_builder_create_draft_from_pin', 'dc_desktop_pointer_large_good', 1),
('flow_builder_create_draft_from_pin', 'dc_tablet_touch_medium_good', 2),
('flow_builder_tend_and_pin', 'dc_desktop_pointer_large_good', 1),
('flow_builder_capture_seen_at', 'dc_desktop_pointer_large_good', 1),
('flow_builder_capture_seen_at', 'dc_tablet_touch_medium_good', 2);

INSERT INTO persona_device_context (persona_id, device_context_id, relevance_rank) VALUES
('persona_public_viewer', 'dc_mobile_touch_small_good', 1),
('persona_public_viewer', 'dc_desktop_pointer_large_good', 2),
('persona_public_submitter', 'dc_mobile_touch_small_good', 1),
('persona_public_submitter', 'dc_mobile_touch_small_constrained', 2),
('persona_community_builder', 'dc_desktop_pointer_large_good', 1),
('persona_community_builder', 'dc_tablet_touch_medium_good', 2);
