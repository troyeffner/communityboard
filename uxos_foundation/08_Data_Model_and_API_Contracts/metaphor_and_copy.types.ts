export type UxosId = string;
export type IsoDateTime = string;

export type MetaphorLevel = "interaction" | "page" | "system";
export type CanonStatus = "draft" | "active" | "canon" | "deprecated";

export type CopyAtomType =
  | "cta"
  | "headline"
  | "label"
  | "helper_text"
  | "error"
  | "marketing_claim";

export type CopyChannel =
  | "public_site"
  | "in_product"
  | "email"
  | "docs"
  | "app_store"
  | "other";

export type AlignmentIssueType =
  | "metaphor_conflict"
  | "metaphor_missing"
  | "copy_ooux_mismatch"
  | "copy_job_mismatch"
  | "copy_page_purpose_mismatch"
  | "claim_capability_gap"
  | "terminology_inconsistency";

export type AlignmentSeverity = "low" | "medium" | "high" | "blocking";
export type AlignmentDetectedBy = "rule_engine" | "manual";
export type AlignmentIssueStatus = "open" | "accepted" | "resolved" | "suppressed";

export type EdgeType =
  | "frames"
  | "implies"
  | "aligns_with"
  | "violates"
  | "uses_term";

export interface Timestamps {
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface MetaphorAppliesTo {
  pageIds?: UxosId[];
  interactionIds?: UxosId[];
  surfaceElementIds?: UxosId[];
  objectIds?: UxosId[];
  actionIds?: UxosId[];
  jobIds?: UxosId[];
}

export interface Metaphor extends Timestamps {
  id: UxosId;
  level: MetaphorLevel;
  name: string;
  statement: string;
  description?: string;
  appliesTo: MetaphorAppliesTo;
  doNotDo: string[];
  toneTags?: string[];
  inheritsSystemMetaphor?: boolean;
  status: CanonStatus;
  versionId: UxosId;
  owner?: string;
}

export interface CopyIntent {
  primaryJobId?: UxosId; // required when type is cta/headline/marketing_claim
  desiredOutcomeId?: UxosId;
}

export interface CopyReferences {
  objectIds: UxosId[];
  actionIds: UxosId[];
  capabilityIds?: UxosId[];
}

export interface CopyConstraints {
  mustNotImply?: string[];
  requiredDisclaimer?: string;
}

export interface PublicCopyAtom extends Timestamps {
  id: UxosId;
  type: CopyAtomType;
  channel: CopyChannel;
  surfaceId: UxosId;
  placement: string;
  text: string;
  intent: CopyIntent;
  references: CopyReferences;
  constraints?: CopyConstraints;
  status: CanonStatus;
  versionId: UxosId;
}

export interface AlignmentIssue extends Timestamps {
  id: UxosId;
  issueType: AlignmentIssueType;
  severity: AlignmentSeverity;
  detectedBy: AlignmentDetectedBy;
  fromEntityId: UxosId;
  toEntityId?: UxosId;
  summary: string;
  details?: string;
  suggestedFix?: string;
  status: AlignmentIssueStatus;
  suppressionRationale?: string;
  versionId: UxosId;
}

export interface Edge {
  fromId: UxosId;
  toId: UxosId;
  type: EdgeType;
  createdVersionId: UxosId;
  metadata?: Record<string, string | number | boolean | null>;
}

export type GovernanceRuleId =
  | "MG1"
  | "MG2"
  | "MG3"
  | "CG1"
  | "CG2"
  | "CG3"
  | "LK1";

export interface GovernanceRule {
  id: GovernanceRuleId;
  description: string;
  enforce: "error" | "warning";
}

export interface GovernanceConfig {
  canonLockEnabled: boolean;
  rules: GovernanceRule[];
}

export interface MetaphorAndCopyBundle {
  metaphors: Metaphor[];
  publicCopyAtoms: PublicCopyAtom[];
  alignmentIssues: AlignmentIssue[];
  edges: Edge[];
  governance: GovernanceConfig;
}
