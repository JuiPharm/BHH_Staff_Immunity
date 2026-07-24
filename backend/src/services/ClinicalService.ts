import { ClinicalRepository } from '../repositories/ClinicalRepository';
import { RuleEngineService, HealthRecordSummary } from './RuleEngineService';
import { VaccinationDTO, LabResultDTO, ClinicalValidationSchema } from '../dto/ClinicalDTO';

export class ClinicalService {
  private repo: ClinicalRepository;

  constructor(repo?: ClinicalRepository) {
    this.repo = repo || new ClinicalRepository();
  }

  /**
   * Retrieves all verified clinical records for a staff member.
   */
  public getStaffClinicalHistory(staffId: string): { vaccinations: VaccinationDTO[]; labResults: LabResultDTO[] } {
    const vaccinations = this.repo.findVaccinationsByStaffId(staffId);
    const labResults = this.repo.findLabResultsByStaffId(staffId);
    return { vaccinations, labResults };
  }

  /**
   * Records a new vaccination dose and triggers Rule Engine evaluation if verified.
   */
  public addVaccination(dto: Partial<VaccinationDTO>, createdBy: string): VaccinationDTO {
    const validation = ClinicalValidationSchema.validateVaccination(dto);
    if (!validation.isValid) {
      throw new Error(`Validation Error: ${validation.errors.join(', ')}`);
    }

    const created = this.repo.createVaccination(dto, createdBy);

    // If inserted as VERIFIED, trigger decoupled Rule Engine recalculation
    if (created.VerificationStatus === 'VERIFIED') {
      this.reevaluateStaffReadiness(dto.StaffID!);
    }

    return created;
  }

  /**
   * Records a new Lab result.
   */
  public addLabResult(dto: Partial<LabResultDTO>, createdBy: string): LabResultDTO {
    const validation = ClinicalValidationSchema.validateLabResult(dto);
    if (!validation.isValid) {
      throw new Error(`Validation Error: ${validation.errors.join(', ')}`);
    }

    const created = this.repo.createLabResult(dto, createdBy);

    if (created.VerificationStatus === 'VERIFIED') {
      this.reevaluateStaffReadiness(dto.StaffID!);
    }

    return created;
  }

  /**
   * Verifies or Rejects a vaccination record, then triggers Rule Engine Service.
   */
  public verifyVaccination(vaccinationUuid: string, staffId: string, status: 'VERIFIED' | 'REJECTED', verifiedBy: string): boolean {
    const success = this.repo.updateVaccinationStatus(vaccinationUuid, status, verifiedBy);
    if (success && status === 'VERIFIED') {
      // Decoupled Rule Engine Trigger
      this.reevaluateStaffReadiness(staffId);
    }
    return success;
  }

  /**
   * Decoupled Rule Engine Evaluator Trigger
   */
  public reevaluateStaffReadiness(staffId: string): void {
    const { vaccinations, labResults } = this.getStaffClinicalHistory(staffId);

    const summaries: HealthRecordSummary[] = [
      ...vaccinations.map((v) => ({
        category: v.VaccineCategory,
        isVerified: v.VerificationStatus === 'VERIFIED',
        administeredDate: v.AdministeredDate,
        expiryDate: v.ExpiryDate
      })),
      ...labResults.map((l) => ({
        category: l.LabCategory,
        isVerified: l.VerificationStatus === 'VERIFIED',
        administeredDate: l.TestDate
      }))
    ];

    // Evaluate readiness dynamically without hardcoding rules here
    RuleEngineService.evaluateReadiness('CLINICAL', summaries);
  }
}
