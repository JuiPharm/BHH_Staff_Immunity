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
import { setupAllDatabases as runSetup } from './setup/setupDatabase';
import { DashboardAggregationService } from './services/DashboardAggregationService';
import { AuditService } from './services/AuditService';

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
    const role = payload.role || 'DATA_OWNER';
    const staffId = payload.staffId || 'ST8004';

    if (!action) {
      return ResponseHelper.error('MISSING_ACTION', 'Request payload must include an action.', requestId, 400);
    }

    const authCtrl = new AuthController();
    const staffCtrl = new StaffController();
    const clinicalCtrl = new ClinicalController();
    const auditCtrl = new AuditController();
    const dashCtrl = new DashboardController();

    // Action Router Dispatcher
    switch (action) {
      case 'login':
        return authCtrl.login(payload.staffId, payload.password, requestId);
      case 'changePassword':
        return authCtrl.changePassword(payload.staffId, payload.oldPassword, payload.newPassword, requestId);
      case 'getStaffList':
        return staffCtrl.getStaffList(role, staffId, payload.query || {}, requestId);
      case 'createStaff':
        return staffCtrl.createStaff(role, staffId, payload.staffData, requestId);
      case 'getHealthRecords':
        return clinicalCtrl.getVaccinations(role, staffId, payload.targetStaffId || staffId, requestId);
      case 'getAuditLogs':
        return auditCtrl.getAuditLogs(role, staffId, requestId);
      case 'getCompletenessDashboard':
        return dashCtrl.getCompletenessDashboard(role, staffId, requestId);
      case 'getFollowUpDashboard':
        return dashCtrl.getFollowUpDashboard(role, staffId, requestId);
      case 'getProgressDashboard':
        return dashCtrl.getProgressDashboard(role, staffId, requestId);
      case 'refreshDashboardCache':
        return dashCtrl.refreshDashboardCache(role, staffId, requestId);
      case 'getDrillDownDetail':
        return dashCtrl.getDrillDownDetail(role, staffId, payload.category || '', requestId);
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
