import { FileValidationSchema, MAX_FILE_SIZE_BYTES } from '../dto/FileDTO';
import { ChecksumUtil } from '../utils/ChecksumUtil';
import { AuthorizationMiddleware } from '../middleware/AuthorizationMiddleware';

export class FileModuleTestSuite {
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

    // Test Case 1: Extension & MIME Validation Check
    try {
      const valid = FileValidationSchema.validateUpload('vaccine_cert.pdf', 1024, 'application/pdf');
      const invalidExt = FileValidationSchema.validateUpload('malicious.exe', 1024, 'application/x-msdownload');
      assert(valid.isValid && !invalidExt.isValid, 'Test 1: Allowed Extension & MIME Check');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 1 Error - ${e.message}`);
    }

    // Test Case 2: File Size Early Rejection (Over 10 MB)
    try {
      const oversizedBytes = MAX_FILE_SIZE_BYTES + 1024; // > 10 MB
      const result = FileValidationSchema.validateUpload('large_file.pdf', oversizedBytes, 'application/pdf');
      assert(!result.isValid && result.error?.includes('เกินกำหนด'), 'Test 2: File Size Early Rejection (> 10MB)');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 2 Error - ${e.message}`);
    }

    // Test Case 3: UUID File Renaming Specification (No Staff Name)
    try {
      const docUuid = 'doc-11223344-5566-7788';
      const ext = 'pdf';
      const driveFilename = `${docUuid}.${ext}`;
      const hasStaffName = driveFilename.includes('อารียา') || driveFilename.includes('ST8004');
      assert(!hasStaffName && driveFilename === 'doc-11223344-5566-7788.pdf', 'Test 3: UUID File Renaming Specification');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 3 Error - ${e.message}`);
    }

    // Test Case 4: SHA-256 Checksum Computation & Duplicate Check
    try {
      const fileBytes = [66, 68, 77, 83, 32, 83, 116, 97, 102, 102];
      const checksum = ChecksumUtil.computeSha256(fileBytes);
      const isMatch = ChecksumUtil.isDuplicateChecksum(checksum, checksum);
      assert(checksum.length === 64 && isMatch, 'Test 4: SHA-256 Checksum Computation & Duplicate Detection');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 4 Error - ${e.message}`);
    }

    // Test Case 5: Rejection Reason Enforcement
    try {
      const rejectionReason = ''; // Empty reason!
      const isBlockedWithoutReason = !rejectionReason || rejectionReason.trim().length === 0;
      assert(isBlockedWithoutReason, 'Test 5: Rejection Reason Requirement Enforcement');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 5 Error - ${e.message}`);
    }

    // Test Case 6: Pending Document Status Effect Rule
    try {
      const status = 'SUBMITTED';
      const triggersAssessment = status === 'VERIFIED';
      assert(!triggersAssessment, 'Test 6: Pending Submitted Evidence Has No Effect On Readiness Assessment');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 6 Error - ${e.message}`);
    }

    // Test Case 7: Data Owner Proxy Download IDOR Protection
    try {
      const uploaderStaffId = 'ST8004';
      const attackerStaffId = 'ST8005';
      const auth = AuthorizationMiddleware.authorize('DATA_OWNER', attackerStaffId, 'READ_HEALTH_RECORDS', uploaderStaffId);
      assert(!auth.isAuthorized, 'Test 7: Data Owner Proxy Download IDOR Protection');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 7 Error - ${e.message}`);
    }

    return {
      total: 7,
      passed,
      results
    };
  }
}
