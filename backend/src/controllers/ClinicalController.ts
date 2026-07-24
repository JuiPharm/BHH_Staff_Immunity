import { ClinicalService } from '../services/ClinicalService';
import { AuthorizationMiddleware } from '../middleware/AuthorizationMiddleware';
import { ResponseHelper } from '../utils/ResponseHelper';
import { UserRole } from '../types';
import { VaccinationDTO, LabResultDTO } from '../dto/ClinicalDTO';

export class ClinicalController {
  private service: ClinicalService;

  constructor(service?: ClinicalService) {
    this.service = service || new ClinicalService();
  }

  /**
   * Add Vaccination Record (Data Owner BLOCKED from direct edit/creation without evidence upload; IC & Physician allowed).
   */
  public addVaccination(userRole: UserRole, userStaffId: string, payload: Partial<VaccinationDTO>, requestId: string): GoogleAppsScript.Content.TextOutput {
    // Data Owner write block
    if (userRole === 'DATA_OWNER') {
      return ResponseHelper.error(
        'FORBIDDEN',
        'บุคลากรเจ้าของข้อมูลไม่ได้รับอนุญาตให้แก้ไขหรือเพิ่มบันทึกวัคซีนโดยตรง กรุณาใช้ฟังก์ชันอัปโหลดเอกสารหลักฐาน',
        requestId,
        403
      );
    }

    const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, 'CREATE_HEALTH_RECORD', payload.StaffID, requestId);
    if (!auth.isAuthorized) {
      return auth.errorResponse!;
    }

    try {
      const created = this.service.addVaccination(payload, userStaffId);
      return ResponseHelper.success(created, requestId);
    } catch (err: any) {
      return ResponseHelper.error('CREATE_FAILED', err.message, requestId, 400);
    }
  }

  /**
   * Add Lab Result Record.
   */
  public addLabResult(userRole: UserRole, userStaffId: string, payload: Partial<LabResultDTO>, requestId: string): GoogleAppsScript.Content.TextOutput {
    if (userRole === 'DATA_OWNER') {
      return ResponseHelper.error('FORBIDDEN', 'บุคลากรเจ้าของข้อมูลไม่ได้รับอนุญาตให้เพิ่มผล Lab โดยตรง', requestId, 403);
    }

    const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, 'CREATE_HEALTH_RECORD', payload.StaffID, requestId);
    if (!auth.isAuthorized) {
      return auth.errorResponse!;
    }

    try {
      const created = this.service.addLabResult(payload, userStaffId);
      return ResponseHelper.success(created, requestId);
    } catch (err: any) {
      return ResponseHelper.error('CREATE_FAILED', err.message, requestId, 400);
    }
  }

  /**
   * Verify or Reject Vaccination Record (Infection Control & Physician only).
   */
  public verifyVaccination(userRole: UserRole, userStaffId: string, payload: any, requestId: string): GoogleAppsScript.Content.TextOutput {
    const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, 'VERIFY_DOCUMENT', payload.staffId, requestId);
    if (!auth.isAuthorized) {
      return auth.errorResponse!;
    }

    try {
      const success = this.service.verifyVaccination(payload.vaccinationUuid, payload.staffId, payload.status, userStaffId);
      return ResponseHelper.success({ success, message: `ทำการ ${payload.status} รายการวัคซีนเรียบร้อยแล้ว` }, requestId);
    } catch (err: any) {
      return ResponseHelper.error('VERIFY_FAILED', err.message, requestId, 400);
    }
  }
}
