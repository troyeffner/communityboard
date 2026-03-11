export type UxosId = string;
export type IsoDateTime = string;

export type AssumptionDomain =
  | "Actor"
  | "Job"
  | "Problem"
  | "Need"
  | "Context"
  | "Capability"
  | "System";

export type ConfidenceRisk = "low" | "med" | "high";

export type AssumptionStatus = "draft" | "active" | "canon" | "invalidated";

export type HypothesisResult =
  | "pending"
  | "confirmed"
  | "rejected"
  | "inconclusive";

export type ExperimentType =
  | "prototype_test"
  | "usability"
  | "survey"
  | "field"
  | "ab_test"
  | "log_analysis"
  | "other";

export type ExperimentStatus = "planned" | "running" | "completed" | "aborted";

export type EvidenceSource =
  | "experiment"
  | "research_note"
  | "analytics"
  | "cs_ticket"
  | "other";

export type EvidenceStrength = "low" | "med" | "high";

export type EdgeType =
  | "informs"
  | "tested_by"
  | "produces"
  | "updates"
  | "supports"
  | "contradicts"
  | "depends_on"
  | "conflicts_with";

export type CanonicalEntityType =
  | "job"
  | "actor"
  | "object"
  | "page"
  | "capability"
  | "outcome"
  | "thread";

export interface LinkedEntityRef {
  entityType: CanonicalEntityType;
  entityId: UxosId;
}

export interface Timestamps {
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface Assumption extends Timestamps {
  id: UxosId;
  domain: AssumptionDomain;
  statement: string;
  linkedEntities: LinkedEntityRef[];
  confidence: ConfidenceRisk;
  risk: ConfidenceRisk;
  evidenceRefs?: UxosId[];
  evidencePendingReason?: string;
  versionId: UxosId;
  status: AssumptionStatus;
  needsReview?: boolean;
  owner?: string;
}

export interface Hypothesis extends Timestamps {
  id: UxosId;
  derivedFromAssumptions: UxosId[]; // required >= 1
  intervention: string;
  predictedOutcome: string;
  metric: string;
  baseline?: number | string;
  successThreshold: number | string;
  timeframe: string;
  instrumentationUnavailableReason?: string;
  experimentId?: UxosId;
  result: HypothesisResult;
  measuredValue?: number | string;
  linkedEntities: LinkedEntityRef[];
  versionId: UxosId;
  needsReview?: boolean;
}

export interface ExperimentSample {
  n?: number;
  segments?: string[];
}

export interface Experiment extends Timestamps {
  id: UxosId;
  type: ExperimentType;
  hypothesisIds: UxosId[]; // required >= 1
  design?: string;
  sample?: ExperimentSample;
  startDate?: string;
  endDate?: string;
  status: ExperimentStatus;
  instrumentationRefs?: UxosId[];
  outputs: UxosId[]; // evidence ids
  versionId: UxosId;
}

export interface EvidenceSupportMap {
  assumptionIds?: UxosId[];
  hypothesisIds?: UxosId[];
}

export interface Evidence extends Timestamps {
  id: UxosId;
  source: EvidenceSource;
  summary: string;
  strength: EvidenceStrength;
  supports?: EvidenceSupportMap;
  contradicts?: EvidenceSupportMap;
  artifacts: UxosId[];
  assumptionUpdateRationale?: string;
  versionId: UxosId;
}

export interface Edge {
  fromId: UxosId;
  toId: UxosId;
  type: EdgeType;
  createdVersionId: UxosId;
  metadata?: Record<string, string | number | boolean | null>;
}

export type GovernanceRuleId = "GR1" | "GR2" | "GR3" | "GR4" | "GR5";

export interface GovernanceRule {
  id: GovernanceRuleId;
  description: string;
  enforce: "error" | "warning";
}

export interface EpistemicGovernanceConfig {
  rules: GovernanceRule[];
}

export interface EpistemicBundle {
  assumptions: Assumption[];
  hypotheses: Hypothesis[];
  experiments: Experiment[];
  evidence: Evidence[];
  edges: Edge[];
  governance?: EpistemicGovernanceConfig;
}
