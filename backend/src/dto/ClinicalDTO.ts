export type VerificationStatusType = 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED';
export type DataSourceType = 'MANUAL' | 'IMPORT' | 'EVIDENCE';

export interface VaccinationDTO {
  VaccinationUUID: string;
  StaffID: string;
  VaccineCategory: 'HEPATITIS_B' | 'MMR' | 'VARICELLA' | 'TDAP' | 'INFLUENZA';
  DoseNumber: number;
  AdministeredDate: string;
  ManufacturerLot?: string;
  ExpiryDate?: string;
  AdministeredLocation?: string;
  DocumentUUID?: string;
  VerificationStatus: VerificationStatusType;
  Source: DataSourceType;
  CreatedAt: string;
  CreatedBy: string;
  UpdatedAt: string;
  UpdatedBy: string;
  RecordVersion: number;
  IsDeleted: boolean;
}

export interface LabResultDTO {
  LabResultUUID: string;
  StaffID: string;
  LabCategory: 'ANTI_HBS' | 'MEASLES_IGG' | 'VARICELLA_IGG';
  QuantitativeValue?: number;
  Unit?: string;
  QualitativeResult: 'POSITIVE' | 'NEGATIVE' | 'EQUIVOCAL';
  TestDate: string;
  LabName?: string;
  DocumentUUID?: string;
  VerificationStatus: VerificationStatusType;
  Source: DataSourceType;
  CreatedAt: string;
  CreatedBy: string;
  UpdatedAt: string;
  UpdatedBy: string;
  RecordVersion: number;
  IsDeleted: boolean;
}

export interface ChestXrayDTO {
  ChestXrayUUID: string;
  StaffID: string;
  FilmDate: string;
  ResultStatus: 'NORMAL' | 'ABNORMAL_NON_TB' | 'SUSPECTED_TB';
  RadiologistImpression?: string;
  ExpiryDate: string;
  DocumentUUID?: string;
  VerificationStatus: VerificationStatusType;
  Source: DataSourceType;
  CreatedAt: string;
  CreatedBy: string;
  UpdatedAt: string;
  UpdatedBy: string;
  RecordVersion: number;
  IsDeleted: boolean;
}

export interface TbAssessmentDTO {
  TbAssessmentUUID: string;
  StaffID: string;
  ScreeningType: 'TST' | 'IGRA' | 'SYMPTOM_CHECK' | 'LTBI_TREATMENT';
  TstIndurationMm?: number;
  IgraResult?: 'POSITIVE' | 'NEGATIVE' | 'INDETERMINATE';
  LtbiTreatmentStatus?: 'NOT_REQUIRED' | 'IN_PROGRESS' | 'COMPLETED';
  AssessmentDate: string;
  DocumentUUID?: string;
  VerificationStatus: VerificationStatusType;
  Source: DataSourceType;
  CreatedAt: string;
  CreatedBy: string;
  UpdatedAt: string;
  UpdatedBy: string;
  RecordVersion: number;
  IsDeleted: boolean;
}

export interface PhysicianAssessmentDTO {
  MedicalAssessmentUUID: string;
  StaffID: string;
  PhysicianStaffID: string;
  AssessmentDate: string;
  IsMedicalExemption: boolean;
  ExemptionCategory?: string;
  IsMedicalOverride: boolean;
  OverrideReason?: string;
  ClinicalNotes?: string;
  NextReviewDate?: string;
  VerificationStatus: VerificationStatusType;
  CreatedAt: string;
  CreatedBy: string;
  UpdatedAt: string;
  UpdatedBy: string;
  RecordVersion: number;
  IsDeleted: boolean;
}

export class ClinicalValidationSchema {
  private static DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

  public static validateVaccination(dto: Partial<VaccinationDTO>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!dto.StaffID) errors.push('StaffID is required');
    if (!dto.VaccineCategory) errors.push('VaccineCategory is required');
    if (dto.DoseNumber === undefined || dto.DoseNumber < 1) errors.push('DoseNumber must be an integer >= 1');
    if (!dto.AdministeredDate || !this.DATE_REGEX.test(dto.AdministeredDate)) errors.push('AdministeredDate format must be YYYY-MM-DD');
    return { isValid: errors.length === 0, errors };
  }

  public static validateLabResult(dto: Partial<LabResultDTO>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!dto.StaffID) errors.push('StaffID is required');
    if (!dto.LabCategory) errors.push('LabCategory is required');
    if (!dto.QualitativeResult) errors.push('QualitativeResult is required');
    if (!dto.TestDate || !this.DATE_REGEX.test(dto.TestDate)) errors.push('TestDate format must be YYYY-MM-DD');
    return { isValid: errors.length === 0, errors };
  }
}
