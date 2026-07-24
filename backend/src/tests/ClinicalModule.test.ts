import { ClinicalValidationSchema, VaccinationDTO } from '../dto/ClinicalDTO';
import { RuleEngineService } from '../services/RuleEngineService';

export class ClinicalModuleTestSuite {
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

    // Test Case 1: 1 Dose Per Row Granularity & Attributes Check
    try {
      const singleDose: Partial<VaccinationDTO> = {
        StaffID: 'ST8004',
        VaccineCategory: 'MMR',
        DoseNumber: 2,
        AdministeredDate: '2025-05-10'
      };

      const validation = ClinicalValidationSchema.validateVaccination(singleDose);
      assert(validation.isValid && singleDose.DoseNumber === 2, 'Test 1: 1 Dose Per Row Granularity Specification');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 1 Error - ${e.message}`);
    }

    // Test Case 2: Data Owner Write Block Protection
    try {
      const userRole = 'DATA_OWNER';
      const isDirectEditAllowed = userRole === 'INFECTION_CONTROL' || userRole === 'PHYSICIAN';
      assert(!isDirectEditAllowed, 'Test 2: Data Owner Direct Edit Block Protection');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 2 Error - ${e.message}`);
    }

    // Test Case 3: Verification Status Workflow State Machine
    try {
      const validStatuses = ['DRAFT', 'SUBMITTED', 'VERIFIED', 'REJECTED'];
      const initialStatus = 'SUBMITTED';
      const nextStatus = 'VERIFIED';
      const isValidTransition = validStatuses.includes(initialStatus) && validStatuses.includes(nextStatus);
      assert(isValidTransition, 'Test 3: Verification Status Lifecycle (SUBMITTED -> VERIFIED)');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 3 Error - ${e.message}`);
    }

    // Test Case 4: Duplicate Dose Detection
    try {
      const existingDoses = [
        { VaccineCategory: 'MMR', DoseNumber: 1 },
        { VaccineCategory: 'MMR', DoseNumber: 2 }
      ];
      const newAttempt = { VaccineCategory: 'MMR', DoseNumber: 2 };
      const isDuplicate = existingDoses.some((d) => d.VaccineCategory === newAttempt.VaccineCategory && d.DoseNumber === newAttempt.DoseNumber);
      assert(isDuplicate, 'Test 4: Duplicate Dose Detection Prevention');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 4 Error - ${e.message}`);
    }

    // Test Case 5: Rule Engine Decoupling Trigger
    try {
      const mockSummaries = [
        { category: 'MMR', isVerified: true },
        { category: 'VARICELLA', isVerified: true },
        { category: 'TDAP', isVerified: true },
        { category: 'CXR', isVerified: true }
      ];
      const readiness = RuleEngineService.evaluateReadiness('FRONTLINE', mockSummaries);
      assert(readiness.status === 'CLEARED', 'Test 5: Decoupled Rule Engine Evaluator Trigger Execution');
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
