import { FileMetadataRepository } from '../repositories/FileMetadataRepository';
import { ClinicalService } from './ClinicalService';
import { CryptoService } from './CryptoService';

export class FileVerificationService {
  private metadataRepo: FileMetadataRepository;
  private clinicalService: ClinicalService;

  constructor(metadataRepo?: FileMetadataRepository, clinicalService?: ClinicalService) {
    this.metadataRepo = metadataRepo || new FileMetadataRepository();
    this.clinicalService = clinicalService || new ClinicalService();
  }

  /**
   * Verifies evidence file (`SUBMITTED` -> `VERIFIED`).
   * Connects document to clinical record and triggers Rule Engine Service.
   */
  public verifyDocument(documentUuid: string, verifiedBy: string, notes?: string): boolean {
    const metadata = this.metadataRepo.findByDocumentUuid(documentUuid);
    if (!metadata) {
      throw new Error(`Document metadata '${documentUuid}' not found.`);
    }

    const verificationUuid = `vf-${CryptoService.generateUuid()}`;
    this.metadataRepo.logVerification(verificationUuid, documentUuid, metadata.staffId, 'VERIFIED', notes || 'เอกสารแนบถูกต้อง', verifiedBy);

    // Trigger Rule Engine evaluation now that evidence is VERIFIED
    this.clinicalService.reevaluateStaffReadiness(metadata.staffId);

    return true;
  }

  /**
   * Rejects evidence file (`SUBMITTED` -> `REJECTED`).
   * Enforces RejectionReason requirement!
   */
  public rejectDocument(documentUuid: string, rejectionReason: string, rejectedBy: string): boolean {
    if (!rejectionReason || rejectionReason.trim().length === 0) {
      throw new Error('Rejection Error: กรุณาระบุเหตุผลในการปฏิเสธเอกสารแนบ');
    }

    const metadata = this.metadataRepo.findByDocumentUuid(documentUuid);
    if (!metadata) {
      throw new Error(`Document metadata '${documentUuid}' not found.`);
    }

    const verificationUuid = `vf-${CryptoService.generateUuid()}`;
    this.metadataRepo.logVerification(verificationUuid, documentUuid, metadata.staffId, 'REJECTED', rejectionReason, rejectedBy);

    return true;
  }
}
