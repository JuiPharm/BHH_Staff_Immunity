export interface ApiResponse<T = any> {
  success: boolean;
  requestId: string;
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: any[];
  } | null;
}

export class ResponseHelper {
  public static success<T>(data: T, requestId: string): GoogleAppsScript.Content.TextOutput {
    const response: ApiResponse<T> = {
      success: true,
      requestId,
      data,
      error: null
    };
    return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
  }

  public static error(code: string, message: string, requestId: string, statusCode = 400): GoogleAppsScript.Content.TextOutput {
    const response: ApiResponse = {
      success: false,
      requestId,
      data: null,
      error: {
        code,
        message, // Safe user-facing message without exposing stack traces or Sheet/Drive IDs
        details: []
      }
    };
    return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
  }
}
