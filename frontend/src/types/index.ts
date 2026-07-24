// User Roles
export type UserRole = 'INFECTION_CONTROL' | 'HR' | 'PHYSICIAN' | 'DATA_OWNER';

// Work Groups
export type WorkGroup = 'CLINICAL' | 'FRONTLINE' | 'BACKOFFICE';

// Gender
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

// Health Record Categories
export type HealthCategory =
  | 'HEPATITIS_B'
  | 'ANTI_HBS'
  | 'MMR'
  | 'MEASLES_IGG'
  | 'VARICELLA'
  | 'VARICELLA_IGG'
  | 'TDAP'
  | 'INFLUENZA'
  | 'CXR'
  | 'TST'
  | 'LTBI';

// Record Verification Status
export type VerificationStatus = 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED';

// Work Readiness Status
export type WorkReadinessStatus = 'CLEARED' | 'CONDITIONALLY_CLEARED' | 'NOT_CLEARED';

// User Profile
export interface UserSession {
  staffId: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  department: string;
  workGroup: WorkGroup;
  email: string;
  token: string;
  mustChangePassword?: boolean;
}

// Staff Master Record
export interface StaffMaster {
  staffId: string;
  hn?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  bloodGroup: string;
  department: string;
  workGroup: WorkGroup;
  email: string;
  phone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  status: 'ACTIVE' | 'RESIGNED' | 'SUSPENDED';
  recordVersion: number;
  updatedAt: string;

  // Masked or computed summary fields
  workReadiness?: WorkReadinessStatus;
  completenessPercentage?: number;
  pendingItemsCount?: number;
}

// Health Record Item
export interface HealthRecord {
  recordUuid: string;
  staffId: string;
  category: HealthCategory;
  recordType: 'VACCINE' | 'LAB_TEST' | 'TREATMENT';
  resultOrStatus: string;
  numericValue?: number;
  administeredOrTestDate: string;
  expiryDate?: string;
  documentUuid?: string;
  documentFileName?: string;
  verificationStatus: VerificationStatus;
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  isMedicalExemption: boolean;
  exemptionReason?: string;
  recordVersion: number;
  createdAt: string;
}

// Physician Assessment
export interface PhysicianAssessment {
  assessmentUuid: string;
  staffId: string;
  physicianStaffId: string;
  assessmentDate: string;
  workReadinessStatus: WorkReadinessStatus;
  medicalOverride: boolean;
  overrideReason?: string;
  clinicalNotes: string;
  nextReviewDate?: string;
  recordVersion: number;
  createdAt: string;
}

// Work-Readiness Rule
export interface WorkReadinessRule {
  ruleUuid: string;
  version: number;
  workGroup: WorkGroup;
  effectiveDate: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'ARCHIVED';
  requirements: Array<{
    category: HealthCategory;
    ruleType: string;
    minTiter?: number;
    requiredDoses?: number;
    validityYears?: number;
  }>;
  createdBy: string;
  approvedBy?: string;
  createdAt: string;
}

// Document Metadata
export interface DocumentMetadata {
  documentUuid: string;
  staffId: string;
  originalFileName: string;
  fileExtension: string;
  mimeType: string;
  fileSizeByte: number;
  sha256Checksum: string;
  uploadedBy: string;
  uploadedAt: string;
}

// Audit Log Entry with Hash Chain
export interface AuditLogEntry {
  logUuid: string;
  timestamp: string;
  staffId: string;
  role: UserRole;
  action: string;
  targetResource: string;
  detailsJson: string;
  previousHash: string;
  entryHash: string;
  isValidChain?: boolean;
}

// API Standard Response Schema
export interface ApiResponse<T = any> {
  success: boolean;
  requestId: string;
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: any[];
  } | null;
}
