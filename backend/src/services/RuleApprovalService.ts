import { RuleStatusType } from '../dto/RuleDTO';
import { SheetRepository } from '../repositories/SheetRepository';

export class RuleApprovalService {
  private sheetRepo: SheetRepository;

  constructor(sheetRepo?: SheetRepository) {
    const auditSsId = PropertiesService.getScriptProperties().getProperty('DB_AUDIT_SPREADSHEET_ID');
    this.sheetRepo = sheetRepo || new SheetRepository(auditSsId || undefined);
  }

  /**
   * Transitions Rule Version Status:
   * draft -> pending_approval -> approved -> active -> retired
   */
  public transitionStatus(versionUuid: string, targetStatus: RuleStatusType, approvedBy: string, comment?: string): boolean {
    const now = new Date().toISOString();

    return this.sheetRepo.executeWithLock(() => {
      this.sheetRepo.updateRow('RULE_VERSION', 'VersionUUID', versionUuid, {
        Status: targetStatus,
        ApprovedBy: approvedBy,
        ApprovedAt: now,
        UpdatedAt: now,
        UpdatedBy: approvedBy
      });

      // Log approval record
      const headers = [
        'ApprovalUUID', 'VersionUUID', 'ApprovalStatus', 'ApprovalComment', 'ApprovedBy', 'ApprovedAt',
        'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'RecordVersion', 'IsDeleted'
      ];
      this.sheetRepo.appendRow('RULE_APPROVAL', headers, {
        ApprovalUUID: `appr-${Utilities.getUuid()}`,
        VersionUUID: versionUuid,
        ApprovalStatus: targetStatus.toUpperCase(),
        ApprovalComment: comment || '',
        ApprovedBy: approvedBy,
        ApprovedAt: now,
        CreatedAt: now,
        CreatedBy: approvedBy,
        UpdatedAt: now,
        UpdatedBy: approvedBy,
        RecordVersion: 1,
        IsDeleted: false
      });

      return true;
    });
  }
}
