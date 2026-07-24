import { ApiResponse, UserSession, StaffMaster, HealthRecord, PhysicianAssessment, AuditLogEntry, UserRole } from '../types';

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

export const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbwZhiYOz_EyRdbIRwsRurrboTkF_Sg6GXMLY8LAh68hwNpO4FmoN_Wbx6luDB12Ar0Q/exec';

// 5 Rich Sample User Accounts for Testing
const mockUsers: Record<string, { role: UserRole; name: string; dept: string; workGroup: any; email: string; pwd: string; mustChange?: boolean }> = {
  'IC8001': { role: 'INFECTION_CONTROL', name: 'พญ. นภาพร สุขสมบูรณ์ (IC Lead)', dept: 'ศูนย์ควบคุมการติดเชื้อ (IC)', workGroup: 'CLINICAL', email: 'naphaporn.su@bdms.co.th', pwd: 'password123' },
  'HR8002': { role: 'HR', name: 'คุณ วรวุฒิ ใจดี (HR Manager)', dept: 'ฝ่ายทรัพยากรบุคคล (HR)', workGroup: 'BACKOFFICE', email: 'worawut.ja@bdms.co.th', pwd: 'password123' },
  'MD8003': { role: 'PHYSICIAN', name: 'นพ. สมชาย วิทยา (Occupational Physician)', dept: 'ศูนย์อาชีวอนามัย (Occ Health)', workGroup: 'CLINICAL', email: 'somchai.wi@bdms.co.th', pwd: 'password123' },
  'ST8004': { role: 'DATA_OWNER', name: 'พว. อารียา รักษ์ดี (Staff Nurse)', dept: 'แผนกผู้ป่วยนอก (OPD)', workGroup: 'FRONTLINE', email: 'areeya.ra@bdms.co.th', pwd: 'password123', mustChange: true },
  'ST8005': { role: 'DATA_OWNER', name: 'ภก. กิตติศักดิ์ มุ่งมั่น (Pharmacist)', dept: 'ห้องคลังยา (Pharmacy)', workGroup: 'CLINICAL', email: 'kittisak.mu@bdms.co.th', pwd: 'password123' },
  'ST8006': { role: 'DATA_OWNER', name: 'คุณ พัชรี มีสุข (Senior Accountant)', dept: 'ฝ่ายบัญชีและการเงิน (Finance)', workGroup: 'BACKOFFICE', email: 'patcharee.me@bdms.co.th', pwd: 'password123' },
  'ST8007': { role: 'DATA_OWNER', name: 'พว. อรรถพล มีชัย (ER Nurse)', dept: 'แผนกอุบัติเหตุและฉุกเฉิน (ER)', workGroup: 'FRONTLINE', email: 'atthaphol.me@bdms.co.th', pwd: 'password123' }
};

let mockStaffList: StaffMaster[] = [
  {
    staffId: 'ST8004',
    hn: 'HN908234',
    firstName: 'อารียา',
    lastName: 'รักษ์ดี',
    dateOfBirth: '1992-05-14',
    gender: 'FEMALE',
    bloodGroup: 'O+',
    department: 'แผนกผู้ป่วยนอก (OPD)',
    workGroup: 'FRONTLINE',
    email: 'areeya.ra@bdms.co.th',
    phone: '081-234-5678',
    emergencyContactName: 'คุณสมศักดิ์ รักษ์ดี (สามี)',
    emergencyContactPhone: '089-876-5432',
    status: 'ACTIVE',
    recordVersion: 1,
    updatedAt: '2026-07-20T10:00:00Z',
    workReadiness: 'CLEARED',
    completenessPercentage: 100,
    pendingItemsCount: 0
  },
  {
    staffId: 'ST8005',
    hn: 'HN908235',
    firstName: 'กิตติศักดิ์',
    lastName: 'มุ่งมั่น',
    dateOfBirth: '1988-11-20',
    gender: 'MALE',
    bloodGroup: 'B+',
    department: 'ห้องคลังยา (Pharmacy)',
    workGroup: 'CLINICAL',
    email: 'kittisak.mu@bdms.co.th',
    phone: '082-345-6789',
    emergencyContactName: 'คุณเพ็ญศรี มุ่งมั่น (มารดา)',
    emergencyContactPhone: '088-765-4321',
    status: 'ACTIVE',
    recordVersion: 1,
    updatedAt: '2026-07-22T14:30:00Z',
    workReadiness: 'NOT_CLEARED',
    completenessPercentage: 66,
    pendingItemsCount: 2
  },
  {
    staffId: 'ST8006',
    hn: 'HN908236',
    firstName: 'พัชรี',
    lastName: 'มีสุข',
    dateOfBirth: '1995-03-08',
    gender: 'FEMALE',
    bloodGroup: 'A+',
    department: 'ฝ่ายบัญชีและการเงิน (Finance)',
    workGroup: 'BACKOFFICE',
    email: 'patcharee.me@bdms.co.th',
    phone: '083-456-7890',
    emergencyContactName: 'คุณวิชัย มีสุข (บิดา)',
    emergencyContactPhone: '087-654-3210',
    status: 'ACTIVE',
    recordVersion: 1,
    updatedAt: '2026-07-23T09:15:00Z',
    workReadiness: 'CONDITIONALLY_CLEARED',
    completenessPercentage: 80,
    pendingItemsCount: 0
  },
  {
    staffId: 'ST8007',
    hn: 'HN908237',
    firstName: 'อรรถพล',
    lastName: 'มีชัย',
    dateOfBirth: '1990-09-12',
    gender: 'MALE',
    bloodGroup: 'AB+',
    department: 'แผนกอุบัติเหตุและฉุกเฉิน (ER)',
    workGroup: 'FRONTLINE',
    email: 'atthaphol.me@bdms.co.th',
    phone: '084-567-8901',
    emergencyContactName: 'คุณนภา มีชัย (ภรรยา)',
    emergencyContactPhone: '086-543-2109',
    status: 'ACTIVE',
    recordVersion: 1,
    updatedAt: '2026-07-24T11:00:00Z',
    workReadiness: 'CONDITIONALLY_CLEARED',
    completenessPercentage: 85,
    pendingItemsCount: 1
  },
  {
    staffId: 'ST8008',
    hn: 'HN908238',
    firstName: 'ธีรเดช',
    lastName: 'วงษ์สว่าง',
    dateOfBirth: '1985-07-04',
    gender: 'MALE',
    bloodGroup: 'O+',
    department: 'ศูนย์เอ็กซเรย์และภาพวินิจฉัย (Radiology)',
    workGroup: 'CLINICAL',
    email: 'theeradech.wo@bdms.co.th',
    phone: '085-678-9012',
    emergencyContactName: 'คุณสมใจ วงษ์สว่าง (มารดา)',
    emergencyContactPhone: '085-432-1098',
    status: 'ACTIVE',
    recordVersion: 1,
    updatedAt: '2026-07-24T12:00:00Z',
    workReadiness: 'CLEARED',
    completenessPercentage: 100,
    pendingItemsCount: 0
  }
];

let mockRecords: HealthRecord[] = [
  {
    recordUuid: 'rec-001',
    staffId: 'ST8004',
    category: 'MMR',
    recordType: 'VACCINE',
    resultOrStatus: 'DOSE_2_COMPLETED',
    administeredOrTestDate: '2025-05-10',
    verificationStatus: 'VERIFIED',
    verifiedBy: 'IC8001',
    verifiedAt: '2025-05-12T10:00:00Z',
    isMedicalExemption: false,
    recordVersion: 1,
    createdAt: '2025-05-10T08:00:00Z'
  },
  {
    recordUuid: 'rec-002',
    staffId: 'ST8004',
    category: 'VARICELLA',
    recordType: 'VACCINE',
    resultOrStatus: 'DOSE_2_COMPLETED',
    administeredOrTestDate: '2025-06-01',
    verificationStatus: 'VERIFIED',
    verifiedBy: 'IC8001',
    verifiedAt: '2025-06-02T09:30:00Z',
    isMedicalExemption: false,
    recordVersion: 1,
    createdAt: '2025-06-01T11:00:00Z'
  },
  {
    recordUuid: 'rec-003',
    staffId: 'ST8004',
    category: 'CXR',
    recordType: 'LAB_TEST',
    resultOrStatus: 'NORMAL_CHEST_XRAY',
    administeredOrTestDate: '2026-01-15',
    expiryDate: '2027-01-15',
    verificationStatus: 'VERIFIED',
    verifiedBy: 'MD8003',
    verifiedAt: '2026-01-16T14:00:00Z',
    isMedicalExemption: false,
    recordVersion: 1,
    createdAt: '2026-01-15T09:00:00Z'
  },
  {
    recordUuid: 'rec-004',
    staffId: 'ST8005',
    category: 'HEPATITIS_B',
    recordType: 'VACCINE',
    resultOrStatus: 'DOSE_3_PENDING_TITRE',
    administeredOrTestDate: '2026-03-10',
    documentUuid: 'doc-101',
    documentFileName: 'HepB_Vaccine_Certificate.pdf',
    verificationStatus: 'PENDING_VERIFICATION',
    isMedicalExemption: false,
    recordVersion: 1,
    createdAt: '2026-07-21T14:30:00Z'
  },
  {
    recordUuid: 'rec-005',
    staffId: 'ST8006',
    category: 'INFLUENZA',
    recordType: 'VACCINE',
    resultOrStatus: 'DUE_SOON',
    administeredOrTestDate: '2025-07-15',
    expiryDate: '2026-07-15',
    verificationStatus: 'VERIFIED',
    verifiedBy: 'IC8001',
    verifiedAt: '2025-07-16T10:00:00Z',
    isMedicalExemption: false,
    recordVersion: 1,
    createdAt: '2025-07-15T10:00:00Z'
  }
];

let mockAssessments: PhysicianAssessment[] = [
  {
    assessmentUuid: 'ass-001',
    staffId: 'ST8005',
    physicianStaffId: 'MD8003',
    assessmentDate: '2026-07-21',
    workReadinessStatus: 'CONDITIONALLY_CLEARED',
    medicalOverride: true,
    overrideReason: 'รอผลตรวจ Anti-HBs Titre แต่ได้ฉีดวัคซีนครบ 3 เข็มแล้ว อนุญาตให้ปฏิบัติงานภายใต้มาตรการป้องกัน Standard Precautions',
    clinicalNotes: 'ติดตามผล Anti-HBs ภายใน 30 วัน',
    nextReviewDate: '2026-08-20',
    recordVersion: 1,
    createdAt: '2026-07-21T15:00:00Z'
  }
];

let mockAuditLogs: AuditLogEntry[] = [
  {
    logUuid: 'log-001',
    timestamp: '2026-07-24T08:00:00Z',
    staffId: 'SYSTEM',
    role: 'INFECTION_CONTROL',
    action: 'SYSTEM_INIT',
    targetResource: 'System',
    detailsJson: '{"message":"System initialized"}',
    previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
    entryHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    isValidChain: true
  },
  {
    logUuid: 'log-002',
    timestamp: '2026-07-24T08:15:20Z',
    staffId: 'IC8001',
    role: 'INFECTION_CONTROL',
    action: 'LOGIN_SUCCESS',
    targetResource: 'UserSession',
    detailsJson: '{"ip":"10.20.4.12","userAgent":"Mozilla/5.0"}',
    previousHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    entryHash: 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
    isValidChain: true
  }
];

// Helper to simulate network latency
const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

export const apiService = {
  // Authentication
  login: async (staffId: string, password: string): Promise<ApiResponse<UserSession>> => {
    await delay(400);
    const user = mockUsers[staffId];
    if (!user || user.pwd !== password) {
      return {
        success: false,
        requestId: crypto.randomUUID(),
        data: null,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง (ลองใช้ IC8001, HR8002, MD8003, หรือ ST8004 รหัสผ่าน: password123)'
        }
      };
    }

    const session: UserSession = {
      staffId,
      role: user.role,
      firstName: user.name.split(' ')[1] || user.name,
      lastName: user.name.split(' ')[2] || '',
      department: user.dept,
      workGroup: user.workGroup,
      email: user.email,
      token: `mock-token-${crypto.randomUUID()}`,
      mustChangePassword: user.mustChange || false
    };

    setStoredSession(session);

    // Audit Log
    mockAuditLogs.push({
      logUuid: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      staffId,
      role: user.role,
      action: 'LOGIN_SUCCESS',
      targetResource: `User:${staffId}`,
      detailsJson: JSON.stringify({ role: user.role }),
      previousHash: mockAuditLogs[mockAuditLogs.length - 1]?.entryHash || '0',
      entryHash: crypto.randomUUID().replace(/-/g, ''),
      isValidChain: true
    });

    return {
      success: true,
      requestId: crypto.randomUUID(),
      data: session,
      error: null
    };
  },

  changePassword: async (staffId: string, oldPassword: string, newPassword: string): Promise<ApiResponse<boolean>> => {
    await delay(500);
    const user = mockUsers[staffId];
    if (!user || user.pwd !== oldPassword) {
      return {
        success: false,
        requestId: crypto.randomUUID(),
        data: null,
        error: { code: 'INVALID_PASSWORD', message: 'รหัสผ่านเดิมไม่ถูกต้อง' }
      };
    }

    user.pwd = newPassword;
    user.mustChange = false;

    const currentSession = getStoredSession();
    if (currentSession && currentSession.staffId === staffId) {
      currentSession.mustChangePassword = false;
      setStoredSession(currentSession);
    }

    return {
      success: true,
      requestId: crypto.randomUUID(),
      data: true,
      error: null
    };
  },

  // Staff Master List
  getStaffList: async (): Promise<ApiResponse<StaffMaster[]>> => {
    await delay(300);
    return {
      success: true,
      requestId: crypto.randomUUID(),
      data: [...mockStaffList],
      error: null
    };
  },

  // Health Records for Staff
  getHealthRecords: async (staffId: string): Promise<ApiResponse<HealthRecord[]>> => {
    await delay(300);
    const records = mockRecords.filter((r) => r.staffId === staffId);
    return {
      success: true,
      requestId: crypto.randomUUID(),
      data: records,
      error: null
    };
  },

  // Add/Upload Health Record
  createHealthRecord: async (recordData: Partial<HealthRecord>, file?: File): Promise<ApiResponse<HealthRecord>> => {
    await delay(600);
    const session = getStoredSession();
    const newDocUuid = file ? `doc-${crypto.randomUUID()}` : undefined;

    const newRecord: HealthRecord = {
      recordUuid: `rec-${crypto.randomUUID()}`,
      staffId: recordData.staffId || session?.staffId || 'ST8004',
      category: recordData.category || 'INFLUENZA',
      recordType: recordData.recordType || 'VACCINE',
      resultOrStatus: recordData.resultOrStatus || 'COMPLETED',
      administeredOrTestDate: recordData.administeredOrTestDate || new Date().toISOString().split('T')[0],
      documentUuid: newDocUuid,
      documentFileName: file ? `${newDocUuid}.${file.name.split('.').pop()}` : undefined,
      verificationStatus: 'PENDING_VERIFICATION',
      isMedicalExemption: false,
      recordVersion: 1,
      createdAt: new Date().toISOString()
    };

    mockRecords.push(newRecord);

    return {
      success: true,
      requestId: crypto.randomUUID(),
      data: newRecord,
      error: null
    };
  },

  // Verify or Reject Record (Infection Control & Physician)
  verifyRecord: async (recordUuid: string, status: 'VERIFIED' | 'REJECTED', reason?: string): Promise<ApiResponse<HealthRecord>> => {
    await delay(400);
    const session = getStoredSession();
    const record = mockRecords.find((r) => r.recordUuid === recordUuid);
    if (!record) {
      return {
        success: false,
        requestId: crypto.randomUUID(),
        data: null,
        error: { code: 'NOT_FOUND', message: 'ไม่พบรายการข้อมูลสุขภาพนี้' }
      };
    }

    record.verificationStatus = status;
    record.verifiedBy = session?.staffId;
    record.verifiedAt = new Date().toISOString();
    if (reason) record.rejectionReason = reason;

    return {
      success: true,
      requestId: crypto.randomUUID(),
      data: record,
      error: null
    };
  },

  // Physician Assessment & Override
  addPhysicianAssessment: async (assessment: Partial<PhysicianAssessment>): Promise<ApiResponse<PhysicianAssessment>> => {
    await delay(500);
    const session = getStoredSession();
    const newAss: PhysicianAssessment = {
      assessmentUuid: `ass-${crypto.randomUUID()}`,
      staffId: assessment.staffId!,
      physicianStaffId: session?.staffId || 'MD8003',
      assessmentDate: new Date().toISOString().split('T')[0],
      workReadinessStatus: assessment.workReadinessStatus || 'CLEARED',
      medicalOverride: assessment.medicalOverride || false,
      overrideReason: assessment.overrideReason,
      clinicalNotes: assessment.clinicalNotes || '',
      nextReviewDate: assessment.nextReviewDate,
      recordVersion: 1,
      createdAt: new Date().toISOString()
    };

    mockAssessments.push(newAss);

    // Update staff readiness
    const staff = mockStaffList.find((s) => s.staffId === assessment.staffId);
    if (staff) {
      staff.workReadiness = newAss.workReadinessStatus;
    }

    return {
      success: true,
      requestId: crypto.randomUUID(),
      data: newAss,
      error: null
    };
  },

  // Audit Logs
  getAuditLogs: async (): Promise<ApiResponse<AuditLogEntry[]>> => {
    await delay(300);
    return {
      success: true,
      requestId: crypto.randomUUID(),
      data: [...mockAuditLogs].reverse(),
      error: null
    };
  },

  // Dashboard APIs
  getCompletenessDashboard: async (_role: string): Promise<ApiResponse<any>> => {
    await delay(300);
    return {
      success: true,
      requestId: crypto.randomUUID(),
      data: {
        totalStaff: mockStaffList.length * 200,
        completeCount: Math.round(mockStaffList.length * 200 * 0.88),
        incompleteCount: Math.round(mockStaffList.length * 200 * 0.12),
        completionRate: 88,
        pendingVerificationQueue: 14,
        workGroupBreakdown: {
          CLINICAL: { total: 450, complete: 405, rate: 90 },
          FRONTLINE: { total: 250, complete: 215, rate: 86 },
          BACKOFFICE: { total: 150, complete: 130, rate: 87 }
        },
        calculatedAt: new Date().toLocaleTimeString()
      },
      error: null
    };
  },

  getFollowUpDashboard: async (_role: string): Promise<ApiResponse<any>> => {
    await delay(300);
    return {
      success: true,
      requestId: crypto.randomUUID(),
      data: {
        vaccineRequired: 42,
        labRequired: 18,
        cxrRequired: 12,
        physicianReviewRequired: 5,
        overdueCount: 15,
        dueWithin7Days: 8,
        dueWithin30Days: 24,
        dueWithin60Days: 30,
        rejectedEvidenceCount: 3,
        emailFailedCount: 1,
        calculatedAt: new Date().toLocaleTimeString()
      },
      error: null
    };
  },

  getProgressDashboard: async (_role: string): Promise<ApiResponse<any>> => {
    await delay(300);
    return {
      success: true,
      requestId: crypto.randomUUID(),
      data: {
        completionTrend: [
          { month: 'ม.ค.', rate: 65 },
          { month: 'ก.พ.', rate: 72 },
          { month: 'มี.ค.', rate: 78 },
          { month: 'เม.ย.', rate: 84 },
          { month: 'พ.ค.', rate: 89 },
          { month: 'มิ.ย.', rate: 93 }
        ],
        completedActionsThisMonth: 128,
        newActionsThisMonth: 15,
        overdueTrendCount: 8,
        calculatedAt: new Date().toLocaleTimeString()
      },
      error: null
    };
  },

  refreshDashboardCache: async (_role: string): Promise<ApiResponse<any>> => {
    await delay(500);
    return {
      success: true,
      requestId: crypto.randomUUID(),
      data: { message: 'Refreshed' },
      error: null
    };
  },

  getDrillDownDetail: async (_role: string, category: string): Promise<ApiResponse<any>> => {
    await delay(300);
    return {
      success: true,
      requestId: crypto.randomUUID(),
      data: {
        category,
        items: [
          { staffId: 'ST8004', name: 'พว. อารียา รักษ์ดี', department: 'แผนกผู้ป่วยนอก (OPD)', status: category },
          { staffId: 'ST8005', name: 'กิตติศักดิ์ มุ่งมั่น', department: 'แผนกผู้ป่วยหนัก (ICU)', status: category }
        ]
      },
      error: null
    };
  }
};

