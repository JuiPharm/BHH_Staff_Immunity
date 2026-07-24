export class AuditRedactionUtility {
  private static REDACTED_VALUE = '[REDACTED]';
  private static SENSITIVE_KEYS = [
    'password', 'pwd', 'oldpassword', 'newpassword', 'salt', 'passwordsalt',
    'token', 'tokenhash', 'sessiontoken', 'authorization', 'bearer', 'secret'
  ];

  /**
   * Redacts sensitive properties from metadata object before audit logging.
   */
  public static redactObject(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.redactObject(item));
    }

    const redacted: Record<string, any> = {};

    Object.keys(obj).forEach((key) => {
      const lowerKey = key.toLowerCase();
      if (this.SENSITIVE_KEYS.some((sensitive) => lowerKey.includes(sensitive))) {
        redacted[key] = this.REDACTED_VALUE;
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        redacted[key] = this.redactObject(obj[key]);
      } else {
        redacted[key] = obj[key];
      }
    });

    return redacted;
  }

  /**
   * Redacts metadata object and converts to clean JSON string.
   */
  public static redactToJson(obj: any): string {
    const cleanObj = this.redactObject(obj || {});
    return JSON.stringify(cleanObj);
  }
}
