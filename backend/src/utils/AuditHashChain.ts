import { AuditLogEntryDTO } from '../dto/AuditDTO';
import { CryptoService } from '../services/CryptoService';

export class AuditHashChain {
  public static GENESIS_PREVIOUS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

  /**
   * Computes SHA-256 Entry Hash for a single Audit Log row.
   */
  public static computeEntryHash(entry: Omit<AuditLogEntryDTO, 'currentHash'>): string {
    const rawString = [
      entry.auditId,
      entry.timestamp,
      entry.actorStaffId,
      entry.actorRole,
      entry.action,
      entry.entityType,
      entry.entityId,
      entry.requestId,
      entry.oldValueHash,
      entry.newValueHash,
      entry.metadataJson,
      String(entry.success),
      entry.previousHash
    ].join('|');

    return CryptoService.computeSha256(rawString);
  }

  /**
   * Scans and verifies Hash Chain integrity across an array of audit log entries.
   * Returns verification result with tampered index if detected.
   */
  public static verifyChain(logs: AuditLogEntryDTO[]): { isValid: boolean; tamperedIndex?: number; tamperedLogId?: string } {
    if (!logs || logs.length === 0) {
      return { isValid: true };
    }

    let expectedPrevHash = this.GENESIS_PREVIOUS_HASH;

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];

      // 1. Verify PreviousHash links to expected previous CurrentHash
      if (i > 0) {
        if (log.previousHash !== expectedPrevHash) {
          return {
            isValid: false,
            tamperedIndex: i,
            tamperedLogId: log.auditId
          };
        }
      }

      // 2. Re-compute CurrentHash and compare with stored CurrentHash
      const recomputedHash = this.computeEntryHash({
        auditId: log.auditId,
        timestamp: log.timestamp,
        actorStaffId: log.actorStaffId,
        actorRole: log.actorRole,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        requestId: log.requestId,
        oldValueHash: log.oldValueHash,
        newValueHash: log.newValueHash,
        metadataJson: log.metadataJson,
        ipAddress: log.ipAddress,
        userAgentHash: log.userAgentHash,
        success: log.success,
        failureReason: log.failureReason,
        previousHash: log.previousHash
      });

      if (recomputedHash !== log.currentHash) {
        return {
          isValid: false,
          tamperedIndex: i,
          tamperedLogId: log.auditId
        };
      }

      expectedPrevHash = log.currentHash;
    }

    return { isValid: true };
  }
}
