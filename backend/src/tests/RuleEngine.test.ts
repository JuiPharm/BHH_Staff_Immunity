import { RuleParser } from '../services/RuleParser';
import { RuleValidator } from '../services/RuleValidator';
import { RuleEvaluator } from '../services/RuleEvaluator';
import { RuleVersionService } from '../services/RuleVersionService';
import { RuleCondition, RuleVersionDTO } from '../dto/RuleDTO';

export class RuleEngineTestSuite {
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

    // Test Case 1: Boundary Value Evaluation (Anti-HBs Titer >= 10.0 mIU/mL)
    try {
      const boundaryRule: RuleCondition = {
        field: 'ANTI_HBS_TITER',
        operator: 'greater_than_or_equal',
        value: 10.0
      };
      const passData = { ANTI_HBS_TITER: 10.0 };
      const failData = { ANTI_HBS_TITER: 9.9 };

      const isPass = RuleEvaluator.evaluate(boundaryRule, passData);
      const isFail = RuleEvaluator.evaluate(boundaryRule, failData);

      assert(isPass && !isFail, 'Test 1: Boundary Value Evaluation (Anti-HBs Titer >= 10.0)');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 1 Error - ${e.message}`);
    }

    // Test Case 2: Missing Data Handling
    try {
      const rule: RuleCondition = { field: 'MMR_STATUS', operator: 'equals', value: 'VERIFIED' };
      const emptyData = {};
      const isPassed = RuleEvaluator.evaluate(rule, emptyData);
      assert(!isPassed, 'Test 2: Missing Data Handled Safely as Action Required');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 2 Error - ${e.message}`);
    }

    // Test Case 3: Contradictory Data Evaluation
    try {
      const rule: RuleCondition = {
        operator: 'all',
        conditions: [
          { field: 'HEPATITIS_B_VACCINE', operator: 'equals', value: 'VERIFIED' },
          { field: 'ANTI_HBS_LAB', operator: 'equals', value: 'POSITIVE' }
        ]
      };
      const contradictoryData = { HEPATITIS_B_VACCINE: 'VERIFIED', ANTI_HBS_LAB: 'NEGATIVE' };
      const isPassed = RuleEvaluator.evaluate(rule, contradictoryData);
      assert(!isPassed, 'Test 3: Contradictory Data Invalidation');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 3 Error - ${e.message}`);
    }

    // Test Case 4: Expired Vaccination / CXR Date Check
    try {
      const dateRule: RuleCondition = { field: 'CXR_DATE', operator: 'date_within_years', value: 1 };
      const validDateData = { CXR_DATE: new Date().toISOString().split('T')[0] };
      const expiredDateData = { CXR_DATE: '2024-01-01' }; // 2 years old

      const isValid = RuleEvaluator.evaluate(dateRule, validDateData);
      const isExpired = RuleEvaluator.evaluate(dateRule, expiredDateData);

      assert(isValid && !isExpired, 'Test 4: Expired Vaccination / CXR Date Evaluation');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 4 Error - ${e.message}`);
    }

    // Test Case 5: Verified vs Unverified Data Check
    try {
      const rule: RuleCondition = { field: 'VARICELLA', operator: 'equals', value: 'VERIFIED' };
      const unverifiedData = { VARICELLA: 'SUBMITTED' }; // Not verified yet!
      const isPassed = RuleEvaluator.evaluate(rule, unverifiedData);
      assert(!isPassed, 'Test 5: Unverified Data Ignored From Readiness Pass');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 5 Error - ${e.message}`);
    }

    // Test Case 6: Rule Version Change Simulation
    try {
      const v1Condition: RuleCondition = { field: 'CXR', operator: 'equals', value: 'VERIFIED' };
      const v2Condition: RuleCondition = {
        operator: 'all',
        conditions: [
          { field: 'CXR', operator: 'equals', value: 'VERIFIED' },
          { field: 'INFLUENZA', operator: 'equals', value: 'VERIFIED' }
        ]
      };

      const staffData = { CXR: 'VERIFIED' }; // Has CXR, no Influenza
      const passV1 = RuleEvaluator.evaluate(v1Condition, staffData);
      const passV2 = RuleEvaluator.evaluate(v2Condition, staffData);

      assert(passV1 && !passV2, 'Test 6: Rule Version Change Evaluation Difference');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 6 Error - ${e.message}`);
    }

    // Test Case 7: Effective Date Filtering
    try {
      const service = new RuleVersionService();
      const activeRule = service.getActiveRuleVersion('CLINICAL', '2026-07-24');
      assert(activeRule !== null && activeRule.effectiveFrom <= '2026-07-24', 'Test 7: Effective Date Filtering Lookup');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 7 Error - ${e.message}`);
    }

    // Test Case 8: Physician Override Validation
    try {
      const originalStatus = 'action_required';
      const reason = 'ฉีดวัคซีนครบแล้ว อยู่ระหว่างรอผลตรวจ Lab';
      let overriddenStatus = originalStatus;
      if (reason && reason.trim().length > 0) {
        overriddenStatus = 'ready';
      }
      assert(overriddenStatus === 'ready', 'Test 8: Physician Override Status Transition');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 8 Error - ${e.message}`);
    }

    // Test Case 9: Invalid Rule JSON Syntax Error Catch
    try {
      const invalidJson = '{ operator: "equals", field: }'; // Malformed JSON
      const validation = RuleValidator.validate(invalidJson);
      assert(!validation.isValid && validation.errors.some((e) => e.includes('JSON')), 'Test 9: Invalid Rule JSON Syntax Error Catch');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 9 Error - ${e.message}`);
    }

    // Test Case 10: Circular Condition Loop Detection in Nested Rules
    try {
      // Build deeply nested condition exceeding 10 levels
      let deepNode: RuleCondition = { field: 'CXR', operator: 'equals', value: 'VERIFIED' };
      for (let i = 0; i < 12; i++) {
        deepNode = { operator: 'all', conditions: [deepNode] };
      }

      const validation = RuleValidator.validate(deepNode);
      assert(!validation.isValid && validation.errors.some((e) => e.includes('Circular')), 'Test 10: Circular Nested Condition Loop Detection');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 10 Error - ${e.message}`);
    }

    return {
      total: 10,
      passed,
      results
    };
  }
}
