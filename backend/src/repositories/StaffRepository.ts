import { SheetRepository } from './SheetRepository';
import { StaffRecordDTO, CreateStaffDTO, UpdateStaffDTO } from '../dto/StaffDTO';
import { CryptoService } from '../services/CryptoService';

export class StaffRepository {
  private sheetRepo: SheetRepository;

  constructor(sheetRepo?: SheetRepository) {
    const clinicalSsId = PropertiesService.getScriptProperties().getProperty('DB_CLINICAL_SPREADSHEET_ID');
    this.sheetRepo = sheetRepo || new SheetRepository(clinicalSsId || undefined);
  }

  /**
   * Maps raw sheet row to StaffRecordDTO.
   */
  private mapRowToDTO(row: Record<string, any>): StaffRecordDTO {
    return {
      RecordUUID: String(row.RecordUUID || row.StaffID),
      StaffID: String(row.StaffID),
      HN: row.HN ? String(row.HN) : undefined,
      FirstName: String(row.FirstName || ''),
      LastName: String(row.LastName || ''),
      DateOfBirth: String(row.DateOfBirth || ''),
      Sex: (row.Sex || row.Gender || 'OTHER') as any,
      BloodGroup: String(row.BloodGroup || ''),
      Address: String(row.Address || ''),
      EmergencyPhone: String(row.EmergencyPhone || row.EmergencyContactPhone || ''),
      Email: String(row.Email || ''),
      DepartmentCode: String(row.DepartmentCode || row.Department || ''),
      WorkGroup: (row.WorkGroup || 'BACKOFFICE') as any,
      EmploymentStatus: (row.EmploymentStatus || row.Status || 'ACTIVE') as any,
      StartDate: String(row.StartDate || row.CreatedAt || ''),
      EndDate: row.EndDate ? String(row.EndDate) : undefined,
      CreatedAt: String(row.CreatedAt || new Date().toISOString()),
      CreatedBy: String(row.CreatedBy || 'SYSTEM'),
      UpdatedAt: String(row.UpdatedAt || new Date().toISOString()),
      UpdatedBy: String(row.UpdatedBy || 'SYSTEM'),
      RecordVersion: Number(row.RecordVersion) || 1,
      IsDeleted: row.IsDeleted === true || String(row.IsDeleted) === 'TRUE'
    };
  }

  /**
   * Finds active staff record by StaffID.
   */
  public findByStaffId(staffId: string, includeDeleted = false): StaffRecordDTO | null {
    const rows = this.sheetRepo.getRows('STAFF');
    const match = rows.find((r) => {
      const isStaffMatch = String(r.StaffID).toUpperCase() === staffId.toUpperCase();
      const isNotDeleted = !r.IsDeleted || String(r.IsDeleted) === 'FALSE';
      return isStaffMatch && (includeDeleted || isNotDeleted);
    });

    return match ? this.mapRowToDTO(match) : null;
  }

  /**
   * Lists all active staff records.
   */
  public findAll(includeDeleted = false): StaffRecordDTO[] {
    const rows = this.sheetRepo.getRows('STAFF');
    return rows
      .map((r) => this.mapRowToDTO(r))
      .filter((dto) => includeDeleted || !dto.IsDeleted);
  }

  /**
   * Inserts a new staff record into STAFF sheet. Wrapped in LockService.
   */
  public createStaff(dto: CreateStaffDTO, createdBy: string): StaffRecordDTO {
    return this.sheetRepo.executeWithLock(() => {
      // Duplicate StaffID Check
      const existing = this.findByStaffId(dto.StaffID, true);
      if (existing) {
        throw new Error(`Duplicate StaffID: รหัสพนักงาน '${dto.StaffID}' มีอยู่ในระบบแล้ว`);
      }

      const now = new Date().toISOString();
      const recordUuid = `staff-${CryptoService.generateUuid()}`;

      const headers = [
        'StaffID', 'HN', 'FirstName', 'LastName', 'DateOfBirth', 'Gender',
        'BloodGroup', 'Department', 'WorkGroup', 'Email', 'Phone',
        'EmergencyContactName', 'EmergencyContactPhone', 'Status',
        'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'RecordVersion', 'IsDeleted'
      ];

      const rowObj = {
        RecordUUID: recordUuid,
        StaffID: dto.StaffID.toUpperCase(),
        HN: dto.HN || '',
        FirstName: dto.FirstName,
        LastName: dto.LastName,
        DateOfBirth: dto.DateOfBirth,
        Gender: dto.Sex,
        BloodGroup: dto.BloodGroup,
        Department: dto.DepartmentCode,
        DepartmentCode: dto.DepartmentCode,
        WorkGroup: dto.WorkGroup,
        Email: dto.Email,
        Phone: dto.EmergencyPhone,
        Address: dto.Address,
        EmergencyContactPhone: dto.EmergencyPhone,
        EmergencyPhone: dto.EmergencyPhone,
        Status: dto.EmploymentStatus,
        EmploymentStatus: dto.EmploymentStatus,
        StartDate: dto.StartDate,
        EndDate: dto.EndDate || '',
        CreatedAt: now,
        CreatedBy: createdBy,
        UpdatedAt: now,
        UpdatedBy: createdBy,
        RecordVersion: 1,
        IsDeleted: false
      };

      this.sheetRepo.appendRow('STAFF', headers, rowObj);
      return this.mapRowToDTO(rowObj);
    });
  }

  /**
   * Updates an existing staff record with optimistic version check.
   */
  public updateStaff(staffId: string, dto: UpdateStaffDTO, updatedBy: string): StaffRecordDTO {
    return this.sheetRepo.executeWithLock(() => {
      const existing = this.findByStaffId(staffId, false);
      if (!existing) {
        throw new Error(`Staff record for '${staffId}' not found or has been deleted.`);
      }

      // Optimistic Versioning Check
      if (existing.RecordVersion !== dto.RecordVersion) {
        throw new Error(`Concurrency Conflict: Record version mismatch. Current: ${existing.RecordVersion}, Provided: ${dto.RecordVersion}`);
      }

      const now = new Date().toISOString();
      const updatedFields: Record<string, any> = {
        UpdatedAt: now,
        UpdatedBy: updatedBy
      };

      if (dto.HN !== undefined) updatedFields['HN'] = dto.HN;
      if (dto.FirstName !== undefined) updatedFields['FirstName'] = dto.FirstName;
      if (dto.LastName !== undefined) updatedFields['LastName'] = dto.LastName;
      if (dto.DateOfBirth !== undefined) updatedFields['DateOfBirth'] = dto.DateOfBirth;
      if (dto.Sex !== undefined) updatedFields['Gender'] = dto.Sex;
      if (dto.BloodGroup !== undefined) updatedFields['BloodGroup'] = dto.BloodGroup;
      if (dto.Address !== undefined) updatedFields['Address'] = dto.Address;
      if (dto.EmergencyPhone !== undefined) updatedFields['EmergencyPhone'] = dto.EmergencyPhone;
      if (dto.Email !== undefined) updatedFields['Email'] = dto.Email;
      if (dto.DepartmentCode !== undefined) updatedFields['Department'] = dto.DepartmentCode;
      if (dto.WorkGroup !== undefined) updatedFields['WorkGroup'] = dto.WorkGroup;
      if (dto.EmploymentStatus !== undefined) updatedFields['Status'] = dto.EmploymentStatus;

      this.sheetRepo.updateRow('STAFF', 'StaffID', staffId, updatedFields, existing.RecordVersion);
      return this.findByStaffId(staffId)!;
    });
  }

  /**
   * Soft deletes a staff record (`IsDeleted = true`).
   */
  public softDeleteStaff(staffId: string, updatedBy: string): boolean {
    return this.sheetRepo.executeWithLock(() => {
      const existing = this.findByStaffId(staffId, false);
      if (!existing) return false;

      const now = new Date().toISOString();
      return this.sheetRepo.updateRow(
        'STAFF',
        'StaffID',
        staffId,
        {
          IsDeleted: true,
          Status: 'RESIGNED',
          UpdatedAt: now,
          UpdatedBy: updatedBy
        },
        existing.RecordVersion
      );
    });
  }
}
