import { ResponseHelper } from './utils/ResponseHelper';
import { CryptoService } from './services/CryptoService';
import { AuthController } from './controllers/AuthController';
import { StaffController } from './controllers/StaffController';
import { ClinicalController } from './controllers/ClinicalController';
import { FileController } from './controllers/FileController';
import { DashboardController } from './controllers/DashboardController';
import { ImportController } from './controllers/ImportController';
import { ExportController } from './controllers/ExportController';
import { AuditController } from './controllers/AuditController';
import { setupAllDatabases as runSetup, repairSystemSchema as runRepair, resetTestUserAccounts as runResetAccounts } from './setup/setupDatabase';
import { DashboardAggregationService } from './services/DashboardAggregationService';
import { AuditService } from './services/AuditService';
import { SessionRepository } from './repositories/SessionRepository';
import { AccountRepository } from './repositories/AccountRepository';

/**
 * Handle HTTP GET Requests
 */
export function doGet(e: GoogleAppsScript.Events.DoGet): GoogleAppsScript.Content.TextOutput {
  const requestId = CryptoService.generateUuid();
  try {
    const action = e.parameter?.action || 'ping';

    if (action === 'ping') {
      return ResponseHelper.success(
        {
          system: 'BDMS Staff Immunity & Health Registry API',
          hospital: 'Bangkok Hospital Hat Yai',
          status: 'ONLINE',
          timestamp: new Date().toISOString()
        },
        requestId
      );
    }

    return ResponseHelper.error('INVALID_ACTION', `Action '${action}' is not supported via GET.`, requestId, 400);
  } catch (err: any) {
    return ResponseHelper.error('SERVER_ERROR', 'An internal error occurred. Please contact system admin.', requestId, 500);
  }
}

/**
 * Handle HTTP POST Requests
 */
export function doPost(e: GoogleAppsScript.Events.DoPost): GoogleAppsScript.Content.TextOutput {
  const requestId = CryptoService.generateUuid();
  try {
    let payload: any = {};
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }

    const action = payload.action;

    if (!action) {
      return ResponseHelper.error('MISSING_ACTION', 'Request payload must include an action.', requestId, 400);
    }

    const authCtrl = new AuthController();
    const staffCtrl = new StaffController();
    const clinicalCtrl = new ClinicalController();
    const auditCtrl = new AuditController();
    const dashCtrl = new DashboardController();
    const fileCtrl = new FileController();
    const importCtrl = new ImportController();
    const exportCtrl = new ExportController();
    const accountRepo = new AccountRepository();
    const sessionRepo = new SessionRepository();

    // 1. Unprotected System Endpoints
    if (action === 'login') {
      return authCtrl.login(payload.staffId, payload.password, requestId);
    }
    if (action === 'requestResetToken') {
      return authCtrl.requestResetToken(payload.staffId, requestId);
    }
    if (action === 'resetPassword') {
      return authCtrl.resetPassword(payload, requestId);
    }
    if (action === 'ping') {
      return ResponseHelper.success({ status: 'ONLINE', time: new Date().toISOString() }, requestId);
    }
    if (action === 'setupSystem') {
      runSetup();
      return ResponseHelper.success({ message: 'System setup completed successfully' }, requestId);
    }
    if (action === 'repairSystemSchema') {
      const repairResult = runRepair();
      return ResponseHelper.success(repairResult, requestId);
    }
    if (action === 'diagnoseAuthentication') {
      const diagResult = accountRepo.diagnoseAuthentication(payload.targetStaffId);
      return ResponseHelper.success(diagResult, requestId);
    }
    if (action === 'resetTestUserAccounts') {
      const resetResult = runResetAccounts();
      return ResponseHelper.success(resetResult, requestId);
    }

    // 2. Strict Session Authentication & Server-Side Authorization for Protected Endpoints
    const rawToken = payload.token || '';
    if (!rawToken) {
      return ResponseHelper.error('UNAUTHORIZED', 'กรุณาระบุ Token สำหรับการยืนยันตัวตน', requestId, 401);
    }

    const tokenHash = CryptoService.hashSha256(rawToken);
    const session = sessionRepo.findByTokenHash(tokenHash);

    if (!session || session.isRevoked) {
      return ResponseHelper.error('UNAUTHORIZED', 'เซสชันหมดอายุหรือถูกยกเลิกแล้ว กรุณาเข้าสู่ระบบใหม่', requestId, 401);
    }

    // Check Session Expiration (Idle & Absolute)
    const nowMs = Date.now();
    if (session.idleExpiresAt && nowMs > new Date(session.idleExpiresAt).getTime()) {
      sessionRepo.revokeSession(tokenHash);
      return ResponseHelper.error('SESSION_EXPIRED', 'เซสชันหมดอายุเนื่องจากไม่มีการใช้งานเป็นเวลานาน', requestId, 401);
    }
    if (session.absoluteExpiresAt && nowMs > new Date(session.absoluteExpiresAt).getTime()) {
      sessionRepo.revokeSession(tokenHash);
      return ResponseHelper.error('SESSION_EXPIRED', 'เซสชันหมดอายุเกินกำหนดเวลาการใช้งานสูงสุด', requestId, 401);
    }

    // Derive Verified StaffID, Role, and UserLevel directly from Server Database (NEVER TRUST BROWSER PAYLOAD!)
    const verifiedStaffId = session.staffId;
    const account = accountRepo.findByStaffId(verifiedStaffId);

    if (!account || account.AccountStatus !== 'ACTIVE') {
      sessionRepo.revokeSession(tokenHash);
      return ResponseHelper.error('ACCOUNT_INACTIVE', 'บัญชีผู้ใช้งานระงับการใช้งานหรือถูกลบ', requestId, 403);
    }

    // Superuser Override Logic: SUPERUSER gets full role permissions
    const isSuperuser = account.UserLevel === 'SUPERUSER';
    const verifiedRole = isSuperuser ? (payload.roleOverride || account.FunctionalRole || 'INFECTION_CONTROL') : (account.FunctionalRole || 'DATA_OWNER');

    // Handle Logout
    if (action === 'logout') {
      return authCtrl.logout(rawToken, requestId);
    }

    // Action Router Dispatcher
    switch (action) {
      case 'changePassword':
        return authCtrl.changePassword(verifiedStaffId, payload.oldPassword, payload.newPassword, requestId);
      case 'getStaffList':
        return staffCtrl.getStaffList(verifiedRole, verifiedStaffId, payload.query || payload, requestId);
      case 'listStaff':
        return staffCtrl.listStaff(verifiedRole, verifiedStaffId, payload, requestId);
      case 'getStaff':
        return staffCtrl.getStaff(verifiedRole, verifiedStaffId, payload.targetStaffId || verifiedStaffId, requestId);
      case 'createStaff':
        return staffCtrl.createStaff(verifiedRole, verifiedStaffId, payload.staffData || payload, requestId);
      case 'updateStaff':
        return staffCtrl.updateStaff(verifiedRole, verifiedStaffId, payload.targetStaffId, payload.staffData || payload, requestId);
      case 'deleteStaff':
        return staffCtrl.deleteStaff(verifiedRole, verifiedStaffId, payload.targetStaffId, requestId);
      case 'getHealthRecords':
        return clinicalCtrl.getHealthRecords(verifiedRole, verifiedStaffId, payload.targetStaffId || verifiedStaffId, requestId);
      case 'createHealthRecord':
        return clinicalCtrl.addVaccination(verifiedRole, verifiedStaffId, payload.recordData || payload, requestId);
      case 'verifyRecord':
        return clinicalCtrl.verifyVaccination(verifiedRole, verifiedStaffId, payload, requestId);
      case 'addPhysicianAssessment':
        return clinicalCtrl.addPhysicianAssessment(verifiedRole, verifiedStaffId, payload, requestId);
      case 'uploadFile':
        return fileCtrl.uploadFile(verifiedRole, verifiedStaffId, payload, requestId);
      case 'downloadFile':
        return fileCtrl.downloadFile(verifiedRole, verifiedStaffId, payload.documentUuid, requestId);
      case 'getAuditLogs':
        return auditCtrl.getAuditLogs(verifiedRole, verifiedStaffId, requestId);
      case 'getCompletenessDashboard':
        return dashCtrl.getCompletenessDashboard(verifiedRole, verifiedStaffId, requestId);
      case 'getFollowUpDashboard':
        return dashCtrl.getFollowUpDashboard(verifiedRole, verifiedStaffId, requestId);
      case 'getProgressDashboard':
        return dashCtrl.getProgressDashboard(verifiedRole, verifiedStaffId, requestId);
      case 'refreshDashboardCache':
        return dashCtrl.refreshDashboardCache(verifiedRole, verifiedStaffId, requestId);
      case 'getDrillDownDetail':
        return dashCtrl.getDrillDownDetail(verifiedRole, verifiedStaffId, payload.category || '', requestId);
      case 'importStaffCSV':
        return importCtrl.importStaffCSV(verifiedRole, verifiedStaffId, payload, requestId);
      case 'exportStaffReport':
        return exportCtrl.exportStaffReport(verifiedRole, verifiedStaffId, payload, requestId);
      default:
        return ResponseHelper.error('UNKNOWN_ACTION', `Action '${action}' is not recognized.`, requestId, 404);
    }
  } catch (err: any) {
    return ResponseHelper.error('SERVER_ERROR', err.message || 'An internal error occurred.', requestId, 500);
  }
}

export function setupAllSpreadsheetsAndSheets(): any {
  return runSetup();
}

export function repairSystemSchema(): any {
  return runRepair();
}

export function diagnoseAuthentication(targetStaffId?: string): any {
  const accountRepo = new AccountRepository();
  return accountRepo.diagnoseAuthentication(targetStaffId);
}

export function resetTestUserAccounts(): any {
  return runResetAccounts();
}

export function cronDailyMailQueue(): void {
  console.log('Daily Mail Queue cron executed.');
}

export function cronRecalculateDashboardCache(): void {
  const dashService = new DashboardAggregationService();
  dashService.recalculateAndCacheAll();
}

export function cronAuditChainScan(): any {
  const auditService = new AuditService();
  return auditService.verifyAuditChain('CRON_SYSTEM');
}
