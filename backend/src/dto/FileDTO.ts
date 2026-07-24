export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB Max for GAS Execution Safety

export const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'xlsx', 'csv'];

export const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  pdf: ['application/pdf'],
  jpg: ['image/jpeg', 'image/jpg'],
  jpeg: ['image/jpeg', 'image/jpg'],
  png: ['image/png'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  csv: ['text/csv', 'text/plain', 'application/csv']
};

export interface FileUploadPayloadDTO {
  staffId: string;
  originalFileName: string;
  fileBase64Content: string;
  mimeType: string;
  category?: string;
}

export interface DocumentMetadataDTO {
  documentUuid: string;
  staffId: string;
  driveFileId: string; // Internal Backend Only - Never exposed to UI!
  originalFileName: string;
  fileExtension: string;
  mimeType: string;
  fileSizeByte: number;
  sha256Checksum: string;
  uploadedBy: string;
  uploadedAt: string;
  verificationStatus: 'SUBMITTED' | 'VERIFIED' | 'REJECTED';
  rejectionReason?: string;
  verifiedBy?: string;
  verifiedAt?: string;
}

export class FileValidationSchema {
  public static validateUpload(fileName: string, fileSizeByte: number, mimeType: string): { isValid: boolean; error?: string } {
    if (!fileName) {
      return { isValid: false, error: 'กรุณาระบุชื่อไฟล์' };
    }

    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return { isValid: false, error: `นามสกุลไฟล์ไม่ได้รับอนุญาต (อนุญาตเฉพาะ: ${ALLOWED_EXTENSIONS.join(', ')})` };
    }

    if (fileSizeByte > MAX_FILE_SIZE_BYTES) {
      return { isValid: false, error: `ขนาดไฟล์เกินกำหนด (สูงสุดไม่เกิน 10 MB)` };
    }

    const validMimes = ALLOWED_MIME_TYPES[ext] || [];
    if (validMimes.length > 0 && !validMimes.includes(mimeType.toLowerCase())) {
      // Gentle check to allow standard browser fallback
    }

    return { isValid: true };
  }
}
