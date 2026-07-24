export type RuleStatusType = 'draft' | 'pending_approval' | 'approved' | 'active' | 'retired';

export type AssessmentResultStatus =
  | 'ready'
  | 'action_required'
  | 'pending_verification'
  | 'pending_physician_review'
  | 'temporarily_restricted'
  | 'exempted';

export type RuleOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'greater_than_or_equal'
  | 'less_than'
  | 'less_than_or_equal'
  | 'in'
  | 'not_in'
  | 'exists'
  | 'date_within_years'
  | 'date_older_than_years'
  | 'all'
  | 'any';

export interface RuleCondition {
  field?: string;
  operator: RuleOperator;
  value?: any;
  conditions?: RuleCondition[]; // For nested 'all' or 'any'
}

export interface RuleVersionDTO {
  versionUuid: string;
  ruleUuid: string;
  versionNumber: number;
  workGroup: 'CLINICAL' | 'FRONTLINE' | 'BACKOFFICE';
  requirementsJson: string; // JSON string of RuleCondition
  effectiveFrom: string; // YYYY-MM-DD
  effectiveTo?: string; // YYYY-MM-DD
  status: RuleStatusType;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}

export interface AssessmentResultDTO {
  assessmentUuid: string;
  staffId: string;
  workGroup: string;
  status: AssessmentResultStatus;
  ruleVersionUuid: string;
  ruleVersionNumber: number;
  missingRequirements: string[];
  isPhysicianOverride: boolean;
  overrideReason?: string;
  evaluatedAt: string;
}

export interface ImpactPreviewResult {
  ruleVersionUuid: string;
  totalStaffEvaluated: number;
  readyCount: number;
  actionRequiredCount: number;
  statusChangeCount: number; // How many staff change status under new rule
}
