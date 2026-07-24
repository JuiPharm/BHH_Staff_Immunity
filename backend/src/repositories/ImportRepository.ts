import { SheetRepository } from './SheetRepository';
import { ImportSummaryDTO, ImportRowError } from '../dto/ImportDTO';
import { CryptoService } from '../services/CryptoService';

export class ImportRepository {
  private sheetRepo: SheetRepository;

  constructor(sheetRepo?: SheetRepository) {
    const opsSsId = PropertiesService.getScriptProperties().getProperty('DB_AUDIT_SPREADSHEET_ID');
    this.sheetRepo = sheetRepo || new SheetRepository(opsSsId || undefined);
  }

  /**
   * Log Import Job to IMPORT_JOB sheet.
   */
  public logImportJob(summary: ImportSummaryDTO): void {
    const headers = [
      'ImportJobID', 'TargetType', 'FileName', 'TotalRows', 'SuccessRows',
      'WarningRows', 'ErrorRows', 'SkippedRows', 'InsertedRows', 'UpdatedRows',
      'Status', 'ExecutedAt', 'ExecutedBy',
      'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'RecordVersion', 'IsDeleted'
    ];

    const now = new Date().toISOString();
    const rowObj = {
      ImportJobID: summary.importJobId,
      TargetType: summary.targetType,
      FileName: summary.fileName,
      TotalRows: summary.totalRows,
      SuccessRows: summary.successRows,
      WarningRows: summary.warningRows,
      ErrorRows: summary.errorRows,
      SkippedRows: summary.skippedRows,
      InsertedRows: summary.insertedRows,
      UpdatedRows: summary.updatedRows,
      Status: summary.status,
      ExecutedAt: summary.executedAt,
      ExecutedBy: summary.executedBy,
      CreatedAt: now,
      CreatedBy: summary.executedBy,
      UpdatedAt: now,
      UpdatedBy: summary.executedBy,
      RecordVersion: 1,
      IsDeleted: false
    };

    this.sheetRepo.appendRow('IMPORT_JOB', headers, rowObj);
  }

  /**
   * Log Import Row Errors to IMPORT_ERROR sheet.
   */
  public logImportErrors(importJobId: string, errors: ImportRowError[], executedBy: string): void {
    if (errors.length === 0) return;

    const headers = [
      'ErrorUUID', 'ImportJobID', 'RowNumber', 'FieldName', 'InvalidValue',
      'ErrorMessage', 'Severity',
      'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'RecordVersion', 'IsDeleted'
    ];

    const now = new Date().toISOString();
    errors.forEach((err) => {
      this.sheetRepo.appendRow('IMPORT_ERROR', headers, {
        ErrorUUID: `err-${CryptoService.generateUuid()}`,
        ImportJobID: importJobId,
        RowNumber: err.rowNumber,
        FieldName: err.fieldName,
        InvalidValue: String(err.invalidValue || ''),
        ErrorMessage: err.errorMessage,
        Severity: err.severity,
        CreatedAt: now,
        CreatedBy: executedBy,
        UpdatedAt: now,
        UpdatedBy: executedBy,
        RecordVersion: 1,
        IsDeleted: false
      });
    });
  }
}
