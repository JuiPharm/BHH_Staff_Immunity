import { AuthorizationMiddleware } from '../middleware/AuthorizationMiddleware';
import { RecordAccessPolicy } from '../policies/RecordAccessPolicy';
import { FieldMaskingUtil } from '../utils/FieldMaskingUtil';

export class RbacPolicyTestSuite {
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

    // Test Case 1: Data Owner Self-Access Success
    try {
      const res = AuthorizationMiddleware.authorize('DATA_OWNER', 'ST8004', 'READ_HEALTH_RECORDS', 'ST8004');
      assert(res.isAuthorized, 'Test 1: Data Owner Reading Own Record');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 1 Error - ${e.message}`);
    }

    // Test Case 2: Data Owner IDOR Attack Test (IDOR Prevention)
    try {
      // Data Owner ST8004 attempts to access ST8005's records
      const res = AuthorizationMiddleware.authorize('DATA_OWNER', 'ST8004', 'READ_HEALTH_RECORDS', 'ST8005');
      assert(!res.isAuthorized, 'Test 2: Data Owner IDOR Attack Prevention (Accessing other StaffID)');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 2 Error - ${e.message}`);
    }

    // Test Case 3: Data Owner Cannot Edit Health Records
    try {
      const canEdit = RecordAccessPolicy.canModifyHealthRecord('DATA_OWNER');
      assert(!canEdit, 'Test 3: Data Owner Blocked From Editing Health Records');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 3 Error - ${e.message}`);
    }

    // Test Case 4: HR Field-Level Data Masking
    try {
      const rawMedicalRecord = {
        staffId: 'ST8004',
        category: 'ANTI_HBS',
        QuantitativeValue: 125.4,
        ClinicalNotes: 'Physician Confidential Note',
        WorkReadinessStatus: 'CLEARED'
      };

      const maskedForHr = FieldMaskingUtil.maskHealthRecord(rawMedicalRecord, 'HR');
      const isQuantitativeMasked = maskedForHr.QuantitativeValue === FieldMaskingUtil.MASKED_PLACEHOLDER;
      const isNotesMasked = maskedForHr.ClinicalNotes === FieldMaskingUtil.MASKED_PLACEHOLDER;
      const isStatusVisible = maskedForHr.WorkReadinessStatus === 'CLEARED';

      assert(isQuantitativeMasked && isNotesMasked && isStatusVisible, 'Test 4: HR Field-Level Data Masking');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 4 Error - ${e.message}`);
    }

    // Test Case 5: Physician Medical Override Permission
    try {
      const res = AuthorizationMiddleware.authorize('PHYSICIAN', 'MD8003', 'PHYSICIAN_ASSESSMENT', 'ST8005');
      assert(res.isAuthorized, 'Test 5: Physician Medical Override Action Authorized');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 5 Error - ${e.message}`);
    }

    // Test Case 6: Infection Control Verification Permission
    try {
      const res = AuthorizationMiddleware.authorize('INFECTION_CONTROL', 'IC8001', 'VERIFY_DOCUMENT', 'ST8004');
      assert(res.isAuthorized, 'Test 6: Infection Control Document Verification Authorized');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 6 Error - ${e.message}`);
    }

    // Test Case 7: HR Blocked from Physician Assessment Action
    try {
      const res = AuthorizationMiddleware.authorize('HR', 'HR8002', 'PHYSICIAN_ASSESSMENT', 'ST8004');
      assert(!res.isAuthorized, 'Test 7: HR Blocked From Physician Assessment Action');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 7 Error - ${e.message}`);
    }

    // Test Case 8: Unmasked Medical Data for Physician & Infection Control
    try {
      const rawRecord = { QuantitativeValue: 150.0, ClinicalNotes: 'Normal' };
      const maskedForPhysician = FieldMaskingUtil.maskHealthRecord(rawRecord, 'PHYSICIAN');
      const unmasked = maskedForPhysician.QuantitativeValue === 150.0;
      assert(unmasked, 'Test 8: Full Medical Unmasked Access for Physician');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 8 Error - ${e.message}`);
    }

    return {
      total: 8,
      passed,
      results
    };
  }
}
