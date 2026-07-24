import { UserRole } from '../types';
import { RecordAccessPolicy } from '../policies/RecordAccessPolicy';
import { ResponseHelper } from '../utils/ResponseHelper';
import { CryptoService } from '../services/CryptoService';

export class AuthorizationMiddleware {
  // Action Permissions Map for 4 Roles
  private static ROLE_PERMISSIONS: Record<UserRole, string[]> = {
    INFECTION_CONTROL: [
      'READ_STAFF_LIST', 'READ_STAFF_SELF', 'READ_HEALTH_RECORDS', 'CREATE_HEALTH_RECORD',
      'UPDATE_HEALTH_RECORD', 'VERIFY_DOCUMENT', 'MANAGE_RULE_ENGINE', 'EXPORT_HEALTH_DATA',
      'READ_AUDIT_LOGS'
    ],
    HR: [
      'READ_STAFF_LIST', 'READ_STAFF_SELF', 'READ_HEALTH_RECORDS', 'IMPORT_STAFF_MASTER',
      'EXPORT_HEALTH_DATA'
    ],
    PHYSICIAN: [
      'READ_STAFF_LIST', 'READ_STAFF_SELF', 'READ_HEALTH_RECORDS', 'CREATE_HEALTH_RECORD',
      'UPDATE_HEALTH_RECORD', 'VERIFY_DOCUMENT', 'PHYSICIAN_ASSESSMENT', 'MANAGE_RULE_ENGINE',
      'EXPORT_HEALTH_DATA'
    ],
    DATA_OWNER: [
      'READ_STAFF_SELF', 'READ_HEALTH_RECORDS', 'CREATE_HEALTH_RECORD', 'EXPORT_HEALTH_DATA'
    ],
    SUPERUSER: [
      'READ_STAFF_LIST', 'READ_STAFF_SELF', 'READ_HEALTH_RECORDS', 'CREATE_HEALTH_RECORD',
      'UPDATE_HEALTH_RECORD', 'VERIFY_DOCUMENT', 'PHYSICIAN_ASSESSMENT', 'MANAGE_RULE_ENGINE',
      'IMPORT_STAFF_MASTER', 'EXPORT_HEALTH_DATA', 'READ_AUDIT_LOGS', 'MANAGE_SUPERUSER_STATUS'
    ],
    ADMIN: [
      'READ_STAFF_LIST', 'READ_STAFF_SELF', 'READ_HEALTH_RECORDS', 'CREATE_HEALTH_RECORD',
      'UPDATE_HEALTH_RECORD', 'VERIFY_DOCUMENT', 'PHYSICIAN_ASSESSMENT', 'MANAGE_RULE_ENGINE',
      'IMPORT_STAFF_MASTER', 'EXPORT_HEALTH_DATA', 'READ_AUDIT_LOGS', 'MANAGE_SUPERUSER_STATUS'
    ],
    NORMAL_USER: [
      'READ_STAFF_SELF', 'READ_HEALTH_RECORDS', 'CREATE_HEALTH_RECORD', 'EXPORT_HEALTH_DATA'
    ]
  };

  /**
   * Authorizes an API Request on Backend.
   * Enforces Action-Level, Record-Level (IDOR Protection), and logs Audit Action on sensitive view.
   */
  public static authorize(
    userRole: UserRole,
    userStaffId: string,
    action: string,
    targetStaffId?: string,
    requestId?: string
  ): { isAuthorized: boolean; errorResponse?: GoogleAppsScript.Content.TextOutput } {
    const reqId = requestId || CryptoService.generateUuid();

    // 1. Action-Level Permission Check
    const allowedActions = this.ROLE_PERMISSIONS[userRole] || [];
    if (!allowedActions.includes(action)) {
      return {
        isAuthorized: false,
        errorResponse: ResponseHelper.error(
          'FORBIDDEN',
          `สิทธิ์ใช้งานบทบาท '${userRole}' ไม่อนุญาตให้ทำรายการ '${action}'`,
          reqId,
          403
        )
      };
    }

    // 2. Record-Level Access Check (IDOR Protection)
    if (targetStaffId) {
      const canAccess = RecordAccessPolicy.canAccessRecord(userRole, userStaffId, targetStaffId);
      if (!canAccess) {
        return {
          isAuthorized: false,
          errorResponse: ResponseHelper.error(
            'IDOR_FORBIDDEN',
            `ไม่อนุญาตให้เข้าถึงข้อมูลสุขภาพของ StaffID '${targetStaffId}'`,
            reqId,
            403
          )
        };
      }
    }

    // 3. Log Audit Action when Physician or IC views sensitive medical record
    if ((userRole === 'INFECTION_CONTROL' || userRole === 'PHYSICIAN') && action === 'READ_HEALTH_RECORDS' && targetStaffId) {
      this.logSensitiveMedicalView(userRole, userStaffId, targetStaffId);
    }

    return { isAuthorized: true };
  }

  /**
   * Audit logging for sensitive medical record view.
   */
  private static logSensitiveMedicalView(userRole: UserRole, userStaffId: string, targetStaffId: string): void {
    try {
      const ssId = PropertiesService.getScriptProperties().getProperty('DB_AUDIT_SPREADSHEET_ID');
      if (!ssId) return;

      const ss = SpreadsheetApp.openById(ssId);
      const sheet = ss.getSheetByName('AUDIT_LOG');
      if (!sheet) return;

      const now = new Date().toISOString();
      const logUuid = `log-${CryptoService.generateUuid()}`;
      const action = 'SENSITIVE_RECORD_VIEW';
      const target = `Staff:${targetStaffId}/HealthRecord`;
      const details = JSON.stringify({ viewedBy: userStaffId, role: userRole });

      // Fetch last row entry hash for Hash Chain
      const lastRow = sheet.getLastRow();
      let prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
      if (lastRow > 1) {
        prevHash = String(sheet.getRange(lastRow, 9).getValue()); // CurrentHash col
      }

      const currentHash = CryptoService.computeAuditEntryHash(logUuid, now, userStaffId, action, target, details, prevHash);

      sheet.appendRow([
        logUuid, now, userStaffId, userRole, action, target, details, prevHash, currentHash,
        now, userStaffId, now, userStaffId, 1, false
      ]);
    } catch {
      // Ignore logging failure to avoid blocking operational read
    }
  }
}
