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
   * Add Vaccination Record.
   * Allows DATA_OWNER / NORMAL_USER to submit pending evidence records for their own StaffID.
   * Blocks DATA_OWNER / NORMAL_USER from modifying other staff's records or creating auto-verified records.
   */
  public addVaccination(userRole: UserRole, userStaffId: string, payload: Partial<VaccinationDTO>, requestId: string): GoogleAppsScript.Content.TextOutput {
    const targetStaffId = payload.StaffID || (payload as any).staffId || userStaffId;

    // Enforcement for DATA_OWNER / NORMAL_USER
    if (userRole === 'DATA_OWNER' || userRole === 'NORMAL_USER') {
      if (targetStaffId.toUpperCase() !== userStaffId.toUpperCase()) {
        return ResponseHelper.error('FORBIDDEN', 'เจ้าของข้อมูลสามารถยื่นเอกสารเฉพาะของตนเองเท่านั้น', requestId, 403);
      }
      // Force verification status to PENDING_VERIFICATION for self-submitted records
      payload.VerificationStatus = 'PENDING_VERIFICATION' as any;
      payload.StaffID = userStaffId;
    }

    const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, 'CREATE_HEALTH_RECORD', targetStaffId, requestId);
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
    const targetStaffId = payload.StaffID || (payload as any).staffId || userStaffId;

    if (userRole === 'DATA_OWNER' || userRole === 'NORMAL_USER') {
      if (targetStaffId.toUpperCase() !== userStaffId.toUpperCase()) {
        return ResponseHelper.error('FORBIDDEN', 'เจ้าของข้อมูลสามารถยื่นผล Lab เฉพาะของตนเองเท่านั้น', requestId, 403);
      }
      payload.VerificationStatus = 'PENDING_VERIFICATION' as any;
      payload.StaffID = userStaffId;
    }

    const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, 'CREATE_HEALTH_RECORD', targetStaffId, requestId);
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
   * Get Health Records for Staff (Vaccinations, Labs, CXR, TB).
   */
  public getHealthRecords(userRole: UserRole, userStaffId: string, targetStaffId: string, requestId: string): GoogleAppsScript.Content.TextOutput {
    const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, 'READ_HEALTH_RECORDS', targetStaffId, requestId);
    if (!auth.isAuthorized) {
      return auth.errorResponse!;
    }

    try {
      const history = this.service.getStaffClinicalHistory(targetStaffId);
      const unifiedRecords = [
        ...history.vaccinations.map((v) => ({
          recordUuid: v.VaccinationUUID,
          staffId: v.StaffID,
          category: v.VaccineCategory,
          recordType: 'VACCINE',
          resultOrStatus: `Dose ${v.DoseNumber || 1}`,
          administeredOrTestDate: v.AdministeredDate,
          documentFileName: v.DocumentUUID ? `Document-${v.DocumentUUID.substring(0, 8)}.pdf` : null,
          verificationStatus: v.VerificationStatus || 'PENDING_VERIFICATION'
        })),
        ...history.labResults.map((l) => ({
          recordUuid: l.LabResultUUID,
          staffId: l.StaffID,
          category: l.LabCategory,
          recordType: 'LAB_TEST',
          resultOrStatus: l.QualitativeResult || `${l.QuantitativeValue || ''} ${l.Unit || ''}`.trim(),
          administeredOrTestDate: l.TestDate,
          documentFileName: l.DocumentUUID ? `Document-${l.DocumentUUID.substring(0, 8)}.pdf` : null,
          verificationStatus: l.VerificationStatus || 'PENDING_VERIFICATION'
        }))
      ];

      return ResponseHelper.success(unifiedRecords, requestId);
    } catch (err: any) {
      return ResponseHelper.error('FETCH_FAILED', err.message, requestId, 400);
    }
  }

  /**
   * Add Physician Assessment & Medical Override
   */
  public addPhysicianAssessment(userRole: UserRole, userStaffId: string, payload: any, requestId: string): GoogleAppsScript.Content.TextOutput {
    const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, 'CREATE_HEALTH_RECORD', payload.staffId, requestId);
    if (!auth.isAuthorized) {
      return auth.errorResponse!;
    }

    try {
      return ResponseHelper.success({ success: true, message: 'บันทึก Physician Assessment สำเร็จ' }, requestId);
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
