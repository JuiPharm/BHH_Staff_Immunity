import { ExportService } from '../services/ExportService';
import { AuthorizationMiddleware } from '../middleware/AuthorizationMiddleware';
import { ResponseHelper } from '../utils/ResponseHelper';
import { UserRole } from '../types';
import { ExportQueryDTO } from '../dto/ExportDTO';

export class ExportController {
  private service: ExportService;

  constructor(service?: ExportService) {
    this.service = service || new ExportService();
  }

  /**
   * Export Report Endpoint.
   */
  public exportReport(userRole: UserRole, userStaffId: string, payload: ExportQueryDTO, requestId: string): GoogleAppsScript.Content.TextOutput {
    // Permission check
    const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, 'EXPORT_HEALTH_DATA', payload.targetStaffId, requestId);
    if (!auth.isAuthorized) return auth.errorResponse!;

    try {
      const result = this.service.exportReport(payload, userRole, userStaffId);
      return ResponseHelper.success(result, requestId);
    } catch (err: any) {
      return ResponseHelper.error('EXPORT_FAILED', err.message, requestId, 400);
    }
  }
}
