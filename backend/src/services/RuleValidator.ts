import { RuleCondition, RuleOperator } from '../dto/RuleDTO';
import { RuleParser } from './RuleParser';

export class RuleValidator {
  private static VALID_OPERATORS: RuleOperator[] = [
    'equals', 'not_equals', 'greater_than', 'greater_than_or_equal',
    'less_than', 'less_than_or_equal', 'in', 'not_in', 'exists',
    'date_within_years', 'date_older_than_years', 'all', 'any'
  ];

  /**
   * Validates rule JSON string or RuleCondition object.
   */
  public static validate(ruleInput: string | RuleCondition): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    let condition: RuleCondition;

    if (typeof ruleInput === 'string') {
      try {
        condition = RuleParser.parse(ruleInput);
      } catch (e: any) {
        return { isValid: false, errors: [e.message] };
      }
    } else {
      condition = ruleInput;
    }

    // Circular Reference Detection (Depth limit)
    const circularCheck = this.detectCircularLoop(condition, new Set<any>(), 0);
    if (!circularCheck.isValid) {
      errors.push(circularCheck.error!);
    }

    // Validate Operators
    this.validateConditionNode(condition, errors);

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private static validateConditionNode(node: RuleCondition, errors: string[]): void {
    if (!node || typeof node !== 'object') {
      errors.push('Rule node must be an object');
      return;
    }

    if (!this.VALID_OPERATORS.includes(node.operator)) {
      errors.push(`Invalid Operator: '${node.operator}' is not supported`);
    }

    if (node.operator === 'all' || node.operator === 'any') {
      if (!Array.isArray(node.conditions) || node.conditions.length === 0) {
        errors.push(`Operator '${node.operator}' requires a non-empty 'conditions' array`);
      } else {
        node.conditions.forEach((child) => this.validateConditionNode(child, errors));
      }
    } else {
      if (!node.field) {
        errors.push(`Operator '${node.operator}' requires a 'field' property`);
      }
    }
  }

  /**
   * Detects circular references or excessive recursion depth (> 10 levels).
   */
  private static detectCircularLoop(node: any, visited: Set<any>, depth: number): { isValid: boolean; error?: string } {
    if (depth > 10) {
      return { isValid: false, error: 'Circular Condition Error: Rule nesting depth exceeded limit (Max 10 levels)' };
    }
    if (visited.has(node)) {
      return { isValid: false, error: 'Circular Condition Error: Circular reference loop detected in nested rule' };
    }

    visited.add(node);
    if (node && typeof node === 'object' && Array.isArray(node.conditions)) {
      for (const child of node.conditions) {
        const check = this.detectCircularLoop(child, new Set(visited), depth + 1);
        if (!check.isValid) return check;
      }
    }
    return { isValid: true };
  }
}
