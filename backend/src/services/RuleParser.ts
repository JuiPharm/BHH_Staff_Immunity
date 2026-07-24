import { RuleCondition } from '../dto/RuleDTO';

export class RuleParser {
  /**
   * Parses JSON string into RuleCondition object.
   */
  public static parse(jsonString: string): RuleCondition {
    if (!jsonString || jsonString.trim().length === 0) {
      throw new Error('Rule Parser Error: Empty rule JSON expression string');
    }
    try {
      const parsed = JSON.parse(jsonString);
      return parsed as RuleCondition;
    } catch (e: any) {
      throw new Error(`Rule Parser JSON Error: Invalid JSON syntax - ${e.message}`);
    }
  }

  /**
   * Serializes RuleCondition object back to JSON string.
   */
  public static stringify(condition: RuleCondition): string {
    return JSON.stringify(condition, null, 2);
  }
}
