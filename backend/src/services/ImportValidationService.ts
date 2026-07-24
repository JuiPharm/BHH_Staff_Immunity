import { ImportTargetType, ImportRowValidationResult, ImportRowError } from '../dto/ImportDTO';
import { SchemaValidator } from '../utils/SchemaValidator';

export class ImportValidationService {
  private static DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
  private static EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /**
   * Sanitizes text to prevent CSV Formula Injection attacks.
   * Prepends a single quote `'` if the cell begins with `=`, `+`, `-`, `@`, `0x09`, or `0x0D`.
   */
  public static sanitizeFormulaInjection(value: any): any {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (/^[=+\-@\t\r]/.test(trimmed)) {
      return `'${trimmed}`;
    }
    return value;
  }

  /**
   * Validates a batch of raw records for dry run preview.
   */
  public static validateBatch(
    targetType: ImportTargetType,
    records: Record<string, any>[],
    existingStaffIds: Set<string>
  ): ImportRowValidationResult[] {
    const results: ImportRowValidationResult[] = [];
    const seenStaffIdsInFile = new Set<string>();
    const seenVaccinesInFile = new Set<string>();

    const todayStr = new Date().toISOString().split('T')[0];

    records.forEach((rawRecord, index) => {
      const rowNumber = index + 2; // 1-indexed header + 1
      const sanitizedRecord: Record<string, any> = {};
      const errors: ImportRowError[] = [];

      // Sanitize all values against CSV Formula Injection
      Object.keys(rawRecord).forEach((k) => {
        sanitizedRecord[k] = this.sanitizeFormulaInjection(rawRecord[k]);
      });

      const staffId = String(sanitizedRecord['StaffID'] || sanitizedRecord['staffId'] || '').toUpperCase();

      // 1. StaffID Validation
      if (!staffId) {
        errors.push({ rowNumber, fieldName: 'StaffID', invalidValue: '', errorMessage: 'StaffID เป็นข้อมูลจำเป็น', severity: 'ERROR' });
      } else {
        if (!SchemaValidator.validateStaffId(staffId)) {
          errors.push({ rowNumber, fieldName: 'StaffID', invalidValue: staffId, errorMessage: 'รูปแบบ StaffID ไม่ถูกต้อง (ต้องเป็นอักษร/ตัวเลข 4-10 ตัวอักษร)', severity: 'ERROR' });
        }

        // Duplicate StaffID in uploaded file check (for Staff Master)
        if (targetType === 'STAFF_MASTER') {
          if (seenStaffIdsInFile.has(staffId)) {
            errors.push({ rowNumber, fieldName: 'StaffID', invalidValue: staffId, errorMessage: 'พบ StaffID ซ้ำซ้อนภายในไฟล์เดียวกัน', severity: 'ERROR' });
          } else {
            seenStaffIdsInFile.add(staffId);
          }
        } else {
          // For Clinical Records, check if StaffID exists in system
          if (!existingStaffIds.has(staffId)) {
            errors.push({ rowNumber, fieldName: 'StaffID', invalidValue: staffId, errorMessage: 'ไม่พบรหัส StaffID นี้ในฐานข้อมูลบุคลากร', severity: 'ERROR' });
          }
        }
      }

      // 2. Target Specific Validations
      if (targetType === 'STAFF_MASTER') {
        const email = String(sanitizedRecord['Email'] || '');
        if (email && !this.EMAIL_REGEX.test(email)) {
          errors.push({ rowNumber, fieldName: 'Email', invalidValue: email, errorMessage: 'รูปแบบอีเมลไม่ถูกต้อง', severity: 'ERROR' });
        }

        const workGroup = String(sanitizedRecord['WorkGroup'] || '').toUpperCase();
        if (workGroup && !['CLINICAL', 'FRONTLINE', 'BACKOFFICE'].includes(workGroup)) {
          errors.push({ rowNumber, fieldName: 'WorkGroup', invalidValue: workGroup, errorMessage: 'กลุ่มงานต้องเป็น CLINICAL, FRONTLINE หรือ BACKOFFICE', severity: 'ERROR' });
        }
      }

      if (targetType === 'VACCINATION') {
        const category = String(sanitizedRecord['VaccineCategory'] || '').toUpperCase();
        const dose = Number(sanitizedRecord['DoseNumber']) || 1;
        const adminDate = String(sanitizedRecord['AdministeredDate'] || '');

        if (!adminDate || !this.DATE_REGEX.test(adminDate)) {
          errors.push({ rowNumber, fieldName: 'AdministeredDate', invalidValue: adminDate, errorMessage: 'รูปแบบวันฉีดวัคซีนต้องเป็น YYYY-MM-DD', severity: 'ERROR' });
        } else if (adminDate > todayStr) {
          errors.push({ rowNumber, fieldName: 'AdministeredDate', invalidValue: adminDate, errorMessage: 'วันฉีดวัคซีนต้องไม่เป็นวันในอนาคต (Future Date)', severity: 'ERROR' });
        }

        // Duplicate dose in file
        const key = `${staffId}_${category}_${dose}`;
        if (seenVaccinesInFile.has(key)) {
          errors.push({ rowNumber, fieldName: 'DoseNumber', invalidValue: String(dose), errorMessage: `รายการวัคซีน ${category} เข็มที่ ${dose} ซ้ำในไฟล์เดียวกัน`, severity: 'ERROR' });
        } else {
          seenVaccinesInFile.add(key);
        }
      }

      if (targetType === 'LAB_RESULT') {
        const qualResult = String(sanitizedRecord['QualitativeResult'] || '').toUpperCase();
        if (!['POSITIVE', 'NEGATIVE', 'EQUIVOCAL'].includes(qualResult)) {
          errors.push({ rowNumber, fieldName: 'QualitativeResult', invalidValue: qualResult, errorMessage: 'ผลตรวจแบบเชิงคุณภาพต้องเป็น POSITIVE, NEGATIVE หรือ EQUIVOCAL', severity: 'ERROR' });
        }
      }

      const hasError = errors.some((e) => e.severity === 'ERROR');
      const hasWarning = errors.some((e) => e.severity === 'WARNING');

      results.push({
        rowNumber,
        rawRecord,
        sanitizedRecord,
        isValid: !hasError,
        hasWarning,
        errors
      });
    });

    return results;
  }
}
