import { DashboardAggregationService } from '../services/DashboardAggregationService';
import { AuthorizationMiddleware } from '../middleware/AuthorizationMiddleware';
import { ResponseHelper } from '../utils/ResponseHelper';
import { UserRole } from '../types';

export class DashboardController {
  private aggregationService: DashboardAggregationService;

  constructor(aggregationService?: DashboardAggregationService) {
    this.aggregationService = aggregationService || new DashboardAggregationService();
  }

  /**
   * Completeness Dashboard Endpoint.
   * Data Owner is BLOCKED.
   */
  public getCompletenessDashboard(userRole: UserRole, userStaffId: string, payload: any, requestId: string): GoogleAppsScript.Content.TextOutput {
    if (userRole === 'DATA_OWNER') {
      return ResponseHelper.error('FORBIDDEN', 'บุคลากรเจ้าของข้อมูลไม่ได้รับอนุญาตให้เข้าถึงแดชบอร์ดภาพรวมขององค์กร', requestId, 403);
    }

    const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, 'READ_STAFF_LIST', undefined, requestId);
    if (!auth.isAuthorized) return auth.errorResponse!;

    try {
      const data = this.aggregationService.getCompletenessDashboard(userRole, payload?.forceRefresh === true);
      return ResponseHelper.success(data, requestId);
    } catch (err: any) {
      return ResponseHelper.error('DASHBOARD_ERROR', err.message, requestId, 500);
    }
  }

  /**
   * Follow-up Dashboard Endpoint.
   */
  public getFollowUpDashboard(userRole: UserRole, userStaffId: string, payload: any, requestId: string): GoogleAppsScript.Content.TextOutput {
    if (userRole === 'DATA_OWNER') {
      return ResponseHelper.error('FORBIDDEN', 'บุคลากรเจ้าของข้อมูลไม่ได้รับอนุญาตให้เข้าถึงแดชบอร์ดภาพรวม', requestId, 403);
    }

    const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, 'READ_STAFF_LIST', undefined, requestId);
    if (!auth.isAuthorized) return auth.errorResponse!;

    try {
      const data = this.aggregationService.getFollowUpDashboard(userRole, payload?.forceRefresh === true);
      return ResponseHelper.success(data, requestId);
    } catch (err: any) {
      return ResponseHelper.error('DASHBOARD_ERROR', err.message, requestId, 500);
    }
  }

  /**
   * Progress Dashboard Endpoint.
   */
  public getProgressDashboard(userRole: UserRole, userStaffId: string, payload: any, requestId: string): GoogleAppsScript.Content.TextOutput {
    if (userRole === 'DATA_OWNER') {
      return ResponseHelper.error('FORBIDDEN', 'บุคลากรเจ้าของข้อมูลไม่ได้รับอนุญาตให้เข้าถึงแดชบอร์ดภาพรวม', requestId, 403);
    }

    const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, 'READ_STAFF_LIST', undefined, requestId);
    if (!auth.isAuthorized) return auth.errorResponse!;

    try {
      const data = this.aggregationService.getProgressDashboard(userRole, payload?.forceRefresh === true);
      return ResponseHelper.success(data, requestId);
    } catch (err: any) {
      return ResponseHelper.error('DASHBOARD_ERROR', err.message, requestId, 500);
    }
  }

  /**
   * Manual Cache Refresh Endpoint.
   */
  public refreshDashboardCache(userRole: UserRole, userStaffId: string, requestId: string): GoogleAppsScript.Content.TextOutput {
    if (userRole === 'DATA_OWNER' || userRole === 'HR') {
      return ResponseHelper.error('FORBIDDEN', 'มีเฉพาะ Infection Control หรือแพทย์ที่สามารถล้างแคชแดชบอร์ดได้', requestId, 403);
    }

    try {
      this.aggregationService.refreshAllCaches();
      return ResponseHelper.success({ message: 'ทำการล้างแคชและประมวลผลข้อมูลสถิติล่าสุดเรียบร้อยแล้ว' }, requestId);
    } catch (err: any) {
      return ResponseHelper.error('REFRESH_FAILED', err.message, requestId, 500);
    }
  }

  /**
   * Drill-down Detail Endpoint with Re-authorization Check!
   */
  public getDrillDownDetail(userRole: UserRole, userStaffId: string, payload: any, requestId: string): GoogleAppsScript.Content.TextOutput {
    if (userRole === 'DATA_OWNER') {
      return ResponseHelper.error('FORBIDDEN', 'ไม่อนุญาตให้ทำการ Drill-down ดูรายชื่อบุคลากร', requestId, 403);
    }

    // Re-verify authorization on every drill-down action
    const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, 'READ_STAFF_LIST', undefined, requestId);
    if (!auth.isAuthorized) return auth.errorResponse!;

    const category = typeof payload === 'string' ? payload : (payload?.category || 'TOTAL');
    const result = this.aggregationService.getDrillDownDetail(category, userRole);

    return ResponseHelper.success(result, requestId);
  }
}
