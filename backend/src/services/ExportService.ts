import { ExportQueryDTO, ReportMetadataHeader } from '../dto/ExportDTO';
import { ReportDefinition } from './ReportDefinition';
import { ExcelGenerationService } from './ExcelGenerationService';
import { StaffRepository } from '../repositories/StaffRepository';
import { ClinicalRepository } from '../repositories/ClinicalRepository';
import { SheetRepository } from '../repositories/SheetRepository';
import { UserRole } from '../types';
import { FieldMaskingUtil } from '../utils/FieldMaskingUtil';
import { CryptoService } from './CryptoService';

export class ExportService {
  private staffRepo: StaffRepository;
  private clinicalRepo: ClinicalRepository;
  private sheetRepo: SheetRepository;

  constructor(staffRepo?: StaffRepository, clinicalRepo?: ClinicalRepository, sheetRepo?: SheetRepository) {
    this.staffRepo = staffRepo || new StaffRepository();
    this.clinicalRepo = clinicalRepo || new ClinicalRepository();
    const auditSsId = PropertiesService.getScriptProperties().getProperty('DB_AUDIT_SPREADSHEET_ID');
    this.sheetRepo = sheetRepo || new SheetRepository(auditSsId || undefined);
  }

  /**
   * Generates report file payload, applies role masking, and logs audit entry.
   */
  public exportReport(query: ExportQueryDTO, userRole: UserRole, userStaffId: string): { fileBase64: string; fileName: string } {
    // 1. Data Owner IDOR Check
    if (userRole === 'DATA_OWNER') {
      if (query.reportType !== 'INDIVIDUAL_HISTORY' || query.targetStaffId?.toUpperCase() !== userStaffId.toUpperCase()) {
        throw new Error('Export Error: บุคลากรเจ้าของข้อมูลสามารถส่งออกรายงานได้เฉพาะประวัติส่วนบุคคลของตนเองเท่านั้น');
      }
    }

    // 2. Retrieve Data Rows
    const dataRows = this.fetchReportData(query, userRole, userStaffId);

    // 3. Get Role-Filtered Columns
    const columns = ReportDefinition.getColumns(query.reportType, userRole);

    // 4. Apply HR Field Masking if needed
    const maskedRows = dataRows.map((row) => FieldMaskingUtil.maskHealthRecord(row, userRole));

    const now = new Date().toISOString();
    const filterSummary = `Dept: ${query.departmentCode || 'ALL'}, WorkGroup: ${query.workGroup || 'ALL'}`;

    const metadataHeader: ReportMetadataHeader = {
      reportTitle: `BDMS Report - ${query.reportType}`,
      generatedAt: now,
      generatedBy: userStaffId,
      userRole,
      filterSummary,
      totalRowsCount: maskedRows.length
    };

    // 5. Generate CSV/XLSX Payload
    const fileBase64 = ExcelGenerationService.generateCsvPayload(metadataHeader, columns, maskedRows);
    const fileName = `BDMS_${query.reportType}_${Date.now()}.csv`;

    // 6. Log Audit Event: REPORT_EXPORT
    this.logExportAudit(query.reportType, filterSummary, maskedRows.length, userRole, userStaffId);

    return { fileBase64, fileName };
  }

  private fetchReportData(query: ExportQueryDTO, userRole: UserRole, userStaffId: string): Record<string, any>[] {
    if (query.reportType === 'STAFF_MASTER') {
      const list = this.staffRepo.findAll(false);
      return list.map((s) => ({
        StaffID: s.StaffID,
        HN: s.HN || '',
        FirstName: s.FirstName,
        LastName: s.LastName,
        DateOfBirth: s.DateOfBirth,
        Sex: s.Sex,
        BloodGroup: s.BloodGroup,
        DepartmentCode: s.DepartmentCode,
        WorkGroup: s.WorkGroup,
        Email: s.Email,
        EmergencyPhone: s.EmergencyPhone,
        EmploymentStatus: s.EmploymentStatus
      }));
    }

    if (query.reportType === 'INDIVIDUAL_HISTORY') {
      const targetId = query.targetStaffId || userStaffId;
      const vacs = this.clinicalRepo.findVaccinationsByStaffId(targetId);
      const labs = this.clinicalRepo.findLabResultsByStaffId(targetId);

      const rows: Record<string, any>[] = [
        ...vacs.map((v) => ({
          StaffID: v.StaffID,
          Category: v.VaccineCategory,
          RecordType: 'VACCINE',
          AdministeredDate: v.AdministeredDate,
          QuantitativeValue: `เข็มที่ ${v.DoseNumber}`,
          VerificationStatus: v.VerificationStatus
        })),
        ...labs.map((l) => ({
          StaffID: l.StaffID,
          Category: l.LabCategory,
          RecordType: 'LAB_TEST',
          AdministeredDate: l.TestDate,
          QuantitativeValue: l.QuantitativeValue || l.QualitativeResult,
          VerificationStatus: l.VerificationStatus
        }))
      ];
      return rows;
    }

    // Default sample aggregation
    return [
      { StaffID: 'ST8004', FullName: 'พว. อารียา รักษ์ดี', WorkGroup: 'FRONTLINE', DepartmentCode: 'OPD', WorkReadinessStatus: 'CLEARED', CompletenessPercentage: 100 }
    ];
  }

  private logExportAudit(reportType: string, filterSummary: string, rowCount: number, role: UserRole, staffId: string): void {
    try {
      const headers = [
        'LogUUID', 'Timestamp', 'StaffID', 'RoleCode', 'Action',
        'TargetResource', 'DetailsJson', 'PreviousHash', 'CurrentHash',
        'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'RecordVersion', 'IsDeleted'
      ];
      const now = new Date().toISOString();
      const logUuid = `log-${CryptoService.generateUuid()}`;
      const action = 'REPORT_EXPORT';
      const target = `Report:${reportType}`;
      const details = JSON.stringify({ reportType, filterSummary, rowCount });

      this.sheetRepo.appendRow('AUDIT_LOG', headers, {
        LogUUID: logUuid,
        Timestamp: now,
        StaffID: staffId,
        RoleCode: role,
        Action: action,
        TargetResource: target,
        DetailsJson: details,
        PreviousHash: '0000000000000000000000000000000000000000000000000000000000000000',
        CurrentHash: CryptoService.computeAuditEntryHash(logUuid, now, staffId, action, target, details, '0000000000000000000000000000000000000000000000000000000000000000'),
        CreatedAt: now,
        CreatedBy: staffId,
        UpdatedAt: now,
        UpdatedBy: staffId,
        RecordVersion: 1,
        IsDeleted: false
      });
    } catch {
      // Ignore logging failure to prevent export failure
    }
  }
}
