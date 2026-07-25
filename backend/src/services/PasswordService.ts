import { CryptoService } from './CryptoService';
import { SheetRepository } from '../repositories/SheetRepository';

export interface PasswordHashResult {
  hash: string;
  salt: string;
  iterations: number;
}

export class PasswordService {
  public static DEFAULT_ITERATIONS = 5000;

  /**
   * Retrieves or initializes the system Password Pepper from Script Properties.
   */
  public static getPepper(): string {
    let pepper = '';
    if (typeof PropertiesService !== 'undefined') {
      const props = PropertiesService.getScriptProperties();
      pepper = props.getProperty('PASSWORD_PEPPER') || '';
      if (!pepper) {
        pepper = CryptoService.generateSalt(32);
        props.setProperty('PASSWORD_PEPPER', pepper);
      }
    }
    return pepper || 'BDMS_IMMUNE_STAFF_DEFAULT_PEPPER_KEY_2026';
  }

  /**
   * Hashes password using PBKDF2-HMAC-SHA256 with a unique random salt and server-side pepper.
   * NEVER logs or stores plain-text password.
   */
  public static hashPassword(password: string, customSalt?: string, iterations = PasswordService.DEFAULT_ITERATIONS): PasswordHashResult {
    const salt = customSalt || CryptoService.generateSalt(16);
    const pepper = PasswordService.getPepper();
    const pepperedPassword = password + pepper;
    const hash = CryptoService.pbkdf2(pepperedPassword, salt, iterations);
    return { hash, salt, iterations };
  }

  /**
   * Verifies password using constant-time comparison.
   * Also supports legacy hashes (plain SHA-256 without pepper/salt).
   */
  public static verifyPassword(password: string, expectedHash: string, salt: string, iterations = PasswordService.DEFAULT_ITERATIONS): { isValid: boolean; isLegacy: boolean } {
    if (!expectedHash) return { isValid: false, isLegacy: false };

    // 1. Try modern Peppered PBKDF2 verification
    if (salt && iterations > 1) {
      const { hash } = this.hashPassword(password, salt, iterations);
      if (CryptoService.constantTimeCompare(hash, expectedHash)) {
        return { isValid: true, isLegacy: false };
      }
    }

    // 2. Legacy Fallback Check (Plain SHA-256 or unpeppered hash)
    const legacyHash = CryptoService.hashSha256(password);
    if (CryptoService.constantTimeCompare(legacyHash, expectedHash)) {
      return { isValid: true, isLegacy: true };
    }

    // 3. Fallback unpeppered PBKDF2 check
    if (salt && iterations > 1) {
      const unpepperedHash = CryptoService.pbkdf2(password, salt, iterations);
      if (CryptoService.constantTimeCompare(unpepperedHash, expectedHash)) {
        return { isValid: true, isLegacy: true };
      }
    }

    return { isValid: false, isLegacy: false };
  }

  /**
   * Checks if a new password was used in the user's last N password changes (Password History).
   */
  public static isPasswordInHistory(staffId: string, newPassword: string, historyLimit = 5): boolean {
    if (typeof PropertiesService === 'undefined') return false;
    const securitySsId = PropertiesService.getScriptProperties().getProperty('DB_SECURITY_SPREADSHEET_ID') || '1oOCXuIPbsEMy154OivVKqquFMt4wfK8LXqhNngH47M8';
    const sheetRepo = new SheetRepository(securitySsId);
    const historyRows = sheetRepo.getRows('PASSWORD_HISTORY');

    const userHistory = historyRows
      .filter((r) => String(r.StaffID).toUpperCase() === staffId.toUpperCase() && !r.IsDeleted)
      .sort((a, b) => new Date(b.ChangedAt || b.CreatedAt).getTime() - new Date(a.ChangedAt || a.CreatedAt).getTime())
      .slice(0, historyLimit);

    for (const record of userHistory) {
      const oldHash = String(record.PasswordHash);
      const oldSalt = String(record.Salt || '');
      const oldIterations = Number(record.Iterations) || PasswordService.DEFAULT_ITERATIONS;

      const { isValid } = this.verifyPassword(newPassword, oldHash, oldSalt, oldIterations);
      if (isValid) {
        return true;
      }
    }

    return false;
  }

  /**
   * Records a password entry in the PASSWORD_HISTORY sheet.
   */
  public static recordPasswordHistory(staffId: string, passwordHash: string, salt: string, iterations: number): void {
    if (typeof PropertiesService === 'undefined') return;
    const securitySsId = PropertiesService.getScriptProperties().getProperty('DB_SECURITY_SPREADSHEET_ID') || '1oOCXuIPbsEMy154OivVKqquFMt4wfK8LXqhNngH47M8';
    const sheetRepo = new SheetRepository(securitySsId);
    const now = new Date().toISOString();

    const headers = [
      'HistoryUUID', 'StaffID', 'PasswordHash', 'Salt', 'ChangedAt',
      'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'RecordVersion', 'IsDeleted'
    ];

    const rowObj = {
      HistoryUUID: `hist-${CryptoService.generateUuid()}`,
      StaffID: staffId,
      PasswordHash: passwordHash,
      Salt: salt,
      ChangedAt: now,
      CreatedAt: now,
      CreatedBy: staffId,
      UpdatedAt: now,
      UpdatedBy: staffId,
      RecordVersion: 1,
      IsDeleted: false
    };

    sheetRepo.appendRow('PASSWORD_HISTORY', headers, rowObj);
  }

  /**
   * Hashes a one-time password reset token (SHA-256).
   */
  public static hashResetToken(token: string): string {
    return CryptoService.hashSha256(token);
  }

  /**
   * Generates a new random one-time reset token and its SHA-256 hash.
   */
  public static generateResetToken(): { token: string; tokenHash: string } {
    const token = `reset-${CryptoService.generateUuid()}`;
    const tokenHash = this.hashResetToken(token);
    return { token, tokenHash };
  }
}
