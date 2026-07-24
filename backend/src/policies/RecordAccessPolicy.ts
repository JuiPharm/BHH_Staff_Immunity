import { UserRole } from '../types';

export class RecordAccessPolicy {
  /**
   * Checks if a user has access to a specific staff member's record (IDOR Protection).
   */
  public static canAccessRecord(userRole: UserRole, userStaffId: string, targetStaffId: string): boolean {
    // Elevated Roles can access any staff record
    if (userRole === 'INFECTION_CONTROL' || userRole === 'PHYSICIAN' || userRole === 'HR') {
      return true;
    }

    // Data Owner can ONLY access their own StaffID record
    if (userRole === 'DATA_OWNER') {
      return userStaffId.toUpperCase() === targetStaffId.toUpperCase();
    }

    return false;
  }

  /**
   * Checks if a user can edit/modify a staff member's health record.
   */
  public static canModifyHealthRecord(userRole: UserRole): boolean {
    // Only Infection Control & Physician can modify health records
    return userRole === 'INFECTION_CONTROL' || userRole === 'PHYSICIAN';
  }
}
