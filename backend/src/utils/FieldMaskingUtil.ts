import { UserRole } from '../types';

export class FieldMaskingUtil {
  public static MASKED_PLACEHOLDER = '[RESTRICTED_HR_MASKED]';

  /**
   * Masks sensitive clinical fields if user role is HR.
   */
  public static maskHealthRecord(record: Record<string, any>, userRole: UserRole): Record<string, any> {
    if (userRole !== 'HR') {
      return record; // Elevated & Data Owner see unmasked
    }

    const maskedRecord = { ...record };

    // Mask deep medical lab titers & values
    if (maskedRecord.QuantitativeValue !== undefined) {
      maskedRecord.QuantitativeValue = this.MASKED_PLACEHOLDER;
    }
    if (maskedRecord.NumericValue !== undefined) {
      maskedRecord.NumericValue = this.MASKED_PLACEHOLDER;
    }

    // Mask CXR impression
    if (maskedRecord.RadiologistImpression !== undefined) {
      maskedRecord.RadiologistImpression = this.MASKED_PLACEHOLDER;
    }

    // Mask Clinical Notes & Override Reasons
    if (maskedRecord.ClinicalNotes !== undefined) {
      maskedRecord.ClinicalNotes = this.MASKED_PLACEHOLDER;
    }
    if (maskedRecord.OverrideReason !== undefined) {
      maskedRecord.OverrideReason = this.MASKED_PLACEHOLDER;
    }
    if (maskedRecord.ExemptionCategory !== undefined) {
      maskedRecord.ExemptionCategory = this.MASKED_PLACEHOLDER;
    }
    if (maskedRecord.RejectionReason !== undefined) {
      maskedRecord.RejectionReason = this.MASKED_PLACEHOLDER;
    }

    return maskedRecord;
  }

  /**
   * Masks an array of health records for HR.
   */
  public static maskHealthRecords(records: Record<string, any>[], userRole: UserRole): Record<string, any>[] {
    return records.map((r) => this.maskHealthRecord(r, userRole));
  }
}
