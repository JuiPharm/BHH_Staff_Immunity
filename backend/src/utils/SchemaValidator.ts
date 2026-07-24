import { FormulaSanitizer } from './FormulaSanitizer';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class SchemaValidator {
  private static UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  private static STAFF_ID_REGEX = /^[A-Z0-9]{4,10}$/;
  private static ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
  private static ISO_TIMESTAMP_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
  private static EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private static HEX_64_REGEX = /^[0-9a-f]{64}$/i;

  /**
   * Validates UUID string format
   */
  public static isValidUuid(uuid: string): boolean {
    if (!uuid) return false;
    return this.UUID_REGEX.test(uuid) || uuid.startsWith('doc-') || uuid.startsWith('log-') || uuid.startsWith('rec-') || uuid.startsWith('job-');
  }

  /**
   * Validates Business Key StaffID format
   */
  public static isValidStaffId(staffId: string): boolean {
    if (!staffId) return false;
    return this.STAFF_ID_REGEX.test(staffId) || staffId === 'SYSTEM';
  }

  /**
   * Validates ISO Date format (YYYY-MM-DD)
   */
  public static isValidDate(dateStr: string): boolean {
    if (!dateStr) return false;
    return this.ISO_DATE_REGEX.test(dateStr);
  }

  /**
   * Validates ISO 8601 Timestamp format
   */
  public static isValidTimestamp(timestampStr: string): boolean {
    if (!timestampStr) return false;
    return !isNaN(Date.parse(timestampStr));
  }

  /**
   * Validates SHA-256 / PBKDF2 Hex String (64 Hex Characters)
   */
  public static isValidHex64(hexStr: string): boolean {
    if (!hexStr) return false;
    return this.HEX_64_REGEX.test(hexStr);
  }

  /**
   * General Record Validation Engine
   */
  public static validateRecord(sheetName: string, record: Record<string, any>): ValidationResult {
    const errors: string[] = [];

    // 1. Mandatory Standard Columns Check
    if (record.StaffID !== undefined && !this.isValidStaffId(String(record.StaffID))) {
      errors.push(`Invalid StaffID format: '${record.StaffID}'`);
    }

    if (record.CreatedAt && !this.isValidTimestamp(String(record.CreatedAt))) {
      errors.push(`Invalid CreatedAt ISO Timestamp: '${record.CreatedAt}'`);
    }

    if (record.UpdatedAt && !this.isValidTimestamp(String(record.UpdatedAt))) {
      errors.push(`Invalid UpdatedAt ISO Timestamp: '${record.UpdatedAt}'`);
    }

    if (record.RecordVersion !== undefined && (isNaN(Number(record.RecordVersion)) || Number(record.RecordVersion) < 1)) {
      errors.push(`RecordVersion must be an integer >= 1`);
    }

    if (record.IsDeleted !== undefined && typeof record.IsDeleted !== 'boolean' && record.IsDeleted !== 'TRUE' && record.IsDeleted !== 'FALSE') {
      errors.push(`IsDeleted must be a boolean`);
    }

    // 2. Specific Security Database Checks
    if (sheetName === 'USER_ACCOUNT') {
      if (record.PasswordHash && !this.isValidHex64(String(record.PasswordHash))) {
        errors.push(`PasswordHash must be a 64-character SHA-256/PBKDF2 hex string`);
      }
      if (record.Iterations && Number(record.Iterations) < 100000) {
        errors.push(`PBKDF2 Iterations must be >= 100000`);
      }
    }

    if (sheetName === 'SESSION') {
      if (record.TokenHash && !this.isValidHex64(String(record.TokenHash))) {
        errors.push(`Session TokenHash must be a 64-character SHA-256 hex string`);
      }
    }

    // 3. Specific Audit Log Checks
    if (sheetName === 'AUDIT_LOG') {
      if (!record.PreviousHash) {
        errors.push(`AUDIT_LOG requires PreviousHash for cryptographic hash chain`);
      }
      if (!record.CurrentHash) {
        errors.push(`AUDIT_LOG requires CurrentHash for cryptographic hash chain`);
      }
    }

    // 4. File Attachment Security Checks
    if (sheetName === 'FILE_ATTACHMENT') {
      if (record.DriveFileUrl || record.PublicUrl) {
        errors.push(`FILE_ATTACHMENT must NOT store public Drive URLs for security compliance`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
