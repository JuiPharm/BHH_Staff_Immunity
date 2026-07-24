import { ImportService } from '../services/ImportService';
import { AuthorizationMiddleware } from '../middleware/AuthorizationMiddleware';
import { ResponseHelper } from '../utils/ResponseHelper';
import { UserRole } from '../types';
import { ImportTargetType, ColumnMappingDTO } from '../dto/ImportDTO';

export class ImportController {
  private service: ImportService;

  constructor(service?: ImportService) {
    this.service = service || new ImportService();
  }

  /**
   * Dry Run Validation Preview Endpoint.
   */
  public dryRunImport(userRole: UserRole, userStaffId: string, payload: any, requestId: string): GoogleAppsScript.Content.TextOutput {
    // Permission check
    const action = payload.targetType === 'STAFF_MASTER' ? 'IMPORT_STAFF_MASTER' : 'CREATE_HEALTH_RECORD';
    const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, action, undefined, requestId);
    if (!auth.isAuthorized) return auth.errorResponse!;

    try {
      const targetType: ImportTargetType = payload.targetType;
      const rawRows: Record<string, any>[] = payload.rawRows || [];
      const mappings: ColumnMappingDTO[] = payload.mappings || [];

      const previewResult = this.service.dryRun(targetType, rawRows, mappings);
      return ResponseHelper.success(previewResult, requestId);
    } catch (err: any) {
      return ResponseHelper.error('DRY_RUN_FAILED', err.message, requestId, 400);
    }
  }

  /**
   * Idempotent Batch Commit Endpoint.
   */
  public commitImportJob(userRole: UserRole, userStaffId: string, payload: any, requestId: string): GoogleAppsScript.Content.TextOutput {
    const action = payload.targetType === 'STAFF_MASTER' ? 'IMPORT_STAFF_MASTER' : 'CREATE_HEALTH_RECORD';
    const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, action, undefined, requestId);
    if (!auth.isAuthorized) return auth.errorResponse!;

    try {
      const summary = this.service.commitImportJob(
        payload.importJobId,
        payload.targetType,
        payload.fileName || 'import_file.csv',
        payload.validRecords || [],
        userStaffId
      );
      return ResponseHelper.success(summary, requestId);
    } catch (err: any) {
      return ResponseHelper.error('COMMIT_FAILED', err.message, requestId, 400);
    }
  }

  /**
   * Download Error Report Endpoint.
   */
  public downloadErrorReport(userRole: UserRole, userStaffId: string, payload: any, requestId: string): GoogleAppsScript.Content.TextOutput {
    try {
      const errors = payload.errors || [];
      const fileBase64 = this.service.generateErrorReport(errors);
      return ResponseHelper.success({ fileBase64, fileName: `Import_Error_Report_${Date.now()}.csv` }, requestId);
    } catch (err: any) {
      return ResponseHelper.error('REPORT_FAILED', err.message, requestId, 400);
    }
  }
}
