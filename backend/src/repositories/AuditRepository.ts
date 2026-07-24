import { SheetRepository } from './SheetRepository';
import { AuditLogEntryDTO } from '../dto/AuditDTO';
import { AuditHashChain } from '../utils/AuditHashChain';

export class AuditRepository {
  private sheetRepo: SheetRepository;

  constructor(sheetRepo?: SheetRepository) {
    const auditSsId = typeof PropertiesService !== 'undefined' 
      ? PropertiesService.getScriptProperties().getProperty('DB_AUDIT_SPREADSHEET_ID') 
      : null;
    this.sheetRepo = sheetRepo || new SheetRepository(auditSsId || '1CnZIe2REEWrEowRVsiNT9nvcPjh_QxJrQq4sxoZRJoo');
  }

  /**
   * Appends a new Audit Log entry to AUDIT_LOG sheet using LockService.
   * STRICT APPEND-ONLY: No update or delete operations allowed!
   */
  public appendLog(entry: Omit<AuditLogEntryDTO, 'auditId' | 'timestamp' | 'previousHash' | 'currentHash'>): AuditLogEntryDTO {
    return this.sheetRepo.executeWithLock(() => {
      const sheet = this.sheetRepo.getSheet('AUDIT_LOG');
      const lastRow = sheet.getLastRow();

      let previousHash = AuditHashChain.GENESIS_PREVIOUS_HASH;
      if (lastRow > 1) {
        // Fetch CurrentHash of last row (Column 17)
        previousHash = String(sheet.getRange(lastRow, 17).getValue());
      }

      const now = new Date().toISOString();
      const auditId = `log-${Utilities.getUuid()}`;

      const fullEntry: AuditLogEntryDTO = {
        ...entry,
        auditId,
        timestamp: now,
        previousHash,
        currentHash: ''
      };

      const currentHash = AuditHashChain.computeEntryHash(fullEntry);
      fullEntry.currentHash = currentHash;

      const headers = [
        'AuditID', 'Timestamp', 'ActorStaffID', 'ActorRole', 'Action',
        'EntityType', 'EntityID', 'RequestID', 'OldValueHash', 'NewValueHash',
        'MetadataJSON', 'IPAddress', 'UserAgentHash', 'Success', 'FailureReason',
        'PreviousHash', 'CurrentHash'
      ];

      const rowObj = {
        AuditID: fullEntry.auditId,
        Timestamp: fullEntry.timestamp,
        ActorStaffID: fullEntry.actorStaffId,
        ActorRole: fullEntry.actorRole,
        Action: fullEntry.action,
        EntityType: fullEntry.entityType,
        EntityID: fullEntry.entityId,
        RequestID: fullEntry.requestId,
        OldValueHash: fullEntry.oldValueHash,
        NewValueHash: fullEntry.newValueHash,
        MetadataJSON: fullEntry.metadataJson,
        IPAddress: fullEntry.ipAddress,
        UserAgentHash: fullEntry.userAgentHash,
        Success: fullEntry.success,
        FailureReason: fullEntry.failureReason,
        PreviousHash: fullEntry.previousHash,
        CurrentHash: fullEntry.currentHash
      };

      this.sheetRepo.appendRow('AUDIT_LOG', headers, rowObj);
      return fullEntry;
    });
  }

  /**
   * Reads all audit log entries for verification scanning.
   */
  public findAllLogs(): AuditLogEntryDTO[] {
    const rows = this.sheetRepo.getRows('AUDIT_LOG');
    return rows.map((r) => ({
      auditId: String(r.AuditID || r.LogUUID),
      timestamp: String(r.Timestamp),
      actorStaffId: String(r.ActorStaffID || r.StaffID),
      actorRole: (r.ActorRole || r.RoleCode) as any,
      action: String(r.Action),
      entityType: String(r.EntityType || r.TargetResource || 'System'),
      entityId: String(r.EntityID || ''),
      requestId: String(r.RequestID || ''),
      oldValueHash: String(r.OldValueHash || '0000000000000000000000000000000000000000000000000000000000000000'),
      newValueHash: String(r.NewValueHash || '0000000000000000000000000000000000000000000000000000000000000000'),
      metadataJson: String(r.MetadataJSON || r.DetailsJson || '{}'),
      ipAddress: String(r.IPAddress || ''),
      userAgentHash: String(r.UserAgentHash || ''),
      success: r.Success !== false && String(r.Success) !== 'FALSE',
      failureReason: String(r.FailureReason || ''),
      previousHash: String(r.PreviousHash),
      currentHash: String(r.CurrentHash || r.EntryHash)
    }));
  }
}
