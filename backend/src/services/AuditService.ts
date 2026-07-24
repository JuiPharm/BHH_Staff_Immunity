import { AuditRepository } from '../repositories/AuditRepository';
import { AuditRedactionUtility } from '../utils/AuditRedactionUtility';
import { AuditHashChain } from '../utils/AuditHashChain';
import { AuditEventAction, AuditVerificationReportDTO, AuditLogEntryDTO } from '../dto/AuditDTO';
import { UserRole } from '../types';
import { CryptoService } from './CryptoService';

export class AuditService {
  private repo: AuditRepository;

  constructor(repo?: AuditRepository) {
    this.repo = repo || new AuditRepository();
  }

  /**
   * General Audit Event Logger with automatic data redaction.
   */
  public logEvent(
    actorStaffId: string,
    actorRole: UserRole | 'SYSTEM',
    action: AuditEventAction | string,
    entityType: string,
    entityId: string,
    requestId: string,
    metadataObj: any = {},
    success = true,
    failureReason = '',
    oldValue = '',
    newValue = ''
  ): AuditLogEntryDTO {
    const sanitizedJson = AuditRedactionUtility.redactToJson(metadataObj);
    const oldValueHash = oldValue ? CryptoService.computeSha256(oldValue) : '0000000000000000000000000000000000000000000000000000000000000000';
    const newValueHash = newValue ? CryptoService.computeSha256(newValue) : '0000000000000000000000000000000000000000000000000000000000000000';

    return this.repo.appendLog({
      actorStaffId,
      actorRole,
      action,
      entityType,
      entityId,
      requestId,
      oldValueHash,
      newValueHash,
      metadataJson: sanitizedJson,
      ipAddress: metadataObj.ipAddress || '10.20.4.12',
      userAgentHash: metadataObj.userAgent ? CryptoService.computeSha256(metadataObj.userAgent) : '0000000000000000000000000000000000000000000000000000000000000000',
      success,
      failureReason
    });
  }

  /**
   * Scans and verifies Hash Chain integrity across the entire AUDIT_LOG sheet.
   */
  public verifyAuditChain(verifiedBy: string): AuditVerificationReportDTO {
    const logs = this.repo.findAllLogs();
    const result = AuditHashChain.verifyChain(logs);
    const now = new Date().toISOString();

    if (!result.isValid) {
      return {
        totalLogsScanned: logs.length,
        isChainValid: false,
        tamperedLogIndex: result.tamperedIndex,
        tamperedLogId: result.tamperedLogId,
        verificationTimestamp: now,
        verifiedBy,
        summaryMessage: `⚠️ WARNING: Cryptographic Hash Chain Tampering Detected at Row ${result.tamperedIndex! + 1} (AuditID: ${result.tamperedLogId})`
      };
    }

    return {
      totalLogsScanned: logs.length,
      isChainValid: true,
      verificationTimestamp: now,
      verifiedBy,
      summaryMessage: `✅ SUCCESS: All ${logs.length} Cryptographic Audit Logs verified cleanly with unbroken Hash Chain integrity.`
    };
  }
}
