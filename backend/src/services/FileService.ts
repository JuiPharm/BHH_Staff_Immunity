import { DriveRepository } from '../repositories/DriveRepository';
import { FileMetadataRepository } from '../repositories/FileMetadataRepository';
import { FileUploadPayloadDTO, DocumentMetadataDTO, FileValidationSchema } from '../dto/FileDTO';
import { ChecksumUtil } from '../utils/ChecksumUtil';
import { CryptoService } from './CryptoService';

export class FileService {
  private driveRepo: DriveRepository;
  private metadataRepo: FileMetadataRepository;

  constructor(driveRepo?: DriveRepository, metadataRepo?: FileMetadataRepository) {
    this.driveRepo = driveRepo || new DriveRepository();
    this.metadataRepo = metadataRepo || new FileMetadataRepository();
  }

  /**
   * Uploads file, calculates SHA-256 checksum, renames to UUID.ext, saves to Drive, and stores metadata.
   */
  public uploadFile(payload: FileUploadPayloadDTO, uploadedBy: string): DocumentMetadataDTO {
    const ext = payload.originalFileName.split('.').pop()?.toLowerCase() || '';
    const bytes = Utilities.base64Decode(payload.fileBase64Content);

    // 1. Early Validation Check
    const validation = FileValidationSchema.validateUpload(payload.originalFileName, bytes.length, payload.mimeType);
    if (!validation.isValid) {
      throw new Error(`Validation Error: ${validation.error}`);
    }

    // 2. Compute SHA-256 Checksum & Duplicate Check
    const sha256Checksum = ChecksumUtil.computeSha256(bytes);
    const duplicate = this.metadataRepo.findDuplicateChecksum(sha256Checksum);
    if (duplicate) {
      throw new Error(`Duplicate File Error: ไฟล์เอกสารนี้เคยถูกอัปโหลดเข้าระบบแล้ว (DocumentUUID: ${duplicate.documentUuid})`);
    }

    // 3. Save to Google Drive with UUID Renaming
    const documentUuid = `doc-${CryptoService.generateUuid()}`;
    const { driveFileId, fileSizeByte } = this.driveRepo.saveFile(documentUuid, ext, payload.fileBase64Content, payload.mimeType);

    const now = new Date().toISOString();
    const metadata: DocumentMetadataDTO = {
      documentUuid,
      staffId: payload.staffId,
      driveFileId,
      originalFileName: payload.originalFileName,
      fileExtension: ext,
      mimeType: payload.mimeType,
      fileSizeByte,
      sha256Checksum,
      uploadedBy,
      uploadedAt: now,
      verificationStatus: 'SUBMITTED'
    };

    // 4. Save Metadata
    this.metadataRepo.saveMetadata(metadata);

    return metadata;
  }

  /**
   * Secure Download Proxy (Reads Drive file, converts to Base64, returns securely).
   * NEVER exposes Drive File ID to frontend.
   */
  public downloadFile(documentUuid: string): { originalFileName: string; mimeType: string; fileBase64Content: string } {
    const metadata = this.metadataRepo.findByDocumentUuid(documentUuid);
    if (!metadata) {
      throw new Error(`Document metadata for '${documentUuid}' not found.`);
    }

    const fileData = this.driveRepo.getFileAsBase64(metadata.driveFileId);
    if (!fileData) {
      throw new Error(`Drive file for '${documentUuid}' could not be accessed.`);
    }

    return {
      originalFileName: metadata.originalFileName,
      mimeType: metadata.mimeType,
      fileBase64Content: fileData.base64
    };
  }

  public getDocumentMetadata(documentUuid: string): DocumentMetadataDTO | null {
    return this.metadataRepo.findByDocumentUuid(documentUuid);
  }
}
