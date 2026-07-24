import { StaffRepository } from '../repositories/StaffRepository';
import {
  StaffRecordDTO,
  CreateStaffDTO,
  UpdateStaffDTO,
  StaffSearchQueryDTO,
  PaginatedResponse,
  StaffValidationSchema
} from '../dto/StaffDTO';

export class StaffService {
  private staffRepo: StaffRepository;

  constructor(staffRepo?: StaffRepository) {
    this.staffRepo = staffRepo || new StaffRepository();
  }

  /**
   * Retrieves single staff record by StaffID.
   */
  public getStaffByStaffId(staffId: string): StaffRecordDTO | null {
    return this.staffRepo.findByStaffId(staffId);
  }

  /**
   * Searches, filters, and paginates staff records.
   */
  public searchStaff(query: StaffSearchQueryDTO): PaginatedResponse<StaffRecordDTO> {
    const allRecords = this.staffRepo.findAll(false);
    const { keyword, departmentCode, workGroup, employmentStatus, page = 1, limit = 10 } = query;

    // Filter Logic
    const filtered = allRecords.filter((s) => {
      if (keyword) {
        const kw = keyword.toLowerCase();
        const matchesKw =
          s.StaffID.toLowerCase().includes(kw) ||
          s.FirstName.toLowerCase().includes(kw) ||
          s.LastName.toLowerCase().includes(kw) ||
          s.Email.toLowerCase().includes(kw) ||
          s.DepartmentCode.toLowerCase().includes(kw);

        if (!matchesKw) return false;
      }

      if (departmentCode && s.DepartmentCode.toUpperCase() !== departmentCode.toUpperCase()) {
        return false;
      }

      if (workGroup && s.WorkGroup !== workGroup) {
        return false;
      }

      if (employmentStatus && s.EmploymentStatus !== employmentStatus) {
        return false;
      }

      return true;
    });

    // Pagination Logic
    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / limit) || 1;
    const validPage = Math.max(1, Math.min(page, totalPages));
    const startIndex = (validPage - 1) * limit;
    const paginatedItems = filtered.slice(startIndex, startIndex + limit);

    return {
      items: paginatedItems,
      totalCount,
      page: validPage,
      limit,
      totalPages
    };
  }

  /**
   * Creates new staff record with validation & duplicate check.
   */
  public createStaff(dto: CreateStaffDTO, createdBy: string): StaffRecordDTO {
    const validation = StaffValidationSchema.validateCreate(dto);
    if (!validation.isValid) {
      throw new Error(`Validation Error: ${validation.errors.join(', ')}`);
    }

    return this.staffRepo.createStaff(dto, createdBy);
  }

  /**
   * Updates an existing staff record.
   */
  public updateStaff(staffId: string, dto: UpdateStaffDTO, updatedBy: string): StaffRecordDTO {
    if (dto.Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dto.Email)) {
      throw new Error('Validation Error: รูปแบบอีเมลไม่ถูกต้อง');
    }
    if (dto.WorkGroup && !['CLINICAL', 'FRONTLINE', 'BACKOFFICE'].includes(dto.WorkGroup)) {
      throw new Error('Validation Error: กลุ่มงานต้องเป็น CLINICAL, FRONTLINE หรือ BACKOFFICE');
    }

    return this.staffRepo.updateStaff(staffId, dto, updatedBy);
  }

  /**
   * Soft deletes a staff record.
   */
  public deleteStaff(staffId: string, deletedBy: string): boolean {
    return this.staffRepo.softDeleteStaff(staffId, deletedBy);
  }
}
