import { StaffService } from '../services/StaffService';
import { ClinicalRepository } from '../repositories/ClinicalRepository';
import { AuthorizationMiddleware } from '../middleware/AuthorizationMiddleware';
import { ResponseHelper } from '../utils/ResponseHelper';
import { UserRole } from '../types';
import { CreateStaffDTO, UpdateStaffDTO } from '../dto/StaffDTO';

export class StaffController {
  private staffService: StaffService;
  private clinicalRepo: ClinicalRepository;

  constructor(staffService?: StaffService, clinicalRepo?: ClinicalRepository) {
    this.staffService = staffService || new StaffService();
    this.clinicalRepo = clinicalRepo || new ClinicalRepository();
  }

  /**
   * Get single staff record by StaffID.
   * Enforces IDOR Check for Data Owner.
   */
  public getStaff(userRole: UserRole, userStaffId: string, targetStaffId: string, requestId: string): GoogleAppsScript.Content.TextOutput {
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
   * Search and List staff records formatted for Frontend StaffMaster contract.
   */
  public getStaffList(userRole: UserRole, userStaffId: string, payload: any, requestId: string): GoogleAppsScript.Content.TextOutput {
    const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, 'READ_STAFF_LIST', undefined, requestId);
    if (!auth.isAuthorized) {
      return auth.errorResponse!;
    }

    const allStaff = this.staffService.searchStaff({
      keyword: payload?.keyword,
      departmentCode: payload?.departmentCode,
      workGroup: payload?.workGroup,
      employmentStatus: payload?.employmentStatus,
      page: 1,
      limit: 1000
    });

    const items = (allStaff.items || []).map((s) => {
      const vacs = this.clinicalRepo.findVaccinationsByStaffId(s.StaffID);
      const isVerified = vacs.some((v) => String(v.VerificationStatus).toUpperCase() === 'VERIFIED' || String(v.VerificationStatus).toUpperCase() === 'APPROVED');
      const isPending = vacs.some((v) => String(v.VerificationStatus).toUpperCase() === 'PENDING' || String(v.VerificationStatus).toUpperCase() === 'PENDING_VERIFICATION');

      let readiness = 'NOT_CLEARED';
      if (isVerified) readiness = 'CLEARED';
      else if (isPending) readiness = 'CONDITIONALLY_CLEARED';

      return {
        staffId: s.StaffID,
        hn: s.HN || '',
        firstName: s.FirstName || '',
        lastName: s.LastName || '',
        department: s.DepartmentCode || '',
        workGroup: s.WorkGroup || 'BACKOFFICE',
        email: s.Email || '',
        phone: (s as any).Phone || s.EmergencyPhone || '',
        workReadiness: readiness
      };
    });

    return ResponseHelper.success(items, requestId);
  }

  /**
   * Search and List staff records with pagination metadata.
   */
  public listStaff(userRole: UserRole, userStaffId: string, payload: any, requestId: string): GoogleAppsScript.Content.TextOutput {
    const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, 'READ_STAFF_LIST', undefined, requestId);
    if (!auth.isAuthorized) {
      return auth.errorResponse!;
    }

    const result = this.staffService.searchStaff({
      keyword: payload?.keyword,
      departmentCode: payload?.departmentCode,
      workGroup: payload?.workGroup,
      employmentStatus: payload?.employmentStatus,
      page: Number(payload?.page) || 1,
      limit: Number(payload?.limit) || 10
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
