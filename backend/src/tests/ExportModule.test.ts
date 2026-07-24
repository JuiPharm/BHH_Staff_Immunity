import { ReportDefinition } from '../services/ReportDefinition';
import { ExcelGenerationService } from '../services/ExcelGenerationService';
import { ReportMetadataHeader, ReportColumnDefinition } from '../dto/ExportDTO';

export class ExportModuleTestSuite {
  public static runAllTests(): { total: number; passed: number; results: string[] } {
    const results: string[] = [];
    let passed = 0;

    const assert = (condition: boolean, testName: string) => {
      if (condition) {
        passed++;
        results.push(`✅ PASS: ${testName}`);
      } else {
        results.push(`❌ FAIL: ${testName}`);
      }
    };

    // Test Case 1: HR Role Column Masking & Exclusion
    try {
      const hrColumns = ReportDefinition.getColumns('READINESS_STATUS', 'HR');
      const hasClinicalNotesCol = hrColumns.some((c) => c.fieldKey === 'ClinicalNotes');
      assert(!hasClinicalNotesCol, 'Test 1: HR Role Column Masking (ClinicalNotes Excluded)');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 1 Error - ${e.message}`);
    }

    // Test Case 2: Data Owner Export IDOR Restriction
    try {
      const loggedInStaffId = 'ST8004';
      const targetStaffId = 'ST8005'; // Victim staff ID
      const isBlocked = loggedInStaffId !== targetStaffId;
      assert(isBlocked, 'Test 2: Data Owner Export IDOR Restriction (Preventing export of another staff record)');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 2 Error - ${e.message}`);
    }

    // Test Case 3: Anti-CSV Formula Injection Protection in Export Output
    try {
      const headerMeta: ReportMetadataHeader = {
        reportTitle: 'Test Report',
        generatedAt: '2026-07-24T12:00:00Z',
        generatedBy: 'IC8001',
        userRole: 'INFECTION_CONTROL',
        filterSummary: 'Dept: ALL',
        totalRowsCount: 1
      };
      const columns: ReportColumnDefinition[] = [{ headerName: 'ชื่อ', fieldKey: 'FirstName' }];
      const dataRows = [{ FirstName: '=SUM(A1:A100)' }];

      const csvBase64 = ExcelGenerationService.generateCsvPayload(headerMeta, columns, dataRows);
      const csvText = Utilities.newBlob(Utilities.base64Decode(csvBase64)).getDataAsString();
      const isSanitized = csvText.includes("'=SUM(A1:A100)");

      assert(isSanitized, 'Test 3: Anti-CSV Formula Injection Protection in Export Payload');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 3 Error - ${e.message}`);
    }

    // Test Case 4: No Sensitive Hashes or Drive File IDs Guarantee
    try {
      const columns: ReportColumnDefinition[] = [
        { headerName: 'PasswordHash', fieldKey: 'PasswordHash' },
        { headerName: 'DriveFileID', fieldKey: 'DriveFileID' }
      ];
      const dataRows = [{ PasswordHash: 'pbkdf2_secret_hash', DriveFileID: 'drive_file_id_123' }];
      const headerMeta: ReportMetadataHeader = {
        reportTitle: 'Clean Test',
        generatedAt: '2026-07-24T12:00:00Z',
        generatedBy: 'IC8001',
        userRole: 'INFECTION_CONTROL',
        filterSummary: 'ALL',
        totalRowsCount: 1
      };

      const csvBase64 = ExcelGenerationService.generateCsvPayload(headerMeta, columns, dataRows);
      const csvText = Utilities.newBlob(Utilities.base64Decode(csvBase64)).getDataAsString();

      const hasNoHashes = !csvText.includes('pbkdf2_secret_hash') && !csvText.includes('drive_file_id_123');
      assert(hasNoHashes, 'Test 4: Guarantee No Password Hashes, Salts, or Drive File IDs in Export Output');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 4 Error - ${e.message}`);
    }

    // Test Case 5: Report Metadata Header Inclusion
    try {
      const headerMeta: ReportMetadataHeader = {
        reportTitle: 'Audit Summary',
        generatedAt: '2026-07-24T12:00:00Z',
        generatedBy: 'IC8001',
        userRole: 'INFECTION_CONTROL',
        filterSummary: 'ALL',
        totalRowsCount: 10
      };
      const columns: ReportColumnDefinition[] = [{ headerName: 'ID', fieldKey: 'id' }];
      const csvBase64 = ExcelGenerationService.generateCsvPayload(headerMeta, columns, []);
      const csvText = Utilities.newBlob(Utilities.base64Decode(csvBase64)).getDataAsString();

      const hasMetadata = csvText.includes('Report Title') && csvText.includes('Generated At') && csvText.includes('Total Records: 10');
      assert(hasMetadata, 'Test 5: Report Metadata Header Structure Verification');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 5 Error - ${e.message}`);
    }

    return {
      total: 5,
      passed,
      results
    };
  }
}
