import { UserRole } from '../types';

export type AuditEventAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'LOGOUT'
  | 'PASSWORD_CHANGE'
  | 'PASSWORD_RESET'
  | 'SENSITIVE_RECORD_VIEW'
  | 'REPORT_EXPORT'
  | 'FILE_DOWNLOAD'
  | 'RULE_CHANGE'
  | 'PHYSICIAN_OVERRIDE'
  | 'ROLE_CHANGE'
  | 'STAFF_MASTER_CHANGE';

export interface AuditLogEntryDTO {
  auditId: string;
  timestamp: string;
  actorStaffId: string;
  actorRole: UserRole | 'SYSTEM';
  action: AuditEventAction | string;
  entityType: string;
  entityId: string;
  requestId: string;
  oldValueHash: string;
  newValueHash: string;
  metadataJson: string;
  ipAddress: string;
  userAgentHash: string;
  success: boolean;
  failureReason: string;
  previousHash: string;
  currentHash: string;
}

export interface AuditVerificationReportDTO {
  totalLogsScanned: number;
  isChainValid: boolean;
  tamperedLogIndex?: number;
  tamperedLogId?: string;
  verificationTimestamp: string;
  verifiedBy: string;
  summaryMessage: string;
}
