export type ImportTargetType = 'STAFF_MASTER' | 'VACCINATION' | 'LAB_RESULT' | 'CHEST_XRAY' | 'TB_ASSESSMENT';

export interface ColumnMappingDTO {
  sourceColumn: string;
  targetField: string;
}

export interface ImportRowError {
  rowNumber: number;
  fieldName: string;
  invalidValue: string;
  errorMessage: string;
  severity: 'ERROR' | 'WARNING';
}

export interface ImportRowValidationResult {
  rowNumber: number;
  rawRecord: Record<string, any>;
  sanitizedRecord: Record<string, any>;
  isValid: boolean;
  hasWarning: boolean;
  errors: ImportRowError[];
}

export interface ImportSummaryDTO {
  importJobId: string;
  targetType: ImportTargetType;
  fileName: string;
  totalRows: number;
  successRows: number;
  warningRows: number;
  errorRows: number;
  skippedRows: number;
  insertedRows: number;
  updatedRows: number;
  status: 'PENDING' | 'PREVIEW' | 'COMPLETED' | 'FAILED';
  executedAt: string;
  executedBy: string;
}
