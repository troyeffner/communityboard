.headers on
.mode column

SELECT 'table_counts' AS section;
SELECT 'frameworks' AS table_name, COUNT(*) AS rows FROM frameworks
UNION ALL SELECT 'personas', COUNT(*) FROM personas
UNION ALL SELECT 'hypotheses', COUNT(*) FROM hypotheses
UNION ALL SELECT 'jobs', COUNT(*) FROM jobs
UNION ALL SELECT 'pages', COUNT(*) FROM pages
UNION ALL SELECT 'ooux_objects', COUNT(*) FROM ooux_objects
UNION ALL SELECT 'ooux_actions', COUNT(*) FROM ooux_actions
UNION ALL SELECT 'ooux_outcomes', COUNT(*) FROM ooux_outcomes
UNION ALL SELECT 'desired_outcomes', COUNT(*) FROM desired_outcomes
UNION ALL SELECT 'capabilities', COUNT(*) FROM capabilities
UNION ALL SELECT 'blockers', COUNT(*) FROM blockers
UNION ALL SELECT 'work_items', COUNT(*) FROM work_items
UNION ALL SELECT 'task_flows', COUNT(*) FROM task_flows
UNION ALL SELECT 'task_flow_steps', COUNT(*) FROM task_flow_steps
UNION ALL SELECT 'persona_task_flow', COUNT(*) FROM persona_task_flow
UNION ALL SELECT 'hypothesis_task_flow', COUNT(*) FROM hypothesis_task_flow
UNION ALL SELECT 'device_context', COUNT(*) FROM device_context
UNION ALL SELECT 'persona_device_context', COUNT(*) FROM persona_device_context
UNION ALL SELECT 'hypothesis_device_context', COUNT(*) FROM hypothesis_device_context
UNION ALL SELECT 'task_flow_device_context', COUNT(*) FROM task_flow_device_context
UNION ALL SELECT 'hypothesis_desired_outcome', COUNT(*) FROM hypothesis_desired_outcome
UNION ALL SELECT 'task_flow_desired_outcome', COUNT(*) FROM task_flow_desired_outcome
UNION ALL SELECT 'persona_desired_outcome', COUNT(*) FROM persona_desired_outcome
UNION ALL SELECT 'page_desired_outcome', COUNT(*) FROM page_desired_outcome;

SELECT '';
SELECT 'persona_filter_public_viewer' AS section;
SELECT p.name AS persona, j.id AS job_id, j.name AS job_name, pj.relevance_rank
FROM persona_job pj
JOIN personas p ON p.id = pj.persona_id
JOIN jobs j ON j.id = pj.job_id
WHERE p.id = 'persona_public_viewer'
ORDER BY pj.relevance_rank;

SELECT '';
SELECT 'persona_filter_public_submitter' AS section;
SELECT p.name AS persona, j.id AS job_id, j.name AS job_name, pj.relevance_rank
FROM persona_job pj
JOIN personas p ON p.id = pj.persona_id
JOIN jobs j ON j.id = pj.job_id
WHERE p.id = 'persona_public_submitter'
ORDER BY pj.relevance_rank;

SELECT '';
SELECT 'persona_filter_community_builder_pages' AS section;
SELECT p.name AS persona, g.route, g.label, pp.relevance_rank
FROM persona_page pp
JOIN personas p ON p.id = pp.persona_id
JOIN pages g ON g.id = pp.page_id
WHERE p.id = 'persona_community_builder'
ORDER BY pp.relevance_rank;

SELECT '';
SELECT 'persona_filter_hypothesis_matrix' AS section;
SELECT p.name AS persona, h.id AS hypothesis_id, h.priority, h.status
FROM hypothesis_persona hp
JOIN personas p ON p.id = hp.persona_id
JOIN hypotheses h ON h.id = hp.hypothesis_id
ORDER BY p.name, h.id;

SELECT '';
SELECT 'persona_filter_task_flows' AS section;
SELECT p.name AS persona, tf.id AS flow_id, tf.name AS flow_name, ptf.relevance_rank
FROM persona_task_flow ptf
JOIN personas p ON p.id = ptf.persona_id
JOIN task_flows tf ON tf.id = ptf.flow_id
ORDER BY p.name, ptf.relevance_rank;

SELECT '';
SELECT 'persona_filter_device_context' AS section;
SELECT p.name AS persona, dc.label AS device_context, pdc.relevance_rank
FROM persona_device_context pdc
JOIN personas p ON p.id = pdc.persona_id
JOIN device_context dc ON dc.id = pdc.device_context_id
ORDER BY p.name, pdc.relevance_rank;

SELECT '';
SELECT 'persona_filter_desired_outcomes' AS section;
SELECT p.name AS persona, d.name AS desired_outcome, d.desired_signal, pdo.relevance_rank
FROM persona_desired_outcome pdo
JOIN personas p ON p.id = pdo.persona_id
JOIN desired_outcomes d ON d.id = pdo.desired_outcome_id
ORDER BY p.name, pdo.relevance_rank;

SELECT '';
SELECT 'framework_switch_view:fw_jtbd' AS section;
SELECT h.id AS hypothesis_id, h.priority, fi.implication,
       GROUP_CONCAT(DISTINCT j.name) AS jobs
FROM framework_implication fi
JOIN hypotheses h ON h.id = fi.hypothesis_id
LEFT JOIN hypothesis_job hj ON hj.hypothesis_id = h.id
LEFT JOIN jobs j ON j.id = hj.job_id
WHERE fi.framework_id = 'fw_jtbd'
GROUP BY h.id, h.priority, fi.implication
ORDER BY h.id;

SELECT '';
SELECT 'framework_switch_view:fw_page_ia' AS section;
SELECT h.id AS hypothesis_id, fi.implication,
       GROUP_CONCAT(DISTINCT pg.route) AS routes
FROM framework_implication fi
JOIN hypotheses h ON h.id = fi.hypothesis_id
LEFT JOIN hypothesis_page hp ON hp.hypothesis_id = h.id
LEFT JOIN pages pg ON pg.id = hp.page_id
WHERE fi.framework_id = 'fw_page_ia'
GROUP BY h.id, fi.implication
ORDER BY h.id;

SELECT '';
SELECT 'framework_switch_view:fw_desired_outcomes' AS section;
SELECT h.id AS hypothesis_id, fi.implication,
       GROUP_CONCAT(DISTINCT d.name) AS desired_outcomes
FROM framework_implication fi
JOIN hypotheses h ON h.id = fi.hypothesis_id
LEFT JOIN hypothesis_desired_outcome hdo ON hdo.hypothesis_id = h.id
LEFT JOIN desired_outcomes d ON d.id = hdo.desired_outcome_id
WHERE fi.framework_id = 'fw_desired_outcomes'
GROUP BY h.id, fi.implication
ORDER BY h.id;

SELECT '';
SELECT 'implication_drilldown:h_20260301_viewpoint_fairness_filter_signal' AS section;
SELECT h.id AS hypothesis_id,
       GROUP_CONCAT(DISTINCT b.id || ':' || b.severity) AS blockers,
       GROUP_CONCAT(DISTINCT w.id || ':' || w.priority) AS work_items
FROM hypotheses h
LEFT JOIN hypothesis_blocker hb ON hb.hypothesis_id = h.id
LEFT JOIN blockers b ON b.id = hb.blocker_id
LEFT JOIN hypothesis_work_item hw ON hw.hypothesis_id = h.id
LEFT JOIN work_items w ON w.id = hw.work_item_id
WHERE h.id = 'h_20260301_viewpoint_fairness_filter_signal'
GROUP BY h.id;

SELECT '';
SELECT 'hypothesis_to_task_flow_map' AS section;
SELECT h.id AS hypothesis_id, tf.name AS flow_name, htf.confidence, htf.rationale
FROM hypothesis_task_flow htf
JOIN hypotheses h ON h.id = htf.hypothesis_id
JOIN task_flows tf ON tf.id = htf.flow_id
ORDER BY h.id, htf.confidence DESC;

SELECT '';
SELECT 'hypothesis_to_device_context_map' AS section;
SELECT h.id AS hypothesis_id, dc.label AS device_context, hdc.relevance_rank
FROM hypothesis_device_context hdc
JOIN hypotheses h ON h.id = hdc.hypothesis_id
JOIN device_context dc ON dc.id = hdc.device_context_id
ORDER BY h.id, hdc.relevance_rank;

SELECT '';
SELECT 'hypothesis_to_desired_outcome_map' AS section;
SELECT h.id AS hypothesis_id, d.name AS desired_outcome, hdo.contribution_type, d.metric_hint
FROM hypothesis_desired_outcome hdo
JOIN hypotheses h ON h.id = hdo.hypothesis_id
JOIN desired_outcomes d ON d.id = hdo.desired_outcome_id
ORDER BY h.id, hdo.contribution_type;

SELECT '';
SELECT 'task_flow_to_device_context_map' AS section;
SELECT tf.id AS flow_id, tf.name AS flow_name, dc.label AS device_context, tfdc.relevance_rank
FROM task_flow_device_context tfdc
JOIN task_flows tf ON tf.id = tfdc.flow_id
JOIN device_context dc ON dc.id = tfdc.device_context_id
ORDER BY tf.id, tfdc.relevance_rank;

SELECT '';
SELECT 'task_flow_to_desired_outcome_map' AS section;
SELECT tf.id AS flow_id, tf.name AS flow_name, d.name AS desired_outcome, tfdo.contribution_type
FROM task_flow_desired_outcome tfdo
JOIN task_flows tf ON tf.id = tfdo.flow_id
JOIN desired_outcomes d ON d.id = tfdo.desired_outcome_id
ORDER BY tf.id;
