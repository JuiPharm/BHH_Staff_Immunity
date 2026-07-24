export class FormulaSanitizer {
  /**
   * Prevents Formula Injection vulnerability when writing user inputs into Google Sheets.
   * Prepends a single quote `'` if the cell text starts with '=', '+', '-', '@', '\t', '\r'.
   */
  public static sanitize(value: any): any {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (
      trimmed.startsWith('=') ||
      trimmed.startsWith('+') ||
      trimmed.startsWith('-') ||
      trimmed.startsWith('@') ||
      trimmed.startsWith('\t') ||
      trimmed.startsWith('\r')
    ) {
      return `'${value}`;
    }
    return value;
  }

  public static sanitizeRow(row: any[]): any[] {
    return row.map((cell) => FormulaSanitizer.sanitize(cell));
  }
}
