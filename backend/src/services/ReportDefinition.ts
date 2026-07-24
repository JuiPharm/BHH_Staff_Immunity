import { ReportType, ReportColumnDefinition } from '../dto/ExportDTO';
import { UserRole } from '../types';

export class ReportDefinition {
  /**
   * Retrieves column definitions for a report type, filtered by user role.
   */
  public static getColumns(reportType: ReportType, userRole: UserRole): ReportColumnDefinition[] {
    const allCols = this.getAllColumns(reportType);

    // If HR role, filter out sensitive medical columns or mask them
    if (userRole === 'HR') {
      return allCols.filter((col) => !col.isSensitiveMedical);
    }

    return allCols;
  }

  private static getAllColumns(reportType: ReportType): ReportColumnDefinition[] {
    switch (reportType) {
      case 'STAFF_MASTER':
        return [
          { headerName: 'StaffID', fieldKey: 'StaffID' },
          { headerName: 'HN', fieldKey: 'HN' },
          { headerName: 'ชื่อ', fieldKey: 'FirstName' },
          { headerName: 'นามสกุล', fieldKey: 'LastName' },
          { headerName: 'วันเกิด', fieldKey: 'DateOfBirth' },
          { headerName: 'เพศ', fieldKey: 'Sex' },
          { headerName: 'กลุ่มเลือด', fieldKey: 'BloodGroup' },
          { headerName: 'แผนก', fieldKey: 'DepartmentCode' },
          { headerName: 'กลุ่มงาน', fieldKey: 'WorkGroup' },
          { headerName: 'อีเมล', fieldKey: 'Email' },
          { headerName: 'เบอร์ฉุกเฉิน', fieldKey: 'EmergencyPhone' },
          { headerName: 'สถานะการจ้างงาน', fieldKey: 'EmploymentStatus' }
        ];

      case 'READINESS_STATUS':
        return [
          { headerName: 'StaffID', fieldKey: 'StaffID' },
          { headerName: 'ชื่อ-นามสกุล', fieldKey: 'FullName' },
          { headerName: 'กลุ่มงาน', fieldKey: 'WorkGroup' },
          { headerName: 'แผนก', fieldKey: 'DepartmentCode' },
          { headerName: 'สถานะความพร้อม', fieldKey: 'WorkReadinessStatus' },
          { headerName: 'เปอร์เซ็นต์ความสมบูรณ์ (%)', fieldKey: 'CompletenessPercentage' },
          { headerName: 'หมายเหตุการประเมินแพทย์', fieldKey: 'ClinicalNotes', isSensitiveMedical: true }
        ];

      case 'INCOMPLETE_LIST':
        return [
          { headerName: 'StaffID', fieldKey: 'StaffID' },
          { headerName: 'ชื่อ-นามสกุล', fieldKey: 'FullName' },
          { headerName: 'แผนก', fieldKey: 'DepartmentCode' },
          { headerName: 'หมวดหมู่ที่ยังขาด', fieldKey: 'PendingCategory' },
          { headerName: 'สถานะความพร้อม', fieldKey: 'WorkReadinessStatus' }
        ];

      case 'OVERDUE_LIST':
        return [
          { headerName: 'StaffID', fieldKey: 'StaffID' },
          { headerName: 'ชื่อ-นามสกุล', fieldKey: 'FullName' },
          { headerName: 'แผนก', fieldKey: 'DepartmentCode' },
          { headerName: 'รายการเกินกำหนด', fieldKey: 'OverdueItem' },
          { headerName: 'วันละครบรอบ', fieldKey: 'DueDate' }
        ];

      case 'FOLLOWUP_LIST':
        return [
          { headerName: 'StaffID', fieldKey: 'StaffID' },
          { headerName: 'ชื่อ-นามสกุล', fieldKey: 'FullName' },
          { headerName: 'แผนก', fieldKey: 'DepartmentCode' },
          { headerName: 'ประเภทนัดหมาย', fieldKey: 'FollowUpType' },
          { headerName: 'กำหนดการ', fieldKey: 'ScheduledDate' }
        ];

      case 'DEPARTMENT_SUMMARY':
        return [
          { headerName: 'รหัสแผนก', fieldKey: 'DepartmentCode' },
          { headerName: 'จำนวนบุคลากรทั้งหมด', fieldKey: 'TotalStaff' },
          { headerName: 'ครบถ้วนสมบูรณ์ (คน)', fieldKey: 'CompleteCount' },
          { headerName: 'ยังไม่ครบเกณฑ์ (คน)', fieldKey: 'IncompleteCount' },
          { headerName: 'อัตราความสมบูรณ์ (%)', fieldKey: 'CompletionRate' }
        ];

      case 'WORKGROUP_SUMMARY':
        return [
          { headerName: 'กลุ่มงาน', fieldKey: 'WorkGroup' },
          { headerName: 'จำนวนบุคลากรทั้งหมด', fieldKey: 'TotalStaff' },
          { headerName: 'ครบถ้วนสมบูรณ์ (คน)', fieldKey: 'CompleteCount' },
          { headerName: 'อัตราความสมบูรณ์ (%)', fieldKey: 'CompletionRate' }
        ];

      case 'INDIVIDUAL_HISTORY':
        return [
          { headerName: 'StaffID', fieldKey: 'StaffID' },
          { headerName: 'หมวดหมู่', fieldKey: 'Category' },
          { headerName: 'ประเภทรายการ', fieldKey: 'RecordType' },
          { headerName: 'วันรับบริการ/วันตรวจ', fieldKey: 'AdministeredDate' },
          { headerName: 'ค่าเชิงปริมาณ/Titer', fieldKey: 'QuantitativeValue', isSensitiveMedical: true },
          { headerName: 'ผลการอนุมัติ', fieldKey: 'VerificationStatus' }
        ];

      case 'AUDIT_REPORT':
        return [
          { headerName: 'LogUUID', fieldKey: 'LogUUID' },
          { headerName: 'เวลาทำรายการ', fieldKey: 'Timestamp' },
          { headerName: 'ผู้ทำรายการ', fieldKey: 'StaffID' },
          { headerName: 'บทบาท', fieldKey: 'Role' },
          { headerName: 'กิจกรรม', fieldKey: 'Action' },
          { headerName: 'ทรัพยากรเป้าหมาย', fieldKey: 'TargetResource' },
          { headerName: 'รายละเอียด', fieldKey: 'DetailsJson' }
        ];

      default:
        return [];
    }
  }
}
