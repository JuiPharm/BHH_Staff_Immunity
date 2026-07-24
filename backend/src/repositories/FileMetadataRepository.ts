import { SheetRepository } from './SheetRepository';
import { DocumentMetadataDTO } from '../dto/FileDTO';
import { ChecksumUtil } from '../utils/ChecksumUtil';

export class FileMetadataRepository {
  private sheetRepo: SheetRepository;

  constructor(sheetRepo?: SheetRepository) {
    const clinicalSsId = PropertiesService.getScriptProperties().getProperty('DB_CLINICAL_SPREADSHEET_ID');
    this.sheetRepo = sheetRepo || new SheetRepository(clinicalSsId || undefined);
  }

  /**
   * Saves metadata to FILE_ATTACHMENT sheet.
   */
  public saveMetadata(dto: DocumentMetadataDTO): void {
    const headers = [
      'DocumentUUID', 'StaffID', 'DriveFileID', 'OriginalFileName', 'FileExtension',
      'MimeType', 'FileSizeByte', 'SHA256Checksum', 'UploadedBy', 'UploadedAt',
      'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'RecordVersion', 'IsDeleted'
    ];

    const rowObj = {
      DocumentUUID: dto.documentUuid,
      StaffID: dto.staffId,
      DriveFileID: dto.driveFileId,
      OriginalFileName: dto.originalFileName,
      FileExtension: dto.fileExtension,
      MimeType: dto.mimeType,
      FileSizeByte: dto.fileSizeByte,
      SHA256Checksum: dto.sha256Checksum,
      UploadedBy: dto.uploadedBy,
      UploadedAt: dto.uploadedAt,
      CreatedAt: dto.uploadedAt,
      CreatedBy: dto.uploadedBy,
      UpdatedAt: dto.uploadedAt,
      UpdatedBy: dto.uploadedBy,
      RecordVersion: 1,
      IsDeleted: false
    };

    this.sheetRepo.appendRow('FILE_ATTACHMENT', headers, rowObj);
  }

  /**
   * Finds document metadata by DocumentUUID.
   */
  public findByDocumentUuid(documentUuid: string): DocumentMetadataDTO | null {
    const rows = this.sheetRepo.getRows('FILE_ATTACHMENT');
    const match = rows.find((r) => String(r.DocumentUUID) === documentUuid && (!r.IsDeleted || String(r.IsDeleted) === 'FALSE'));
    if (!match) return null;

    return {
      documentUuid: String(match.DocumentUUID),
      staffId: String(match.StaffID),
      driveFileId: String(match.DriveFileID), // Backend Internal Only
      originalFileName: String(match.OriginalFileName),
      fileExtension: String(match.FileExtension),
      mimeType: String(match.MimeType),
      fileSizeByte: Number(match.FileSizeByte),
      sha256Checksum: String(match.SHA256Checksum),
      uploadedBy: String(match.UploadedBy),
      uploadedAt: String(match.UploadedAt),
      verificationStatus: (match.VerificationStatus || 'SUBMITTED') as any
    };
  }

  /**
   * Checks if an existing active file shares the exact same SHA-256 Checksum.
   */
  public findDuplicateChecksum(checksum: string): DocumentMetadataDTO | null {
    const rows = this.sheetRepo.getRows('FILE_ATTACHMENT');
    const match = rows.find((r) => ChecksumUtil.isDuplicateChecksum(String(r.SHA256Checksum), checksum) && (!r.IsDeleted || String(r.IsDeleted) === 'FALSE'));
    if (!match) return null;
    return this.findByDocumentUuid(String(match.DocumentUUID));
  }

  /**
   * Records file verification or rejection log into FILE_VERIFICATION sheet.
   */
  public logVerification(verificationUuid: string, documentUuid: string, staffId: string, action: 'VERIFIED' | 'REJECTED', reason: string, verifiedBy: string): void {
    const headers = [
      'VerificationUUID', 'DocumentUUID', 'StaffID', 'VerificationAction', 'ActionReason',
      'VerifiedBy', 'VerifiedAt',
      'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'RecordVersion', 'IsDeleted'
    ];

    const now = new Date().toISOString();
    const rowObj = {
      VerificationUUID: verificationUuid,
      DocumentUUID: documentUuid,
      StaffID: staffId,
      VerificationAction: action,
      ActionReason: reason || '',
      VerifiedBy: verifiedBy,
      VerifiedAt: now,
      CreatedAt: now,
      CreatedBy: verifiedBy,
      UpdatedAt: now,
      UpdatedBy: verifiedBy,
      RecordVersion: 1,
      IsDeleted: false
    };

    this.sheetRepo.appendRow('FILE_VERIFICATION', headers, rowObj);
  }
}
