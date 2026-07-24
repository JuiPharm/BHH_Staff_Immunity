import { RuleCondition } from '../dto/RuleDTO';

export class RuleEvaluator {
  /**
   * Evaluates a staff record dataset against a RuleCondition.
   */
  public static evaluate(condition: RuleCondition, recordData: Record<string, any>): boolean {
    const op = condition.operator;

    if (op === 'all') {
      if (!condition.conditions || condition.conditions.length === 0) return true;
      return condition.conditions.every((child) => this.evaluate(child, recordData));
    }

    if (op === 'any') {
      if (!condition.conditions || condition.conditions.length === 0) return false;
      return condition.conditions.some((child) => this.evaluate(child, recordData));
    }

    const fieldValue = recordData[condition.field || ''];
    const targetValue = condition.value;

    switch (op) {
      case 'equals':
        return String(fieldValue).toLowerCase() === String(targetValue).toLowerCase();

      case 'not_equals':
        return String(fieldValue).toLowerCase() !== String(targetValue).toLowerCase();

      case 'greater_than':
        return Number(fieldValue) > Number(targetValue);

      case 'greater_than_or_equal':
        return Number(fieldValue) >= Number(targetValue);

      case 'less_than':
        return Number(fieldValue) < Number(targetValue);

      case 'less_than_or_equal':
        return Number(fieldValue) <= Number(targetValue);

      case 'in':
        if (Array.isArray(targetValue)) {
          return targetValue.map((v) => String(v).toLowerCase()).includes(String(fieldValue).toLowerCase());
        }
        return false;

      case 'not_in':
        if (Array.isArray(targetValue)) {
          return !targetValue.map((v) => String(v).toLowerCase()).includes(String(fieldValue).toLowerCase());
        }
        return true;

      case 'exists':
        return fieldValue !== undefined && fieldValue !== null && String(fieldValue).trim() !== '';

      case 'date_within_years': {
        if (!fieldValue) return false;
        const recordDate = new Date(fieldValue).getTime();
        const now = new Date().getTime();
        const yearsInMs = Number(targetValue) * 365.25 * 24 * 60 * 60 * 1000;
        return now - recordDate <= yearsInMs;
      }

      case 'date_older_than_years': {
        if (!fieldValue) return true; // Expired/older
        const recordDate = new Date(fieldValue).getTime();
        const now = new Date().getTime();
        const yearsInMs = Number(targetValue) * 365.25 * 24 * 60 * 60 * 1000;
        return now - recordDate > yearsInMs;
      }

      default:
        return false;
    }
  }
}
