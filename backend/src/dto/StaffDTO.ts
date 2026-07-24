export type SexType = 'MALE' | 'FEMALE' | 'OTHER';
export type WorkGroupType = 'CLINICAL' | 'FRONTLINE' | 'BACKOFFICE';
export type EmploymentStatusType = 'ACTIVE' | 'RESIGNED' | 'SUSPENDED';

export interface StaffRecordDTO {
  RecordUUID: string;
  StaffID: string;
  HN?: string;
  FirstName: string;
  LastName: string;
  DateOfBirth: string;
  Sex: SexType;
  BloodGroup: string;
  Address: string;
  EmergencyPhone: string;
  Email: string;
  DepartmentCode: string;
  WorkGroup: WorkGroupType;
  EmploymentStatus: EmploymentStatusType;
  StartDate: string;
  EndDate?: string;
  CreatedAt: string;
  CreatedBy: string;
  UpdatedAt: string;
  UpdatedBy: string;
  RecordVersion: number;
  IsDeleted: boolean;
}

export interface CreateStaffDTO {
  StaffID: string;
  HN?: string;
  FirstName: string;
  LastName: string;
  DateOfBirth: string;
  Sex: SexType;
  BloodGroup: string;
  Address: string;
  EmergencyPhone: string;
  Email: string;
  DepartmentCode: string;
  WorkGroup: WorkGroupType;
  EmploymentStatus: EmploymentStatusType;
  StartDate: string;
  EndDate?: string;
}

export interface UpdateStaffDTO {
  HN?: string;
  FirstName?: string;
  LastName?: string;
  DateOfBirth?: string;
  Sex?: SexType;
  BloodGroup?: string;
  Address?: string;
  EmergencyPhone?: string;
  Email?: string;
  DepartmentCode?: string;
  WorkGroup?: WorkGroupType;
  EmploymentStatus?: EmploymentStatusType;
  StartDate?: string;
  EndDate?: string;
  RecordVersion: number;
}

export interface StaffSearchQueryDTO {
  keyword?: string;
  departmentCode?: string;
  workGroup?: WorkGroupType;
  employmentStatus?: EmploymentStatusType;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class StaffValidationSchema {
  private static EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private static STAFF_ID_REGEX = /^[A-Z0-9]{4,10}$/;
  private static DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

  public static validateCreate(dto: CreateStaffDTO): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!dto.StaffID || !this.STAFF_ID_REGEX.test(dto.StaffID.toUpperCase())) {
      errors.push('รหัสพนักงาน (StaffID) ต้องเป็นอักษรภาษาอังกฤษหรือตัวเลข 4-10 ตัวอักษร');
    }
    if (!dto.FirstName || dto.FirstName.trim().length === 0) {
      errors.push('ชื่อ (FirstName) เป็นข้อมูลจำเป็น');
    }
    if (!dto.LastName || dto.LastName.trim().length === 0) {
      errors.push('นามสกุล (LastName) เป็นข้อมูลจำเป็น');
    }
    if (!dto.Email || !this.EMAIL_REGEX.test(dto.Email)) {
      errors.push('รูปแบบอีเมลไม่ถูกต้อง');
    }
    if (!dto.DateOfBirth || !this.DATE_REGEX.test(dto.DateOfBirth)) {
      errors.push('รูปแบบวันเกิดต้องเป็น YYYY-MM-DD');
    }
    if (!dto.WorkGroup || !['CLINICAL', 'FRONTLINE', 'BACKOFFICE'].includes(dto.WorkGroup)) {
      errors.push('กลุ่มงาน (WorkGroup) ต้องเป็น CLINICAL, FRONTLINE หรือ BACKOFFICE');
    }
    if (!dto.Sex || !['MALE', 'FEMALE', 'OTHER'].includes(dto.Sex)) {
      errors.push('เพศ (Sex) ต้องเป็น MALE, FEMALE หรือ OTHER');
    }

    return { isValid: errors.length === 0, errors };
  }
}
