import { RuleVersionService } from './RuleVersionService';
import { RuleParser } from './RuleParser';
import { RuleEvaluator } from './RuleEvaluator';
import { AssessmentResultDTO, AssessmentResultStatus, ImpactPreviewResult, RuleVersionDTO } from '../dto/RuleDTO';
import { StaffRepository } from '../repositories/StaffRepository';
import { ClinicalRepository } from '../repositories/ClinicalRepository';
import { SheetRepository } from '../repositories/SheetRepository';
import { CryptoService } from './CryptoService';

export class AssessmentService {
  private ruleVersionService: RuleVersionService;
  private staffRepo: StaffRepository;
  private clinicalRepo: ClinicalRepository;
  private sheetRepo: SheetRepository;

  constructor(
    ruleVersionService?: RuleVersionService,
    staffRepo?: StaffRepository,
    clinicalRepo?: ClinicalRepository,
    sheetRepo?: SheetRepository
  ) {
    this.ruleVersionService = ruleVersionService || new RuleVersionService();
    this.staffRepo = staffRepo || new StaffRepository();
    this.clinicalRepo = clinicalRepo || new ClinicalRepository();

    const clinicalSsId = PropertiesService.getScriptProperties().getProperty('DB_CLINICAL_SPREADSHEET_ID');
    this.sheetRepo = sheetRepo || new SheetRepository(clinicalSsId || undefined);
  }

  /**
   * Evaluates single staff member against active rule version.
   * Outputs one of 6 AssessmentResultStatus:
   * 'ready', 'action_required', 'pending_verification', 'pending_physician_review', 'temporarily_restricted', 'exempted'
   */
  public evaluateStaff(staffId: string, customRuleVersion?: RuleVersionDTO): AssessmentResultDTO {
    const staff = this.staffRepo.findByStaffId(staffId);
    const workGroup = staff ? staff.WorkGroup : 'CLINICAL';

    const ruleVersion = customRuleVersion || this.ruleVersionService.getActiveRuleVersion(workGroup);
    const ruleCondition = RuleParser.parse(ruleVersion!.requirementsJson);

    const vaccinations = this.clinicalRepo.findVaccinationsByStaffId(staffId);
    const labResults = this.clinicalRepo.findLabResultsByStaffId(staffId);

    // Build Record Dataset (Only VERIFIED records count as pass)
    const recordData: Record<string, any> = {};
    const pendingRequirements: string[] = [];

    vaccinations.forEach((v) => {
      if (v.VerificationStatus === 'VERIFIED') {
        recordData[v.VaccineCategory] = 'VERIFIED';
        recordData[`${v.VaccineCategory}_DATE`] = v.AdministeredDate;
      } else if (v.VerificationStatus === 'PENDING_VERIFICATION' || v.VerificationStatus === 'SUBMITTED') {
        recordData[v.VaccineCategory] = 'PENDING_VERIFICATION';
      }
    });

    labResults.forEach((l) => {
      if (l.VerificationStatus === 'VERIFIED') {
        recordData[l.LabCategory] = 'VERIFIED';
        recordData[`${l.LabCategory}_VALUE`] = l.QuantitativeValue;
      }
    });

    const isPassed = RuleEvaluator.evaluate(ruleCondition, recordData);

    let status: AssessmentResultStatus = isPassed ? 'ready' : 'action_required';

    // Check if pending verification
    if (!isPassed && Object.values(recordData).includes('PENDING_VERIFICATION')) {
      status = 'pending_verification';
    }

    const now = new Date().toISOString();
    return {
      assessmentUuid: `ass-${CryptoService.generateUuid()}`,
      staffId,
      workGroup,
      status,
      ruleVersionUuid: ruleVersion!.versionUuid,
      ruleVersionNumber: ruleVersion!.versionNumber,
      missingRequirements: isPassed ? [] : ['REQUIREMENTS_NOT_MET'],
      isPhysicianOverride: false,
      evaluatedAt: now
    };
  }

  /**
   * Recalculates and saves assessment result for single StaffID recording exact Rule Version used.
   */
  public recalculateByStaffId(staffId: string): AssessmentResultDTO {
    const result = this.evaluateStaff(staffId);
    this.saveAssessmentResult(result);
    return result;
  }

  /**
   * Batch recalculation for all active staff members.
   */
  public batchRecalculateAll(): { totalEvaluated: number; results: AssessmentResultDTO[] } {
    const allStaff = this.staffRepo.findAll(false);
    const results: AssessmentResultDTO[] = [];

    allStaff.forEach((staff) => {
      const res = this.recalculateByStaffId(staff.StaffID);
      results.push(res);
    });

    return { totalEvaluated: results.length, results };
  }

  /**
   * CRIT-01 Patch: Chunking Batch Recalculation to prevent GAS 6-minute execution timeout.
   */
  public recalculateBatchChunk(startIndex: number = 0, chunkSize: number = 100): { processed: number; hasMore: boolean; nextIndex: number } {
    const allStaff = this.staffRepo.findAll(false);
    const chunk = allStaff.slice(startIndex, startIndex + chunkSize);

    chunk.forEach((staff) => {
      try {
        this.recalculateByStaffId(staff.StaffID);
      } catch (e) {
        // Log individual staff recalculation error without breaking the chunk batch
      }
    });

    const nextIndex = startIndex + chunkSize;
    const hasMore = nextIndex < allStaff.length;

    return {
      processed: chunk.length,
      hasMore,
      nextIndex
    };
  }

  /**
   * Impact Preview: Simulates how many staff will change status under a new Rule Version before activating.
   */
  public impactPreview(candidateRuleVersion: RuleVersionDTO): ImpactPreviewResult {
    const allStaff = this.staffRepo.findAll(false);
    let readyCount = 0;
    let actionRequiredCount = 0;
    let statusChangeCount = 0;

    allStaff.forEach((staff) => {
      if (staff.WorkGroup === candidateRuleVersion.workGroup) {
        const oldResult = this.evaluateStaff(staff.StaffID);
        const newResult = this.evaluateStaff(staff.StaffID, candidateRuleVersion);

        if (newResult.status === 'ready') readyCount++;
        else actionRequiredCount++;

        if (oldResult.status !== newResult.status) {
          statusChangeCount++;
        }
      }
    });

    return {
      ruleVersionUuid: candidateRuleVersion.versionUuid,
      totalStaffEvaluated: allStaff.length,
      readyCount,
      actionRequiredCount,
      statusChangeCount
    };
  }

  /**
   * Physician Override: Physician overrides assessment status with clinical reasoning.
   */
  public physicianOverride(staffId: string, newStatus: AssessmentResultStatus, reason: string, physicianStaffId: string): AssessmentResultDTO {
    if (!reason || reason.trim().length === 0) {
      throw new Error('Physician Override Error: Must provide clinical reasoning for override.');
    }

    const current = this.evaluateStaff(staffId);
    current.status = newStatus;
    current.isPhysicianOverride = true;
    current.overrideReason = reason;

    this.saveAssessmentResult(current);
    return current;
  }

  private saveAssessmentResult(result: AssessmentResultDTO): void {
    const headers = [
      'ResultUUID', 'StaffID', 'WorkGroup', 'WorkReadinessStatus', 'EvaluatedRuleVersion',
      'CompletenessPercentage', 'PendingRequirementsJson', 'LastEvaluatedAt',
      'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'RecordVersion', 'IsDeleted'
    ];

    const rowObj = {
      ResultUUID: result.assessmentUuid,
      StaffID: result.staffId,
      WorkGroup: result.workGroup,
      WorkReadinessStatus: result.status.toUpperCase(),
      EvaluatedRuleVersion: result.ruleVersionNumber,
      CompletenessPercentage: result.status === 'ready' ? 100 : 50,
      PendingRequirementsJson: JSON.stringify(result.missingRequirements),
      LastEvaluatedAt: result.evaluatedAt,
      CreatedAt: result.evaluatedAt,
      CreatedBy: 'SYSTEM',
      UpdatedAt: result.evaluatedAt,
      UpdatedBy: 'SYSTEM',
      RecordVersion: 1,
      IsDeleted: false
    };

    this.sheetRepo.appendRow('ASSESSMENT_RESULT', headers, rowObj);
  }
}
