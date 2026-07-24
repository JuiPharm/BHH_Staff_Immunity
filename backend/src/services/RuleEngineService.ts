export type WorkGroup = 'CLINICAL' | 'FRONTLINE' | 'BACKOFFICE';
export type WorkReadinessStatus = 'CLEARED' | 'CONDITIONALLY_CLEARED' | 'NOT_CLEARED';

export interface HealthRecordSummary {
  category: string;
  isVerified: boolean;
  administeredDate?: string;
  expiryDate?: string;
  isMedicalExemption?: boolean;
}

export class RuleEngineService {
  /**
   * Evaluates work-readiness based on work group rules.
   */
  public static evaluateReadiness(workGroup: WorkGroup, records: HealthRecordSummary[]): { status: WorkReadinessStatus; missingCategories: string[] } {
    const verifiedMap = new Map<string, HealthRecordSummary>();
    records.forEach((r) => {
      if (r.isVerified || r.isMedicalExemption) {
        verifiedMap.set(r.category, r);
      }
    });

    let requiredCategories: string[] = [];

    if (workGroup === 'CLINICAL') {
      requiredCategories = ['HEPATITIS_B', 'MMR', 'VARICELLA', 'TDAP', 'INFLUENZA', 'CXR', 'TST'];
    } else if (workGroup === 'FRONTLINE') {
      requiredCategories = ['MMR', 'VARICELLA', 'TDAP', 'CXR'];
    } else {
      // BACKOFFICE
      requiredCategories = ['CXR'];
    }

    const missingCategories: string[] = [];
    const currentDate = new Date().toISOString().split('T')[0];

    requiredCategories.forEach((cat) => {
      const rec = verifiedMap.get(cat);
      if (!rec) {
        missingCategories.push(cat);
      } else if (rec.expiryDate && rec.expiryDate < currentDate) {
        missingCategories.push(`${cat} (Expired)`);
      }
    });

    if (missingCategories.length === 0) {
      return { status: 'CLEARED', missingCategories: [] };
    } else if (missingCategories.length === 1 && (missingCategories[0].includes('INFLUENZA') || missingCategories[0].includes('ANTI_HBS'))) {
      return { status: 'CONDITIONALLY_CLEARED', missingCategories };
    } else {
      return { status: 'NOT_CLEARED', missingCategories };
    }
  }
}
