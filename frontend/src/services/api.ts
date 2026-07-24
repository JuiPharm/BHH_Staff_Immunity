import { ApiResponse, UserSession, StaffMaster, HealthRecord, PhysicianAssessment, AuditLogEntry } from '../types';

const SESSION_STORAGE_KEY = 'bdms_session';

export const getStoredSession = (): UserSession | null => {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const setStoredSession = (session: UserSession | null) => {
  if (session) {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }
};

export const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbx4PX8yYrTZi49I_aHmv1EFnaLMCMjI0MdIOfEYVpZef2HtH5-o-TSkCwOkSThq0ND6/exec';

/**
 * Generic API Caller for Google Apps Script
 */
async function callApi<T = any>(action: string, extraPayload: any = {}): Promise<ApiResponse<T>> {
  const session = getStoredSession();
  
  const payload = {
    action,
    role: session?.role || 'DATA_OWNER',
    staffId: session?.staffId || 'UNKNOWN',
    ...extraPayload
  };

  try {
    const response = await fetch(GAS_API_URL, {
      method: 'POST',
      // GAS requires text/plain for CORS without preflight
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data: ApiResponse<T> = await response.json();
    return data;
  } catch (error: any) {
    console.error('API call failed:', error);
    return {
      success: false,
      requestId: 'local-err',
      data: null,
      error: {
        code: 'NETWORK_ERROR',
        message: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ หรือพบข้อผิดพลาดที่ไม่คาดคิด'
      }
    };
  }
}

export const apiService = {
  // Authentication
  login: async (staffId: string, password: string): Promise<ApiResponse<UserSession>> => {
    const res = await callApi<UserSession>('login', { staffId, password });
    if (res.success && res.data) {
      setStoredSession(res.data);
    }
    return res;
  },

  changePassword: async (staffId: string, oldPassword: string, newPassword: string): Promise<ApiResponse<boolean>> => {
    const res = await callApi<boolean>('changePassword', { staffId, oldPassword, newPassword });
    if (res.success) {
      const currentSession = getStoredSession();
      if (currentSession && currentSession.staffId === staffId) {
        currentSession.mustChangePassword = false;
        setStoredSession(currentSession);
      }
    }
    return res;
  },

  // Staff Master List
  getStaffList: async (): Promise<ApiResponse<StaffMaster[]>> => {
    return callApi<StaffMaster[]>('getStaffList', { query: {} });
  },

  // Add/Upload Health Record (Bulk for Import Modal)
  createStaff: async (staffData: any): Promise<ApiResponse<StaffMaster>> => {
    return callApi<StaffMaster>('createStaff', { staffData });
  },

  // Health Records for Staff
  getHealthRecords: async (staffId: string): Promise<ApiResponse<HealthRecord[]>> => {
    return callApi<HealthRecord[]>('getHealthRecords', { targetStaffId: staffId });
  },

  // --- Below Actions might not be fully implemented in GAS yet ---

  createHealthRecord: async (recordData: Partial<HealthRecord>, file?: File): Promise<ApiResponse<HealthRecord>> => {
    // Note: File upload to GAS requires converting file to Base64
    let base64Data = '';
    let mimeType = '';
    let fileName = '';

    if (file) {
      fileName = file.name;
      mimeType = file.type;
      base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // get base64 part
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    return callApi<HealthRecord>('createHealthRecord', { recordData, fileData: base64Data, fileName, mimeType });
  },

  verifyRecord: async (recordUuid: string, status: 'VERIFIED' | 'REJECTED', reason?: string): Promise<ApiResponse<HealthRecord>> => {
    return callApi<HealthRecord>('verifyRecord', { recordUuid, status, reason });
  },

  addPhysicianAssessment: async (assessment: Partial<PhysicianAssessment>): Promise<ApiResponse<PhysicianAssessment>> => {
    return callApi<PhysicianAssessment>('addPhysicianAssessment', { assessment });
  },

  getAuditLogs: async (): Promise<ApiResponse<AuditLogEntry[]>> => {
    return callApi<AuditLogEntry[]>('getAuditLogs');
  },

  // Dashboard APIs
  getCompletenessDashboard: async (_role: string): Promise<ApiResponse<any>> => {
    return callApi<any>('getCompletenessDashboard');
  },

  getFollowUpDashboard: async (_role: string): Promise<ApiResponse<any>> => {
    return callApi<any>('getFollowUpDashboard');
  },

  getProgressDashboard: async (_role: string): Promise<ApiResponse<any>> => {
    return callApi<any>('getProgressDashboard');
  },

  refreshDashboardCache: async (_role: string): Promise<ApiResponse<any>> => {
    return callApi<any>('refreshDashboardCache');
  },

  getDrillDownDetail: async (_role: string, category: string): Promise<ApiResponse<any>> => {
    return callApi<any>('getDrillDownDetail', { category });
  }
};
