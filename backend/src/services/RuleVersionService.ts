import { SheetRepository } from '../repositories/SheetRepository';
import { RuleVersionDTO, RuleCondition } from '../dto/RuleDTO';
import { RuleParser } from './RuleParser';

export class RuleVersionService {
  private sheetRepo: SheetRepository;

  constructor(sheetRepo?: SheetRepository) {
    const auditSsId = PropertiesService.getScriptProperties().getProperty('DB_AUDIT_SPREADSHEET_ID');
    this.sheetRepo = sheetRepo || new SheetRepository(auditSsId || undefined);
  }

  /**
   * Retrieves active rule version for a given work group based on effective date.
   */
  public getActiveRuleVersion(workGroup: 'CLINICAL' | 'FRONTLINE' | 'BACKOFFICE', currentDate = new Date().toISOString().split('T')[0]): RuleVersionDTO | null {
    const rows = this.sheetRepo.getRows('RULE_VERSION');

    const match = rows.find((r) => {
      const isGroupMatch = String(r.WorkGroup || r.workGroup).toUpperCase() === workGroup.toUpperCase();
      const isActive = (r.Status || r.status) === 'active';
      const isEffectiveFrom = String(r.EffectiveDate || r.effectiveFrom) <= currentDate;
      const isNotExpired = !r.ExpiryDate || String(r.ExpiryDate || r.effectiveTo) >= currentDate;
      return isGroupMatch && isActive && isEffectiveFrom && isNotExpired;
    });

    if (!match) {
      // Fallback default rules
      return this.getDefaultFallbackRule(workGroup);
    }

    return {
      versionUuid: String(match.VersionUUID || match.versionUuid),
      ruleUuid: String(match.RuleUUID || match.ruleUuid),
      versionNumber: Number(match.VersionNumber || match.versionNumber) || 1,
      workGroup,
      requirementsJson: String(match.RequirementsCriteriaJson || match.requirementsJson),
      effectiveFrom: String(match.EffectiveDate || match.effectiveFrom),
      status: (match.Status || match.status) as any,
      createdBy: String(match.CreatedBy || match.createdBy || 'SYSTEM'),
      createdAt: String(match.CreatedAt || match.createdAt || new Date().toISOString())
    };
  }

  /**
   * Default fallback rules for Clinical, Frontline, and Back Office
   */
  public getDefaultFallbackRule(workGroup: 'CLINICAL' | 'FRONTLINE' | 'BACKOFFICE'): RuleVersionDTO {
    let condition: RuleCondition;

    if (workGroup === 'CLINICAL') {
      condition = {
        operator: 'all',
        conditions: [
          { field: 'HEPATITIS_B', operator: 'equals', value: 'VERIFIED' },
          { field: 'MMR', operator: 'equals', value: 'VERIFIED' },
          { field: 'VARICELLA', operator: 'equals', value: 'VERIFIED' },
          { field: 'TDAP', operator: 'equals', value: 'VERIFIED' },
          { field: 'INFLUENZA', operator: 'equals', value: 'VERIFIED' },
          { field: 'CXR', operator: 'equals', value: 'VERIFIED' },
          { field: 'TST', operator: 'equals', value: 'VERIFIED' }
        ]
      };
    } else if (workGroup === 'FRONTLINE') {
      condition = {
        operator: 'all',
        conditions: [
          { field: 'MMR', operator: 'equals', value: 'VERIFIED' },
          { field: 'VARICELLA', operator: 'equals', value: 'VERIFIED' },
          { field: 'TDAP', operator: 'equals', value: 'VERIFIED' },
          { field: 'CXR', operator: 'equals', value: 'VERIFIED' }
        ]
      };
    } else {
      // BACKOFFICE
      condition = {
        operator: 'all',
        conditions: [{ field: 'CXR', operator: 'equals', value: 'VERIFIED' }]
      };
    }

    return {
      versionUuid: `ver-default-${workGroup.toLowerCase()}`,
      ruleUuid: `rule-default-${workGroup.toLowerCase()}`,
      versionNumber: 1,
      workGroup,
      requirementsJson: RuleParser.stringify(condition),
      effectiveFrom: '2026-01-01',
      status: 'active',
      createdBy: 'SYSTEM',
      createdAt: '2026-01-01T00:00:00Z'
    };
  }
}
