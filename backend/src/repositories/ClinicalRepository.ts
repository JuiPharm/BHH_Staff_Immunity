import { SheetRepository } from './SheetRepository';
import { VaccinationDTO, LabResultDTO, ChestXrayDTO, TbAssessmentDTO, PhysicianAssessmentDTO } from '../dto/ClinicalDTO';
import { CryptoService } from '../services/CryptoService';

export class ClinicalRepository {
  private sheetRepo: SheetRepository;

  constructor(sheetRepo?: SheetRepository) {
    const clinicalSsId = PropertiesService.getScriptProperties().getProperty('DB_CLINICAL_SPREADSHEET_ID');
    this.sheetRepo = sheetRepo || new SheetRepository(clinicalSsId || undefined);
  }

  // --- VACCINATION METHODS ---
  public findVaccinationsByStaffId(staffId: string): VaccinationDTO[] {
    const rows = this.sheetRepo.getRows('VACCINATION');
    return rows
      .filter((r) => String(r.StaffID).toUpperCase() === staffId.toUpperCase() && (!r.IsDeleted || String(r.IsDeleted) === 'FALSE'))
      .map((r) => ({
        VaccinationUUID: String(r.VaccinationUUID),
        StaffID: String(r.StaffID),
        VaccineCategory: String(r.VaccineCategory) as any,
        DoseNumber: Number(r.DoseNumber) || 1,
        AdministeredDate: String(r.AdministeredDate),
        ManufacturerLot: r.ManufacturerLot ? String(r.ManufacturerLot) : undefined,
        ExpiryDate: r.ExpiryDate ? String(r.ExpiryDate) : undefined,
        AdministeredLocation: r.AdministeredLocation ? String(r.AdministeredLocation) : undefined,
        DocumentUUID: r.DocumentUUID ? String(r.DocumentUUID) : undefined,
        VerificationStatus: (r.VerificationStatus || 'SUBMITTED') as any,
        Source: (r.Source || 'MANUAL') as any,
        CreatedAt: String(r.CreatedAt),
        CreatedBy: String(r.CreatedBy),
        UpdatedAt: String(r.UpdatedAt),
        UpdatedBy: String(r.UpdatedBy),
        RecordVersion: Number(r.RecordVersion) || 1,
        IsDeleted: r.IsDeleted === true || String(r.IsDeleted) === 'TRUE'
      }));
  }

  public createVaccination(dto: Partial<VaccinationDTO>, createdBy: string): VaccinationDTO {
    return this.sheetRepo.executeWithLock(() => {
      // Duplicate Dose Check
      const existing = this.findVaccinationsByStaffId(dto.StaffID!);
      const isDuplicate = existing.some((v) => v.VaccineCategory === dto.VaccineCategory && v.DoseNumber === dto.DoseNumber);
      if (isDuplicate) {
        throw new Error(`Duplicate Record: รายการวัคซีน ${dto.VaccineCategory} เข็มที่ ${dto.DoseNumber} มีอยู่ในระบบแล้ว`);
      }

      const now = new Date().toISOString();
      const uuid = `vac-${CryptoService.generateUuid()}`;

      const headers = [
        'VaccinationUUID', 'StaffID', 'VaccineCategory', 'DoseNumber',
        'AdministeredDate', 'ManufacturerLot', 'ExpiryDate', 'AdministeredLocation',
        'DocumentUUID', 'VerificationStatus', 'Source',
        'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'RecordVersion', 'IsDeleted'
      ];

      const rowObj = {
        VaccinationUUID: uuid,
        StaffID: dto.StaffID!.toUpperCase(),
        VaccineCategory: dto.VaccineCategory,
        DoseNumber: dto.DoseNumber || 1,
        AdministeredDate: dto.AdministeredDate,
        ManufacturerLot: dto.ManufacturerLot || '',
        ExpiryDate: dto.ExpiryDate || '',
        AdministeredLocation: dto.AdministeredLocation || '',
        DocumentUUID: dto.DocumentUUID || '',
        VerificationStatus: dto.VerificationStatus || 'SUBMITTED',
        Source: dto.Source || 'MANUAL',
        CreatedAt: now,
        CreatedBy: createdBy,
        UpdatedAt: now,
        UpdatedBy: createdBy,
        RecordVersion: 1,
        IsDeleted: false
      };

      this.sheetRepo.appendRow('VACCINATION', headers, rowObj);
      return rowObj as any;
    });
  }

  public updateVaccinationStatus(uuid: string, status: string, updatedBy: string): boolean {
    return this.sheetRepo.executeWithLock(() => {
      const now = new Date().toISOString();
      return this.sheetRepo.updateRow('VACCINATION', 'VaccinationUUID', uuid, {
        VerificationStatus: status,
        UpdatedAt: now,
        UpdatedBy: updatedBy
      });
    });
  }

  // --- LAB RESULT METHODS ---
  public findLabResultsByStaffId(staffId: string): LabResultDTO[] {
    const rows = this.sheetRepo.getRows('LAB_RESULT');
    return rows
      .filter((r) => String(r.StaffID).toUpperCase() === staffId.toUpperCase() && (!r.IsDeleted || String(r.IsDeleted) === 'FALSE'))
      .map((r) => ({
        LabResultUUID: String(r.LabResultUUID),
        StaffID: String(r.StaffID),
        LabCategory: String(r.LabCategory) as any,
        QuantitativeValue: r.QuantitativeValue !== undefined ? Number(r.QuantitativeValue) : undefined,
        Unit: r.Unit ? String(r.Unit) : undefined,
        QualitativeResult: String(r.QualitativeResult) as any,
        TestDate: String(r.TestDate),
        LabName: r.LabName ? String(r.LabName) : undefined,
        DocumentUUID: r.DocumentUUID ? String(r.DocumentUUID) : undefined,
        VerificationStatus: (r.VerificationStatus || 'SUBMITTED') as any,
        Source: (r.Source || 'MANUAL') as any,
        CreatedAt: String(r.CreatedAt),
        CreatedBy: String(r.CreatedBy),
        UpdatedAt: String(r.UpdatedAt),
        UpdatedBy: String(r.UpdatedBy),
        RecordVersion: Number(r.RecordVersion) || 1,
        IsDeleted: r.IsDeleted === true || String(r.IsDeleted) === 'TRUE'
      }));
  }

  public createLabResult(dto: Partial<LabResultDTO>, createdBy: string): LabResultDTO {
    return this.sheetRepo.executeWithLock(() => {
      const now = new Date().toISOString();
      const uuid = `lab-${CryptoService.generateUuid()}`;

      const headers = [
        'LabResultUUID', 'StaffID', 'LabCategory', 'QuantitativeValue', 'Unit',
        'QualitativeResult', 'TestDate', 'LabName', 'DocumentUUID', 'VerificationStatus', 'Source',
        'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'RecordVersion', 'IsDeleted'
      ];

      const rowObj = {
        LabResultUUID: uuid,
        StaffID: dto.StaffID!.toUpperCase(),
        LabCategory: dto.LabCategory,
        QuantitativeValue: dto.QuantitativeValue ?? '',
        Unit: dto.Unit || '',
        QualitativeResult: dto.QualitativeResult,
        TestDate: dto.TestDate,
        LabName: dto.LabName || '',
        DocumentUUID: dto.DocumentUUID || '',
        VerificationStatus: dto.VerificationStatus || 'SUBMITTED',
        Source: dto.Source || 'MANUAL',
        CreatedAt: now,
        CreatedBy: createdBy,
        UpdatedAt: now,
        UpdatedBy: createdBy,
        RecordVersion: 1,
        IsDeleted: false
      };

      this.sheetRepo.appendRow('LAB_RESULT', headers, rowObj);
      return rowObj as any;
    });
  }
}
