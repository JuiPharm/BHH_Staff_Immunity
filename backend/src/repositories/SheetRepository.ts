import { FormulaSanitizer } from '../utils/FormulaSanitizer';

export class SheetRepository {
  private spreadsheetId: string;

  constructor(spreadsheetId?: string) {
    // Read Spreadsheet ID from PropertiesService or fallback to active spreadsheet
    this.spreadsheetId = spreadsheetId || PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || '';
  }

  private getSpreadsheet(): GoogleAppsScript.Spreadsheet.Spreadsheet {
    if (this.spreadsheetId) {
      try {
        return SpreadsheetApp.openById(this.spreadsheetId);
      } catch (err) {
        console.error('Failed to open spreadsheet by ID:', this.spreadsheetId, err);
        return SpreadsheetApp.getActiveSpreadsheet();
      }
    }
    return SpreadsheetApp.getActiveSpreadsheet();
  }

  /**
   * Executes a write operation wrapped in LockService script lock to prevent concurrency race conditions.
   */
  public executeWithLock<T>(action: () => T, timeoutMs = 10000): T {
    const lock = LockService.getScriptLock();
    try {
      const acquired = lock.tryLock(timeoutMs);
      if (!acquired) {
        throw new Error('System is busy processing another transaction. Please try again.');
      }
      return action();
    } finally {
      lock.releaseLock();
    }
  }

  /**
   * Reads all rows from a sheet as objects mapped to header names.
   */
  public getRows(sheetName: string): Record<string, any>[] {
    const ss = this.getSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];

    const values = sheet.getDataRange().getValues();
    if (values.length < 2) return []; // No headers or data

    const headers = values[0].map((h) => String(h).trim());
    const dataRows = values.slice(1);

    return dataRows.map((row) => {
      const item: Record<string, any> = {};
      headers.forEach((header, index) => {
        item[header] = row[index];
      });
      return item;
    });
  }

  /**
   * Appends a new row to a sheet after sanitizing against CSV Formula Injection.
   */
  public appendRow(sheetName: string, headers: string[], rowObject: Record<string, any>): void {
    this.executeWithLock(() => {
      const ss = this.getSpreadsheet();
      let sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        sheet.appendRow(headers);
      }

      const rowValues = headers.map((h) => rowObject[h] ?? '');
      const sanitizedValues = FormulaSanitizer.sanitizeRow(rowValues);
      sheet.appendRow(sanitizedValues);
    });
  }

  /**
   * Updates a row matching a key header with optimistic record version check.
   */
  public updateRow(sheetName: string, keyHeader: string, keyValue: string, newObject: Record<string, any>, currentVersion?: number): boolean {
    return this.executeWithLock(() => {
      const ss = this.getSpreadsheet();
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) return false;

      const values = sheet.getDataRange().getValues();
      if (values.length < 2) return false;

      const headers = values[0].map((h) => String(h).trim());
      const keyColIndex = headers.indexOf(keyHeader);
      const versionColIndex = headers.indexOf('RecordVersion');

      if (keyColIndex === -1) return false;

      for (let r = 1; r < values.length; r++) {
        if (String(values[r][keyColIndex]) === String(keyValue)) {
          // Check Optimistic Locking version if provided
          if (versionColIndex !== -1 && currentVersion !== undefined) {
            const sheetVersion = Number(values[r][versionColIndex]);
            if (sheetVersion !== currentVersion) {
              throw new Error(`Concurrency Conflict: Record has been modified by another user. Current version: ${sheetVersion}`);
            }
            newObject['RecordVersion'] = sheetVersion + 1;
          }

          headers.forEach((header, cIndex) => {
            if (newObject[header] !== undefined) {
              const cellValue = FormulaSanitizer.sanitize(newObject[header]);
              sheet.getRange(r + 1, cIndex + 1).setValue(cellValue);
            }
          });
          return true;
        }
      }
      return false;
    });
  }
}
