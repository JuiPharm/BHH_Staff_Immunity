export type ReportType =
  | 'STAFF_MASTER'
  | 'READINESS_STATUS'
  | 'INCOMPLETE_LIST'
  | 'OVERDUE_LIST'
  | 'FOLLOWUP_LIST'
  | 'DEPARTMENT_SUMMARY'
  | 'WORKGROUP_SUMMARY'
  | 'INDIVIDUAL_HISTORY'
  | 'AUDIT_REPORT';

export interface ExportQueryDTO {
  reportType: ReportType;
  departmentCode?: string;
  workGroup?: string;
  targetStaffId?: string; // For Individual History
  format?: 'CSV' | 'XLSX';
}

export interface ReportColumnDefinition {
  headerName: string;
  fieldKey: string;
  isSensitiveMedical?: boolean;
}

export interface ReportMetadataHeader {
  reportTitle: string;
  generatedAt: string;
  generatedBy: string;
  userRole: string;
  filterSummary: string;
  totalRowsCount: number;
}
