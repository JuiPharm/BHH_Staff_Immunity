import { StaffService } from '../services/StaffService';
import { AuthorizationMiddleware } from '../middleware/AuthorizationMiddleware';
import { ResponseHelper } from '../utils/ResponseHelper';
import { UserRole } from '../types';
import { CreateStaffDTO, UpdateStaffDTO } from '../dto/StaffDTO';

export class StaffController {
  private staffService: StaffService;

  constructor(staffService?: StaffService) {
    this.staffService = staffService || new StaffService();
  }

  /**
   * Get single staff record by StaffID.
   * Enforces IDOR Check for Data Owner.
   */
  public getStaff(userRole: UserRole, userStaffId: string, targetStaffId: string, requestId: string): GoogleAppsScript.Content.TextOutput {
    // 1. Authorization & IDOR Check
    const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, 'READ_STAFF_SELF', targetStaffId, requestId);
    if (!auth.isAuthorized) {
      return auth.errorResponse!;
    }

    const staff = this.staffService.getStaffByStaffId(targetStaffId);
    if (!staff) {
      return ResponseHelper.error('NOT_FOUND', `ไม่พบข้อมูลบุคลากรรหัส '${targetStaffId}'`, requestId, 404);
    }

    return ResponseHelper.success(staff, requestId);
  }

  /**
   * Search and List staff records.
   */
  public listStaff(userRole: UserRole, userStaffId: string, payload: any, requestId: string): GoogleAppsScript.Content.TextOutput {
    const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, 'READ_STAFF_LIST', undefined, requestId);
    if (!auth.isAuthorized) {
      return auth.errorResponse!;
    }

    const result = this.staffService.searchStaff({
      keyword: payload.keyword,
      departmentCode: payload.departmentCode,
      workGroup: payload.workGroup,
      employmentStatus: payload.employmentStatus,
      page: Number(payload.page) || 1,
      limit: Number(payload.limit) || 10
    });

    return ResponseHelper.success(result, requestId);
  }

  /**
   * Create new staff record (HR only).
   */
  public createStaff(userRole: UserRole, userStaffId: string, payload: CreateStaffDTO, requestId: string): GoogleAppsScript.Content.TextOutput {
    const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, 'IMPORT_STAFF_MASTER', undefined, requestId);
    if (!auth.isAuthorized) {
      return auth.errorResponse!;
    }

    try {
      const created = this.staffService.createStaff(payload, userStaffId);
      return ResponseHelper.success(created, requestId);
    } catch (err: any) {
      return ResponseHelper.error('CREATE_FAILED', err.message, requestId, 400);
    }
  }

  /**
   * Update staff record (HR / Elevated roles).
   */
  public updateStaff(userRole: UserRole, userStaffId: string, targetStaffId: string, payload: UpdateStaffDTO, requestId: string): GoogleAppsScript.Content.TextOutput {
    const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, 'IMPORT_STAFF_MASTER', targetStaffId, requestId);
    if (!auth.isAuthorized) {
      return auth.errorResponse!;
    }

    try {
      const updated = this.staffService.updateStaff(targetStaffId, payload, userStaffId);
      return ResponseHelper.success(updated, requestId);
    } catch (err: any) {
      return ResponseHelper.error('UPDATE_FAILED', err.message, requestId, 400);
    }
  }

  /**
   * Soft delete staff record (HR / Admin).
   */
  public deleteStaff(userRole: UserRole, userStaffId: string, targetStaffId: string, requestId: string): GoogleAppsScript.Content.TextOutput {
    const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, 'IMPORT_STAFF_MASTER', targetStaffId, requestId);
    if (!auth.isAuthorized) {
      return auth.errorResponse!;
    }

    try {
      const success = this.staffService.deleteStaff(targetStaffId, userStaffId);
      if (!success) {
        return ResponseHelper.error('NOT_FOUND', `ไม่พบข้อมูลบุคลากร '${targetStaffId}' เพื่อทำการ Soft Delete`, requestId, 404);
      }
      return ResponseHelper.success({ message: `ทำการ Soft Delete บุคลากร '${targetStaffId}' เรียบร้อยแล้ว` }, requestId);
    } catch (err: any) {
      return ResponseHelper.error('DELETE_FAILED', err.message, requestId, 400);
    }
  }
}
