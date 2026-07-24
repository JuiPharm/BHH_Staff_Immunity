import { SheetRepository } from './SheetRepository';
import { SessionData } from '../services/SessionService';

export class SessionRepository {
  private sheetRepo: SheetRepository;

  constructor(sheetRepo?: SheetRepository) {
    const securitySsId = typeof PropertiesService !== 'undefined' 
      ? PropertiesService.getScriptProperties().getProperty('DB_SECURITY_SPREADSHEET_ID') 
      : null;
    this.sheetRepo = sheetRepo || new SheetRepository(securitySsId || '1oOCXuIPbsEMy154OivVKqquFMt4wfK8LXqhNngH47M8');
  }

  /**
   * Saves a new session into SESSION sheet using LockService.
   */
  public saveSession(session: SessionData): void {
    const headers = [
      'SessionUUID', 'StaffID', 'TokenHash', 'IdleExpiresAt', 'AbsoluteExpiresAt',
      'IpAddressHash', 'UserAgent', 'IsRevoked',
      'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'RecordVersion', 'IsDeleted'
    ];

    const rowObj = {
      SessionUUID: session.sessionUuid,
      StaffID: session.staffId,
      TokenHash: session.tokenHash,
      IdleExpiresAt: session.idleExpiresAt,
      AbsoluteExpiresAt: session.absoluteExpiresAt,
      IpAddressHash: '',
      UserAgent: '',
      IsRevoked: false,
      CreatedAt: session.createdAt,
      CreatedBy: session.staffId,
      UpdatedAt: session.createdAt,
      UpdatedBy: session.staffId,
      RecordVersion: 1,
      IsDeleted: false
    };

    this.sheetRepo.appendRow('SESSION', headers, rowObj);
  }

  /**
   * Finds session by SHA-256 TokenHash.
   */
  public findByTokenHash(tokenHash: string): SessionData | null {
    const rows = this.sheetRepo.getRows('SESSION');
    const match = rows.find((r) => String(r.TokenHash) === tokenHash && !r.IsDeleted);
    if (!match) return null;

    return {
      sessionUuid: String(match.SessionUUID),
      staffId: String(match.StaffID),
      tokenHash: String(match.TokenHash),
      idleExpiresAt: String(match.IdleExpiresAt),
      absoluteExpiresAt: String(match.AbsoluteExpiresAt),
      sessionVersion: Number(match.RecordVersion) || 1,
      isRevoked: match.IsRevoked === true || String(match.IsRevoked) === 'TRUE',
      lastSeenAt: String(match.UpdatedAt || match.CreatedAt),
      createdAt: String(match.CreatedAt)
    };
  }

  /**
   * Revokes a single session by token hash.
   */
  public revokeSession(tokenHash: string): void {
    const session = this.findByTokenHash(tokenHash);
    if (!session) return;

    this.sheetRepo.updateRow(
      'SESSION',
      'TokenHash',
      tokenHash,
      {
        IsRevoked: true,
        UpdatedAt: new Date().toISOString()
      },
      session.sessionVersion
    );
  }

  /**
   * Revokes ALL active sessions for a given StaffID (e.g. on password change or account disable).
   */
  public revokeAllSessionsForStaff(staffId: string): void {
    const rows = this.sheetRepo.getRows('SESSION');
    rows.forEach((r) => {
      if (String(r.StaffID).toUpperCase() === staffId.toUpperCase() && !r.IsRevoked) {
        this.sheetRepo.updateRow('SESSION', 'TokenHash', String(r.TokenHash), {
          IsRevoked: true,
          UpdatedAt: new Date().toISOString()
        });
      }
    });
  }

  /**
   * HIGH-01 Patch: Purges expired or revoked session entries to prevent unbounded table growth.
   */
  public purgeExpiredSessions(): number {
    return this.sheetRepo.executeWithLock(() => {
      const sheet = this.sheetRepo.getSheet('SESSION');
      const rows = this.sheetRepo.getRows('SESSION');
      const now = new Date().toISOString();
      let purgedCount = 0;

      // Delete from bottom to top to preserve correct row indices
      for (let i = rows.length - 1; i >= 0; i--) {
        const absExp = String(rows[i].AbsoluteExpiresAt || rows[i].AbsoluteExpiration || '');
        const isRevoked = rows[i].IsRevoked === true || String(rows[i].IsRevoked) === 'TRUE';

        if (isRevoked || (absExp && absExp < now)) {
          sheet.deleteRow(i + 2); // +2 offset for 1-indexed sheet header
          purgedCount++;
        }
      }

      return purgedCount;
    });
  }
}
