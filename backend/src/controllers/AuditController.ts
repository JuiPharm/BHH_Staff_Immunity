import { AuditService } from '../services/AuditService';
import { AuthorizationMiddleware } from '../middleware/AuthorizationMiddleware';
import { ResponseHelper } from '../utils/ResponseHelper';
import { UserRole } from '../types';

export class AuditController {
  private service: AuditService;

  constructor(service?: AuditService) {
    this.service = service || new AuditService();
  }

  /**
   * Fetches audit logs (Infection Control only).
   */
  public getAuditLogs(userRole: UserRole, userStaffId: string, requestId: string): GoogleAppsScript.Content.TextOutput {
    const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, 'READ_AUDIT_LOGS', undefined, requestId);
    if (!auth.isAuthorized) return auth.errorResponse!;

    try {
      const verificationReport = this.service.verifyAuditChain(userStaffId);
      return ResponseHelper.success(verificationReport, requestId);
    } catch (err: any) {
      return ResponseHelper.error('AUDIT_ERROR', err.message, requestId, 500);
    }
  }

  /**
   * Triggers full table Cryptographic Hash Chain verification scan.
   */
  public verifyAuditChainIntegrity(userRole: UserRole, userStaffId: string, requestId: string): GoogleAppsScript.Content.TextOutput {
    const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, 'READ_AUDIT_LOGS', undefined, requestId);
    if (!auth.isAuthorized) return auth.errorResponse!;

    try {
      const report = this.service.verifyAuditChain(userStaffId);
      return ResponseHelper.success(report, requestId);
    } catch (err: any) {
      return ResponseHelper.error('VERIFICATION_FAILED', err.message, requestId, 500);
    }
  }
}
