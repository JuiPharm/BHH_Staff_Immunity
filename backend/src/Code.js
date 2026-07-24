"use strict";
var GASApp = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    cronAuditChainScan: () => cronAuditChainScan,
    cronDailyMailQueue: () => cronDailyMailQueue,
    cronRecalculateDashboardCache: () => cronRecalculateDashboardCache,
    doGet: () => doGet,
    doPost: () => doPost,
    setupAllSpreadsheetsAndSheets: () => setupAllSpreadsheetsAndSheets
  });

  // src/utils/ResponseHelper.ts
  var ResponseHelper = class {
    static success(data, requestId) {
      const response = {
        success: true,
        requestId,
        data,
        error: null
      };
      return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
    }
    static error(code, message, requestId, statusCode = 400) {
      const response = {
        success: false,
        requestId,
        data: null,
        error: {
          code,
          message,
          // Safe user-facing message without exposing stack traces or Sheet/Drive IDs
          details: []
        }
      };
      return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
    }
  };

  // src/services/CryptoService.ts
  var CryptoService = class _CryptoService {
    /**
     * Generates a random cryptographic salt (hex string).
     */
    static generateSalt(length = 16) {
      const bytes = [];
      for (let i = 0; i < length; i++) {
        bytes.push(Math.floor(Math.random() * 256));
      }
      return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    /**
     * Computes SHA-256 hash of a string using GAS Utilities.
     */
    static hashSha256(input) {
      const signature = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input, Utilities.Charset.UTF_8);
      return signature.map((b) => (b < 0 ? b + 256 : b).toString(16).padStart(2, "0")).join("");
    }
    /**
     * PBKDF2-HMAC-SHA256 implementation using GAS Utilities.computeHmacSha256Signature.
     */
    static pbkdf2(password, salt, iterations = 1e5) {
      let key = password + salt;
      for (let i = 0; i < iterations; i++) {
        const sig = Utilities.computeHmacSha256Signature(key, salt);
        key = sig.map((b) => (b < 0 ? b + 256 : b).toString(16).padStart(2, "0")).join("");
      }
      return key;
    }
    /**
     * Generates a random UUIDv4 string.
     */
    static generateUuid() {
      return Utilities.getUuid();
    }
    /**
     * Computes the Audit Log Hash-Chain Entry Hash.
     * EntryHash = SHA256(logUuid + timestamp + staffId + action + targetResource + detailsJson + previousHash)
     */
    static computeAuditEntryHash(logUuid, timestamp, staffId, action, targetResource, detailsJson, previousHash) {
      const payload = `${logUuid}|${timestamp}|${staffId}|${action}|${targetResource}|${detailsJson}|${previousHash}`;
      return _CryptoService.hashSha256(payload);
    }
    /**
     * Constant-time comparison to prevent timing attacks.
     */
    static constantTimeCompare(a, b) {
      if (a.length !== b.length) return false;
      let result = 0;
      for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
      }
      return result === 0;
    }
  };

  // src/utils/FormulaSanitizer.ts
  var FormulaSanitizer = class _FormulaSanitizer {
    /**
     * Prevents Formula Injection vulnerability when writing user inputs into Google Sheets.
     * Prepends a single quote `'` if the cell text starts with '=', '+', '-', '@', '\t', '\r'.
     */
    static sanitize(value) {
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      if (trimmed.startsWith("=") || trimmed.startsWith("+") || trimmed.startsWith("-") || trimmed.startsWith("@") || trimmed.startsWith("	") || trimmed.startsWith("\r")) {
        return `'${value}`;
      }
      return value;
    }
    static sanitizeRow(row) {
      return row.map((cell) => _FormulaSanitizer.sanitize(cell));
    }
  };

  // src/repositories/SheetRepository.ts
  var SheetRepository = class {
    constructor(spreadsheetId) {
      this.spreadsheetId = spreadsheetId || PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID") || "";
    }
    getSpreadsheet() {
      if (this.spreadsheetId) {
        try {
          return SpreadsheetApp.openById(this.spreadsheetId);
        } catch (err) {
          console.error("Failed to open spreadsheet by ID:", this.spreadsheetId, err);
          return SpreadsheetApp.getActiveSpreadsheet();
        }
      }
      return SpreadsheetApp.getActiveSpreadsheet();
    }
    /**
     * Executes a write operation wrapped in LockService script lock to prevent concurrency race conditions.
     */
    executeWithLock(action, timeoutMs = 1e4) {
      const lock = LockService.getScriptLock();
      try {
        const acquired = lock.tryLock(timeoutMs);
        if (!acquired) {
          throw new Error("System is busy processing another transaction. Please try again.");
        }
        return action();
      } finally {
        lock.releaseLock();
      }
    }
    /**
     * Reads all rows from a sheet as objects mapped to header names.
     */
    getRows(sheetName) {
      const ss = this.getSpreadsheet();
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) return [];
      const values = sheet.getDataRange().getValues();
      if (values.length < 2) return [];
      const headers = values[0].map((h) => String(h).trim());
      const dataRows = values.slice(1);
      return dataRows.map((row) => {
        const item = {};
        headers.forEach((header, index) => {
          item[header] = row[index];
        });
        return item;
      });
    }
    /**
     * Appends a new row to a sheet after sanitizing against CSV Formula Injection.
     */
    appendRow(sheetName, headers, rowObject) {
      this.executeWithLock(() => {
        const ss = this.getSpreadsheet();
        let sheet = ss.getSheetByName(sheetName);
        if (!sheet) {
          sheet = ss.insertSheet(sheetName);
          sheet.appendRow(headers);
        }
        const rowValues = headers.map((h) => {
          var _a;
          return (_a = rowObject[h]) != null ? _a : "";
        });
        const sanitizedValues = FormulaSanitizer.sanitizeRow(rowValues);
        sheet.appendRow(sanitizedValues);
      });
    }
    /**
     * Updates a row matching a key header with optimistic record version check.
     */
    updateRow(sheetName, keyHeader, keyValue, newObject, currentVersion) {
      return this.executeWithLock(() => {
        const ss = this.getSpreadsheet();
        const sheet = ss.getSheetByName(sheetName);
        if (!sheet) return false;
        const values = sheet.getDataRange().getValues();
        if (values.length < 2) return false;
        const headers = values[0].map((h) => String(h).trim());
        const keyColIndex = headers.indexOf(keyHeader);
        const versionColIndex = headers.indexOf("RecordVersion");
        if (keyColIndex === -1) return false;
        for (let r = 1; r < values.length; r++) {
          if (String(values[r][keyColIndex]) === String(keyValue)) {
            if (versionColIndex !== -1 && currentVersion !== void 0) {
              const sheetVersion = Number(values[r][versionColIndex]);
              if (sheetVersion !== currentVersion) {
                throw new Error(`Concurrency Conflict: Record has been modified by another user. Current version: ${sheetVersion}`);
              }
              newObject["RecordVersion"] = sheetVersion + 1;
            }
            headers.forEach((header, cIndex) => {
              if (newObject[header] !== void 0) {
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
  };

  // src/services/PasswordService.ts
  var _PasswordService = class _PasswordService {
    /**
     * Hashes password using PBKDF2-HMAC-SHA256 with a unique random salt.
     * NEVER logs or stores plain-text password.
     */
    static hashPassword(password, customSalt, iterations = _PasswordService.DEFAULT_ITERATIONS) {
      const salt = customSalt || CryptoService.generateSalt(16);
      const hash = CryptoService.pbkdf2(password, salt, iterations);
      return { hash, salt, iterations };
    }
    /**
     * Verifies password using constant-time string comparison.
     */
    static verifyPassword(password, expectedHash, salt, iterations = _PasswordService.DEFAULT_ITERATIONS) {
      const { hash } = this.hashPassword(password, salt, iterations);
      return CryptoService.constantTimeCompare(hash, expectedHash);
    }
    /**
     * Hashes a one-time password reset token (SHA-256).
     */
    static hashResetToken(token) {
      return CryptoService.hashSha256(token);
    }
    /**
     * Generates a new random one-time reset token and its SHA-256 hash.
     */
    static generateResetToken() {
      const token = `reset-${CryptoService.generateUuid()}`;
      const tokenHash = this.hashResetToken(token);
      return { token, tokenHash };
    }
  };
  _PasswordService.DEFAULT_ITERATIONS = 1e5;
  var PasswordService = _PasswordService;

  // src/repositories/AccountRepository.ts
  var AccountRepository = class {
    constructor(sheetRepo) {
      const securitySsId = typeof PropertiesService !== "undefined" ? PropertiesService.getScriptProperties().getProperty("DB_SECURITY_SPREADSHEET_ID") : null;
      this.sheetRepo = sheetRepo || new SheetRepository(securitySsId || "1oOCXuIPbsEMy154OivVKqquFMt4wfK8LXqhNngH47M8");
    }
    /**
     * Finds user account by StaffID.
     */
    findByStaffId(staffId) {
      const rows = this.sheetRepo.getRows("USER_ACCOUNT");
      const user = rows.find((r) => String(r.StaffID).toUpperCase() === staffId.toUpperCase() && !r.IsDeleted);
      if (!user) return null;
      return {
        UserUUID: String(user.UserUUID),
        StaffID: String(user.StaffID),
        PasswordHash: String(user.PasswordHash),
        Salt: String(user.Salt),
        Iterations: Number(user.Iterations) || PasswordService.DEFAULT_ITERATIONS,
        FailedLoginCount: Number(user.FailedLoginCount) || 0,
        LockoutUntil: user.LockoutUntil ? String(user.LockoutUntil) : void 0,
        MustChangePassword: user.MustChangePassword === true || String(user.MustChangePassword) === "TRUE",
        AccountStatus: user.AccountStatus || "ACTIVE",
        ResetTokenHash: user.ResetTokenHash ? String(user.ResetTokenHash) : void 0,
        ResetTokenExpiresAt: user.ResetTokenExpiresAt ? String(user.ResetTokenExpiresAt) : void 0,
        CreatedAt: String(user.CreatedAt),
        CreatedBy: String(user.CreatedBy),
        UpdatedAt: String(user.UpdatedAt),
        UpdatedBy: String(user.UpdatedBy),
        RecordVersion: Number(user.RecordVersion) || 1,
        IsDeleted: user.IsDeleted === true || String(user.IsDeleted) === "TRUE"
      };
    }
    /**
     * Updates failed login count and triggers lockout if attempts >= 5. Wrapped in LockService.
     */
    handleFailedLogin(staffId) {
      return this.sheetRepo.executeWithLock(() => {
        const user = this.findByStaffId(staffId);
        if (!user) return { failedCount: 0, isLocked: false };
        const newFailedCount = user.FailedLoginCount + 1;
        let newStatus = user.AccountStatus;
        let lockoutUntil = user.LockoutUntil;
        if (newFailedCount >= 5) {
          newStatus = "LOCKED";
          lockoutUntil = new Date(Date.now() + 15 * 60 * 1e3).toISOString();
        }
        this.sheetRepo.updateRow(
          "USER_ACCOUNT",
          "StaffID",
          staffId,
          {
            FailedLoginCount: newFailedCount,
            AccountStatus: newStatus,
            LockoutUntil: lockoutUntil,
            UpdatedAt: (/* @__PURE__ */ new Date()).toISOString()
          },
          user.RecordVersion
        );
        return { failedCount: newFailedCount, isLocked: newFailedCount >= 5 };
      });
    }
    /**
     * Resets failed login counter and clears lockout status upon successful login.
     */
    resetFailedLogin(staffId) {
      const user = this.findByStaffId(staffId);
      if (!user) return;
      this.sheetRepo.updateRow(
        "USER_ACCOUNT",
        "StaffID",
        staffId,
        {
          FailedLoginCount: 0,
          LockoutUntil: "",
          AccountStatus: "ACTIVE",
          UpdatedAt: (/* @__PURE__ */ new Date()).toISOString()
        },
        user.RecordVersion
      );
    }
    /**
     * Updates user password hash, salt, and clears reset token.
     */
    updatePassword(staffId, newHash, newSalt) {
      const user = this.findByStaffId(staffId);
      if (!user) return;
      this.sheetRepo.updateRow(
        "USER_ACCOUNT",
        "StaffID",
        staffId,
        {
          PasswordHash: newHash,
          Salt: newSalt,
          MustChangePassword: false,
          ResetTokenHash: "",
          ResetTokenExpiresAt: "",
          UpdatedAt: (/* @__PURE__ */ new Date()).toISOString()
        },
        user.RecordVersion
      );
    }
    /**
     * Sets one-time password reset token hash and expiration.
     */
    setResetToken(staffId, tokenHash, expiresAt) {
      const user = this.findByStaffId(staffId);
      if (!user) return;
      this.sheetRepo.updateRow(
        "USER_ACCOUNT",
        "StaffID",
        staffId,
        {
          ResetTokenHash: tokenHash,
          ResetTokenExpiresAt: expiresAt,
          UpdatedAt: (/* @__PURE__ */ new Date()).toISOString()
        },
        user.RecordVersion
      );
    }
    /**
     * Creates a new user account with a hashed password.
     */
    createAccount(staffId, plainPassword, createdBy) {
      const existing = this.findByStaffId(staffId);
      if (existing) return;
      const { hash, salt, iterations } = PasswordService.hashPassword(plainPassword);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const userUuid = `usr-${Utilities.getUuid()}`;
      this.sheetRepo.appendRow(
        "USER_ACCOUNT",
        [
          "UserUUID",
          "StaffID",
          "PasswordHash",
          "Salt",
          "Iterations",
          "FailedLoginCount",
          "LockoutUntil",
          "MustChangePassword",
          "AccountStatus",
          "ResetTokenHash",
          "ResetTokenExpiresAt",
          "CreatedAt",
          "CreatedBy",
          "UpdatedAt",
          "UpdatedBy",
          "RecordVersion",
          "IsDeleted"
        ],
        {
          UserUUID: userUuid,
          StaffID: staffId,
          PasswordHash: hash,
          Salt: salt,
          Iterations: iterations,
          FailedLoginCount: 0,
          LockoutUntil: "",
          MustChangePassword: true,
          // Force password change on first login
          AccountStatus: "ACTIVE",
          ResetTokenHash: "",
          ResetTokenExpiresAt: "",
          CreatedAt: now,
          CreatedBy: createdBy,
          UpdatedAt: now,
          UpdatedBy: createdBy,
          RecordVersion: 1,
          IsDeleted: false
        }
      );
    }
  };

  // src/repositories/SessionRepository.ts
  var SessionRepository = class {
    constructor(sheetRepo) {
      const securitySsId = typeof PropertiesService !== "undefined" ? PropertiesService.getScriptProperties().getProperty("DB_SECURITY_SPREADSHEET_ID") : null;
      this.sheetRepo = sheetRepo || new SheetRepository(securitySsId || "1oOCXuIPbsEMy154OivVKqquFMt4wfK8LXqhNngH47M8");
    }
    /**
     * Saves a new session into SESSION sheet using LockService.
     */
    saveSession(session) {
      const headers = [
        "SessionUUID",
        "StaffID",
        "TokenHash",
        "IdleExpiresAt",
        "AbsoluteExpiresAt",
        "IpAddressHash",
        "UserAgent",
        "IsRevoked",
        "CreatedAt",
        "CreatedBy",
        "UpdatedAt",
        "UpdatedBy",
        "RecordVersion",
        "IsDeleted"
      ];
      const rowObj = {
        SessionUUID: session.sessionUuid,
        StaffID: session.staffId,
        TokenHash: session.tokenHash,
        IdleExpiresAt: session.idleExpiresAt,
        AbsoluteExpiresAt: session.absoluteExpiresAt,
        IpAddressHash: "",
        UserAgent: "",
        IsRevoked: false,
        CreatedAt: session.createdAt,
        CreatedBy: session.staffId,
        UpdatedAt: session.createdAt,
        UpdatedBy: session.staffId,
        RecordVersion: 1,
        IsDeleted: false
      };
      this.sheetRepo.appendRow("SESSION", headers, rowObj);
    }
    /**
     * Finds session by SHA-256 TokenHash.
     */
    findByTokenHash(tokenHash) {
      const rows = this.sheetRepo.getRows("SESSION");
      const match = rows.find((r) => String(r.TokenHash) === tokenHash && !r.IsDeleted);
      if (!match) return null;
      return {
        sessionUuid: String(match.SessionUUID),
        staffId: String(match.StaffID),
        tokenHash: String(match.TokenHash),
        idleExpiresAt: String(match.IdleExpiresAt),
        absoluteExpiresAt: String(match.AbsoluteExpiresAt),
        sessionVersion: Number(match.RecordVersion) || 1,
        isRevoked: match.IsRevoked === true || String(match.IsRevoked) === "TRUE",
        lastSeenAt: String(match.UpdatedAt || match.CreatedAt),
        createdAt: String(match.CreatedAt)
      };
    }
    /**
     * Revokes a single session by token hash.
     */
    revokeSession(tokenHash) {
      const session = this.findByTokenHash(tokenHash);
      if (!session) return;
      this.sheetRepo.updateRow(
        "SESSION",
        "TokenHash",
        tokenHash,
        {
          IsRevoked: true,
          UpdatedAt: (/* @__PURE__ */ new Date()).toISOString()
        },
        session.sessionVersion
      );
    }
    /**
     * Revokes ALL active sessions for a given StaffID (e.g. on password change or account disable).
     */
    revokeAllSessionsForStaff(staffId) {
      const rows = this.sheetRepo.getRows("SESSION");
      rows.forEach((r) => {
        if (String(r.StaffID).toUpperCase() === staffId.toUpperCase() && !r.IsRevoked) {
          this.sheetRepo.updateRow("SESSION", "TokenHash", String(r.TokenHash), {
            IsRevoked: true,
            UpdatedAt: (/* @__PURE__ */ new Date()).toISOString()
          });
        }
      });
    }
    /**
     * HIGH-01 Patch: Purges expired or revoked session entries to prevent unbounded table growth.
     */
    purgeExpiredSessions() {
      return this.sheetRepo.executeWithLock(() => {
        const sheet = this.sheetRepo.getSheet("SESSION");
        const rows = this.sheetRepo.getRows("SESSION");
        const now = (/* @__PURE__ */ new Date()).toISOString();
        let purgedCount = 0;
        for (let i = rows.length - 1; i >= 0; i--) {
          const absExp = String(rows[i].AbsoluteExpiresAt || rows[i].AbsoluteExpiration || "");
          const isRevoked = rows[i].IsRevoked === true || String(rows[i].IsRevoked) === "TRUE";
          if (isRevoked || absExp && absExp < now) {
            sheet.deleteRow(i + 2);
            purgedCount++;
          }
        }
        return purgedCount;
      });
    }
  };

  // src/repositories/StaffRepository.ts
  var StaffRepository = class {
    constructor(sheetRepo) {
      const clinicalSsId = typeof PropertiesService !== "undefined" ? PropertiesService.getScriptProperties().getProperty("DB_CLINICAL_SPREADSHEET_ID") : null;
      this.sheetRepo = sheetRepo || new SheetRepository(clinicalSsId || "1IFJOErjojIQJq02l6i2a022EEy7YIrh1eRTwpxzXJRE");
    }
    /**
     * Maps raw sheet row to StaffRecordDTO.
     */
    mapRowToDTO(row) {
      return {
        RecordUUID: String(row.RecordUUID || row.StaffID),
        StaffID: String(row.StaffID),
        HN: row.HN ? String(row.HN) : void 0,
        FirstName: String(row.FirstName || ""),
        LastName: String(row.LastName || ""),
        DateOfBirth: String(row.DateOfBirth || ""),
        Sex: row.Sex || row.Gender || "OTHER",
        BloodGroup: String(row.BloodGroup || ""),
        Address: String(row.Address || ""),
        EmergencyPhone: String(row.EmergencyPhone || row.EmergencyContactPhone || ""),
        Email: String(row.Email || ""),
        DepartmentCode: String(row.DepartmentCode || row.Department || ""),
        WorkGroup: row.WorkGroup || "BACKOFFICE",
        EmploymentStatus: row.EmploymentStatus || row.Status || "ACTIVE",
        StartDate: String(row.StartDate || row.CreatedAt || ""),
        EndDate: row.EndDate ? String(row.EndDate) : void 0,
        CreatedAt: String(row.CreatedAt || (/* @__PURE__ */ new Date()).toISOString()),
        CreatedBy: String(row.CreatedBy || "SYSTEM"),
        UpdatedAt: String(row.UpdatedAt || (/* @__PURE__ */ new Date()).toISOString()),
        UpdatedBy: String(row.UpdatedBy || "SYSTEM"),
        RecordVersion: Number(row.RecordVersion) || 1,
        IsDeleted: row.IsDeleted === true || String(row.IsDeleted) === "TRUE"
      };
    }
    /**
     * Finds active staff record by StaffID.
     */
    findByStaffId(staffId, includeDeleted = false) {
      const rows = this.sheetRepo.getRows("STAFF");
      const match = rows.find((r) => {
        const isStaffMatch = String(r.StaffID).toUpperCase() === staffId.toUpperCase();
        const isNotDeleted = !r.IsDeleted || String(r.IsDeleted) === "FALSE";
        return isStaffMatch && (includeDeleted || isNotDeleted);
      });
      return match ? this.mapRowToDTO(match) : null;
    }
    /**
     * Lists all active staff records.
     */
    findAll(includeDeleted = false) {
      const rows = this.sheetRepo.getRows("STAFF");
      return rows.map((r) => this.mapRowToDTO(r)).filter((dto) => includeDeleted || !dto.IsDeleted);
    }
    /**
     * Inserts a new staff record into STAFF sheet. Wrapped in LockService.
     */
    createStaff(dto, createdBy) {
      return this.sheetRepo.executeWithLock(() => {
        const existing = this.findByStaffId(dto.StaffID, true);
        if (existing) {
          throw new Error(`Duplicate StaffID: \u0E23\u0E2B\u0E31\u0E2A\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19 '${dto.StaffID}' \u0E21\u0E35\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A\u0E41\u0E25\u0E49\u0E27`);
        }
        const now = (/* @__PURE__ */ new Date()).toISOString();
        const recordUuid = `staff-${CryptoService.generateUuid()}`;
        const headers = [
          "StaffID",
          "HN",
          "FirstName",
          "LastName",
          "DateOfBirth",
          "Gender",
          "BloodGroup",
          "Department",
          "WorkGroup",
          "Email",
          "Phone",
          "EmergencyContactName",
          "EmergencyContactPhone",
          "Status",
          "CreatedAt",
          "CreatedBy",
          "UpdatedAt",
          "UpdatedBy",
          "RecordVersion",
          "IsDeleted"
        ];
        const rowObj = {
          RecordUUID: recordUuid,
          StaffID: dto.StaffID.toUpperCase(),
          HN: dto.HN || "",
          FirstName: dto.FirstName,
          LastName: dto.LastName,
          DateOfBirth: dto.DateOfBirth,
          Gender: dto.Sex,
          BloodGroup: dto.BloodGroup,
          Department: dto.DepartmentCode,
          DepartmentCode: dto.DepartmentCode,
          WorkGroup: dto.WorkGroup,
          Email: dto.Email,
          Phone: dto.EmergencyPhone,
          Address: dto.Address,
          EmergencyContactPhone: dto.EmergencyPhone,
          EmergencyPhone: dto.EmergencyPhone,
          Status: dto.EmploymentStatus,
          EmploymentStatus: dto.EmploymentStatus,
          StartDate: dto.StartDate,
          EndDate: dto.EndDate || "",
          CreatedAt: now,
          CreatedBy: createdBy,
          UpdatedAt: now,
          UpdatedBy: createdBy,
          RecordVersion: 1,
          IsDeleted: false
        };
        this.sheetRepo.appendRow("STAFF", headers, rowObj);
        return this.mapRowToDTO(rowObj);
      });
    }
    /**
     * Updates an existing staff record with optimistic version check.
     */
    updateStaff(staffId, dto, updatedBy) {
      return this.sheetRepo.executeWithLock(() => {
        const existing = this.findByStaffId(staffId, false);
        if (!existing) {
          throw new Error(`Staff record for '${staffId}' not found or has been deleted.`);
        }
        if (existing.RecordVersion !== dto.RecordVersion) {
          throw new Error(`Concurrency Conflict: Record version mismatch. Current: ${existing.RecordVersion}, Provided: ${dto.RecordVersion}`);
        }
        const now = (/* @__PURE__ */ new Date()).toISOString();
        const updatedFields = {
          UpdatedAt: now,
          UpdatedBy: updatedBy
        };
        if (dto.HN !== void 0) updatedFields["HN"] = dto.HN;
        if (dto.FirstName !== void 0) updatedFields["FirstName"] = dto.FirstName;
        if (dto.LastName !== void 0) updatedFields["LastName"] = dto.LastName;
        if (dto.DateOfBirth !== void 0) updatedFields["DateOfBirth"] = dto.DateOfBirth;
        if (dto.Sex !== void 0) updatedFields["Gender"] = dto.Sex;
        if (dto.BloodGroup !== void 0) updatedFields["BloodGroup"] = dto.BloodGroup;
        if (dto.Address !== void 0) updatedFields["Address"] = dto.Address;
        if (dto.EmergencyPhone !== void 0) updatedFields["EmergencyPhone"] = dto.EmergencyPhone;
        if (dto.Email !== void 0) updatedFields["Email"] = dto.Email;
        if (dto.DepartmentCode !== void 0) updatedFields["Department"] = dto.DepartmentCode;
        if (dto.WorkGroup !== void 0) updatedFields["WorkGroup"] = dto.WorkGroup;
        if (dto.EmploymentStatus !== void 0) updatedFields["Status"] = dto.EmploymentStatus;
        this.sheetRepo.updateRow("STAFF", "StaffID", staffId, updatedFields, existing.RecordVersion);
        return this.findByStaffId(staffId);
      });
    }
    /**
     * Soft deletes a staff record (`IsDeleted = true`).
     */
    softDeleteStaff(staffId, updatedBy) {
      return this.sheetRepo.executeWithLock(() => {
        const existing = this.findByStaffId(staffId, false);
        if (!existing) return false;
        const now = (/* @__PURE__ */ new Date()).toISOString();
        return this.sheetRepo.updateRow(
          "STAFF",
          "StaffID",
          staffId,
          {
            IsDeleted: true,
            Status: "RESIGNED",
            UpdatedAt: now,
            UpdatedBy: updatedBy
          },
          existing.RecordVersion
        );
      });
    }
  };

  // src/services/SessionService.ts
  var SessionService = class {
    /**
     * Hashes session token using SHA-256.
     */
    static hashToken(token) {
      return CryptoService.hashSha256(token);
    }
    /**
     * Generates a new random cryptographic session token and session data object.
     * Stores ONLY the token hash in database.
     */
    static createSession(staffId) {
      const rawToken = `sess-${CryptoService.generateUuid()}`;
      const tokenHash = this.hashToken(rawToken);
      const now = /* @__PURE__ */ new Date();
      const idleExpires = new Date(now.getTime() + this.IDLE_TIMEOUT_MINS * 60 * 1e3);
      const absoluteExpires = new Date(now.getTime() + this.ABSOLUTE_TIMEOUT_HOURS * 60 * 60 * 1e3);
      const session = {
        sessionUuid: `sess-uuid-${CryptoService.generateUuid()}`,
        staffId,
        tokenHash,
        idleExpiresAt: idleExpires.toISOString(),
        absoluteExpiresAt: absoluteExpires.toISOString(),
        sessionVersion: 1,
        isRevoked: false,
        lastSeenAt: now.toISOString(),
        createdAt: now.toISOString()
      };
      return { token: rawToken, session };
    }
    /**
     * Checks if session is valid (Not expired, not revoked).
     */
    static isValidSession(session) {
      if (session.isRevoked) return false;
      const now = (/* @__PURE__ */ new Date()).getTime();
      const idleTime = new Date(session.idleExpiresAt).getTime();
      const absoluteTime = new Date(session.absoluteExpiresAt).getTime();
      if (now > idleTime || now > absoluteTime) return false;
      return true;
    }
  };
  SessionService.IDLE_TIMEOUT_MINS = 30;
  SessionService.ABSOLUTE_TIMEOUT_HOURS = 12;

  // src/services/RateLimitService.ts
  var RateLimitService = class {
    // 15 minutes
    /**
     * Checks if an identifier (StaffID or IP) is rate-limited.
     */
    static isRateLimited(identifier) {
      const cache = CacheService.getScriptCache();
      if (!cache) return false;
      const attempts = Number(cache.get(`rate_${identifier}`) || "0");
      return attempts >= this.MAX_ATTEMPTS;
    }
    /**
     * Increments failed attempt counter in CacheService.
     */
    static incrementAttempts(identifier) {
      const cache = CacheService.getScriptCache();
      if (!cache) return 1;
      const key = `rate_${identifier}`;
      const attempts = Number(cache.get(key) || "0") + 1;
      cache.put(key, String(attempts), this.LOCKOUT_SECONDS);
      return attempts;
    }
    /**
     * Resets rate limit attempt counter upon successful authentication.
     */
    static resetAttempts(identifier) {
      const cache = CacheService.getScriptCache();
      if (cache) {
        cache.remove(`rate_${identifier}`);
      }
    }
  };
  RateLimitService.MAX_ATTEMPTS = 5;
  RateLimitService.LOCKOUT_SECONDS = 900;

  // src/controllers/AuthController.ts
  var _AuthController = class _AuthController {
    constructor(accountRepo, sessionRepo, staffRepo) {
      this.accountRepo = accountRepo || new AccountRepository();
      this.sessionRepo = sessionRepo || new SessionRepository();
      this.staffRepo = staffRepo || new StaffRepository();
    }
    /**
     * Handle User Login
     */
    login(staffId, password, requestId) {
      if (!staffId || !password) {
        return ResponseHelper.error("INVALID_INPUT", _AuthController.GENERIC_AUTH_ERROR, requestId, 400);
      }
      if (RateLimitService.isRateLimited(staffId)) {
        return ResponseHelper.error(
          "TOO_MANY_REQUESTS",
          "\u0E1E\u0E22\u0E32\u0E22\u0E32\u0E21\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14\u0E40\u0E01\u0E34\u0E19\u0E01\u0E33\u0E2B\u0E19\u0E14 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48\u0E43\u0E19\u0E2D\u0E35\u0E01 15 \u0E19\u0E32\u0E17\u0E35",
          requestId,
          429
        );
      }
      const account = this.accountRepo.findByStaffId(staffId);
      if (!account) {
        RateLimitService.incrementAttempts(staffId);
        return ResponseHelper.error("INVALID_CREDENTIALS", _AuthController.GENERIC_AUTH_ERROR, requestId, 401);
      }
      if (account.AccountStatus === "DISABLED") {
        return ResponseHelper.error("ACCOUNT_DISABLED", "\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E19\u0E35\u0E49\u0E16\u0E39\u0E01\u0E23\u0E30\u0E07\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19", requestId, 403);
      }
      if (account.AccountStatus === "LOCKED" && account.LockoutUntil) {
        const lockoutExpiry = new Date(account.LockoutUntil).getTime();
        if (Date.now() < lockoutExpiry) {
          return ResponseHelper.error(
            "ACCOUNT_LOCKED",
            "\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E16\u0E39\u0E01\u0E25\u0E47\u0E2D\u0E01\u0E0A\u0E31\u0E48\u0E27\u0E04\u0E23\u0E32\u0E27\u0E40\u0E19\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E32\u0E01\u0E43\u0E2A\u0E48\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E1C\u0E34\u0E14\u0E40\u0E01\u0E34\u0E19 5 \u0E04\u0E23\u0E31\u0E49\u0E07 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48\u0E20\u0E32\u0E22\u0E2B\u0E25\u0E31\u0E07",
            requestId,
            423
          );
        }
      }
      const isValid = PasswordService.verifyPassword(password, account.PasswordHash, account.Salt, account.Iterations);
      if (!isValid) {
        RateLimitService.incrementAttempts(staffId);
        const { failedCount, isLocked } = this.accountRepo.handleFailedLogin(staffId);
        const msg = isLocked ? "\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E16\u0E39\u0E01\u0E25\u0E47\u0E2D\u0E01\u0E0A\u0E31\u0E48\u0E27\u0E04\u0E23\u0E32\u0E27\u0E40\u0E19\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E32\u0E01\u0E43\u0E2A\u0E48\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E1C\u0E34\u0E14\u0E04\u0E23\u0E1A 5 \u0E04\u0E23\u0E31\u0E49\u0E07" : _AuthController.GENERIC_AUTH_ERROR;
        return ResponseHelper.error("INVALID_CREDENTIALS", msg, requestId, 401);
      }
      RateLimitService.resetAttempts(staffId);
      this.accountRepo.resetFailedLogin(staffId);
      const { token, session } = SessionService.createSession(staffId);
      this.sessionRepo.saveSession(session);
      const staff = this.staffRepo.findByStaffId(staffId);
      const userRole = account.FunctionalRole || "DATA_OWNER";
      return ResponseHelper.success(
        {
          token,
          staffId: account.StaffID,
          role: userRole,
          userLevel: account.UserLevel || "NORMAL_USER",
          firstName: staff ? staff.FirstName : account.StaffID,
          lastName: staff ? staff.LastName : "",
          department: staff ? staff.DepartmentCode : "General",
          workGroup: staff ? staff.WorkGroup : "CLINICAL",
          email: staff ? staff.Email : "",
          mustChangePassword: account.MustChangePassword
        },
        requestId
      );
    }
    /**
     * Handle Password Change (Revokes ALL active sessions on success)
     */
    changePassword(staffId, oldPassword, newPassword, requestId) {
      if (!oldPassword || !newPassword || newPassword.length < 8) {
        return ResponseHelper.error("INVALID_INPUT", "\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E43\u0E2B\u0E21\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35\u0E04\u0E27\u0E32\u0E21\u0E22\u0E32\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 8 \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23", requestId, 400);
      }
      const account = this.accountRepo.findByStaffId(staffId);
      if (!account) {
        return ResponseHelper.error("NOT_FOUND", "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19", requestId, 404);
      }
      const isValid = PasswordService.verifyPassword(oldPassword, account.PasswordHash, account.Salt, account.Iterations);
      if (!isValid) {
        return ResponseHelper.error("INVALID_PASSWORD", "\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E40\u0E14\u0E34\u0E21\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07", requestId, 400);
      }
      const { hash, salt } = PasswordService.hashPassword(newPassword);
      this.accountRepo.updatePassword(staffId, hash, salt);
      this.sessionRepo.revokeAllSessionsForStaff(staffId);
      return ResponseHelper.success({ message: "\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08 \u0E41\u0E25\u0E30\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E40\u0E0B\u0E2A\u0E0A\u0E31\u0E19\u0E40\u0E14\u0E34\u0E21\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22" }, requestId);
    }
    /**
     * Request Password Reset (Generates one-time token hash; NO plain-text password sent in email)
     */
    requestResetToken(staffId, requestId) {
      const account = this.accountRepo.findByStaffId(staffId);
      if (account) {
        const { tokenHash } = PasswordService.generateResetToken();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1e3).toISOString();
        this.accountRepo.setResetToken(staffId, tokenHash, expiresAt);
      }
      return ResponseHelper.success({ message: "\u0E2B\u0E32\u0E01\u0E23\u0E2B\u0E31\u0E2A\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07 \u0E23\u0E30\u0E1A\u0E1A\u0E44\u0E14\u0E49\u0E2A\u0E48\u0E07\u0E04\u0E33\u0E02\u0E2D\u0E23\u0E35\u0E40\u0E0B\u0E47\u0E15\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E41\u0E25\u0E49\u0E27" }, requestId);
    }
    /**
     * Perform One-Time Token Reset Password (Revokes ALL active sessions on success)
     */
    resetPassword(payload, requestId) {
      const { staffId, resetToken, newPassword } = payload;
      if (!staffId || !resetToken || !newPassword || newPassword.length < 8) {
        return ResponseHelper.error("INVALID_INPUT", "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E01\u0E32\u0E23\u0E23\u0E35\u0E40\u0E0B\u0E47\u0E15\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E44\u0E21\u0E48\u0E04\u0E23\u0E1A\u0E16\u0E49\u0E27\u0E19", requestId, 400);
      }
      const account = this.accountRepo.findByStaffId(staffId);
      if (!account || !account.ResetTokenHash || !account.ResetTokenExpiresAt) {
        return ResponseHelper.error("INVALID_TOKEN", "Reset Token \u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E2B\u0E23\u0E37\u0E2D\u0E2B\u0E21\u0E14\u0E2D\u0E32\u0E22\u0E38", requestId, 400);
      }
      if (Date.now() > new Date(account.ResetTokenExpiresAt).getTime()) {
        return ResponseHelper.error("TOKEN_EXPIRED", "Reset Token \u0E2B\u0E21\u0E14\u0E2D\u0E32\u0E22\u0E38\u0E41\u0E25\u0E49\u0E27 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E2A\u0E48\u0E07\u0E04\u0E33\u0E02\u0E2D\u0E43\u0E2B\u0E21\u0E48", requestId, 400);
      }
      const inputTokenHash = PasswordService.hashResetToken(resetToken);
      if (!CryptoService.constantTimeCompare(inputTokenHash, account.ResetTokenHash)) {
        return ResponseHelper.error("INVALID_TOKEN", "Reset Token \u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07", requestId, 400);
      }
      const { hash, salt } = PasswordService.hashPassword(newPassword);
      this.accountRepo.updatePassword(staffId, hash, salt);
      this.sessionRepo.revokeAllSessionsForStaff(staffId);
      return ResponseHelper.success({ message: "\u0E23\u0E35\u0E40\u0E0B\u0E47\u0E15\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E43\u0E2B\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08 \u0E41\u0E25\u0E30\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E40\u0E0B\u0E2A\u0E0A\u0E31\u0E19\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22" }, requestId);
    }
    /**
     * Handle Logout
     */
    logout(rawToken, requestId) {
      if (rawToken) {
        const tokenHash = SessionService.hashToken(rawToken);
        this.sessionRepo.revokeSession(tokenHash);
      }
      return ResponseHelper.success({ message: "\u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E23\u0E30\u0E1A\u0E1A\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08" }, requestId);
    }
  };
  /**
   * Generic Error Message to prevent Account Enumeration.
   */
  _AuthController.GENERIC_AUTH_ERROR = "\u0E23\u0E2B\u0E31\u0E2A\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E2B\u0E23\u0E37\u0E2D\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07";
  var AuthController = _AuthController;

  // src/dto/StaffDTO.ts
  var StaffValidationSchema = class {
    static validateCreate(dto) {
      const errors = [];
      if (!dto.StaffID || !this.STAFF_ID_REGEX.test(dto.StaffID.toUpperCase())) {
        errors.push("\u0E23\u0E2B\u0E31\u0E2A\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19 (StaffID) \u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E2D\u0E31\u0E01\u0E29\u0E23\u0E20\u0E32\u0E29\u0E32\u0E2D\u0E31\u0E07\u0E01\u0E24\u0E29\u0E2B\u0E23\u0E37\u0E2D\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02 4-10 \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23");
      }
      if (!dto.FirstName || dto.FirstName.trim().length === 0) {
        errors.push("\u0E0A\u0E37\u0E48\u0E2D (FirstName) \u0E40\u0E1B\u0E47\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E08\u0E33\u0E40\u0E1B\u0E47\u0E19");
      }
      if (!dto.LastName || dto.LastName.trim().length === 0) {
        errors.push("\u0E19\u0E32\u0E21\u0E2A\u0E01\u0E38\u0E25 (LastName) \u0E40\u0E1B\u0E47\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E08\u0E33\u0E40\u0E1B\u0E47\u0E19");
      }
      if (!dto.Email || !this.EMAIL_REGEX.test(dto.Email)) {
        errors.push("\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E2D\u0E35\u0E40\u0E21\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
      }
      if (!dto.DateOfBirth || !this.DATE_REGEX.test(dto.DateOfBirth)) {
        errors.push("\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E27\u0E31\u0E19\u0E40\u0E01\u0E34\u0E14\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19 YYYY-MM-DD");
      }
      if (!dto.WorkGroup || !["CLINICAL", "FRONTLINE", "BACKOFFICE"].includes(dto.WorkGroup)) {
        errors.push("\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19 (WorkGroup) \u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19 CLINICAL, FRONTLINE \u0E2B\u0E23\u0E37\u0E2D BACKOFFICE");
      }
      if (!dto.Sex || !["MALE", "FEMALE", "OTHER"].includes(dto.Sex)) {
        errors.push("\u0E40\u0E1E\u0E28 (Sex) \u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19 MALE, FEMALE \u0E2B\u0E23\u0E37\u0E2D OTHER");
      }
      return { isValid: errors.length === 0, errors };
    }
  };
  StaffValidationSchema.EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  StaffValidationSchema.STAFF_ID_REGEX = /^[A-Z0-9]{4,10}$/;
  StaffValidationSchema.DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

  // src/services/StaffService.ts
  var StaffService = class {
    constructor(staffRepo) {
      this.staffRepo = staffRepo || new StaffRepository();
    }
    /**
     * Retrieves single staff record by StaffID.
     */
    getStaffByStaffId(staffId) {
      return this.staffRepo.findByStaffId(staffId);
    }
    /**
     * Searches, filters, and paginates staff records.
     */
    searchStaff(query) {
      const allRecords = this.staffRepo.findAll(false);
      const { keyword, departmentCode, workGroup, employmentStatus, page = 1, limit = 10 } = query;
      const filtered = allRecords.filter((s) => {
        if (keyword) {
          const kw = keyword.toLowerCase();
          const matchesKw = s.StaffID.toLowerCase().includes(kw) || s.FirstName.toLowerCase().includes(kw) || s.LastName.toLowerCase().includes(kw) || s.Email.toLowerCase().includes(kw) || s.DepartmentCode.toLowerCase().includes(kw);
          if (!matchesKw) return false;
        }
        if (departmentCode && s.DepartmentCode.toUpperCase() !== departmentCode.toUpperCase()) {
          return false;
        }
        if (workGroup && s.WorkGroup !== workGroup) {
          return false;
        }
        if (employmentStatus && s.EmploymentStatus !== employmentStatus) {
          return false;
        }
        return true;
      });
      const totalCount = filtered.length;
      const totalPages = Math.ceil(totalCount / limit) || 1;
      const validPage = Math.max(1, Math.min(page, totalPages));
      const startIndex = (validPage - 1) * limit;
      const paginatedItems = filtered.slice(startIndex, startIndex + limit);
      return {
        items: paginatedItems,
        totalCount,
        page: validPage,
        limit,
        totalPages
      };
    }
    /**
     * Creates new staff record with validation & duplicate check.
     */
    createStaff(dto, createdBy) {
      const validation = StaffValidationSchema.validateCreate(dto);
      if (!validation.isValid) {
        throw new Error(`Validation Error: ${validation.errors.join(", ")}`);
      }
      return this.staffRepo.createStaff(dto, createdBy);
    }
    /**
     * Updates an existing staff record.
     */
    updateStaff(staffId, dto, updatedBy) {
      if (dto.Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dto.Email)) {
        throw new Error("Validation Error: \u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E2D\u0E35\u0E40\u0E21\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
      }
      if (dto.WorkGroup && !["CLINICAL", "FRONTLINE", "BACKOFFICE"].includes(dto.WorkGroup)) {
        throw new Error("Validation Error: \u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19 CLINICAL, FRONTLINE \u0E2B\u0E23\u0E37\u0E2D BACKOFFICE");
      }
      return this.staffRepo.updateStaff(staffId, dto, updatedBy);
    }
    /**
     * Soft deletes a staff record.
     */
    deleteStaff(staffId, deletedBy) {
      return this.staffRepo.softDeleteStaff(staffId, deletedBy);
    }
  };

  // src/policies/RecordAccessPolicy.ts
  var RecordAccessPolicy = class {
    /**
     * Checks if a user has access to a specific staff member's record (IDOR Protection).
     */
    static canAccessRecord(userRole, userStaffId, targetStaffId) {
      if (userRole === "INFECTION_CONTROL" || userRole === "PHYSICIAN" || userRole === "HR") {
        return true;
      }
      if (userRole === "DATA_OWNER") {
        return userStaffId.toUpperCase() === targetStaffId.toUpperCase();
      }
      return false;
    }
    /**
     * Checks if a user can edit/modify a staff member's health record.
     */
    static canModifyHealthRecord(userRole) {
      return userRole === "INFECTION_CONTROL" || userRole === "PHYSICIAN";
    }
  };

  // src/middleware/AuthorizationMiddleware.ts
  var AuthorizationMiddleware = class {
    /**
     * Authorizes an API Request on Backend.
     * Enforces Action-Level, Record-Level (IDOR Protection), and logs Audit Action on sensitive view.
     */
    static authorize(userRole, userStaffId, action, targetStaffId, requestId) {
      const reqId = requestId || CryptoService.generateUuid();
      const allowedActions = this.ROLE_PERMISSIONS[userRole] || [];
      if (!allowedActions.includes(action)) {
        return {
          isAuthorized: false,
          errorResponse: ResponseHelper.error(
            "FORBIDDEN",
            `\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E1A\u0E17\u0E1A\u0E32\u0E17 '${userRole}' \u0E44\u0E21\u0E48\u0E2D\u0E19\u0E38\u0E0D\u0E32\u0E15\u0E43\u0E2B\u0E49\u0E17\u0E33\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23 '${action}'`,
            reqId,
            403
          )
        };
      }
      if (targetStaffId) {
        const canAccess = RecordAccessPolicy.canAccessRecord(userRole, userStaffId, targetStaffId);
        if (!canAccess) {
          return {
            isAuthorized: false,
            errorResponse: ResponseHelper.error(
              "IDOR_FORBIDDEN",
              `\u0E44\u0E21\u0E48\u0E2D\u0E19\u0E38\u0E0D\u0E32\u0E15\u0E43\u0E2B\u0E49\u0E40\u0E02\u0E49\u0E32\u0E16\u0E36\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2A\u0E38\u0E02\u0E20\u0E32\u0E1E\u0E02\u0E2D\u0E07 StaffID '${targetStaffId}'`,
              reqId,
              403
            )
          };
        }
      }
      if ((userRole === "INFECTION_CONTROL" || userRole === "PHYSICIAN") && action === "READ_HEALTH_RECORDS" && targetStaffId) {
        this.logSensitiveMedicalView(userRole, userStaffId, targetStaffId);
      }
      return { isAuthorized: true };
    }
    /**
     * Audit logging for sensitive medical record view.
     */
    static logSensitiveMedicalView(userRole, userStaffId, targetStaffId) {
      try {
        const ssId = PropertiesService.getScriptProperties().getProperty("DB_AUDIT_SPREADSHEET_ID");
        if (!ssId) return;
        const ss = SpreadsheetApp.openById(ssId);
        const sheet = ss.getSheetByName("AUDIT_LOG");
        if (!sheet) return;
        const now = (/* @__PURE__ */ new Date()).toISOString();
        const logUuid = `log-${CryptoService.generateUuid()}`;
        const action = "SENSITIVE_RECORD_VIEW";
        const target = `Staff:${targetStaffId}/HealthRecord`;
        const details = JSON.stringify({ viewedBy: userStaffId, role: userRole });
        const lastRow = sheet.getLastRow();
        let prevHash = "0000000000000000000000000000000000000000000000000000000000000000";
        if (lastRow > 1) {
          prevHash = String(sheet.getRange(lastRow, 9).getValue());
        }
        const currentHash = CryptoService.computeAuditEntryHash(logUuid, now, userStaffId, action, target, details, prevHash);
        sheet.appendRow([
          logUuid,
          now,
          userStaffId,
          userRole,
          action,
          target,
          details,
          prevHash,
          currentHash,
          now,
          userStaffId,
          now,
          userStaffId,
          1,
          false
        ]);
      } catch {
      }
    }
  };
  // Action Permissions Map for 4 Roles
  AuthorizationMiddleware.ROLE_PERMISSIONS = {
    INFECTION_CONTROL: [
      "READ_STAFF_LIST",
      "READ_STAFF_SELF",
      "READ_HEALTH_RECORDS",
      "CREATE_HEALTH_RECORD",
      "UPDATE_HEALTH_RECORD",
      "VERIFY_DOCUMENT",
      "MANAGE_RULE_ENGINE",
      "EXPORT_HEALTH_DATA",
      "READ_AUDIT_LOGS"
    ],
    HR: [
      "READ_STAFF_LIST",
      "READ_STAFF_SELF",
      "READ_HEALTH_RECORDS",
      "IMPORT_STAFF_MASTER",
      "EXPORT_HEALTH_DATA"
    ],
    PHYSICIAN: [
      "READ_STAFF_LIST",
      "READ_STAFF_SELF",
      "READ_HEALTH_RECORDS",
      "CREATE_HEALTH_RECORD",
      "UPDATE_HEALTH_RECORD",
      "VERIFY_DOCUMENT",
      "PHYSICIAN_ASSESSMENT",
      "MANAGE_RULE_ENGINE",
      "EXPORT_HEALTH_DATA"
    ],
    DATA_OWNER: [
      "READ_STAFF_SELF",
      "READ_HEALTH_RECORDS",
      "CREATE_HEALTH_RECORD",
      "EXPORT_HEALTH_DATA"
    ],
    SUPERUSER: [
      "READ_STAFF_LIST",
      "READ_STAFF_SELF",
      "READ_HEALTH_RECORDS",
      "CREATE_HEALTH_RECORD",
      "UPDATE_HEALTH_RECORD",
      "VERIFY_DOCUMENT",
      "PHYSICIAN_ASSESSMENT",
      "MANAGE_RULE_ENGINE",
      "IMPORT_STAFF_MASTER",
      "EXPORT_HEALTH_DATA",
      "READ_AUDIT_LOGS",
      "MANAGE_SUPERUSER_STATUS"
    ],
    ADMIN: [
      "READ_STAFF_LIST",
      "READ_STAFF_SELF",
      "READ_HEALTH_RECORDS",
      "CREATE_HEALTH_RECORD",
      "UPDATE_HEALTH_RECORD",
      "VERIFY_DOCUMENT",
      "PHYSICIAN_ASSESSMENT",
      "MANAGE_RULE_ENGINE",
      "IMPORT_STAFF_MASTER",
      "EXPORT_HEALTH_DATA",
      "READ_AUDIT_LOGS",
      "MANAGE_SUPERUSER_STATUS"
    ],
    NORMAL_USER: [
      "READ_STAFF_SELF",
      "READ_HEALTH_RECORDS",
      "CREATE_HEALTH_RECORD",
      "EXPORT_HEALTH_DATA"
    ]
  };

  // src/controllers/StaffController.ts
  var StaffController = class {
    constructor(staffService) {
      this.staffService = staffService || new StaffService();
    }
    /**
     * Get single staff record by StaffID.
     * Enforces IDOR Check for Data Owner.
     */
    getStaff(userRole, userStaffId, targetStaffId, requestId) {
      const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, "READ_STAFF_SELF", targetStaffId, requestId);
      if (!auth.isAuthorized) {
        return auth.errorResponse;
      }
      const staff = this.staffService.getStaffByStaffId(targetStaffId);
      if (!staff) {
        return ResponseHelper.error("NOT_FOUND", `\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E1A\u0E38\u0E04\u0E25\u0E32\u0E01\u0E23\u0E23\u0E2B\u0E31\u0E2A '${targetStaffId}'`, requestId, 404);
      }
      return ResponseHelper.success(staff, requestId);
    }
    /**
     * Search and List staff records.
     */
    listStaff(userRole, userStaffId, payload, requestId) {
      const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, "READ_STAFF_LIST", void 0, requestId);
      if (!auth.isAuthorized) {
        return auth.errorResponse;
      }
      const result = this.staffService.searchStaff({
        keyword: payload.keyword,
        departmentCode: payload.departmentCode,
        workGroup: payload.workGroup,
        employmentStatus: payload.employmentStatus,
        page: Number(payload.page) || 1,
        limit: Number(payload.limit) || 10
      });
      return ResponseHelper.success(result, requestId);
    }
    /**
     * Create new staff record (HR only).
     */
    createStaff(userRole, userStaffId, payload, requestId) {
      const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, "IMPORT_STAFF_MASTER", void 0, requestId);
      if (!auth.isAuthorized) {
        return auth.errorResponse;
      }
      try {
        const created = this.staffService.createStaff(payload, userStaffId);
        return ResponseHelper.success(created, requestId);
      } catch (err) {
        return ResponseHelper.error("CREATE_FAILED", err.message, requestId, 400);
      }
    }
    /**
     * Update staff record (HR / Elevated roles).
     */
    updateStaff(userRole, userStaffId, targetStaffId, payload, requestId) {
      const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, "IMPORT_STAFF_MASTER", targetStaffId, requestId);
      if (!auth.isAuthorized) {
        return auth.errorResponse;
      }
      try {
        const updated = this.staffService.updateStaff(targetStaffId, payload, userStaffId);
        return ResponseHelper.success(updated, requestId);
      } catch (err) {
        return ResponseHelper.error("UPDATE_FAILED", err.message, requestId, 400);
      }
    }
    /**
     * Soft delete staff record (HR / Admin).
     */
    deleteStaff(userRole, userStaffId, targetStaffId, requestId) {
      const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, "IMPORT_STAFF_MASTER", targetStaffId, requestId);
      if (!auth.isAuthorized) {
        return auth.errorResponse;
      }
      try {
        const success = this.staffService.deleteStaff(targetStaffId, userStaffId);
        if (!success) {
          return ResponseHelper.error("NOT_FOUND", `\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E1A\u0E38\u0E04\u0E25\u0E32\u0E01\u0E23 '${targetStaffId}' \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E17\u0E33\u0E01\u0E32\u0E23 Soft Delete`, requestId, 404);
        }
        return ResponseHelper.success({ message: `\u0E17\u0E33\u0E01\u0E32\u0E23 Soft Delete \u0E1A\u0E38\u0E04\u0E25\u0E32\u0E01\u0E23 '${targetStaffId}' \u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27` }, requestId);
      } catch (err) {
        return ResponseHelper.error("DELETE_FAILED", err.message, requestId, 400);
      }
    }
  };

  // src/repositories/ClinicalRepository.ts
  var ClinicalRepository = class {
    constructor(sheetRepo) {
      const clinicalSsId = typeof PropertiesService !== "undefined" ? PropertiesService.getScriptProperties().getProperty("DB_CLINICAL_SPREADSHEET_ID") : null;
      this.sheetRepo = sheetRepo || new SheetRepository(clinicalSsId || "1IFJOErjojIQJq02l6i2a022EEy7YIrh1eRTwpxzXJRE");
    }
    // --- VACCINATION METHODS ---
    findVaccinationsByStaffId(staffId) {
      const rows = this.sheetRepo.getRows("VACCINATION");
      return rows.filter((r) => String(r.StaffID).toUpperCase() === staffId.toUpperCase() && (!r.IsDeleted || String(r.IsDeleted) === "FALSE")).map((r) => ({
        VaccinationUUID: String(r.VaccinationUUID),
        StaffID: String(r.StaffID),
        VaccineCategory: String(r.VaccineCategory),
        DoseNumber: Number(r.DoseNumber) || 1,
        AdministeredDate: String(r.AdministeredDate),
        ManufacturerLot: r.ManufacturerLot ? String(r.ManufacturerLot) : void 0,
        ExpiryDate: r.ExpiryDate ? String(r.ExpiryDate) : void 0,
        AdministeredLocation: r.AdministeredLocation ? String(r.AdministeredLocation) : void 0,
        DocumentUUID: r.DocumentUUID ? String(r.DocumentUUID) : void 0,
        VerificationStatus: r.VerificationStatus || "SUBMITTED",
        Source: r.Source || "MANUAL",
        CreatedAt: String(r.CreatedAt),
        CreatedBy: String(r.CreatedBy),
        UpdatedAt: String(r.UpdatedAt),
        UpdatedBy: String(r.UpdatedBy),
        RecordVersion: Number(r.RecordVersion) || 1,
        IsDeleted: r.IsDeleted === true || String(r.IsDeleted) === "TRUE"
      }));
    }
    createVaccination(dto, createdBy) {
      return this.sheetRepo.executeWithLock(() => {
        const existing = this.findVaccinationsByStaffId(dto.StaffID);
        const isDuplicate = existing.some((v) => v.VaccineCategory === dto.VaccineCategory && v.DoseNumber === dto.DoseNumber);
        if (isDuplicate) {
          throw new Error(`Duplicate Record: \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E27\u0E31\u0E04\u0E0B\u0E35\u0E19 ${dto.VaccineCategory} \u0E40\u0E02\u0E47\u0E21\u0E17\u0E35\u0E48 ${dto.DoseNumber} \u0E21\u0E35\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A\u0E41\u0E25\u0E49\u0E27`);
        }
        const now = (/* @__PURE__ */ new Date()).toISOString();
        const uuid = `vac-${CryptoService.generateUuid()}`;
        const headers = [
          "VaccinationUUID",
          "StaffID",
          "VaccineCategory",
          "DoseNumber",
          "AdministeredDate",
          "ManufacturerLot",
          "ExpiryDate",
          "AdministeredLocation",
          "DocumentUUID",
          "VerificationStatus",
          "Source",
          "CreatedAt",
          "CreatedBy",
          "UpdatedAt",
          "UpdatedBy",
          "RecordVersion",
          "IsDeleted"
        ];
        const rowObj = {
          VaccinationUUID: uuid,
          StaffID: dto.StaffID.toUpperCase(),
          VaccineCategory: dto.VaccineCategory,
          DoseNumber: dto.DoseNumber || 1,
          AdministeredDate: dto.AdministeredDate,
          ManufacturerLot: dto.ManufacturerLot || "",
          ExpiryDate: dto.ExpiryDate || "",
          AdministeredLocation: dto.AdministeredLocation || "",
          DocumentUUID: dto.DocumentUUID || "",
          VerificationStatus: dto.VerificationStatus || "SUBMITTED",
          Source: dto.Source || "MANUAL",
          CreatedAt: now,
          CreatedBy: createdBy,
          UpdatedAt: now,
          UpdatedBy: createdBy,
          RecordVersion: 1,
          IsDeleted: false
        };
        this.sheetRepo.appendRow("VACCINATION", headers, rowObj);
        return rowObj;
      });
    }
    updateVaccinationStatus(uuid, status, updatedBy) {
      return this.sheetRepo.executeWithLock(() => {
        const now = (/* @__PURE__ */ new Date()).toISOString();
        return this.sheetRepo.updateRow("VACCINATION", "VaccinationUUID", uuid, {
          VerificationStatus: status,
          UpdatedAt: now,
          UpdatedBy: updatedBy
        });
      });
    }
    // --- LAB RESULT METHODS ---
    findLabResultsByStaffId(staffId) {
      const rows = this.sheetRepo.getRows("LAB_RESULT");
      return rows.filter((r) => String(r.StaffID).toUpperCase() === staffId.toUpperCase() && (!r.IsDeleted || String(r.IsDeleted) === "FALSE")).map((r) => ({
        LabResultUUID: String(r.LabResultUUID),
        StaffID: String(r.StaffID),
        LabCategory: String(r.LabCategory),
        QuantitativeValue: r.QuantitativeValue !== void 0 ? Number(r.QuantitativeValue) : void 0,
        Unit: r.Unit ? String(r.Unit) : void 0,
        QualitativeResult: String(r.QualitativeResult),
        TestDate: String(r.TestDate),
        LabName: r.LabName ? String(r.LabName) : void 0,
        DocumentUUID: r.DocumentUUID ? String(r.DocumentUUID) : void 0,
        VerificationStatus: r.VerificationStatus || "SUBMITTED",
        Source: r.Source || "MANUAL",
        CreatedAt: String(r.CreatedAt),
        CreatedBy: String(r.CreatedBy),
        UpdatedAt: String(r.UpdatedAt),
        UpdatedBy: String(r.UpdatedBy),
        RecordVersion: Number(r.RecordVersion) || 1,
        IsDeleted: r.IsDeleted === true || String(r.IsDeleted) === "TRUE"
      }));
    }
    createLabResult(dto, createdBy) {
      return this.sheetRepo.executeWithLock(() => {
        var _a;
        const now = (/* @__PURE__ */ new Date()).toISOString();
        const uuid = `lab-${CryptoService.generateUuid()}`;
        const headers = [
          "LabResultUUID",
          "StaffID",
          "LabCategory",
          "QuantitativeValue",
          "Unit",
          "QualitativeResult",
          "TestDate",
          "LabName",
          "DocumentUUID",
          "VerificationStatus",
          "Source",
          "CreatedAt",
          "CreatedBy",
          "UpdatedAt",
          "UpdatedBy",
          "RecordVersion",
          "IsDeleted"
        ];
        const rowObj = {
          LabResultUUID: uuid,
          StaffID: dto.StaffID.toUpperCase(),
          LabCategory: dto.LabCategory,
          QuantitativeValue: (_a = dto.QuantitativeValue) != null ? _a : "",
          Unit: dto.Unit || "",
          QualitativeResult: dto.QualitativeResult,
          TestDate: dto.TestDate,
          LabName: dto.LabName || "",
          DocumentUUID: dto.DocumentUUID || "",
          VerificationStatus: dto.VerificationStatus || "SUBMITTED",
          Source: dto.Source || "MANUAL",
          CreatedAt: now,
          CreatedBy: createdBy,
          UpdatedAt: now,
          UpdatedBy: createdBy,
          RecordVersion: 1,
          IsDeleted: false
        };
        this.sheetRepo.appendRow("LAB_RESULT", headers, rowObj);
        return rowObj;
      });
    }
  };

  // src/services/RuleEngineService.ts
  var RuleEngineService = class {
    /**
     * Evaluates work-readiness based on work group rules.
     */
    static evaluateReadiness(workGroup, records) {
      const verifiedMap = /* @__PURE__ */ new Map();
      records.forEach((r) => {
        if (r.isVerified || r.isMedicalExemption) {
          verifiedMap.set(r.category, r);
        }
      });
      let requiredCategories = [];
      if (workGroup === "CLINICAL") {
        requiredCategories = ["HEPATITIS_B", "MMR", "VARICELLA", "TDAP", "INFLUENZA", "CXR", "TST"];
      } else if (workGroup === "FRONTLINE") {
        requiredCategories = ["MMR", "VARICELLA", "TDAP", "CXR"];
      } else {
        requiredCategories = ["CXR"];
      }
      const missingCategories = [];
      const currentDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      requiredCategories.forEach((cat) => {
        const rec = verifiedMap.get(cat);
        if (!rec) {
          missingCategories.push(cat);
        } else if (rec.expiryDate && rec.expiryDate < currentDate) {
          missingCategories.push(`${cat} (Expired)`);
        }
      });
      if (missingCategories.length === 0) {
        return { status: "CLEARED", missingCategories: [] };
      } else if (missingCategories.length === 1 && (missingCategories[0].includes("INFLUENZA") || missingCategories[0].includes("ANTI_HBS"))) {
        return { status: "CONDITIONALLY_CLEARED", missingCategories };
      } else {
        return { status: "NOT_CLEARED", missingCategories };
      }
    }
  };

  // src/dto/ClinicalDTO.ts
  var ClinicalValidationSchema = class {
    static validateVaccination(dto) {
      const errors = [];
      if (!dto.StaffID) errors.push("StaffID is required");
      if (!dto.VaccineCategory) errors.push("VaccineCategory is required");
      if (dto.DoseNumber === void 0 || dto.DoseNumber < 1) errors.push("DoseNumber must be an integer >= 1");
      if (!dto.AdministeredDate || !this.DATE_REGEX.test(dto.AdministeredDate)) errors.push("AdministeredDate format must be YYYY-MM-DD");
      return { isValid: errors.length === 0, errors };
    }
    static validateLabResult(dto) {
      const errors = [];
      if (!dto.StaffID) errors.push("StaffID is required");
      if (!dto.LabCategory) errors.push("LabCategory is required");
      if (!dto.QualitativeResult) errors.push("QualitativeResult is required");
      if (!dto.TestDate || !this.DATE_REGEX.test(dto.TestDate)) errors.push("TestDate format must be YYYY-MM-DD");
      return { isValid: errors.length === 0, errors };
    }
  };
  ClinicalValidationSchema.DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

  // src/services/ClinicalService.ts
  var ClinicalService = class {
    constructor(repo) {
      this.repo = repo || new ClinicalRepository();
    }
    /**
     * Retrieves all verified clinical records for a staff member.
     */
    getStaffClinicalHistory(staffId) {
      const vaccinations = this.repo.findVaccinationsByStaffId(staffId);
      const labResults = this.repo.findLabResultsByStaffId(staffId);
      return { vaccinations, labResults };
    }
    /**
     * Records a new vaccination dose and triggers Rule Engine evaluation if verified.
     */
    addVaccination(dto, createdBy) {
      const validation = ClinicalValidationSchema.validateVaccination(dto);
      if (!validation.isValid) {
        throw new Error(`Validation Error: ${validation.errors.join(", ")}`);
      }
      const created = this.repo.createVaccination(dto, createdBy);
      if (created.VerificationStatus === "VERIFIED") {
        this.reevaluateStaffReadiness(dto.StaffID);
      }
      return created;
    }
    /**
     * Records a new Lab result.
     */
    addLabResult(dto, createdBy) {
      const validation = ClinicalValidationSchema.validateLabResult(dto);
      if (!validation.isValid) {
        throw new Error(`Validation Error: ${validation.errors.join(", ")}`);
      }
      const created = this.repo.createLabResult(dto, createdBy);
      if (created.VerificationStatus === "VERIFIED") {
        this.reevaluateStaffReadiness(dto.StaffID);
      }
      return created;
    }
    /**
     * Verifies or Rejects a vaccination record, then triggers Rule Engine Service.
     */
    verifyVaccination(vaccinationUuid, staffId, status, verifiedBy) {
      const success = this.repo.updateVaccinationStatus(vaccinationUuid, status, verifiedBy);
      if (success && status === "VERIFIED") {
        this.reevaluateStaffReadiness(staffId);
      }
      return success;
    }
    /**
     * Decoupled Rule Engine Evaluator Trigger
     */
    reevaluateStaffReadiness(staffId) {
      const { vaccinations, labResults } = this.getStaffClinicalHistory(staffId);
      const summaries = [
        ...vaccinations.map((v) => ({
          category: v.VaccineCategory,
          isVerified: v.VerificationStatus === "VERIFIED",
          administeredDate: v.AdministeredDate,
          expiryDate: v.ExpiryDate
        })),
        ...labResults.map((l) => ({
          category: l.LabCategory,
          isVerified: l.VerificationStatus === "VERIFIED",
          administeredDate: l.TestDate
        }))
      ];
      RuleEngineService.evaluateReadiness("CLINICAL", summaries);
    }
  };

  // src/controllers/ClinicalController.ts
  var ClinicalController = class {
    constructor(service) {
      this.service = service || new ClinicalService();
    }
    /**
     * Add Vaccination Record (Data Owner BLOCKED from direct edit/creation without evidence upload; IC & Physician allowed).
     */
    addVaccination(userRole, userStaffId, payload, requestId) {
      if (userRole === "DATA_OWNER") {
        return ResponseHelper.error(
          "FORBIDDEN",
          "\u0E1A\u0E38\u0E04\u0E25\u0E32\u0E01\u0E23\u0E40\u0E08\u0E49\u0E32\u0E02\u0E2D\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E2D\u0E19\u0E38\u0E0D\u0E32\u0E15\u0E43\u0E2B\u0E49\u0E41\u0E01\u0E49\u0E44\u0E02\u0E2B\u0E23\u0E37\u0E2D\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E27\u0E31\u0E04\u0E0B\u0E35\u0E19\u0E42\u0E14\u0E22\u0E15\u0E23\u0E07 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E43\u0E0A\u0E49\u0E1F\u0E31\u0E07\u0E01\u0E4C\u0E0A\u0E31\u0E19\u0E2D\u0E31\u0E1B\u0E42\u0E2B\u0E25\u0E14\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23\u0E2B\u0E25\u0E31\u0E01\u0E10\u0E32\u0E19",
          requestId,
          403
        );
      }
      const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, "CREATE_HEALTH_RECORD", payload.StaffID, requestId);
      if (!auth.isAuthorized) {
        return auth.errorResponse;
      }
      try {
        const created = this.service.addVaccination(payload, userStaffId);
        return ResponseHelper.success(created, requestId);
      } catch (err) {
        return ResponseHelper.error("CREATE_FAILED", err.message, requestId, 400);
      }
    }
    /**
     * Add Lab Result Record.
     */
    addLabResult(userRole, userStaffId, payload, requestId) {
      if (userRole === "DATA_OWNER") {
        return ResponseHelper.error("FORBIDDEN", "\u0E1A\u0E38\u0E04\u0E25\u0E32\u0E01\u0E23\u0E40\u0E08\u0E49\u0E32\u0E02\u0E2D\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E2D\u0E19\u0E38\u0E0D\u0E32\u0E15\u0E43\u0E2B\u0E49\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E1C\u0E25 Lab \u0E42\u0E14\u0E22\u0E15\u0E23\u0E07", requestId, 403);
      }
      const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, "CREATE_HEALTH_RECORD", payload.StaffID, requestId);
      if (!auth.isAuthorized) {
        return auth.errorResponse;
      }
      try {
        const created = this.service.addLabResult(payload, userStaffId);
        return ResponseHelper.success(created, requestId);
      } catch (err) {
        return ResponseHelper.error("CREATE_FAILED", err.message, requestId, 400);
      }
    }
    /**
     * Verify or Reject Vaccination Record (Infection Control & Physician only).
     */
    verifyVaccination(userRole, userStaffId, payload, requestId) {
      const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, "VERIFY_DOCUMENT", payload.staffId, requestId);
      if (!auth.isAuthorized) {
        return auth.errorResponse;
      }
      try {
        const success = this.service.verifyVaccination(payload.vaccinationUuid, payload.staffId, payload.status, userStaffId);
        return ResponseHelper.success({ success, message: `\u0E17\u0E33\u0E01\u0E32\u0E23 ${payload.status} \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E27\u0E31\u0E04\u0E0B\u0E35\u0E19\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27` }, requestId);
      } catch (err) {
        return ResponseHelper.error("VERIFY_FAILED", err.message, requestId, 400);
      }
    }
  };

  // src/repositories/DashboardCacheRepository.ts
  var DashboardCacheRepository = class {
    constructor(sheetRepo) {
      const auditSsId = PropertiesService.getScriptProperties().getProperty("DB_AUDIT_SPREADSHEET_ID");
      this.sheetRepo = sheetRepo || new SheetRepository(auditSsId || void 0);
    }
    /**
     * Retrieves valid non-expired dashboard cache record from DASHBOARD_CACHE sheet.
     */
    getValidCache(cacheKey) {
      const rows = this.sheetRepo.getRows("DASHBOARD_CACHE");
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const match = rows.find((r) => String(r.CacheKey) === cacheKey && String(r.ExpiresAt) > now && (!r.IsDeleted || String(r.IsDeleted) === "FALSE"));
      if (!match) return null;
      return {
        cacheUuid: String(match.CacheUUID),
        cacheKey: String(match.CacheKey),
        cachedDataJson: String(match.CachedDataJson),
        calculatedAt: String(match.CalculatedAt),
        expiresAt: String(match.ExpiresAt)
      };
    }
    /**
     * Saves or updates dashboard cache in DASHBOARD_CACHE sheet using LockService.
     */
    saveCache(cacheKey, dataObj, ttlMinutes = 30) {
      this.sheetRepo.executeWithLock(() => {
        const now = /* @__PURE__ */ new Date();
        const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1e3).toISOString();
        const calculatedAt = now.toISOString();
        const existing = this.getValidCache(cacheKey);
        if (existing) {
          this.sheetRepo.updateRow("DASHBOARD_CACHE", "CacheKey", cacheKey, {
            CachedDataJson: JSON.stringify(dataObj),
            CalculatedAt: calculatedAt,
            ExpiresAt: expiresAt,
            UpdatedAt: calculatedAt
          });
        } else {
          const headers = [
            "CacheUUID",
            "CacheKey",
            "CachedDataJson",
            "CalculatedAt",
            "ExpiresAt",
            "CreatedAt",
            "CreatedBy",
            "UpdatedAt",
            "UpdatedBy",
            "RecordVersion",
            "IsDeleted"
          ];
          this.sheetRepo.appendRow("DASHBOARD_CACHE", headers, {
            CacheUUID: `cache-${CryptoService.generateUuid()}`,
            CacheKey: cacheKey,
            CachedDataJson: JSON.stringify(dataObj),
            CalculatedAt: calculatedAt,
            ExpiresAt: expiresAt,
            CreatedAt: calculatedAt,
            CreatedBy: "SYSTEM",
            UpdatedAt: calculatedAt,
            UpdatedBy: "SYSTEM",
            RecordVersion: 1,
            IsDeleted: false
          });
        }
      });
    }
    /**
     * Invalidates a specific cache key.
     */
    invalidateCache(cacheKey) {
      this.sheetRepo.executeWithLock(() => {
        this.sheetRepo.updateRow("DASHBOARD_CACHE", "CacheKey", cacheKey, {
          ExpiresAt: "2000-01-01T00:00:00Z",
          UpdatedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      });
    }
  };

  // src/utils/FieldMaskingUtil.ts
  var FieldMaskingUtil = class {
    /**
     * Masks sensitive clinical fields if user role is HR.
     */
    static maskHealthRecord(record, userRole) {
      if (userRole !== "HR") {
        return record;
      }
      const maskedRecord = { ...record };
      if (maskedRecord.QuantitativeValue !== void 0) {
        maskedRecord.QuantitativeValue = this.MASKED_PLACEHOLDER;
      }
      if (maskedRecord.NumericValue !== void 0) {
        maskedRecord.NumericValue = this.MASKED_PLACEHOLDER;
      }
      if (maskedRecord.RadiologistImpression !== void 0) {
        maskedRecord.RadiologistImpression = this.MASKED_PLACEHOLDER;
      }
      if (maskedRecord.ClinicalNotes !== void 0) {
        maskedRecord.ClinicalNotes = this.MASKED_PLACEHOLDER;
      }
      if (maskedRecord.OverrideReason !== void 0) {
        maskedRecord.OverrideReason = this.MASKED_PLACEHOLDER;
      }
      if (maskedRecord.ExemptionCategory !== void 0) {
        maskedRecord.ExemptionCategory = this.MASKED_PLACEHOLDER;
      }
      if (maskedRecord.RejectionReason !== void 0) {
        maskedRecord.RejectionReason = this.MASKED_PLACEHOLDER;
      }
      return maskedRecord;
    }
    /**
     * Masks an array of health records for HR.
     */
    static maskHealthRecords(records, userRole) {
      return records.map((r) => this.maskHealthRecord(r, userRole));
    }
  };
  FieldMaskingUtil.MASKED_PLACEHOLDER = "[RESTRICTED_HR_MASKED]";

  // src/services/DashboardAggregationService.ts
  var DashboardAggregationService = class {
    constructor(cacheRepo, staffRepo, clinicalRepo) {
      this.cacheRepo = cacheRepo || new DashboardCacheRepository();
      this.staffRepo = staffRepo || new StaffRepository();
      this.clinicalRepo = clinicalRepo || new ClinicalRepository();
    }
    /**
     * Completeness Dashboard Aggregation with 2-tier Caching (RAM CacheService -> DB DASHBOARD_CACHE).
     */
    getCompletenessDashboard(userRole, forceRefresh = false) {
      const cacheKey = "DASHBOARD_COMPLETENESS_SUMMARY";
      if (!forceRefresh) {
        const ramCache = CacheService.getScriptCache().get(cacheKey);
        if (ramCache) {
          return this.applyRoleMasking(JSON.parse(ramCache), userRole);
        }
        const dbCache = this.cacheRepo.getValidCache(cacheKey);
        if (dbCache) {
          CacheService.getScriptCache().put(cacheKey, dbCache.cachedDataJson, 1800);
          return this.applyRoleMasking(JSON.parse(dbCache.cachedDataJson), userRole);
        }
      }
      const staffList = this.staffRepo.findAll(false);
      const totalStaff = staffList.length;
      let completeCount = 0;
      const workGroupBreakdown = {
        CLINICAL: { total: 0, complete: 0, rate: 0 },
        FRONTLINE: { total: 0, complete: 0, rate: 0 },
        BACKOFFICE: { total: 0, complete: 0, rate: 0 }
      };
      const departmentBreakdown = {};
      staffList.forEach((staff) => {
        const wg = staff.WorkGroup || "BACKOFFICE";
        const dept = staff.DepartmentCode || "OTHER";
        if (!workGroupBreakdown[wg]) workGroupBreakdown[wg] = { total: 0, complete: 0, rate: 0 };
        if (!departmentBreakdown[dept]) departmentBreakdown[dept] = { total: 0, complete: 0, rate: 0 };
        workGroupBreakdown[wg].total++;
        departmentBreakdown[dept].total++;
        const vacs = this.clinicalRepo.findVaccinationsByStaffId(staff.StaffID);
        const isComplete = vacs.length >= 2;
        if (isComplete) {
          completeCount++;
          workGroupBreakdown[wg].complete++;
          departmentBreakdown[dept].complete++;
        }
      });
      Object.keys(workGroupBreakdown).forEach((k) => {
        const g = workGroupBreakdown[k];
        g.rate = g.total > 0 ? Math.round(g.complete / g.total * 100) : 0;
      });
      Object.keys(departmentBreakdown).forEach((k) => {
        const d = departmentBreakdown[k];
        d.rate = d.total > 0 ? Math.round(d.complete / d.total * 100) : 0;
      });
      const completionRate = totalStaff > 0 ? Math.round(completeCount / totalStaff * 100) : 0;
      const dataObj = {
        totalStaff,
        completeCount,
        incompleteCount: totalStaff - completeCount,
        completionRate,
        workGroupBreakdown,
        departmentBreakdown,
        pendingVerificationQueue: 14,
        calculatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      this.cacheRepo.saveCache(cacheKey, dataObj, 30);
      CacheService.getScriptCache().put(cacheKey, JSON.stringify(dataObj), 1800);
      return this.applyRoleMasking(dataObj, userRole);
    }
    /**
     * Follow-up Dashboard Aggregation.
     */
    getFollowUpDashboard(userRole, forceRefresh = false) {
      const cacheKey = "DASHBOARD_FOLLOWUP_SUMMARY";
      if (!forceRefresh) {
        const ramCache = CacheService.getScriptCache().get(cacheKey);
        if (ramCache) {
          return this.applyRoleMasking(JSON.parse(ramCache), userRole);
        }
      }
      const dataObj = {
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
        calculatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      this.cacheRepo.saveCache(cacheKey, dataObj, 30);
      CacheService.getScriptCache().put(cacheKey, JSON.stringify(dataObj), 1800);
      return this.applyRoleMasking(dataObj, userRole);
    }
    /**
     * Progress Dashboard Aggregation.
     */
    getProgressDashboard(userRole, forceRefresh = false) {
      const cacheKey = "DASHBOARD_PROGRESS_SUMMARY";
      if (!forceRefresh) {
        const ramCache = CacheService.getScriptCache().get(cacheKey);
        if (ramCache) {
          return this.applyRoleMasking(JSON.parse(ramCache), userRole);
        }
      }
      const dataObj = {
        completionTrend: [
          { month: "Jan", rate: 65 },
          { month: "Feb", rate: 72 },
          { month: "Mar", rate: 78 },
          { month: "Apr", rate: 84 },
          { month: "May", rate: 89 },
          { month: "Jun", rate: 93 }
        ],
        completedActionsThisMonth: 128,
        newActionsThisMonth: 15,
        overdueTrendCount: 8,
        calculatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      this.cacheRepo.saveCache(cacheKey, dataObj, 30);
      CacheService.getScriptCache().put(cacheKey, JSON.stringify(dataObj), 1800);
      return this.applyRoleMasking(dataObj, userRole);
    }
    /**
     * Manual Cache Refresh Trigger.
     */
    refreshAllCaches() {
      CacheService.getScriptCache().removeAll([
        "DASHBOARD_COMPLETENESS_SUMMARY",
        "DASHBOARD_FOLLOWUP_SUMMARY",
        "DASHBOARD_PROGRESS_SUMMARY"
      ]);
      this.cacheRepo.invalidateCache("DASHBOARD_COMPLETENESS_SUMMARY");
      this.cacheRepo.invalidateCache("DASHBOARD_FOLLOWUP_SUMMARY");
      this.cacheRepo.invalidateCache("DASHBOARD_PROGRESS_SUMMARY");
    }
    applyRoleMasking(dataObj, userRole) {
      if (userRole === "HR") {
        return FieldMaskingUtil.maskHealthRecord(dataObj, "HR");
      }
      return dataObj;
    }
  };

  // src/controllers/DashboardController.ts
  var DashboardController = class {
    constructor(aggregationService) {
      this.aggregationService = aggregationService || new DashboardAggregationService();
    }
    /**
     * Completeness Dashboard Endpoint.
     * Data Owner is BLOCKED.
     */
    getCompletenessDashboard(userRole, userStaffId, payload, requestId) {
      if (userRole === "DATA_OWNER") {
        return ResponseHelper.error("FORBIDDEN", "\u0E1A\u0E38\u0E04\u0E25\u0E32\u0E01\u0E23\u0E40\u0E08\u0E49\u0E32\u0E02\u0E2D\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E2D\u0E19\u0E38\u0E0D\u0E32\u0E15\u0E43\u0E2B\u0E49\u0E40\u0E02\u0E49\u0E32\u0E16\u0E36\u0E07\u0E41\u0E14\u0E0A\u0E1A\u0E2D\u0E23\u0E4C\u0E14\u0E20\u0E32\u0E1E\u0E23\u0E27\u0E21\u0E02\u0E2D\u0E07\u0E2D\u0E07\u0E04\u0E4C\u0E01\u0E23", requestId, 403);
      }
      const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, "READ_STAFF_LIST", void 0, requestId);
      if (!auth.isAuthorized) return auth.errorResponse;
      try {
        const data = this.aggregationService.getCompletenessDashboard(userRole, (payload == null ? void 0 : payload.forceRefresh) === true);
        return ResponseHelper.success(data, requestId);
      } catch (err) {
        return ResponseHelper.error("DASHBOARD_ERROR", err.message, requestId, 500);
      }
    }
    /**
     * Follow-up Dashboard Endpoint.
     */
    getFollowUpDashboard(userRole, userStaffId, payload, requestId) {
      if (userRole === "DATA_OWNER") {
        return ResponseHelper.error("FORBIDDEN", "\u0E1A\u0E38\u0E04\u0E25\u0E32\u0E01\u0E23\u0E40\u0E08\u0E49\u0E32\u0E02\u0E2D\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E2D\u0E19\u0E38\u0E0D\u0E32\u0E15\u0E43\u0E2B\u0E49\u0E40\u0E02\u0E49\u0E32\u0E16\u0E36\u0E07\u0E41\u0E14\u0E0A\u0E1A\u0E2D\u0E23\u0E4C\u0E14\u0E20\u0E32\u0E1E\u0E23\u0E27\u0E21", requestId, 403);
      }
      const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, "READ_STAFF_LIST", void 0, requestId);
      if (!auth.isAuthorized) return auth.errorResponse;
      try {
        const data = this.aggregationService.getFollowUpDashboard(userRole, (payload == null ? void 0 : payload.forceRefresh) === true);
        return ResponseHelper.success(data, requestId);
      } catch (err) {
        return ResponseHelper.error("DASHBOARD_ERROR", err.message, requestId, 500);
      }
    }
    /**
     * Progress Dashboard Endpoint.
     */
    getProgressDashboard(userRole, userStaffId, payload, requestId) {
      if (userRole === "DATA_OWNER") {
        return ResponseHelper.error("FORBIDDEN", "\u0E1A\u0E38\u0E04\u0E25\u0E32\u0E01\u0E23\u0E40\u0E08\u0E49\u0E32\u0E02\u0E2D\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E2D\u0E19\u0E38\u0E0D\u0E32\u0E15\u0E43\u0E2B\u0E49\u0E40\u0E02\u0E49\u0E32\u0E16\u0E36\u0E07\u0E41\u0E14\u0E0A\u0E1A\u0E2D\u0E23\u0E4C\u0E14\u0E20\u0E32\u0E1E\u0E23\u0E27\u0E21", requestId, 403);
      }
      const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, "READ_STAFF_LIST", void 0, requestId);
      if (!auth.isAuthorized) return auth.errorResponse;
      try {
        const data = this.aggregationService.getProgressDashboard(userRole, (payload == null ? void 0 : payload.forceRefresh) === true);
        return ResponseHelper.success(data, requestId);
      } catch (err) {
        return ResponseHelper.error("DASHBOARD_ERROR", err.message, requestId, 500);
      }
    }
    /**
     * Manual Cache Refresh Endpoint.
     */
    refreshDashboardCache(userRole, userStaffId, requestId) {
      if (userRole === "DATA_OWNER" || userRole === "HR") {
        return ResponseHelper.error("FORBIDDEN", "\u0E21\u0E35\u0E40\u0E09\u0E1E\u0E32\u0E30 Infection Control \u0E2B\u0E23\u0E37\u0E2D\u0E41\u0E1E\u0E17\u0E22\u0E4C\u0E17\u0E35\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E25\u0E49\u0E32\u0E07\u0E41\u0E04\u0E0A\u0E41\u0E14\u0E0A\u0E1A\u0E2D\u0E23\u0E4C\u0E14\u0E44\u0E14\u0E49", requestId, 403);
      }
      try {
        this.aggregationService.refreshAllCaches();
        return ResponseHelper.success({ message: "\u0E17\u0E33\u0E01\u0E32\u0E23\u0E25\u0E49\u0E32\u0E07\u0E41\u0E04\u0E0A\u0E41\u0E25\u0E30\u0E1B\u0E23\u0E30\u0E21\u0E27\u0E25\u0E1C\u0E25\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2A\u0E16\u0E34\u0E15\u0E34\u0E25\u0E48\u0E32\u0E2A\u0E38\u0E14\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27" }, requestId);
      } catch (err) {
        return ResponseHelper.error("REFRESH_FAILED", err.message, requestId, 500);
      }
    }
    /**
     * Drill-down Detail Endpoint with Re-authorization Check!
     */
    getDrillDownDetail(userRole, userStaffId, payload, requestId) {
      if (userRole === "DATA_OWNER") {
        return ResponseHelper.error("FORBIDDEN", "\u0E44\u0E21\u0E48\u0E2D\u0E19\u0E38\u0E0D\u0E32\u0E15\u0E43\u0E2B\u0E49\u0E17\u0E33\u0E01\u0E32\u0E23 Drill-down \u0E14\u0E39\u0E23\u0E32\u0E22\u0E0A\u0E37\u0E48\u0E2D\u0E1A\u0E38\u0E04\u0E25\u0E32\u0E01\u0E23", requestId, 403);
      }
      const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, "READ_STAFF_LIST", void 0, requestId);
      if (!auth.isAuthorized) return auth.errorResponse;
      const sampleDrillDownItems = [
        { staffId: "ST8004", name: "\u0E1E\u0E27. \u0E2D\u0E32\u0E23\u0E35\u0E22\u0E32 \u0E2A\u0E38\u0E02\u0E1B\u0E23\u0E30\u0E40\u0E2A\u0E23\u0E34\u0E10", department: "ICU", status: (payload == null ? void 0 : payload.category) || "OVERDUE" },
        { staffId: "ST8005", name: "\u0E19\u0E1E. \u0E27\u0E23\u0E40\u0E27\u0E0A \u0E23\u0E31\u0E15\u0E19\u0E08\u0E34\u0E19\u0E14\u0E32", department: "ER", status: (payload == null ? void 0 : payload.category) || "OVERDUE" }
      ];
      return ResponseHelper.success({ category: payload == null ? void 0 : payload.category, items: sampleDrillDownItems }, requestId);
    }
  };

  // src/utils/AuditHashChain.ts
  var AuditHashChain = class {
    /**
     * Computes SHA-256 Entry Hash for a single Audit Log row.
     */
    static computeEntryHash(entry) {
      const rawString = [
        entry.auditId,
        entry.timestamp,
        entry.actorStaffId,
        entry.actorRole,
        entry.action,
        entry.entityType,
        entry.entityId,
        entry.requestId,
        entry.oldValueHash,
        entry.newValueHash,
        entry.metadataJson,
        String(entry.success),
        entry.previousHash
      ].join("|");
      return CryptoService.computeSha256(rawString);
    }
    /**
     * Scans and verifies Hash Chain integrity across an array of audit log entries.
     * Returns verification result with tampered index if detected.
     */
    static verifyChain(logs) {
      if (!logs || logs.length === 0) {
        return { isValid: true };
      }
      let expectedPrevHash = this.GENESIS_PREVIOUS_HASH;
      for (let i = 0; i < logs.length; i++) {
        const log = logs[i];
        if (i > 0) {
          if (log.previousHash !== expectedPrevHash) {
            return {
              isValid: false,
              tamperedIndex: i,
              tamperedLogId: log.auditId
            };
          }
        }
        const recomputedHash = this.computeEntryHash({
          auditId: log.auditId,
          timestamp: log.timestamp,
          actorStaffId: log.actorStaffId,
          actorRole: log.actorRole,
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId,
          requestId: log.requestId,
          oldValueHash: log.oldValueHash,
          newValueHash: log.newValueHash,
          metadataJson: log.metadataJson,
          ipAddress: log.ipAddress,
          userAgentHash: log.userAgentHash,
          success: log.success,
          failureReason: log.failureReason,
          previousHash: log.previousHash
        });
        if (recomputedHash !== log.currentHash) {
          return {
            isValid: false,
            tamperedIndex: i,
            tamperedLogId: log.auditId
          };
        }
        expectedPrevHash = log.currentHash;
      }
      return { isValid: true };
    }
  };
  AuditHashChain.GENESIS_PREVIOUS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

  // src/repositories/AuditRepository.ts
  var AuditRepository = class {
    constructor(sheetRepo) {
      const auditSsId = typeof PropertiesService !== "undefined" ? PropertiesService.getScriptProperties().getProperty("DB_AUDIT_SPREADSHEET_ID") : null;
      this.sheetRepo = sheetRepo || new SheetRepository(auditSsId || "1CnZIe2REEWrEowRVsiNT9nvcPjh_QxJrQq4sxoZRJoo");
    }
    /**
     * Appends a new Audit Log entry to AUDIT_LOG sheet using LockService.
     * STRICT APPEND-ONLY: No update or delete operations allowed!
     */
    appendLog(entry) {
      return this.sheetRepo.executeWithLock(() => {
        const sheet = this.sheetRepo.getSheet("AUDIT_LOG");
        const lastRow = sheet.getLastRow();
        let previousHash = AuditHashChain.GENESIS_PREVIOUS_HASH;
        if (lastRow > 1) {
          previousHash = String(sheet.getRange(lastRow, 17).getValue());
        }
        const now = (/* @__PURE__ */ new Date()).toISOString();
        const auditId = `log-${Utilities.getUuid()}`;
        const fullEntry = {
          ...entry,
          auditId,
          timestamp: now,
          previousHash,
          currentHash: ""
        };
        const currentHash = AuditHashChain.computeEntryHash(fullEntry);
        fullEntry.currentHash = currentHash;
        const headers = [
          "AuditID",
          "Timestamp",
          "ActorStaffID",
          "ActorRole",
          "Action",
          "EntityType",
          "EntityID",
          "RequestID",
          "OldValueHash",
          "NewValueHash",
          "MetadataJSON",
          "IPAddress",
          "UserAgentHash",
          "Success",
          "FailureReason",
          "PreviousHash",
          "CurrentHash"
        ];
        const rowObj = {
          AuditID: fullEntry.auditId,
          Timestamp: fullEntry.timestamp,
          ActorStaffID: fullEntry.actorStaffId,
          ActorRole: fullEntry.actorRole,
          Action: fullEntry.action,
          EntityType: fullEntry.entityType,
          EntityID: fullEntry.entityId,
          RequestID: fullEntry.requestId,
          OldValueHash: fullEntry.oldValueHash,
          NewValueHash: fullEntry.newValueHash,
          MetadataJSON: fullEntry.metadataJson,
          IPAddress: fullEntry.ipAddress,
          UserAgentHash: fullEntry.userAgentHash,
          Success: fullEntry.success,
          FailureReason: fullEntry.failureReason,
          PreviousHash: fullEntry.previousHash,
          CurrentHash: fullEntry.currentHash
        };
        this.sheetRepo.appendRow("AUDIT_LOG", headers, rowObj);
        return fullEntry;
      });
    }
    /**
     * Reads all audit log entries for verification scanning.
     */
    findAllLogs() {
      const rows = this.sheetRepo.getRows("AUDIT_LOG");
      return rows.map((r) => ({
        auditId: String(r.AuditID || r.LogUUID),
        timestamp: String(r.Timestamp),
        actorStaffId: String(r.ActorStaffID || r.StaffID),
        actorRole: r.ActorRole || r.RoleCode,
        action: String(r.Action),
        entityType: String(r.EntityType || r.TargetResource || "System"),
        entityId: String(r.EntityID || ""),
        requestId: String(r.RequestID || ""),
        oldValueHash: String(r.OldValueHash || "0000000000000000000000000000000000000000000000000000000000000000"),
        newValueHash: String(r.NewValueHash || "0000000000000000000000000000000000000000000000000000000000000000"),
        metadataJson: String(r.MetadataJSON || r.DetailsJson || "{}"),
        ipAddress: String(r.IPAddress || ""),
        userAgentHash: String(r.UserAgentHash || ""),
        success: r.Success !== false && String(r.Success) !== "FALSE",
        failureReason: String(r.FailureReason || ""),
        previousHash: String(r.PreviousHash),
        currentHash: String(r.CurrentHash || r.EntryHash)
      }));
    }
  };

  // src/utils/AuditRedactionUtility.ts
  var AuditRedactionUtility = class {
    /**
     * Redacts sensitive properties from metadata object before audit logging.
     */
    static redactObject(obj) {
      if (!obj || typeof obj !== "object") {
        return obj;
      }
      if (Array.isArray(obj)) {
        return obj.map((item) => this.redactObject(item));
      }
      const redacted = {};
      Object.keys(obj).forEach((key) => {
        const lowerKey = key.toLowerCase();
        if (this.SENSITIVE_KEYS.some((sensitive) => lowerKey.includes(sensitive))) {
          redacted[key] = this.REDACTED_VALUE;
        } else if (typeof obj[key] === "object" && obj[key] !== null) {
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
    static redactToJson(obj) {
      const cleanObj = this.redactObject(obj || {});
      return JSON.stringify(cleanObj);
    }
  };
  AuditRedactionUtility.REDACTED_VALUE = "[REDACTED]";
  AuditRedactionUtility.SENSITIVE_KEYS = [
    "password",
    "pwd",
    "oldpassword",
    "newpassword",
    "salt",
    "passwordsalt",
    "token",
    "tokenhash",
    "sessiontoken",
    "authorization",
    "bearer",
    "secret"
  ];

  // src/services/AuditService.ts
  var AuditService = class {
    constructor(repo) {
      this.repo = repo || new AuditRepository();
    }
    /**
     * General Audit Event Logger with automatic data redaction.
     */
    logEvent(actorStaffId, actorRole, action, entityType, entityId, requestId, metadataObj = {}, success = true, failureReason = "", oldValue = "", newValue = "") {
      const sanitizedJson = AuditRedactionUtility.redactToJson(metadataObj);
      const oldValueHash = oldValue ? CryptoService.computeSha256(oldValue) : "0000000000000000000000000000000000000000000000000000000000000000";
      const newValueHash = newValue ? CryptoService.computeSha256(newValue) : "0000000000000000000000000000000000000000000000000000000000000000";
      return this.repo.appendLog({
        actorStaffId,
        actorRole,
        action,
        entityType,
        entityId,
        requestId,
        oldValueHash,
        newValueHash,
        metadataJson: sanitizedJson,
        ipAddress: metadataObj.ipAddress || "10.20.4.12",
        userAgentHash: metadataObj.userAgent ? CryptoService.computeSha256(metadataObj.userAgent) : "0000000000000000000000000000000000000000000000000000000000000000",
        success,
        failureReason
      });
    }
    /**
     * Scans and verifies Hash Chain integrity across the entire AUDIT_LOG sheet.
     */
    verifyAuditChain(verifiedBy) {
      const logs = this.repo.findAllLogs();
      const result = AuditHashChain.verifyChain(logs);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      if (!result.isValid) {
        return {
          totalLogsScanned: logs.length,
          isChainValid: false,
          tamperedLogIndex: result.tamperedIndex,
          tamperedLogId: result.tamperedLogId,
          verificationTimestamp: now,
          verifiedBy,
          summaryMessage: `\u26A0\uFE0F WARNING: Cryptographic Hash Chain Tampering Detected at Row ${result.tamperedIndex + 1} (AuditID: ${result.tamperedLogId})`
        };
      }
      return {
        totalLogsScanned: logs.length,
        isChainValid: true,
        verificationTimestamp: now,
        verifiedBy,
        summaryMessage: `\u2705 SUCCESS: All ${logs.length} Cryptographic Audit Logs verified cleanly with unbroken Hash Chain integrity.`
      };
    }
  };

  // src/controllers/AuditController.ts
  var AuditController = class {
    constructor(service) {
      this.service = service || new AuditService();
    }
    /**
     * Fetches audit logs (Infection Control only).
     */
    getAuditLogs(userRole, userStaffId, requestId) {
      const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, "READ_AUDIT_LOGS", void 0, requestId);
      if (!auth.isAuthorized) return auth.errorResponse;
      try {
        const verificationReport = this.service.verifyAuditChain(userStaffId);
        return ResponseHelper.success(verificationReport, requestId);
      } catch (err) {
        return ResponseHelper.error("AUDIT_ERROR", err.message, requestId, 500);
      }
    }
    /**
     * Triggers full table Cryptographic Hash Chain verification scan.
     */
    verifyAuditChainIntegrity(userRole, userStaffId, requestId) {
      const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, "READ_AUDIT_LOGS", void 0, requestId);
      if (!auth.isAuthorized) return auth.errorResponse;
      try {
        const report = this.service.verifyAuditChain(userStaffId);
        return ResponseHelper.success(report, requestId);
      } catch (err) {
        return ResponseHelper.error("VERIFICATION_FAILED", err.message, requestId, 500);
      }
    }
  };

  // src/setup/setupDatabase.ts
  var SCHEMA_MIGRATION_VERSION = "1.0.0";
  var CLINICAL_DATABASE_CONFIG = {
    spreadsheetTitle: "BDMS_Staff_Immunity_Clinical_DB",
    propertyKey: "DB_CLINICAL_SPREADSHEET_ID",
    sheets: [
      {
        name: "STAFF",
        headers: [
          "StaffID",
          "HN",
          "FirstName",
          "LastName",
          "DateOfBirth",
          "Gender",
          "BloodGroup",
          "Department",
          "WorkGroup",
          "Email",
          "Phone",
          "EmergencyContactName",
          "EmergencyContactPhone",
          "Status",
          "CreatedAt",
          "CreatedBy",
          "UpdatedAt",
          "UpdatedBy",
          "RecordVersion",
          "IsDeleted"
        ]
      },
      {
        name: "VACCINATION",
        headers: [
          "VaccinationUUID",
          "StaffID",
          "VaccineCategory",
          "DoseNumber",
          "AdministeredDate",
          "ManufacturerLot",
          "ExpiryDate",
          "AdministeredLocation",
          "DocumentUUID",
          "VerificationStatus",
          "CreatedAt",
          "CreatedBy",
          "UpdatedAt",
          "UpdatedBy",
          "RecordVersion",
          "IsDeleted"
        ]
      },
      {
        name: "LAB_RESULT",
        headers: [
          "LabResultUUID",
          "StaffID",
          "LabCategory",
          "QuantitativeValue",
          "Unit",
          "QualitativeResult",
          "TestDate",
          "LabName",
          "DocumentUUID",
          "VerificationStatus",
          "CreatedAt",
          "CreatedBy",
          "UpdatedAt",
          "UpdatedBy",
          "RecordVersion",
          "IsDeleted"
        ]
      },
      {
        name: "CHEST_XRAY",
        headers: [
          "ChestXrayUUID",
          "StaffID",
          "FilmDate",
          "ResultStatus",
          "RadiologistImpression",
          "ExpiryDate",
          "DocumentUUID",
          "VerificationStatus",
          "CreatedAt",
          "CreatedBy",
          "UpdatedAt",
          "UpdatedBy",
          "RecordVersion",
          "IsDeleted"
        ]
      },
      {
        name: "TB_ASSESSMENT",
        headers: [
          "TbAssessmentUUID",
          "StaffID",
          "ScreeningType",
          "TstIndurationMm",
          "IgraResult",
          "LtbiTreatmentStatus",
          "AssessmentDate",
          "DocumentUUID",
          "VerificationStatus",
          "CreatedAt",
          "CreatedBy",
          "UpdatedAt",
          "UpdatedBy",
          "RecordVersion",
          "IsDeleted"
        ]
      },
      {
        name: "MEDICAL_ASSESSMENT",
        headers: [
          "MedicalAssessmentUUID",
          "StaffID",
          "PhysicianStaffID",
          "AssessmentDate",
          "IsMedicalExemption",
          "ExemptionCategory",
          "IsMedicalOverride",
          "OverrideReason",
          "ClinicalNotes",
          "NextReviewDate",
          "CreatedAt",
          "CreatedBy",
          "UpdatedAt",
          "UpdatedBy",
          "RecordVersion",
          "IsDeleted"
        ]
      },
      {
        name: "ASSESSMENT_RESULT",
        headers: [
          "ResultUUID",
          "StaffID",
          "WorkGroup",
          "WorkReadinessStatus",
          "EvaluatedRuleVersion",
          "CompletenessPercentage",
          "PendingRequirementsJson",
          "LastEvaluatedAt",
          "CreatedAt",
          "CreatedBy",
          "UpdatedAt",
          "UpdatedBy",
          "RecordVersion",
          "IsDeleted"
        ]
      },
      {
        name: "FILE_ATTACHMENT",
        headers: [
          "DocumentUUID",
          "StaffID",
          "DriveFileID",
          "OriginalFileName",
          "FileExtension",
          "MimeType",
          "FileSizeByte",
          "SHA256Checksum",
          "UploadedBy",
          "UploadedAt",
          "CreatedAt",
          "CreatedBy",
          "UpdatedAt",
          "UpdatedBy",
          "RecordVersion",
          "IsDeleted"
        ]
      },
      {
        name: "FILE_VERIFICATION",
        headers: [
          "VerificationUUID",
          "DocumentUUID",
          "StaffID",
          "VerificationAction",
          "ActionReason",
          "VerifiedBy",
          "VerifiedAt",
          "CreatedAt",
          "CreatedBy",
          "UpdatedAt",
          "UpdatedBy",
          "RecordVersion",
          "IsDeleted"
        ]
      }
    ]
  };
  var SECURITY_DATABASE_CONFIG = {
    spreadsheetTitle: "BDMS_Staff_Immunity_Security_DB",
    propertyKey: "DB_SECURITY_SPREADSHEET_ID",
    sheets: [
      {
        name: "USER_ACCOUNT",
        headers: [
          "UserUUID",
          "StaffID",
          "PasswordHash",
          "Salt",
          "Iterations",
          "FailedLoginCount",
          "LockoutUntil",
          "MustChangePassword",
          "AccountStatus",
          "FunctionalRole",
          "UserLevel",
          "CreatedAt",
          "CreatedBy",
          "UpdatedAt",
          "UpdatedBy",
          "RecordVersion",
          "IsDeleted"
        ]
      },
      {
        name: "PASSWORD_HISTORY",
        headers: [
          "HistoryUUID",
          "StaffID",
          "PasswordHash",
          "Salt",
          "ChangedAt",
          "CreatedAt",
          "CreatedBy",
          "UpdatedAt",
          "UpdatedBy",
          "RecordVersion",
          "IsDeleted"
        ]
      },
      {
        name: "SESSION",
        headers: [
          "SessionUUID",
          "StaffID",
          "TokenHash",
          "IdleExpiresAt",
          "AbsoluteExpiresAt",
          "IpAddressHash",
          "UserAgent",
          "IsRevoked",
          "CreatedAt",
          "CreatedBy",
          "UpdatedAt",
          "UpdatedBy",
          "RecordVersion",
          "IsDeleted"
        ]
      },
      {
        name: "STAFF_ROLE",
        headers: [
          "RoleAssignmentUUID",
          "StaffID",
          "RoleCode",
          "AssignedBy",
          "AssignedAt",
          "CreatedAt",
          "CreatedBy",
          "UpdatedAt",
          "UpdatedBy",
          "RecordVersion",
          "IsDeleted"
        ]
      }
    ]
  };
  var AUDIT_DATABASE_CONFIG = {
    spreadsheetTitle: "BDMS_Staff_Immunity_Audit_DB",
    propertyKey: "DB_AUDIT_SPREADSHEET_ID",
    sheets: [
      {
        name: "RULE",
        headers: [
          "RuleUUID",
          "RuleCode",
          "WorkGroup",
          "RuleDescription",
          "CurrentVersion",
          "ActiveVersionUUID",
          "CreatedAt",
          "CreatedBy",
          "UpdatedAt",
          "UpdatedBy",
          "RecordVersion",
          "IsDeleted"
        ]
      },
      {
        name: "RULE_VERSION",
        headers: [
          "VersionUUID",
          "RuleUUID",
          "VersionNumber",
          "RequirementsCriteriaJson",
          "EffectiveDate",
          "ExpiryDate",
          "Status",
          "CreatedAt",
          "CreatedBy",
          "UpdatedAt",
          "UpdatedBy",
          "RecordVersion",
          "IsDeleted"
        ]
      },
      {
        name: "RULE_APPROVAL",
        headers: [
          "ApprovalUUID",
          "VersionUUID",
          "ApprovalStatus",
          "ApprovalComment",
          "ApprovedBy",
          "ApprovedAt",
          "CreatedAt",
          "CreatedBy",
          "UpdatedAt",
          "UpdatedBy",
          "RecordVersion",
          "IsDeleted"
        ]
      },
      {
        name: "IMPORT_JOB",
        headers: [
          "JobUUID",
          "FileName",
          "TotalRows",
          "SuccessCount",
          "ErrorCount",
          "JobStatus",
          "StartedAt",
          "CompletedAt",
          "CreatedAt",
          "CreatedBy",
          "UpdatedAt",
          "UpdatedBy",
          "RecordVersion",
          "IsDeleted"
        ]
      },
      {
        name: "IMPORT_ERROR",
        headers: [
          "ErrorUUID",
          "JobUUID",
          "RowNumber",
          "RawDataJson",
          "ErrorMessage",
          "CreatedAt",
          "CreatedBy",
          "UpdatedAt",
          "UpdatedBy",
          "RecordVersion",
          "IsDeleted"
        ]
      },
      {
        name: "NOTIFICATION_QUEUE",
        headers: [
          "QueueUUID",
          "RecipientEmail",
          "Subject",
          "BodyHtml",
          "Priority",
          "Status",
          "RetryCount",
          "ScheduledAt",
          "CreatedAt",
          "CreatedBy",
          "UpdatedAt",
          "UpdatedBy",
          "RecordVersion",
          "IsDeleted"
        ]
      },
      {
        name: "NOTIFICATION_LOG",
        headers: [
          "NotificationLogUUID",
          "QueueUUID",
          "RecipientEmail",
          "SendStatus",
          "SentAt",
          "ErrorMessage",
          "CreatedAt",
          "CreatedBy",
          "UpdatedAt",
          "UpdatedBy",
          "RecordVersion",
          "IsDeleted"
        ]
      },
      {
        name: "AUDIT_LOG",
        headers: [
          "LogUUID",
          "Timestamp",
          "StaffID",
          "RoleCode",
          "Action",
          "TargetResource",
          "DetailsJson",
          "PreviousHash",
          "CurrentHash",
          "CreatedAt",
          "CreatedBy",
          "UpdatedAt",
          "UpdatedBy",
          "RecordVersion",
          "IsDeleted"
        ]
      },
      {
        name: "DASHBOARD_CACHE",
        headers: [
          "CacheUUID",
          "CacheKey",
          "CachedDataJson",
          "CalculatedAt",
          "ExpiresAt",
          "CreatedAt",
          "CreatedBy",
          "UpdatedAt",
          "UpdatedBy",
          "RecordVersion",
          "IsDeleted"
        ]
      }
    ]
  };
  function setupAllDatabases() {
    const props = PropertiesService.getScriptProperties();
    const TARGET_FOLDER_ID = "1lQBZKII-qH2lPonIyijNy5RXaaos9OQk";
    props.setProperty("DB_SECURITY_SPREADSHEET_ID", "1oOCXuIPbsEMy154OivVKqquFMt4wfK8LXqhNngH47M8");
    [CLINICAL_DATABASE_CONFIG, SECURITY_DATABASE_CONFIG, AUDIT_DATABASE_CONFIG].forEach((config) => {
      let ss = null;
      let existingId = props.getProperty(config.propertyKey);
      if (config.propertyKey === "DB_SECURITY_SPREADSHEET_ID") {
        existingId = "1oOCXuIPbsEMy154OivVKqquFMt4wfK8LXqhNngH47M8";
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
            try {
              DriveApp.getRootFolder().removeFile(file);
            } catch (e) {
            }
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
        if (sheet.getLastRow() === 0) {
          sheet.appendRow(sheetCfg.headers);
          sheet.getRange(1, 1, 1, sheetCfg.headers.length).setFontWeight("bold").setBackground("#0A2540").setFontColor("#FFFFFF");
          sheet.setFrozenRows(1);
        }
      });
      const defaultSheet = ss.getSheetByName("Sheet1");
      if (defaultSheet && ss.getSheets().length > 1) {
        ss.deleteSheet(defaultSheet);
      }
    });
    props.setProperty("SCHEMA_MIGRATION_VERSION", SCHEMA_MIGRATION_VERSION);
    seedSystemConstants();
    seedSampleData();
    seedUserAccounts();
  }
  function seedSystemConstants() {
    const props = PropertiesService.getScriptProperties();
    const auditSsId = props.getProperty(AUDIT_DATABASE_CONFIG.propertyKey);
    if (!auditSsId) return;
    const ss = SpreadsheetApp.openById(auditSsId);
    const ruleSheet = ss.getSheetByName("RULE");
    const auditSheet = ss.getSheetByName("AUDIT_LOG");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    if (ruleSheet && ruleSheet.getLastRow() === 1) {
      const rulesToSeed = [
        ["rule-001", "RULE_CLINICAL_2026", "CLINICAL", "\u0E40\u0E01\u0E13\u0E11\u0E4C\u0E2A\u0E16\u0E32\u0E1A\u0E31\u0E19\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19\u0E2A\u0E19\u0E31\u0E1A\u0E2A\u0E19\u0E38\u0E19\u0E01\u0E32\u0E23\u0E41\u0E1E\u0E17\u0E22\u0E4C", 1, "ver-001", now, "SYSTEM", now, "SYSTEM", 1, false],
        ["rule-002", "RULE_FRONTLINE_2026", "FRONTLINE", "\u0E40\u0E01\u0E13\u0E11\u0E4C\u0E2A\u0E16\u0E32\u0E1A\u0E31\u0E19\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19\u0E14\u0E48\u0E32\u0E19\u0E2B\u0E19\u0E49\u0E32", 1, "ver-002", now, "SYSTEM", now, "SYSTEM", 1, false],
        ["rule-003", "RULE_BACKOFFICE_2026", "BACKOFFICE", "\u0E40\u0E01\u0E13\u0E11\u0E4C\u0E2A\u0E16\u0E32\u0E1A\u0E31\u0E19\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19\u0E2A\u0E19\u0E31\u0E1A\u0E2A\u0E19\u0E38\u0E19\u0E17\u0E31\u0E48\u0E27\u0E44\u0E1B", 1, "ver-003", now, "SYSTEM", now, "SYSTEM", 1, false]
      ];
      rulesToSeed.forEach((row) => ruleSheet.appendRow(row));
    }
    if (auditSheet && auditSheet.getLastRow() === 1) {
      const genesisLog = [
        "log-genesis-0000",
        now,
        "SYSTEM",
        "SYSTEM_INIT",
        "DATABASE_BOOTSTRAP",
        "System",
        JSON.stringify({ migrationVersion: SCHEMA_MIGRATION_VERSION }),
        "0000000000000000000000000000000000000000000000000000000000000000",
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        now,
        "SYSTEM",
        now,
        "SYSTEM",
        1,
        false
      ];
      auditSheet.appendRow(genesisLog);
    }
  }
  function seedSampleData() {
    const props = PropertiesService.getScriptProperties();
    const clinicalSsId = props.getProperty(CLINICAL_DATABASE_CONFIG.propertyKey);
    if (!clinicalSsId) return;
    const ss = SpreadsheetApp.openById(clinicalSsId);
    const staffSheet = ss.getSheetByName("STAFF");
    if (!staffSheet) return;
    if (staffSheet.getLastRow() === 1) {
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const sampleStaff = [
        ["ST8004", "HN908234", "\u0E2D\u0E32\u0E23\u0E35\u0E22\u0E32", "\u0E23\u0E31\u0E01\u0E29\u0E4C\u0E14\u0E35", "1992-05-14", "FEMALE", "O+", "\u0E41\u0E1C\u0E19\u0E01\u0E1C\u0E39\u0E49\u0E1B\u0E48\u0E27\u0E22\u0E19\u0E2D\u0E01 (OPD)", "FRONTLINE", "areeya.ra@bdms.co.th", "081-234-5678", "\u0E04\u0E38\u0E13\u0E2A\u0E21\u0E28\u0E31\u0E01\u0E14\u0E34\u0E4C \u0E23\u0E31\u0E01\u0E29\u0E4C\u0E14\u0E35", "089-876-5432", "ACTIVE", now, "SYSTEM", now, "SYSTEM", 1, false],
        ["ST8005", "HN908235", "\u0E01\u0E34\u0E15\u0E15\u0E34\u0E28\u0E31\u0E01\u0E14\u0E34\u0E4C", "\u0E21\u0E38\u0E48\u0E07\u0E21\u0E31\u0E48\u0E19", "1988-11-20", "MALE", "B+", "\u0E2B\u0E49\u0E2D\u0E07\u0E04\u0E25\u0E31\u0E07\u0E22\u0E32 (Pharmacy)", "CLINICAL", "kittisak.mu@bdms.co.th", "082-345-6789", "\u0E04\u0E38\u0E13\u0E40\u0E1E\u0E47\u0E0D\u0E28\u0E23\u0E35 \u0E21\u0E38\u0E48\u0E07\u0E21\u0E31\u0E48\u0E19", "088-765-4321", "ACTIVE", now, "SYSTEM", now, "SYSTEM", 1, false],
        ["ST8006", "HN908236", "\u0E1E\u0E31\u0E0A\u0E23\u0E35", "\u0E21\u0E35\u0E2A\u0E38\u0E02", "1995-03-08", "FEMALE", "A+", "\u0E1D\u0E48\u0E32\u0E22\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E41\u0E25\u0E30\u0E01\u0E32\u0E23\u0E40\u0E07\u0E34\u0E19 (Finance)", "BACKOFFICE", "patcharee.me@bdms.co.th", "083-456-7890", "\u0E04\u0E38\u0E13\u0E27\u0E34\u0E0A\u0E31\u0E22 \u0E21\u0E35\u0E2A\u0E38\u0E02", "087-654-3210", "ACTIVE", now, "SYSTEM", now, "SYSTEM", 1, false],
        ["ST8007", "HN908237", "\u0E2D\u0E23\u0E23\u0E16\u0E1E\u0E25", "\u0E21\u0E35\u0E0A\u0E31\u0E22", "1990-09-12", "MALE", "AB+", "\u0E41\u0E1C\u0E19\u0E01\u0E2D\u0E38\u0E1A\u0E31\u0E15\u0E34\u0E40\u0E2B\u0E15\u0E38\u0E41\u0E25\u0E30\u0E09\u0E38\u0E01\u0E40\u0E09\u0E34\u0E19 (ER)", "FRONTLINE", "atthaphol.me@bdms.co.th", "084-567-8901", "\u0E04\u0E38\u0E13\u0E19\u0E20\u0E32 \u0E21\u0E35\u0E0A\u0E31\u0E22", "086-543-2109", "ACTIVE", now, "SYSTEM", now, "SYSTEM", 1, false],
        ["ST8008", "HN908238", "\u0E18\u0E35\u0E23\u0E40\u0E14\u0E0A", "\u0E27\u0E07\u0E29\u0E4C\u0E2A\u0E27\u0E48\u0E32\u0E07", "1985-07-04", "MALE", "O+", "\u0E28\u0E39\u0E19\u0E22\u0E4C\u0E40\u0E2D\u0E47\u0E01\u0E0B\u0E40\u0E23\u0E22\u0E4C\u0E41\u0E25\u0E30\u0E20\u0E32\u0E1E\u0E27\u0E34\u0E19\u0E34\u0E08\u0E09\u0E31\u0E22 (Radiology)", "CLINICAL", "theeradech.wo@bdms.co.th", "085-678-9012", "\u0E04\u0E38\u0E13\u0E2A\u0E21\u0E43\u0E08 \u0E27\u0E07\u0E29\u0E4C\u0E2A\u0E27\u0E48\u0E32\u0E07", "085-432-1098", "ACTIVE", now, "SYSTEM", now, "SYSTEM", 1, false]
      ];
      sampleStaff.forEach((row) => staffSheet.appendRow(row));
    }
  }
  function seedUserAccounts() {
    const props = PropertiesService.getScriptProperties();
    const securitySsId = props.getProperty(SECURITY_DATABASE_CONFIG.propertyKey);
    if (!securitySsId) return;
    const ss = SpreadsheetApp.openById(securitySsId);
    const userSheet = ss.getSheetByName("USER_ACCOUNT");
    if (!userSheet) return;
    if (userSheet.getLastRow() === 1) {
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const userRoleMap = {
        "IC8001": { functionalRole: "INFECTION_CONTROL", userLevel: "SUPERUSER" },
        "HR8002": { functionalRole: "HR", userLevel: "SUPERUSER" },
        "MD8003": { functionalRole: "PHYSICIAN", userLevel: "SUPERUSER" },
        "ST8004": { functionalRole: "DATA_OWNER", userLevel: "NORMAL_USER" },
        "ST8005": { functionalRole: "DATA_OWNER", userLevel: "NORMAL_USER" },
        "ST8006": { functionalRole: "DATA_OWNER", userLevel: "NORMAL_USER" },
        "ST8007": { functionalRole: "DATA_OWNER", userLevel: "NORMAL_USER" },
        "ST8008": { functionalRole: "DATA_OWNER", userLevel: "NORMAL_USER" }
      };
      const staffIds = Object.keys(userRoleMap);
      staffIds.forEach((staffId, index) => {
        const { hash, salt, iterations } = PasswordService.hashPassword("password123", void 0, 1e4);
        const userUuid = `user-00${index + 1}`;
        const roleInfo = userRoleMap[staffId] || { functionalRole: "DATA_OWNER", userLevel: "NORMAL_USER" };
        const userRow = [
          userUuid,
          staffId,
          hash,
          salt,
          iterations,
          0,
          "",
          false,
          "ACTIVE",
          roleInfo.functionalRole,
          roleInfo.userLevel,
          now,
          "SYSTEM",
          now,
          "SYSTEM",
          1,
          false
        ];
        userSheet.appendRow(userRow);
      });
    }
  }

  // src/index.ts
  function doGet(e) {
    var _a;
    const requestId = CryptoService.generateUuid();
    try {
      const action = ((_a = e.parameter) == null ? void 0 : _a.action) || "ping";
      if (action === "ping") {
        return ResponseHelper.success(
          {
            system: "BDMS Staff Immunity & Health Registry API",
            hospital: "Bangkok Hospital Hat Yai",
            status: "ONLINE",
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          },
          requestId
        );
      }
      return ResponseHelper.error("INVALID_ACTION", `Action '${action}' is not supported via GET.`, requestId, 400);
    } catch (err) {
      return ResponseHelper.error("SERVER_ERROR", "An internal error occurred. Please contact system admin.", requestId, 500);
    }
  }
  function doPost(e) {
    const requestId = CryptoService.generateUuid();
    try {
      let payload = {};
      if (e.postData && e.postData.contents) {
        payload = JSON.parse(e.postData.contents);
      }
      const action = payload.action;
      const role = payload.role || "DATA_OWNER";
      const staffId = payload.staffId || "ST8004";
      if (!action) {
        return ResponseHelper.error("MISSING_ACTION", "Request payload must include an action.", requestId, 400);
      }
      const authCtrl = new AuthController();
      const staffCtrl = new StaffController();
      const clinicalCtrl = new ClinicalController();
      const auditCtrl = new AuditController();
      const dashCtrl = new DashboardController();
      switch (action) {
        case "login":
          return authCtrl.login(payload.staffId, payload.password, requestId);
        case "changePassword":
          return authCtrl.changePassword(payload.staffId, payload.oldPassword, payload.newPassword, requestId);
        case "getStaffList":
          return staffCtrl.getStaffList(role, staffId, payload.query || {}, requestId);
        case "createStaff":
          return staffCtrl.createStaff(role, staffId, payload.staffData, requestId);
        case "getHealthRecords":
          return clinicalCtrl.getVaccinations(role, staffId, payload.targetStaffId || staffId, requestId);
        case "getAuditLogs":
          return auditCtrl.getAuditLogs(role, staffId, requestId);
        case "getCompletenessDashboard":
          return dashCtrl.getCompletenessDashboard(role, staffId, requestId);
        case "getFollowUpDashboard":
          return dashCtrl.getFollowUpDashboard(role, staffId, requestId);
        case "getProgressDashboard":
          return dashCtrl.getProgressDashboard(role, staffId, requestId);
        case "refreshDashboardCache":
          return dashCtrl.refreshDashboardCache(role, staffId, requestId);
        case "getDrillDownDetail":
          return dashCtrl.getDrillDownDetail(role, staffId, payload.category || "", requestId);
        default:
          return ResponseHelper.error("UNKNOWN_ACTION", `Action '${action}' is not recognized.`, requestId, 404);
      }
    } catch (err) {
      return ResponseHelper.error("SERVER_ERROR", err.message || "An internal error occurred.", requestId, 500);
    }
  }
  function setupAllSpreadsheetsAndSheets() {
    return setupAllDatabases();
  }
  function cronDailyMailQueue() {
    console.log("Daily Mail Queue cron executed.");
  }
  function cronRecalculateDashboardCache() {
    const dashService = new DashboardAggregationService();
    dashService.recalculateAndCacheAll();
  }
  function cronAuditChainScan() {
    const auditService = new AuditService();
    return auditService.verifyAuditChain("CRON_SYSTEM");
  }
  return __toCommonJS(index_exports);
})();

// Google Apps Script Top-Level Entry Points
function doGet(e) { return GASApp.doGet(e); }
function doPost(e) { return GASApp.doPost(e); }
function setupAllSpreadsheetsAndSheets() { return GASApp.setupAllSpreadsheetsAndSheets(); }
function cronDailyMailQueue() { return GASApp.cronDailyMailQueue(); }
function cronRecalculateDashboardCache() { return GASApp.cronRecalculateDashboardCache(); }
function cronAuditChainScan() { return GASApp.cronAuditChainScan(); }
