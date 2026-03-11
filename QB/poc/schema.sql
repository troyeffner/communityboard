PRAGMA foreign_keys = ON;

CREATE TABLE frameworks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE personas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  actor_id TEXT,
  description TEXT NOT NULL,
  primary_goal TEXT NOT NULL
);

CREATE TABLE hypotheses (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  owner TEXT NOT NULL,
  assumption TEXT NOT NULL,
  problem_to_solve TEXT NOT NULL,
  opportunity TEXT NOT NULL,
  hypothesis_text TEXT NOT NULL,
  decision_rule TEXT
);

CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE pages (
  id TEXT PRIMARY KEY,
  route TEXT NOT NULL,
  label TEXT NOT NULL
);

CREATE TABLE ooux_objects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE ooux_actions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE ooux_outcomes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE desired_outcomes (
  id TEXT PRIMARY KEY,
  ooux_outcome_id TEXT NOT NULL,
  name TEXT NOT NULL,
  desired_signal TEXT NOT NULL,
  metric_hint TEXT,
  FOREIGN KEY (ooux_outcome_id) REFERENCES ooux_outcomes(id)
);

CREATE TABLE capabilities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE blockers (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  severity TEXT NOT NULL
);

CREATE TABLE work_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT NOT NULL,
  owner TEXT NOT NULL,
  status TEXT NOT NULL,
  decision_due TEXT,
  notes TEXT
);

CREATE TABLE hypothesis_persona (
  hypothesis_id TEXT NOT NULL,
  persona_id TEXT NOT NULL,
  PRIMARY KEY (hypothesis_id, persona_id),
  FOREIGN KEY (hypothesis_id) REFERENCES hypotheses(id),
  FOREIGN KEY (persona_id) REFERENCES personas(id)
);

CREATE TABLE hypothesis_job (
  hypothesis_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  PRIMARY KEY (hypothesis_id, job_id),
  FOREIGN KEY (hypothesis_id) REFERENCES hypotheses(id),
  FOREIGN KEY (job_id) REFERENCES jobs(id)
);

CREATE TABLE hypothesis_page (
  hypothesis_id TEXT NOT NULL,
  page_id TEXT NOT NULL,
  role TEXT NOT NULL,
  PRIMARY KEY (hypothesis_id, page_id),
  FOREIGN KEY (hypothesis_id) REFERENCES hypotheses(id),
  FOREIGN KEY (page_id) REFERENCES pages(id)
);

CREATE TABLE hypothesis_object (
  hypothesis_id TEXT NOT NULL,
  object_id TEXT NOT NULL,
  PRIMARY KEY (hypothesis_id, object_id),
  FOREIGN KEY (hypothesis_id) REFERENCES hypotheses(id),
  FOREIGN KEY (object_id) REFERENCES ooux_objects(id)
);

CREATE TABLE hypothesis_action (
  hypothesis_id TEXT NOT NULL,
  action_id TEXT NOT NULL,
  PRIMARY KEY (hypothesis_id, action_id),
  FOREIGN KEY (hypothesis_id) REFERENCES hypotheses(id),
  FOREIGN KEY (action_id) REFERENCES ooux_actions(id)
);

CREATE TABLE hypothesis_outcome (
  hypothesis_id TEXT NOT NULL,
  outcome_id TEXT NOT NULL,
  PRIMARY KEY (hypothesis_id, outcome_id),
  FOREIGN KEY (hypothesis_id) REFERENCES hypotheses(id),
  FOREIGN KEY (outcome_id) REFERENCES ooux_outcomes(id)
);

CREATE TABLE hypothesis_capability (
  hypothesis_id TEXT NOT NULL,
  capability_id TEXT NOT NULL,
  PRIMARY KEY (hypothesis_id, capability_id),
  FOREIGN KEY (hypothesis_id) REFERENCES hypotheses(id),
  FOREIGN KEY (capability_id) REFERENCES capabilities(id)
);

CREATE TABLE hypothesis_blocker (
  hypothesis_id TEXT NOT NULL,
  blocker_id TEXT NOT NULL,
  PRIMARY KEY (hypothesis_id, blocker_id),
  FOREIGN KEY (hypothesis_id) REFERENCES hypotheses(id),
  FOREIGN KEY (blocker_id) REFERENCES blockers(id)
);

CREATE TABLE hypothesis_work_item (
  hypothesis_id TEXT NOT NULL,
  work_item_id TEXT NOT NULL,
  PRIMARY KEY (hypothesis_id, work_item_id),
  FOREIGN KEY (hypothesis_id) REFERENCES hypotheses(id),
  FOREIGN KEY (work_item_id) REFERENCES work_items(id)
);

CREATE TABLE persona_job (
  persona_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  relevance_rank INTEGER NOT NULL,
  PRIMARY KEY (persona_id, job_id),
  FOREIGN KEY (persona_id) REFERENCES personas(id),
  FOREIGN KEY (job_id) REFERENCES jobs(id)
);

CREATE TABLE persona_page (
  persona_id TEXT NOT NULL,
  page_id TEXT NOT NULL,
  relevance_rank INTEGER NOT NULL,
  PRIMARY KEY (persona_id, page_id),
  FOREIGN KEY (persona_id) REFERENCES personas(id),
  FOREIGN KEY (page_id) REFERENCES pages(id)
);

CREATE TABLE framework_implication (
  framework_id TEXT NOT NULL,
  hypothesis_id TEXT NOT NULL,
  implication TEXT NOT NULL,
  PRIMARY KEY (framework_id, hypothesis_id),
  FOREIGN KEY (framework_id) REFERENCES frameworks(id),
  FOREIGN KEY (hypothesis_id) REFERENCES hypotheses(id)
);

CREATE TABLE hypothesis_desired_outcome (
  hypothesis_id TEXT NOT NULL,
  desired_outcome_id TEXT NOT NULL,
  contribution_type TEXT NOT NULL,
  PRIMARY KEY (hypothesis_id, desired_outcome_id),
  FOREIGN KEY (hypothesis_id) REFERENCES hypotheses(id),
  FOREIGN KEY (desired_outcome_id) REFERENCES desired_outcomes(id)
);

CREATE TABLE task_flow_desired_outcome (
  flow_id TEXT NOT NULL,
  desired_outcome_id TEXT NOT NULL,
  contribution_type TEXT NOT NULL,
  PRIMARY KEY (flow_id, desired_outcome_id),
  FOREIGN KEY (flow_id) REFERENCES task_flows(id),
  FOREIGN KEY (desired_outcome_id) REFERENCES desired_outcomes(id)
);

CREATE TABLE persona_desired_outcome (
  persona_id TEXT NOT NULL,
  desired_outcome_id TEXT NOT NULL,
  relevance_rank INTEGER NOT NULL,
  PRIMARY KEY (persona_id, desired_outcome_id),
  FOREIGN KEY (persona_id) REFERENCES personas(id),
  FOREIGN KEY (desired_outcome_id) REFERENCES desired_outcomes(id)
);

CREATE TABLE page_desired_outcome (
  page_id TEXT NOT NULL,
  desired_outcome_id TEXT NOT NULL,
  influence_level TEXT NOT NULL,
  PRIMARY KEY (page_id, desired_outcome_id),
  FOREIGN KEY (page_id) REFERENCES pages(id),
  FOREIGN KEY (desired_outcome_id) REFERENCES desired_outcomes(id)
);

CREATE TABLE task_flows (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  trigger_context TEXT NOT NULL,
  start_page_id TEXT NOT NULL,
  success_outcome_id TEXT,
  notes TEXT,
  FOREIGN KEY (start_page_id) REFERENCES pages(id),
  FOREIGN KEY (success_outcome_id) REFERENCES ooux_outcomes(id)
);

CREATE TABLE task_flow_steps (
  flow_id TEXT NOT NULL,
  step_order INTEGER NOT NULL,
  page_id TEXT NOT NULL,
  action_id TEXT NOT NULL,
  object_id TEXT NOT NULL,
  PRIMARY KEY (flow_id, step_order),
  FOREIGN KEY (flow_id) REFERENCES task_flows(id),
  FOREIGN KEY (page_id) REFERENCES pages(id),
  FOREIGN KEY (action_id) REFERENCES ooux_actions(id),
  FOREIGN KEY (object_id) REFERENCES ooux_objects(id)
);

CREATE TABLE persona_task_flow (
  persona_id TEXT NOT NULL,
  flow_id TEXT NOT NULL,
  relevance_rank INTEGER NOT NULL,
  PRIMARY KEY (persona_id, flow_id),
  FOREIGN KEY (persona_id) REFERENCES personas(id),
  FOREIGN KEY (flow_id) REFERENCES task_flows(id)
);

CREATE TABLE hypothesis_task_flow (
  hypothesis_id TEXT NOT NULL,
  flow_id TEXT NOT NULL,
  confidence TEXT NOT NULL,
  rationale TEXT NOT NULL,
  PRIMARY KEY (hypothesis_id, flow_id),
  FOREIGN KEY (hypothesis_id) REFERENCES hypotheses(id),
  FOREIGN KEY (flow_id) REFERENCES task_flows(id)
);

CREATE TABLE device_context (
  id TEXT PRIMARY KEY,
  device_class TEXT NOT NULL,
  input_mode TEXT NOT NULL,
  viewport_bucket TEXT NOT NULL,
  network_tier TEXT NOT NULL,
  label TEXT NOT NULL
);

CREATE TABLE hypothesis_device_context (
  hypothesis_id TEXT NOT NULL,
  device_context_id TEXT NOT NULL,
  relevance_rank INTEGER NOT NULL,
  PRIMARY KEY (hypothesis_id, device_context_id),
  FOREIGN KEY (hypothesis_id) REFERENCES hypotheses(id),
  FOREIGN KEY (device_context_id) REFERENCES device_context(id)
);

CREATE TABLE task_flow_device_context (
  flow_id TEXT NOT NULL,
  device_context_id TEXT NOT NULL,
  relevance_rank INTEGER NOT NULL,
  PRIMARY KEY (flow_id, device_context_id),
  FOREIGN KEY (flow_id) REFERENCES task_flows(id),
  FOREIGN KEY (device_context_id) REFERENCES device_context(id)
);

CREATE TABLE persona_device_context (
  persona_id TEXT NOT NULL,
  device_context_id TEXT NOT NULL,
  relevance_rank INTEGER NOT NULL,
  PRIMARY KEY (persona_id, device_context_id),
  FOREIGN KEY (persona_id) REFERENCES personas(id),
  FOREIGN KEY (device_context_id) REFERENCES device_context(id)
);
