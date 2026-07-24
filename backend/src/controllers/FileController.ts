import { FileService } from '../services/FileService';
import { FileVerificationService } from '../services/FileVerificationService';
import { AuthorizationMiddleware } from '../middleware/AuthorizationMiddleware';
import { ResponseHelper } from '../utils/ResponseHelper';
import { UserRole } from '../types';
import { FileUploadPayloadDTO } from '../dto/FileDTO';

export class FileController {
  private fileService: FileService;
  private verificationService: FileVerificationService;

  constructor(fileService?: FileService, verificationService?: FileVerificationService) {
    this.fileService = fileService || new FileService();
    this.verificationService = verificationService || new FileVerificationService();
  }

  /**
   * Upload Evidence File (Data Owner can ONLY upload for their own StaffID).
   */
  public uploadFile(userRole: UserRole, userStaffId: string, payload: FileUploadPayloadDTO, requestId: string): GoogleAppsScript.Content.TextOutput {
    // 1. Authorization & IDOR Check
    const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, 'CREATE_HEALTH_RECORD', payload.staffId, requestId);
    if (!auth.isAuthorized) {
      return auth.errorResponse!;
    }

    try {
      const metadata = this.fileService.uploadFile(payload, userStaffId);
      // Return metadata to UI (NEVER exposing Drive File ID!)
      const safeMetadata = { ...metadata };
      delete (safeMetadata as any).driveFileId;

      return ResponseHelper.success(safeMetadata, requestId);
    } catch (err: any) {
      return ResponseHelper.error('UPLOAD_FAILED', err.message, requestId, 400);
    }
  }

  /**
   * Secure Proxy Download File (Data Owner can ONLY download their own documents).
   */
  public downloadFile(userRole: UserRole, userStaffId: string, documentUuid: string, requestId: string): GoogleAppsScript.Content.TextOutput {
    const metadata = this.fileService.getDocumentMetadata(documentUuid);
    if (!metadata) {
      return ResponseHelper.error('NOT_FOUND', `ไม่พบเอกสารรหัส '${documentUuid}'`, requestId, 404);
    }

    // IDOR Check
    const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, 'READ_HEALTH_RECORDS', metadata.staffId, requestId);
    if (!auth.isAuthorized) {
      return auth.errorResponse!;
    }

    try {
      const downloadData = this.fileService.downloadFile(documentUuid);
      return ResponseHelper.success(downloadData, requestId);
    } catch (err: any) {
      return ResponseHelper.error('DOWNLOAD_FAILED', err.message, requestId, 400);
    }
  }

  /**
   * Verify Evidence File (Infection Control & Physician only).
   */
  public verifyFile(userRole: UserRole, userStaffId: string, payload: any, requestId: string): GoogleAppsScript.Content.TextOutput {
    const metadata = this.fileService.getDocumentMetadata(payload.documentUuid);
    if (!metadata) {
      return ResponseHelper.error('NOT_FOUND', `ไม่พบเอกสารรหัส '${payload.documentUuid}'`, requestId, 404);
    }

    const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, 'VERIFY_DOCUMENT', metadata.staffId, requestId);
    if (!auth.isAuthorized) {
      return auth.errorResponse!;
    }

    try {
      const success = this.verificationService.verifyDocument(payload.documentUuid, userStaffId, payload.notes);
      return ResponseHelper.success({ success, message: 'อนุมัติเอกสารหลักฐานเรียบร้อยแล้ว' }, requestId);
    } catch (err: any) {
      return ResponseHelper.error('VERIFY_FAILED', err.message, requestId, 400);
    }
  }

  /**
   * Reject Evidence File (Requires Rejection Reason!).
   */
  public rejectFile(userRole: UserRole, userStaffId: string, payload: any, requestId: string): GoogleAppsScript.Content.TextOutput {
    const metadata = this.fileService.getDocumentMetadata(payload.documentUuid);
    if (!metadata) {
      return ResponseHelper.error('NOT_FOUND', `ไม่พบเอกสารรหัส '${payload.documentUuid}'`, requestId, 404);
    }

    const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, 'VERIFY_DOCUMENT', metadata.staffId, requestId);
    if (!auth.isAuthorized) {
      return auth.errorResponse!;
    }

    try {
      const success = this.verificationService.rejectDocument(payload.documentUuid, payload.rejectionReason, userStaffId);
      return ResponseHelper.success({ success, message: 'ปฏิเสธเอกสารหลักฐานเรียบร้อยแล้ว' }, requestId);
    } catch (err: any) {
      return ResponseHelper.error('REJECT_FAILED', err.message, requestId, 400);
    }
  }
}
