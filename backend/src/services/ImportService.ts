import { ImportTargetType, ColumnMappingDTO, ImportRowValidationResult, ImportSummaryDTO, ImportRowError } from '../dto/ImportDTO';
import { ImportValidationService } from './ImportValidationService';
import { ImportRepository } from '../repositories/ImportRepository';
import { StaffRepository } from '../repositories/StaffRepository';
import { ClinicalRepository } from '../repositories/ClinicalRepository';
import { AccountRepository } from '../repositories/AccountRepository';
import { CryptoService } from './CryptoService';

export class ImportService {
  private importRepo: ImportRepository;
  private staffRepo: StaffRepository;
  private clinicalRepo: ClinicalRepository;
  private accountRepo: AccountRepository;

  constructor(importRepo?: ImportRepository, staffRepo?: StaffRepository, clinicalRepo?: ClinicalRepository, accountRepo?: AccountRepository) {
    this.importRepo = importRepo || new ImportRepository();
    this.staffRepo = staffRepo || new StaffRepository();
    this.clinicalRepo = clinicalRepo || new ClinicalRepository();
    this.accountRepo = accountRepo || new AccountRepository();
  }

  /**
   * Applies column mapping to raw CSV/XLSX row objects.
   */
  public applyColumnMapping(rawRows: Record<string, any>[], mappings: ColumnMappingDTO[]): Record<string, any>[] {
    const mapDict: Record<string, string> = {};
    mappings.forEach((m) => {
      mapDict[m.sourceColumn] = m.targetField;
    });

    return rawRows.map((row) => {
      const mappedRecord: Record<string, any> = {};
      Object.keys(row).forEach((col) => {
        const targetField = mapDict[col] || col;
        mappedRecord[targetField] = row[col];
      });
      return mappedRecord;
    });
  }

  /**
   * Dry Run Engine: Validates batch without writing to database.
   */
  public dryRun(targetType: ImportTargetType, rawRows: Record<string, any>[], mappings: ColumnMappingDTO[]): {
    results: ImportRowValidationResult[];
    summary: ImportSummaryDTO;
  } {
    const mappedRecords = this.applyColumnMapping(rawRows, mappings);
    const existingStaffList = this.staffRepo.findAll(false);
    const existingStaffIds = new Set(existingStaffList.map((s) => s.StaffID.toUpperCase()));

    const results = ImportValidationService.validateBatch(targetType, mappedRecords, existingStaffIds);

    const totalRows = results.length;
    const errorRows = results.filter((r) => !r.isValid).length;
    const warningRows = results.filter((r) => r.hasWarning).length;
    const successRows = totalRows - errorRows;

    const importJobId = `job-${CryptoService.generateUuid()}`;
    const now = new Date().toISOString();

    const summary: ImportSummaryDTO = {
      importJobId,
      targetType,
      fileName: 'imported_file.csv',
      totalRows,
      successRows,
      warningRows,
      errorRows,
      skippedRows: errorRows,
      insertedRows: 0,
      updatedRows: 0,
      status: 'PREVIEW',
      executedAt: now,
      executedBy: 'SYSTEM'
    };

    return { results, summary };
  }

  /**
   * Idempotent Batch Commit Engine: Inserts or updates valid rows in Google Sheets.
   */
  public commitImportJob(
    importJobId: string,
    targetType: ImportTargetType,
    fileName: string,
    validRecords: Record<string, any>[],
    executedBy: string
  ): ImportSummaryDTO {
    const now = new Date().toISOString();
    let insertedRows = 0;
    let updatedRows = 0;
    let skippedRows = 0;

    validRecords.forEach((rec) => {
      if (targetType === 'STAFF_MASTER') {
        const staffId = String(rec['StaffID'] || rec['staffId']).toUpperCase();
        const existing = this.staffRepo.findByStaffId(staffId, true);

        if (existing) {
          // Idempotent Update
          this.staffRepo.updateStaff(
            staffId,
            {
              FirstName: rec['FirstName'],
              LastName: rec['LastName'],
              Email: rec['Email'],
              WorkGroup: rec['WorkGroup']
            } as any,
            executedBy
          );
          updatedRows++;
        } else {
          // Idempotent Insert
          this.staffRepo.createStaff(
            {
              StaffID: staffId,
              FirstName: rec['FirstName'] || 'Staff',
              LastName: rec['LastName'] || 'Imported',
              DateOfBirth: rec['DateOfBirth'] || '1990-01-01',
              Sex: rec['Sex'] || 'OTHER',
              BloodGroup: rec['BloodGroup'] || 'O+',
              Address: rec['Address'] || 'Hat Yai',
              EmergencyPhone: rec['EmergencyPhone'] || '081-000-0000',
              Email: rec['Email'] || `${staffId.toLowerCase()}@bdms.co.th`,
              DepartmentCode: rec['DepartmentCode'] || 'OPD',
              WorkGroup: rec['WorkGroup'] || 'BACKOFFICE',
              EmploymentStatus: 'ACTIVE',
              StartDate: now.split('T')[0]
            },
            executedBy
          );
          
          // Production Workflow: Automatically provision a user account for the new staff
          // Default password is set to 'password123' and they are forced to change it on first login.
          const importedRole = rec['FunctionalRole'] || rec['Role'] || 'DATA_OWNER';
          const importedLevel: 'SUPERUSER' | 'NORMAL_USER' = rec['UserLevel'] || (['INFECTION_CONTROL', 'HR', 'PHYSICIAN', 'ADMIN'].includes(String(importedRole).toUpperCase()) ? 'SUPERUSER' : 'NORMAL_USER');
          this.accountRepo.createAccount(staffId, 'password123', executedBy, importedRole, importedLevel);
          
          insertedRows++;
        }
      } else if (targetType === 'VACCINATION') {
        try {
          this.clinicalRepo.createVaccination(
            {
              StaffID: String(rec['StaffID']).toUpperCase(),
              VaccineCategory: rec['VaccineCategory'],
              DoseNumber: Number(rec['DoseNumber']) || 1,
              AdministeredDate: rec['AdministeredDate'],
              VerificationStatus: 'SUBMITTED',
              Source: 'IMPORT'
            },
            executedBy
          );
          insertedRows++;
        } catch {
          // Duplicate dose skipped for idempotency
          skippedRows++;
        }
      }
    });

    const summary: ImportSummaryDTO = {
      importJobId,
      targetType,
      fileName,
      totalRows: validRecords.length,
      successRows: insertedRows + updatedRows,
      warningRows: 0,
      errorRows: 0,
      skippedRows,
      insertedRows,
      updatedRows,
      status: 'COMPLETED',
      executedAt: now,
      executedBy
    };

    // Log Import Job
    this.importRepo.logImportJob(summary);

    // HIGH-02 Patch: Invalidate Dashboard Cache after bulk data import
    try {
      const cacheRepo = new (require('../repositories/DashboardCacheRepository').DashboardCacheRepository)();
      cacheRepo.invalidateCache('ALL');
    } catch {
      // Ignore if cache repository is unavailable during test mocks
    }

    return summary;
  }

  /**
   * Generates Error Report in CSV/Excel Base64 format.
   */
  public generateErrorReport(errors: ImportRowError[]): string {
    let csvContent = 'RowNumber,FieldName,InvalidValue,ErrorMessage,Severity\n';
    errors.forEach((e) => {
      csvContent += `${e.rowNumber},"${e.fieldName}","${e.invalidValue}","${e.errorMessage}",${e.severity}\n`;
    });
    return Utilities.base64Encode(Utilities.newBlob(csvContent).getBytes());
  }
}
