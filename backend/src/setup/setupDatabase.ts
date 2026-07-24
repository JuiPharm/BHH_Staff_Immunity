import { PasswordService } from '../services/PasswordService';

/**
 * Setup Database Script for Staff Immunity & Health Registry
 * Creates 3 Spreadsheets and 22 Sheets with Header Rows, Migration Version, and System Constant Seeds.
 */

export const SCHEMA_MIGRATION_VERSION = '1.0.0';

export interface SheetSchemaConfig {
  name: string;
  headers: string[];
}

export interface DatabaseConfig {
  spreadsheetTitle: string;
  propertyKey: string;
  sheets: SheetSchemaConfig[];
}

// 1. Clinical Database Sheets Definition
export const CLINICAL_DATABASE_CONFIG: DatabaseConfig = {
  spreadsheetTitle: 'BDMS_Staff_Immunity_Clinical_DB',
  propertyKey: 'DB_CLINICAL_SPREADSHEET_ID',
  sheets: [
    {
      name: 'STAFF',
      headers: [
        'StaffID', 'HN', 'FirstName', 'LastName', 'DateOfBirth', 'Gender',
        'BloodGroup', 'Department', 'WorkGroup', 'Email', 'Phone',
        'EmergencyContactName', 'EmergencyContactPhone', 'Status',
        'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'RecordVersion', 'IsDeleted'
      ]
    },
    {
      name: 'VACCINATION',
      headers: [
        'VaccinationUUID', 'StaffID', 'VaccineCategory', 'DoseNumber',
        'AdministeredDate', 'ManufacturerLot', 'ExpiryDate', 'AdministeredLocation',
        'DocumentUUID', 'VerificationStatus',
        'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'RecordVersion', 'IsDeleted'
      ]
    },
    {
      name: 'LAB_RESULT',
      headers: [
        'LabResultUUID', 'StaffID', 'LabCategory', 'QuantitativeValue', 'Unit',
        'QualitativeResult', 'TestDate', 'LabName', 'DocumentUUID', 'VerificationStatus',
        'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'RecordVersion', 'IsDeleted'
      ]
    },
    {
      name: 'CHEST_XRAY',
      headers: [
        'ChestXrayUUID', 'StaffID', 'FilmDate', 'ResultStatus', 'RadiologistImpression',
        'ExpiryDate', 'DocumentUUID', 'VerificationStatus',
        'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'RecordVersion', 'IsDeleted'
      ]
    },
    {
      name: 'TB_ASSESSMENT',
      headers: [
        'TbAssessmentUUID', 'StaffID', 'ScreeningType', 'TstIndurationMm', 'IgraResult',
        'LtbiTreatmentStatus', 'AssessmentDate', 'DocumentUUID', 'VerificationStatus',
        'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'RecordVersion', 'IsDeleted'
      ]
    },
    {
      name: 'MEDICAL_ASSESSMENT',
      headers: [
        'MedicalAssessmentUUID', 'StaffID', 'PhysicianStaffID', 'AssessmentDate',
        'IsMedicalExemption', 'ExemptionCategory', 'IsMedicalOverride', 'OverrideReason',
        'ClinicalNotes', 'NextReviewDate',
        'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'RecordVersion', 'IsDeleted'
      ]
    },
    {
      name: 'ASSESSMENT_RESULT',
      headers: [
        'ResultUUID', 'StaffID', 'WorkGroup', 'WorkReadinessStatus', 'EvaluatedRuleVersion',
        'CompletenessPercentage', 'PendingRequirementsJson', 'LastEvaluatedAt',
        'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'RecordVersion', 'IsDeleted'
      ]
    },
    {
      name: 'FILE_ATTACHMENT',
      headers: [
        'DocumentUUID', 'StaffID', 'DriveFileID', 'OriginalFileName', 'FileExtension',
        'MimeType', 'FileSizeByte', 'SHA256Checksum', 'UploadedBy', 'UploadedAt',
        'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'RecordVersion', 'IsDeleted'
      ]
    },
    {
      name: 'FILE_VERIFICATION',
      headers: [
        'VerificationUUID', 'DocumentUUID', 'StaffID', 'VerificationAction', 'ActionReason',
        'VerifiedBy', 'VerifiedAt',
        'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'RecordVersion', 'IsDeleted'
      ]
    }
  ]
};

// 2. Security Database Sheets Definition
export const SECURITY_DATABASE_CONFIG: DatabaseConfig = {
  spreadsheetTitle: 'BDMS_Staff_Immunity_Security_DB',
  propertyKey: 'DB_SECURITY_SPREADSHEET_ID',
  sheets: [
    {
      name: 'USER_ACCOUNT',
      headers: [
        'UserUUID', 'StaffID', 'PasswordHash', 'Salt', 'Iterations',
        'FailedLoginCount', 'LockoutUntil', 'MustChangePassword', 'AccountStatus',
        'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'RecordVersion', 'IsDeleted'
      ]
    },
    {
      name: 'PASSWORD_HISTORY',
      headers: [
        'HistoryUUID', 'StaffID', 'PasswordHash', 'Salt', 'ChangedAt',
        'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'RecordVersion', 'IsDeleted'
      ]
    },
    {
      name: 'SESSION',
      headers: [
        'SessionUUID', 'StaffID', 'TokenHash', 'IdleExpiresAt', 'AbsoluteExpiresAt',
        'IpAddressHash', 'UserAgent', 'IsRevoked',
        'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'RecordVersion', 'IsDeleted'
      ]
    },
    {
      name: 'STAFF_ROLE',
      headers: [
        'RoleAssignmentUUID', 'StaffID', 'RoleCode', 'AssignedBy', 'AssignedAt',
        'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'RecordVersion', 'IsDeleted'
      ]
    }
  ]
};

// 3. Audit and Operations Database Sheets Definition
export const AUDIT_DATABASE_CONFIG: DatabaseConfig = {
  spreadsheetTitle: 'BDMS_Staff_Immunity_Audit_DB',
  propertyKey: 'DB_AUDIT_SPREADSHEET_ID',
  sheets: [
    {
      name: 'RULE',
      headers: [
        'RuleUUID', 'RuleCode', 'WorkGroup', 'RuleDescription', 'CurrentVersion', 'ActiveVersionUUID',
        'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'RecordVersion', 'IsDeleted'
      ]
    },
    {
      name: 'RULE_VERSION',
      headers: [
        'VersionUUID', 'RuleUUID', 'VersionNumber', 'RequirementsCriteriaJson', 'EffectiveDate',
        'ExpiryDate', 'Status',
        'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'RecordVersion', 'IsDeleted'
      ]
    },
    {
      name: 'RULE_APPROVAL',
      headers: [
        'ApprovalUUID', 'VersionUUID', 'ApprovalStatus', 'ApprovalComment', 'ApprovedBy', 'ApprovedAt',
        'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'RecordVersion', 'IsDeleted'
      ]
    },
    {
      name: 'IMPORT_JOB',
      headers: [
        'JobUUID', 'FileName', 'TotalRows', 'SuccessCount', 'ErrorCount', 'JobStatus', 'StartedAt', 'CompletedAt',
        'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'RecordVersion', 'IsDeleted'
      ]
    },
    {
      name: 'IMPORT_ERROR',
      headers: [
        'ErrorUUID', 'JobUUID', 'RowNumber', 'RawDataJson', 'ErrorMessage',
        'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'RecordVersion', 'IsDeleted'
      ]
    },
    {
      name: 'NOTIFICATION_QUEUE',
      headers: [
        'QueueUUID', 'RecipientEmail', 'Subject', 'BodyHtml', 'Priority', 'Status', 'RetryCount', 'ScheduledAt',
        'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'RecordVersion', 'IsDeleted'
      ]
    },
    {
      name: 'NOTIFICATION_LOG',
      headers: [
        'NotificationLogUUID', 'QueueUUID', 'RecipientEmail', 'SendStatus', 'SentAt', 'ErrorMessage',
        'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'RecordVersion', 'IsDeleted'
      ]
    },
    {
      name: 'AUDIT_LOG',
      headers: [
        'LogUUID', 'Timestamp', 'StaffID', 'RoleCode', 'Action', 'TargetResource', 'DetailsJson',
        'PreviousHash', 'CurrentHash',
        'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'RecordVersion', 'IsDeleted'
      ]
    },
    {
      name: 'DASHBOARD_CACHE',
      headers: [
        'CacheUUID', 'CacheKey', 'CachedDataJson', 'CalculatedAt', 'ExpiresAt',
        'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'RecordVersion', 'IsDeleted'
      ]
    }
  ]
};

/**
 * Bootstrapper function to create Spreadsheets and Sheets automatically
 */
export function setupAllDatabases(): void {
  const props = PropertiesService.getScriptProperties();
  const TARGET_FOLDER_ID = '1lQBZKII-qH2lPonIyijNy5RXaaos9OQk';

  // Force Security DB to use user-specified Sheet ID
  props.setProperty('DB_SECURITY_SPREADSHEET_ID', '1oOCXuIPbsEMy154OivVKqquFMt4wfK8LXqhNngH47M8');

  [CLINICAL_DATABASE_CONFIG, SECURITY_DATABASE_CONFIG, AUDIT_DATABASE_CONFIG].forEach((config) => {
    let ss: GoogleAppsScript.Spreadsheet.Spreadsheet | null = null;
    let existingId = props.getProperty(config.propertyKey);

    if (config.propertyKey === 'DB_SECURITY_SPREADSHEET_ID') {
      existingId = '1oOCXuIPbsEMy154OivVKqquFMt4wfK8LXqhNngH47M8';
    }

    if (existingId) {
      try {
        ss = SpreadsheetApp.openById(existingId);
      } catch (e) {
        existingId = null;
      }
    }

    if (!ss) {
      try {
        const folder = DriveApp.getFolderById(TARGET_FOLDER_ID);
        const files = folder.getFilesByName(config.spreadsheetTitle);
        if (files.hasNext()) {
          const file = files.next();
          ss = SpreadsheetApp.openById(file.getId());
          props.setProperty(config.propertyKey, file.getId());
        } else {
          ss = SpreadsheetApp.create(config.spreadsheetTitle);
          props.setProperty(config.propertyKey, ss.getId());
          const file = DriveApp.getFileById(ss.getId());
          folder.addFile(file);
          try { DriveApp.getRootFolder().removeFile(file); } catch (e) {}
        }
      } catch (err) {
        ss = SpreadsheetApp.create(config.spreadsheetTitle);
        props.setProperty(config.propertyKey, ss.getId());
      }
    }

    config.sheets.forEach((sheetCfg) => {
      let sheet = ss.getSheetByName(sheetCfg.name);
      if (!sheet) {
        sheet = ss.insertSheet(sheetCfg.name);
      }

      // Write Header Row if empty
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(sheetCfg.headers);
        sheet.getRange(1, 1, 1, sheetCfg.headers.length).setFontWeight('bold').setBackground('#0A2540').setFontColor('#FFFFFF');
        sheet.setFrozenRows(1);
      }
    });

    // Remove default "Sheet1" if custom sheets created
    const defaultSheet = ss.getSheetByName('Sheet1');
    if (defaultSheet && ss.getSheets().length > 1) {
      ss.deleteSheet(defaultSheet);
    }
  });

  // Register Migration Tracking Field
  props.setProperty('SCHEMA_MIGRATION_VERSION', SCHEMA_MIGRATION_VERSION);

  // Seed System Constant Metadata ONLY (No Staff PII!)
  seedSystemConstants();

  // Seed 5 Sample Staff for Testing
  seedSampleData();
  
  // Seed User Accounts with properly hashed passwords
  seedUserAccounts();
}

/**
 * Seeds System Constants and Default Rules (NO REAL STAFF DATA!)
 */
function seedSystemConstants(): void {
  const props = PropertiesService.getScriptProperties();
  const auditSsId = props.getProperty(AUDIT_DATABASE_CONFIG.propertyKey);
  if (!auditSsId) return;

  const ss = SpreadsheetApp.openById(auditSsId);
  const ruleSheet = ss.getSheetByName('RULE');
  const auditSheet = ss.getSheetByName('AUDIT_LOG');

  const now = new Date().toISOString();

  // Seed Default Rule Metadata if empty
  if (ruleSheet && ruleSheet.getLastRow() === 1) {
    const rulesToSeed = [
      ['rule-001', 'RULE_CLINICAL_2026', 'CLINICAL', 'เกณฑ์สถาบันสำหรับกลุ่มงานสนับสนุนการแพทย์', 1, 'ver-001', now, 'SYSTEM', now, 'SYSTEM', 1, false],
      ['rule-002', 'RULE_FRONTLINE_2026', 'FRONTLINE', 'เกณฑ์สถาบันสำหรับกลุ่มงานด่านหน้า', 1, 'ver-002', now, 'SYSTEM', now, 'SYSTEM', 1, false],
      ['rule-003', 'RULE_BACKOFFICE_2026', 'BACKOFFICE', 'เกณฑ์สถาบันสำหรับกลุ่มงานสนับสนุนทั่วไป', 1, 'ver-003', now, 'SYSTEM', now, 'SYSTEM', 1, false]
    ];

    rulesToSeed.forEach((row) => ruleSheet.appendRow(row));
  }

  // Seed Genesis Audit Log Hash Chain Entry
  if (auditSheet && auditSheet.getLastRow() === 1) {
    const genesisLog = [
      'log-genesis-0000',
      now,
      'SYSTEM',
      'SYSTEM_INIT',
      'DATABASE_BOOTSTRAP',
      'System',
      JSON.stringify({ migrationVersion: SCHEMA_MIGRATION_VERSION }),
      '0000000000000000000000000000000000000000000000000000000000000000',
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      now,
      'SYSTEM',
      now,
      'SYSTEM',
      1,
      false
    ];
    auditSheet.appendRow(genesisLog);
  }
}

/**
 * Seeds 5 Sample Staff for Testing
 */
function seedSampleData(): void {
  const props = PropertiesService.getScriptProperties();
  const clinicalSsId = props.getProperty(CLINICAL_DATABASE_CONFIG.propertyKey);
  if (!clinicalSsId) return;

  const ss = SpreadsheetApp.openById(clinicalSsId);
  const staffSheet = ss.getSheetByName('STAFF');
  if (!staffSheet) return;

  // Add only if the sheet is empty (only header exists)
  if (staffSheet.getLastRow() === 1) {
    const now = new Date().toISOString();
    const sampleStaff = [
      ['ST8004', 'HN908234', 'อารียา', 'รักษ์ดี', '1992-05-14', 'FEMALE', 'O+', 'แผนกผู้ป่วยนอก (OPD)', 'FRONTLINE', 'areeya.ra@bdms.co.th', '081-234-5678', 'คุณสมศักดิ์ รักษ์ดี', '089-876-5432', 'ACTIVE', now, 'SYSTEM', now, 'SYSTEM', 1, false],
      ['ST8005', 'HN908235', 'กิตติศักดิ์', 'มุ่งมั่น', '1988-11-20', 'MALE', 'B+', 'ห้องคลังยา (Pharmacy)', 'CLINICAL', 'kittisak.mu@bdms.co.th', '082-345-6789', 'คุณเพ็ญศรี มุ่งมั่น', '088-765-4321', 'ACTIVE', now, 'SYSTEM', now, 'SYSTEM', 1, false],
      ['ST8006', 'HN908236', 'พัชรี', 'มีสุข', '1995-03-08', 'FEMALE', 'A+', 'ฝ่ายบัญชีและการเงิน (Finance)', 'BACKOFFICE', 'patcharee.me@bdms.co.th', '083-456-7890', 'คุณวิชัย มีสุข', '087-654-3210', 'ACTIVE', now, 'SYSTEM', now, 'SYSTEM', 1, false],
      ['ST8007', 'HN908237', 'อรรถพล', 'มีชัย', '1990-09-12', 'MALE', 'AB+', 'แผนกอุบัติเหตุและฉุกเฉิน (ER)', 'FRONTLINE', 'atthaphol.me@bdms.co.th', '084-567-8901', 'คุณนภา มีชัย', '086-543-2109', 'ACTIVE', now, 'SYSTEM', now, 'SYSTEM', 1, false],
      ['ST8008', 'HN908238', 'ธีรเดช', 'วงษ์สว่าง', '1985-07-04', 'MALE', 'O+', 'ศูนย์เอ็กซเรย์และภาพวินิจฉัย (Radiology)', 'CLINICAL', 'theeradech.wo@bdms.co.th', '085-678-9012', 'คุณสมใจ วงษ์สว่าง', '085-432-1098', 'ACTIVE', now, 'SYSTEM', now, 'SYSTEM', 1, false]
    ];

    sampleStaff.forEach(row => staffSheet.appendRow(row));
  }
}

/**
 * Seeds User Accounts for Testing
 */
function seedUserAccounts(): void {
  const props = PropertiesService.getScriptProperties();
  const securitySsId = props.getProperty(SECURITY_DATABASE_CONFIG.propertyKey);
  if (!securitySsId) return;

  const ss = SpreadsheetApp.openById(securitySsId);
  const userSheet = ss.getSheetByName('USER_ACCOUNT');
  if (!userSheet) return;

  // Add only if the sheet is empty (only header exists)
  if (userSheet.getLastRow() === 1) {
    const now = new Date().toISOString();
    
    const staffIds = ['ST8004', 'ST8005', 'ST8006', 'ST8007', 'ST8008', 'IC8001', 'HR8002', 'MD8003'];
    
    staffIds.forEach((staffId, index) => {
      // Use 10,000 iterations for testing instead of 100,000 to save GAS execution time during setup
      const { hash, salt, iterations } = PasswordService.hashPassword('password123', undefined, 10000);
      const userUuid = `user-00${index + 1}`;
      
      const userRow = [
        userUuid, staffId, hash, salt, iterations,
        0, '', false, 'ACTIVE',
        now, 'SYSTEM', now, 'SYSTEM', 1, false
      ];
      
      userSheet.appendRow(userRow);
    });
  }
}
