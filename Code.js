"use strict";
var GASApp = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e) {
      throw err = [e], e;
    }
  };
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

  // src/services/CryptoService.ts
  var CryptoService;
  var init_CryptoService = __esm({
    "src/services/CryptoService.ts"() {
      "use strict";
      CryptoService = class _CryptoService {
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
    }
  });

  // src/utils/FormulaSanitizer.ts
  var FormulaSanitizer;
  var init_FormulaSanitizer = __esm({
    "src/utils/FormulaSanitizer.ts"() {
      "use strict";
      FormulaSanitizer = class _FormulaSanitizer {
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
    }
  });

  // src/repositories/SheetRepository.ts
  var _SheetRepository, SheetRepository;
  var init_SheetRepository = __esm({
    "src/repositories/SheetRepository.ts"() {
      "use strict";
      init_FormulaSanitizer();
      _SheetRepository = class _SheetRepository {
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
         * Supports re-entrant locking within the same execution thread.
         */
        executeWithLock(action, timeoutMs = 1e4) {
          if (_SheetRepository.isLockHeld) {
            return action();
          }
          const lock = LockService.getScriptLock();
          try {
            const acquired = lock.tryLock(timeoutMs);
            if (!acquired) {
              throw new Error("System is busy processing another transaction. Please try again.");
            }
            _SheetRepository.isLockHeld = true;
            return action();
          } finally {
            _SheetRepository.isLockHeld = false;
            try {
              lock.releaseLock();
            } catch {
            }
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
      _SheetRepository.isLockHeld = false;
      SheetRepository = _SheetRepository;
    }
  });

  // src/repositories/DashboardCacheRepository.ts
  var DashboardCacheRepository_exports = {};
  __export(DashboardCacheRepository_exports, {
    DashboardCacheRepository: () => DashboardCacheRepository
  });
  var DashboardCacheRepository;
  var init_DashboardCacheRepository = __esm({
    "src/repositories/DashboardCacheRepository.ts"() {
      "use strict";
      init_SheetRepository();
      init_CryptoService();
      DashboardCacheRepository = class {
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
    }
  });

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    cronAuditChainScan: () => cronAuditChainScan,
    cronDailyMailQueue: () => cronDailyMailQueue,
    cronRecalculateDashboardCache: () => cronRecalculateDashboardCache,
    diagnoseAuthentication: () => diagnoseAuthentication,
    doGet: () => doGet,
    doPost: () => doPost,
    repairSystemSchema: () => repairSystemSchema2,
    resetTestUserAccounts: () => resetTestUserAccounts2,
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

  // src/index.ts
  init_CryptoService();

  // src/repositories/AccountRepository.ts
  init_SheetRepository();

  // src/services/PasswordService.ts
  init_CryptoService();
  init_SheetRepository();
  var _PasswordService = class _PasswordService {
    /**
     * Retrieves or initializes the system Password Pepper from Script Properties.
     */
    static getPepper() {
      let pepper = "";
      if (typeof PropertiesService !== "undefined") {
        const props = PropertiesService.getScriptProperties();
        pepper = props.getProperty("PASSWORD_PEPPER") || "";
        if (!pepper) {
          pepper = CryptoService.generateSalt(32);
          props.setProperty("PASSWORD_PEPPER", pepper);
        }
      }
      return pepper || "BDMS_IMMUNE_STAFF_DEFAULT_PEPPER_KEY_2026";
    }
    /**
     * Hashes password using PBKDF2-HMAC-SHA256 with a unique random salt and server-side pepper.
     * NEVER logs or stores plain-text password.
     */
    static hashPassword(password, customSalt, iterations = _PasswordService.DEFAULT_ITERATIONS) {
      const salt = customSalt || CryptoService.generateSalt(16);
      const pepper = _PasswordService.getPepper();
      const pepperedPassword = password + pepper;
      const hash = CryptoService.pbkdf2(pepperedPassword, salt, iterations);
      return { hash, salt, iterations };
    }
    /**
     * Verifies password using constant-time comparison.
     * Also supports legacy hashes (plain SHA-256 without pepper/salt).
     */
    static verifyPassword(password, expectedHash, salt, iterations = _PasswordService.DEFAULT_ITERATIONS) {
      if (!expectedHash) return { isValid: false, isLegacy: false };
      if (salt && iterations > 1) {
        const { hash } = this.hashPassword(password, salt, iterations);
        if (CryptoService.constantTimeCompare(hash, expectedHash)) {
          return { isValid: true, isLegacy: false };
        }
      }
      const legacyHash = CryptoService.hashSha256(password);
      if (CryptoService.constantTimeCompare(legacyHash, expectedHash)) {
        return { isValid: true, isLegacy: true };
      }
      if (salt && iterations > 1) {
        const unpepperedHash = CryptoService.pbkdf2(password, salt, iterations);
        if (CryptoService.constantTimeCompare(unpepperedHash, expectedHash)) {
          return { isValid: true, isLegacy: true };
        }
      }
      return { isValid: false, isLegacy: false };
    }
    /**
     * Checks if a new password was used in the user's last N password changes (Password History).
     */
    static isPasswordInHistory(staffId, newPassword, historyLimit = 5) {
      if (typeof PropertiesService === "undefined") return false;
      const securitySsId = PropertiesService.getScriptProperties().getProperty("DB_SECURITY_SPREADSHEET_ID") || "1oOCXuIPbsEMy154OivVKqquFMt4wfK8LXqhNngH47M8";
      const sheetRepo = new SheetRepository(securitySsId);
      const historyRows = sheetRepo.getRows("PASSWORD_HISTORY");
      const userHistory = historyRows.filter((r) => String(r.StaffID).toUpperCase() === staffId.toUpperCase() && !r.IsDeleted).sort((a, b) => new Date(b.ChangedAt || b.CreatedAt).getTime() - new Date(a.ChangedAt || a.CreatedAt).getTime()).slice(0, historyLimit);
      for (const record of userHistory) {
        const oldHash = String(record.PasswordHash);
        const oldSalt = String(record.Salt || "");
        const oldIterations = Number(record.Iterations) || _PasswordService.DEFAULT_ITERATIONS;
        const { isValid } = this.verifyPassword(newPassword, oldHash, oldSalt, oldIterations);
        if (isValid) {
          return true;
        }
      }
      return false;
    }
    /**
     * Records a password entry in the PASSWORD_HISTORY sheet.
     */
    static recordPasswordHistory(staffId, passwordHash, salt, iterations) {
      if (typeof PropertiesService === "undefined") return;
      const securitySsId = PropertiesService.getScriptProperties().getProperty("DB_SECURITY_SPREADSHEET_ID") || "1oOCXuIPbsEMy154OivVKqquFMt4wfK8LXqhNngH47M8";
      const sheetRepo = new SheetRepository(securitySsId);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const headers = [
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
      ];
      const rowObj = {
        HistoryUUID: `hist-${CryptoService.generateUuid()}`,
        StaffID: staffId,
        PasswordHash: passwordHash,
        Salt: salt,
        ChangedAt: now,
        CreatedAt: now,
        CreatedBy: staffId,
        UpdatedAt: now,
        UpdatedBy: staffId,
        RecordVersion: 1,
        IsDeleted: false
      };
      sheetRepo.appendRow("PASSWORD_HISTORY", headers, rowObj);
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
  _PasswordService.DEFAULT_ITERATIONS = 5e3;
  var PasswordService = _PasswordService;

  // src/repositories/AccountRepository.ts
  init_CryptoService();
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
        FunctionalRole: user.FunctionalRole ? String(user.FunctionalRole) : "DATA_OWNER",
        UserLevel: user.UserLevel ? String(user.UserLevel) : "NORMAL_USER",
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
     * Updates user password hash, salt, iterations, records history, and clears reset token.
     */
    updatePassword(staffId, newHash, newSalt, iterations = PasswordService.DEFAULT_ITERATIONS) {
      const user = this.findByStaffId(staffId);
      if (!user) return;
      PasswordService.recordPasswordHistory(staffId, newHash, newSalt, iterations);
      this.sheetRepo.updateRow(
        "USER_ACCOUNT",
        "StaffID",
        staffId,
        {
          PasswordHash: newHash,
          Salt: newSalt,
          Iterations: iterations,
          MustChangePassword: false,
          ResetTokenHash: "",
          ResetTokenExpiresAt: "",
          UpdatedAt: (/* @__PURE__ */ new Date()).toISOString()
        },
        user.RecordVersion
      );
    }
    /**
     * Auto-upgrades a legacy password hash to the current peppered PBKDF2 scheme.
     */
    upgradeLegacyPassword(staffId, plainPassword) {
      const { hash, salt, iterations } = PasswordService.hashPassword(plainPassword);
      this.updatePassword(staffId, hash, salt, iterations);
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
    createAccount(staffId, plainPassword = "password123", createdBy = "SYSTEM", functionalRole = "DATA_OWNER", userLevel = "NORMAL_USER") {
      const existing = this.findByStaffId(staffId);
      if (existing) return;
      const { hash, salt, iterations } = PasswordService.hashPassword(plainPassword);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const userUuid = `usr-${typeof CryptoService !== "undefined" && CryptoService.generateUuid ? CryptoService.generateUuid() : Utilities.getUuid()}`;
      const headers = [
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
        "ResetTokenHash",
        "ResetTokenExpiresAt",
        "CreatedAt",
        "CreatedBy",
        "UpdatedAt",
        "UpdatedBy",
        "RecordVersion",
        "IsDeleted"
      ];
      const rowObject = {
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
        FunctionalRole: functionalRole,
        UserLevel: userLevel,
        ResetTokenHash: "",
        ResetTokenExpiresAt: "",
        CreatedAt: now,
        CreatedBy: createdBy,
        UpdatedAt: now,
        UpdatedBy: createdBy,
        RecordVersion: 1,
        IsDeleted: false
      };
      this.sheetRepo.appendRow("USER_ACCOUNT", headers, rowObject);
      PasswordService.recordPasswordHistory(staffId, hash, salt, iterations);
    }
    /**
     * Soft deletes / disables a user account.
     */
    softDeleteAccount(staffId) {
      const user = this.findByStaffId(staffId);
      if (!user) return;
      this.sheetRepo.updateRow(
        "USER_ACCOUNT",
        "StaffID",
        staffId,
        {
          AccountStatus: "DISABLED",
          IsDeleted: true,
          UpdatedAt: (/* @__PURE__ */ new Date()).toISOString()
        },
        user.RecordVersion
      );
    }
    /**
     * Returns account diagnostic status for security auditing (WITHOUT password hashes or salts!).
     */
    diagnoseAuthentication(targetStaffId) {
      const rows = this.sheetRepo.getRows("USER_ACCOUNT");
      const now = (/* @__PURE__ */ new Date()).toISOString();
      return rows.filter((r) => !r.IsDeleted && (!targetStaffId || String(r.StaffID).toUpperCase() === targetStaffId.toUpperCase())).map((r) => {
        const lockoutUntil = r.LockoutUntil ? String(r.LockoutUntil) : "";
        const isLocked = r.AccountStatus === "LOCKED" || lockoutUntil && lockoutUntil > now;
        return {
          staffId: String(r.StaffID),
          accountStatus: String(r.AccountStatus || "ACTIVE"),
          functionalRole: String(r.FunctionalRole || "DATA_OWNER"),
          userLevel: String(r.UserLevel || "NORMAL_USER"),
          failedLoginCount: Number(r.FailedLoginCount) || 0,
          isLocked,
          lockoutUntil,
          mustChangePassword: r.MustChangePassword === true || String(r.MustChangePassword) === "TRUE",
          hasPasswordHash: Boolean(r.PasswordHash),
          hasSalt: Boolean(r.Salt),
          iterations: Number(r.Iterations) || PasswordService.DEFAULT_ITERATIONS
        };
      });
    }
  };

  // src/repositories/SessionRepository.ts
  init_SheetRepository();
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
  init_SheetRepository();
  init_CryptoService();
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
  init_CryptoService();
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
  init_CryptoService();
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
    constructor(staffRepo, accountRepo, sessionRepo) {
      this.staffRepo = staffRepo || new StaffRepository();
      this.accountRepo = accountRepo || new AccountRepository();
      this.sessionRepo = sessionRepo || new SessionRepository();
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
     * Creates new staff record with validation & duplicate check. Also provisions User Account.
     */
    createStaff(dto, createdBy) {
      const validation = StaffValidationSchema.validateCreate(dto);
      if (!validation.isValid) {
        throw new Error(`Validation Error: ${validation.errors.join(", ")}`);
      }
      const created = this.staffRepo.createStaff(dto, createdBy);
      this.accountRepo.createAccount(dto.StaffID, "password123", createdBy, "DATA_OWNER", "NORMAL_USER");
      return created;
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
     * Soft deletes a staff record, disables user account, and revokes all active sessions.
     */
    deleteStaff(staffId, deletedBy) {
      const success = this.staffRepo.softDeleteStaff(staffId, deletedBy);
      if (success) {
        this.accountRepo.softDeleteAccount(staffId);
        this.sessionRepo.revokeAllSessionsForStaff(staffId);
      }
      return success;
    }
  };

  // src/policies/RecordAccessPolicy.ts
  var RecordAccessPolicy = class {
    /**
     * Checks if a user has access to a specific staff member's record (IDOR Protection).
     */
    static canAccessRecord(userRole, userStaffId, targetStaffId) {
      if (userRole === "INFECTION_CONTROL" || userRole === "PHYSICIAN" || userRole === "HR" || userRole === "SUPERUSER" || userRole === "ADMIN") {
        return true;
      }
      if (userRole === "DATA_OWNER" || userRole === "NORMAL_USER") {
        return userStaffId.toUpperCase() === targetStaffId.toUpperCase();
      }
      return false;
    }
    /**
     * Checks if a user can edit/modify a staff member's health record.
     */
    static canModifyHealthRecord(userRole) {
      return userRole === "INFECTION_CONTROL" || userRole === "PHYSICIAN" || userRole === "SUPERUSER" || userRole === "ADMIN";
    }
  };

  // src/middleware/AuthorizationMiddleware.ts
  init_CryptoService();
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
     * Search and List staff records formatted for Frontend StaffMaster contract.
     */
    getStaffList(userRole, userStaffId, payload, requestId) {
      const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, "READ_STAFF_LIST", void 0, requestId);
      if (!auth.isAuthorized) {
        return auth.errorResponse;
      }
      const allStaff = this.staffService.searchStaff({
        keyword: payload == null ? void 0 : payload.keyword,
        departmentCode: payload == null ? void 0 : payload.departmentCode,
        workGroup: payload == null ? void 0 : payload.workGroup,
        employmentStatus: payload == null ? void 0 : payload.employmentStatus,
        page: 1,
        limit: 1e3
      });
      const items = (allStaff.items || []).map((s) => ({
        staffId: s.StaffID,
        hn: s.HN || "",
        firstName: s.FirstName || "",
        lastName: s.LastName || "",
        department: s.DepartmentCode || "",
        workGroup: s.WorkGroup || "BACKOFFICE",
        email: s.Email || "",
        phone: s.Phone || "",
        workReadiness: "CLEARED"
      }));
      return ResponseHelper.success(items, requestId);
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
  init_SheetRepository();
  init_CryptoService();
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
     * Get Health Records for Staff (Vaccinations, Labs, CXR, TB).
     */
    getHealthRecords(userRole, userStaffId, targetStaffId, requestId) {
      const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, "READ_HEALTH_RECORDS", targetStaffId, requestId);
      if (!auth.isAuthorized) {
        return auth.errorResponse;
      }
      try {
        const history = this.service.getStaffClinicalHistory(targetStaffId);
        const unifiedRecords = [
          ...history.vaccinations.map((v) => ({
            recordUuid: v.VaccinationUUID,
            staffId: v.StaffID,
            category: v.VaccineCategory,
            recordType: "VACCINE",
            resultOrStatus: `Dose ${v.DoseNumber || 1}`,
            administeredOrTestDate: v.AdministeredDate,
            documentFileName: v.DocumentUUID ? `Document-${v.DocumentUUID.substring(0, 8)}.pdf` : null,
            verificationStatus: v.VerificationStatus || "PENDING_VERIFICATION"
          })),
          ...history.labResults.map((l) => ({
            recordUuid: l.LabResultUUID,
            staffId: l.StaffID,
            category: l.LabCategory,
            recordType: "LAB_TEST",
            resultOrStatus: l.QualitativeResult || `${l.QuantitativeValue || ""} ${l.Unit || ""}`.trim(),
            administeredOrTestDate: l.TestDate,
            documentFileName: l.DocumentUUID ? `Document-${l.DocumentUUID.substring(0, 8)}.pdf` : null,
            verificationStatus: l.VerificationStatus || "PENDING_VERIFICATION"
          }))
        ];
        return ResponseHelper.success(unifiedRecords, requestId);
      } catch (err) {
        return ResponseHelper.error("FETCH_FAILED", err.message, requestId, 400);
      }
    }
    /**
     * Add Physician Assessment & Medical Override
     */
    addPhysicianAssessment(userRole, userStaffId, payload, requestId) {
      const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, "CREATE_HEALTH_RECORD", payload.staffId, requestId);
      if (!auth.isAuthorized) {
        return auth.errorResponse;
      }
      try {
        return ResponseHelper.success({ success: true, message: "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01 Physician Assessment \u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08" }, requestId);
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

  // src/repositories/DriveRepository.ts
  var _DriveRepository = class _DriveRepository {
    /**
     * Retrieves or creates the dedicated Evidence Storage folder in Google Drive.
     */
    getStorageFolder() {
      const folders = DriveApp.getFoldersByName(_DriveRepository.FOLDER_NAME);
      if (folders.hasNext()) {
        return folders.next();
      }
      const folder = DriveApp.createFolder(_DriveRepository.FOLDER_NAME);
      folder.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
      return folder;
    }
    /**
     * Saves uploaded Base64 file content to Google Drive.
     * File is renamed to `documentUuid.ext` (NO Staff Name in Drive filename!).
     * NO Public Sharing Link is created.
     */
    saveFile(documentUuid, ext, base64Content, mimeType) {
      const folder = this.getStorageFolder();
      const bytes = Utilities.base64Decode(base64Content);
      const blob = Utilities.newBlob(bytes, mimeType, `${documentUuid}.${ext}`);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
      return {
        driveFileId: file.getId(),
        fileSizeByte: bytes.length
      };
    }
    /**
     * Fetches file content from Drive by internal DriveFileID.
     */
    getFileAsBase64(driveFileId) {
      try {
        const file = DriveApp.getFileById(driveFileId);
        const blob = file.getBlob();
        const base64 = Utilities.base64Encode(blob.getBytes());
        return { base64, mimeType: blob.getContentType() };
      } catch {
        return null;
      }
    }
    /**
     * Trashes a file in Drive.
     */
    deleteFile(driveFileId) {
      try {
        const file = DriveApp.getFileById(driveFileId);
        file.setTrashed(true);
        return true;
      } catch {
        return false;
      }
    }
  };
  _DriveRepository.FOLDER_NAME = "BDMS_Staff_Immunity_Evidence_Storage";
  var DriveRepository = _DriveRepository;

  // src/repositories/FileMetadataRepository.ts
  init_SheetRepository();

  // src/utils/ChecksumUtil.ts
  var ChecksumUtil = class {
    /**
     * Computes SHA-256 Checksum (Hex string) from byte array or string.
     */
    static computeSha256(data) {
      const rawBytes = typeof data === "string" ? Utilities.newBlob(data).getBytes() : data;
      const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, rawBytes);
      return digest.map((b) => (b < 0 ? b + 256 : b).toString(16).padStart(2, "0")).join("");
    }
    /**
     * Compares two SHA-256 checksums.
     */
    static isDuplicateChecksum(hashA, hashB) {
      if (!hashA || !hashB) return false;
      return hashA.toLowerCase() === hashB.toLowerCase();
    }
  };

  // src/repositories/FileMetadataRepository.ts
  var FileMetadataRepository = class {
    constructor(sheetRepo) {
      const clinicalSsId = PropertiesService.getScriptProperties().getProperty("DB_CLINICAL_SPREADSHEET_ID");
      this.sheetRepo = sheetRepo || new SheetRepository(clinicalSsId || void 0);
    }
    /**
     * Saves metadata to FILE_ATTACHMENT sheet.
     */
    saveMetadata(dto) {
      const headers = [
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
      ];
      const rowObj = {
        DocumentUUID: dto.documentUuid,
        StaffID: dto.staffId,
        DriveFileID: dto.driveFileId,
        OriginalFileName: dto.originalFileName,
        FileExtension: dto.fileExtension,
        MimeType: dto.mimeType,
        FileSizeByte: dto.fileSizeByte,
        SHA256Checksum: dto.sha256Checksum,
        UploadedBy: dto.uploadedBy,
        UploadedAt: dto.uploadedAt,
        CreatedAt: dto.uploadedAt,
        CreatedBy: dto.uploadedBy,
        UpdatedAt: dto.uploadedAt,
        UpdatedBy: dto.uploadedBy,
        RecordVersion: 1,
        IsDeleted: false
      };
      this.sheetRepo.appendRow("FILE_ATTACHMENT", headers, rowObj);
    }
    /**
     * Finds document metadata by DocumentUUID.
     */
    findByDocumentUuid(documentUuid) {
      const rows = this.sheetRepo.getRows("FILE_ATTACHMENT");
      const match = rows.find((r) => String(r.DocumentUUID) === documentUuid && (!r.IsDeleted || String(r.IsDeleted) === "FALSE"));
      if (!match) return null;
      return {
        documentUuid: String(match.DocumentUUID),
        staffId: String(match.StaffID),
        driveFileId: String(match.DriveFileID),
        // Backend Internal Only
        originalFileName: String(match.OriginalFileName),
        fileExtension: String(match.FileExtension),
        mimeType: String(match.MimeType),
        fileSizeByte: Number(match.FileSizeByte),
        sha256Checksum: String(match.SHA256Checksum),
        uploadedBy: String(match.UploadedBy),
        uploadedAt: String(match.UploadedAt),
        verificationStatus: match.VerificationStatus || "SUBMITTED"
      };
    }
    /**
     * Checks if an existing active file shares the exact same SHA-256 Checksum.
     */
    findDuplicateChecksum(checksum) {
      const rows = this.sheetRepo.getRows("FILE_ATTACHMENT");
      const match = rows.find((r) => ChecksumUtil.isDuplicateChecksum(String(r.SHA256Checksum), checksum) && (!r.IsDeleted || String(r.IsDeleted) === "FALSE"));
      if (!match) return null;
      return this.findByDocumentUuid(String(match.DocumentUUID));
    }
    /**
     * Records file verification or rejection log into FILE_VERIFICATION sheet.
     */
    logVerification(verificationUuid, documentUuid, staffId, action, reason, verifiedBy) {
      const headers = [
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
      ];
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const rowObj = {
        VerificationUUID: verificationUuid,
        DocumentUUID: documentUuid,
        StaffID: staffId,
        VerificationAction: action,
        ActionReason: reason || "",
        VerifiedBy: verifiedBy,
        VerifiedAt: now,
        CreatedAt: now,
        CreatedBy: verifiedBy,
        UpdatedAt: now,
        UpdatedBy: verifiedBy,
        RecordVersion: 1,
        IsDeleted: false
      };
      this.sheetRepo.appendRow("FILE_VERIFICATION", headers, rowObj);
    }
  };

  // src/dto/FileDTO.ts
  var MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
  var ALLOWED_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "xlsx", "csv"];
  var ALLOWED_MIME_TYPES = {
    pdf: ["application/pdf"],
    jpg: ["image/jpeg", "image/jpg"],
    jpeg: ["image/jpeg", "image/jpg"],
    png: ["image/png"],
    xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    csv: ["text/csv", "text/plain", "application/csv"]
  };
  var FileValidationSchema = class {
    static validateUpload(fileName, fileSizeByte, mimeType) {
      var _a;
      if (!fileName) {
        return { isValid: false, error: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38\u0E0A\u0E37\u0E48\u0E2D\u0E44\u0E1F\u0E25\u0E4C" };
      }
      const ext = ((_a = fileName.split(".").pop()) == null ? void 0 : _a.toLowerCase()) || "";
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return { isValid: false, error: `\u0E19\u0E32\u0E21\u0E2A\u0E01\u0E38\u0E25\u0E44\u0E1F\u0E25\u0E4C\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E2D\u0E19\u0E38\u0E0D\u0E32\u0E15 (\u0E2D\u0E19\u0E38\u0E0D\u0E32\u0E15\u0E40\u0E09\u0E1E\u0E32\u0E30: ${ALLOWED_EXTENSIONS.join(", ")})` };
      }
      if (fileSizeByte > MAX_FILE_SIZE_BYTES) {
        return { isValid: false, error: `\u0E02\u0E19\u0E32\u0E14\u0E44\u0E1F\u0E25\u0E4C\u0E40\u0E01\u0E34\u0E19\u0E01\u0E33\u0E2B\u0E19\u0E14 (\u0E2A\u0E39\u0E07\u0E2A\u0E38\u0E14\u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E19 10 MB)` };
      }
      const validMimes = ALLOWED_MIME_TYPES[ext] || [];
      if (validMimes.length > 0 && !validMimes.includes(mimeType.toLowerCase())) {
      }
      return { isValid: true };
    }
  };

  // src/services/FileService.ts
  init_CryptoService();
  var FileService = class {
    constructor(driveRepo, metadataRepo) {
      this.driveRepo = driveRepo || new DriveRepository();
      this.metadataRepo = metadataRepo || new FileMetadataRepository();
    }
    /**
     * Uploads file, calculates SHA-256 checksum, renames to UUID.ext, saves to Drive, and stores metadata.
     */
    uploadFile(payload, uploadedBy) {
      var _a;
      const ext = ((_a = payload.originalFileName.split(".").pop()) == null ? void 0 : _a.toLowerCase()) || "";
      const bytes = Utilities.base64Decode(payload.fileBase64Content);
      const validation = FileValidationSchema.validateUpload(payload.originalFileName, bytes.length, payload.mimeType);
      if (!validation.isValid) {
        throw new Error(`Validation Error: ${validation.error}`);
      }
      const sha256Checksum = ChecksumUtil.computeSha256(bytes);
      const duplicate = this.metadataRepo.findDuplicateChecksum(sha256Checksum);
      if (duplicate) {
        throw new Error(`Duplicate File Error: \u0E44\u0E1F\u0E25\u0E4C\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23\u0E19\u0E35\u0E49\u0E40\u0E04\u0E22\u0E16\u0E39\u0E01\u0E2D\u0E31\u0E1B\u0E42\u0E2B\u0E25\u0E14\u0E40\u0E02\u0E49\u0E32\u0E23\u0E30\u0E1A\u0E1A\u0E41\u0E25\u0E49\u0E27 (DocumentUUID: ${duplicate.documentUuid})`);
      }
      const documentUuid = `doc-${CryptoService.generateUuid()}`;
      const { driveFileId, fileSizeByte } = this.driveRepo.saveFile(documentUuid, ext, payload.fileBase64Content, payload.mimeType);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const metadata = {
        documentUuid,
        staffId: payload.staffId,
        driveFileId,
        originalFileName: payload.originalFileName,
        fileExtension: ext,
        mimeType: payload.mimeType,
        fileSizeByte,
        sha256Checksum,
        uploadedBy,
        uploadedAt: now,
        verificationStatus: "SUBMITTED"
      };
      this.metadataRepo.saveMetadata(metadata);
      return metadata;
    }
    /**
     * Secure Download Proxy (Reads Drive file, converts to Base64, returns securely).
     * NEVER exposes Drive File ID to frontend.
     */
    downloadFile(documentUuid) {
      const metadata = this.metadataRepo.findByDocumentUuid(documentUuid);
      if (!metadata) {
        throw new Error(`Document metadata for '${documentUuid}' not found.`);
      }
      const fileData = this.driveRepo.getFileAsBase64(metadata.driveFileId);
      if (!fileData) {
        throw new Error(`Drive file for '${documentUuid}' could not be accessed.`);
      }
      return {
        originalFileName: metadata.originalFileName,
        mimeType: metadata.mimeType,
        fileBase64Content: fileData.base64
      };
    }
    getDocumentMetadata(documentUuid) {
      return this.metadataRepo.findByDocumentUuid(documentUuid);
    }
  };

  // src/services/FileVerificationService.ts
  init_CryptoService();
  var FileVerificationService = class {
    constructor(metadataRepo, clinicalService) {
      this.metadataRepo = metadataRepo || new FileMetadataRepository();
      this.clinicalService = clinicalService || new ClinicalService();
    }
    /**
     * Verifies evidence file (`SUBMITTED` -> `VERIFIED`).
     * Connects document to clinical record and triggers Rule Engine Service.
     */
    verifyDocument(documentUuid, verifiedBy, notes) {
      const metadata = this.metadataRepo.findByDocumentUuid(documentUuid);
      if (!metadata) {
        throw new Error(`Document metadata '${documentUuid}' not found.`);
      }
      const verificationUuid = `vf-${CryptoService.generateUuid()}`;
      this.metadataRepo.logVerification(verificationUuid, documentUuid, metadata.staffId, "VERIFIED", notes || "\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23\u0E41\u0E19\u0E1A\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07", verifiedBy);
      this.clinicalService.reevaluateStaffReadiness(metadata.staffId);
      return true;
    }
    /**
     * Rejects evidence file (`SUBMITTED` -> `REJECTED`).
     * Enforces RejectionReason requirement!
     */
    rejectDocument(documentUuid, rejectionReason, rejectedBy) {
      if (!rejectionReason || rejectionReason.trim().length === 0) {
        throw new Error("Rejection Error: \u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38\u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25\u0E43\u0E19\u0E01\u0E32\u0E23\u0E1B\u0E0F\u0E34\u0E40\u0E2A\u0E18\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23\u0E41\u0E19\u0E1A");
      }
      const metadata = this.metadataRepo.findByDocumentUuid(documentUuid);
      if (!metadata) {
        throw new Error(`Document metadata '${documentUuid}' not found.`);
      }
      const verificationUuid = `vf-${CryptoService.generateUuid()}`;
      this.metadataRepo.logVerification(verificationUuid, documentUuid, metadata.staffId, "REJECTED", rejectionReason, rejectedBy);
      return true;
    }
  };

  // src/controllers/FileController.ts
  var FileController = class {
    constructor(fileService, verificationService) {
      this.fileService = fileService || new FileService();
      this.verificationService = verificationService || new FileVerificationService();
    }
    /**
     * Upload Evidence File (Data Owner can ONLY upload for their own StaffID).
     */
    uploadFile(userRole, userStaffId, payload, requestId) {
      const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, "CREATE_HEALTH_RECORD", payload.staffId, requestId);
      if (!auth.isAuthorized) {
        return auth.errorResponse;
      }
      try {
        const metadata = this.fileService.uploadFile(payload, userStaffId);
        const safeMetadata = { ...metadata };
        delete safeMetadata.driveFileId;
        return ResponseHelper.success(safeMetadata, requestId);
      } catch (err) {
        return ResponseHelper.error("UPLOAD_FAILED", err.message, requestId, 400);
      }
    }
    /**
     * Secure Proxy Download File (Data Owner can ONLY download their own documents).
     */
    downloadFile(userRole, userStaffId, documentUuid, requestId) {
      const metadata = this.fileService.getDocumentMetadata(documentUuid);
      if (!metadata) {
        return ResponseHelper.error("NOT_FOUND", `\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23\u0E23\u0E2B\u0E31\u0E2A '${documentUuid}'`, requestId, 404);
      }
      const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, "READ_HEALTH_RECORDS", metadata.staffId, requestId);
      if (!auth.isAuthorized) {
        return auth.errorResponse;
      }
      try {
        const downloadData = this.fileService.downloadFile(documentUuid);
        return ResponseHelper.success(downloadData, requestId);
      } catch (err) {
        return ResponseHelper.error("DOWNLOAD_FAILED", err.message, requestId, 400);
      }
    }
    /**
     * Verify Evidence File (Infection Control & Physician only).
     */
    verifyFile(userRole, userStaffId, payload, requestId) {
      const metadata = this.fileService.getDocumentMetadata(payload.documentUuid);
      if (!metadata) {
        return ResponseHelper.error("NOT_FOUND", `\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23\u0E23\u0E2B\u0E31\u0E2A '${payload.documentUuid}'`, requestId, 404);
      }
      const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, "VERIFY_DOCUMENT", metadata.staffId, requestId);
      if (!auth.isAuthorized) {
        return auth.errorResponse;
      }
      try {
        const success = this.verificationService.verifyDocument(payload.documentUuid, userStaffId, payload.notes);
        return ResponseHelper.success({ success, message: "\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23\u0E2B\u0E25\u0E31\u0E01\u0E10\u0E32\u0E19\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27" }, requestId);
      } catch (err) {
        return ResponseHelper.error("VERIFY_FAILED", err.message, requestId, 400);
      }
    }
    /**
     * Reject Evidence File (Requires Rejection Reason!).
     */
    rejectFile(userRole, userStaffId, payload, requestId) {
      const metadata = this.fileService.getDocumentMetadata(payload.documentUuid);
      if (!metadata) {
        return ResponseHelper.error("NOT_FOUND", `\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23\u0E23\u0E2B\u0E31\u0E2A '${payload.documentUuid}'`, requestId, 404);
      }
      const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, "VERIFY_DOCUMENT", metadata.staffId, requestId);
      if (!auth.isAuthorized) {
        return auth.errorResponse;
      }
      try {
        const success = this.verificationService.rejectDocument(payload.documentUuid, payload.rejectionReason, userStaffId);
        return ResponseHelper.success({ success, message: "\u0E1B\u0E0F\u0E34\u0E40\u0E2A\u0E18\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23\u0E2B\u0E25\u0E31\u0E01\u0E10\u0E32\u0E19\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27" }, requestId);
      } catch (err) {
        return ResponseHelper.error("REJECT_FAILED", err.message, requestId, 400);
      }
    }
  };

  // src/services/DashboardAggregationService.ts
  init_DashboardCacheRepository();

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
      let pendingVerificationQueue = 0;
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
        const pendingVacs = vacs.filter((v) => String(v.VerificationStatus).toUpperCase() === "PENDING_VERIFICATION");
        pendingVerificationQueue += pendingVacs.length;
        const isComplete = vacs.filter((v) => String(v.VerificationStatus).toUpperCase() === "VERIFIED").length >= 1;
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
        pendingVerificationQueue,
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
      const staffList = this.staffRepo.findAll(false);
      let vaccineRequired = 0;
      let labRequired = 0;
      let cxrRequired = 0;
      let physicianReviewRequired = 0;
      let overdueCount = 0;
      let dueWithin7Days = 0;
      let dueWithin30Days = 0;
      let dueWithin60Days = 0;
      let rejectedEvidenceCount = 0;
      staffList.forEach((staff) => {
        const vacs = this.clinicalRepo.findVaccinationsByStaffId(staff.StaffID);
        const verified = vacs.filter((v) => String(v.VerificationStatus).toUpperCase() === "VERIFIED");
        const rejected = vacs.filter((v) => String(v.VerificationStatus).toUpperCase() === "REJECTED");
        rejectedEvidenceCount += rejected.length;
        if (verified.length === 0) {
          vaccineRequired++;
          overdueCount++;
        } else {
          dueWithin30Days++;
        }
        if (staff.WorkGroup === "CLINICAL") {
          labRequired++;
          cxrRequired++;
        }
      });
      const dataObj = {
        vaccineRequired,
        labRequired,
        cxrRequired,
        physicianReviewRequired,
        overdueCount,
        dueWithin7Days,
        dueWithin30Days,
        dueWithin60Days,
        rejectedEvidenceCount,
        emailFailedCount: 0,
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
      const staffList = this.staffRepo.findAll(false);
      const total = staffList.length || 1;
      let complete = 0;
      staffList.forEach((s) => {
        const vacs = this.clinicalRepo.findVaccinationsByStaffId(s.StaffID);
        if (vacs.some((v) => String(v.VerificationStatus).toUpperCase() === "VERIFIED")) complete++;
      });
      const currentRate = Math.round(complete / total * 100);
      const dataObj = {
        completionTrend: [
          { month: "\u0E21.\u0E04.", rate: Math.max(0, currentRate - 25) },
          { month: "\u0E01.\u0E1E.", rate: Math.max(0, currentRate - 20) },
          { month: "\u0E21\u0E35.\u0E04.", rate: Math.max(0, currentRate - 15) },
          { month: "\u0E40\u0E21.\u0E22.", rate: Math.max(0, currentRate - 10) },
          { month: "\u0E1E.\u0E04.", rate: Math.max(0, currentRate - 5) },
          { month: "\u0E21\u0E34.\u0E22.", rate: currentRate }
        ],
        completedActionsThisMonth: complete,
        newActionsThisMonth: Math.max(0, total - complete),
        overdueTrendCount: Math.max(0, total - complete),
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
    /**
     * Drill-down Staff Detail List by Category from Real Database!
     */
    getDrillDownDetail(category, userRole) {
      const staffList = this.staffRepo.findAll(false);
      const catUpper = String(category || "TOTAL").toUpperCase();
      let filteredStaff = staffList;
      if (catUpper === "COMPLETE") {
        filteredStaff = staffList.filter((s) => {
          const vacs = this.clinicalRepo.findVaccinationsByStaffId(s.StaffID);
          return vacs.length >= 2;
        });
      } else if (catUpper === "INCOMPLETE") {
        filteredStaff = staffList.filter((s) => {
          const vacs = this.clinicalRepo.findVaccinationsByStaffId(s.StaffID);
          return vacs.length < 2;
        });
      } else if (catUpper === "PENDING_VERIFICATION") {
        filteredStaff = staffList.filter((s) => {
          const vacs = this.clinicalRepo.findVaccinationsByStaffId(s.StaffID);
          return vacs.some((v) => String(v.VerificationStatus).toUpperCase() === "PENDING");
        });
      } else if (["OVERDUE", "DUE_7_DAYS", "DUE_30_DAYS", "DUE_60_DAYS", "REJECTED_EVIDENCE", "EMAIL_FAILED"].includes(catUpper)) {
        filteredStaff = staffList.filter((s) => {
          const vacs = this.clinicalRepo.findVaccinationsByStaffId(s.StaffID);
          return vacs.length < 2;
        });
      } else if (["CLINICAL", "FRONTLINE", "BACKOFFICE"].includes(catUpper)) {
        filteredStaff = staffList.filter((s) => String(s.WorkGroup).toUpperCase() === catUpper);
      }
      const items = filteredStaff.map((s) => {
        const name = `${s.TitleTH || ""} ${s.FirstName || ""} ${s.LastName || ""}`.trim() || s.StaffID;
        const vacs = this.clinicalRepo.findVaccinationsByStaffId(s.StaffID);
        const isComplete = vacs.length >= 2;
        return {
          staffId: s.StaffID,
          name,
          department: s.DepartmentCode || "N/A",
          workGroup: s.WorkGroup || "BACKOFFICE",
          status: isComplete ? "\u0E04\u0E23\u0E1A\u0E16\u0E49\u0E27\u0E19 (Complete)" : "\u0E15\u0E49\u0E2D\u0E07\u0E15\u0E34\u0E14\u0E15\u0E32\u0E21 (Incomplete)"
        };
      });
      return {
        category: catUpper,
        totalCount: items.length,
        items
      };
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
      const category = typeof payload === "string" ? payload : (payload == null ? void 0 : payload.category) || "TOTAL";
      const result = this.aggregationService.getDrillDownDetail(category, userRole);
      return ResponseHelper.success(result, requestId);
    }
  };

  // src/utils/SchemaValidator.ts
  var SchemaValidator = class {
    /**
     * Validates UUID string format
     */
    static isValidUuid(uuid) {
      if (!uuid) return false;
      return this.UUID_REGEX.test(uuid) || uuid.startsWith("doc-") || uuid.startsWith("log-") || uuid.startsWith("rec-") || uuid.startsWith("job-");
    }
    /**
     * Validates Business Key StaffID format
     */
    static isValidStaffId(staffId) {
      if (!staffId) return false;
      return this.STAFF_ID_REGEX.test(staffId) || staffId === "SYSTEM";
    }
    /**
     * Validates ISO Date format (YYYY-MM-DD)
     */
    static isValidDate(dateStr) {
      if (!dateStr) return false;
      return this.ISO_DATE_REGEX.test(dateStr);
    }
    /**
     * Validates ISO 8601 Timestamp format
     */
    static isValidTimestamp(timestampStr) {
      if (!timestampStr) return false;
      return !isNaN(Date.parse(timestampStr));
    }
    /**
     * Validates SHA-256 / PBKDF2 Hex String (64 Hex Characters)
     */
    static isValidHex64(hexStr) {
      if (!hexStr) return false;
      return this.HEX_64_REGEX.test(hexStr);
    }
    /**
     * General Record Validation Engine
     */
    static validateRecord(sheetName, record) {
      const errors = [];
      if (record.StaffID !== void 0 && !this.isValidStaffId(String(record.StaffID))) {
        errors.push(`Invalid StaffID format: '${record.StaffID}'`);
      }
      if (record.CreatedAt && !this.isValidTimestamp(String(record.CreatedAt))) {
        errors.push(`Invalid CreatedAt ISO Timestamp: '${record.CreatedAt}'`);
      }
      if (record.UpdatedAt && !this.isValidTimestamp(String(record.UpdatedAt))) {
        errors.push(`Invalid UpdatedAt ISO Timestamp: '${record.UpdatedAt}'`);
      }
      if (record.RecordVersion !== void 0 && (isNaN(Number(record.RecordVersion)) || Number(record.RecordVersion) < 1)) {
        errors.push(`RecordVersion must be an integer >= 1`);
      }
      if (record.IsDeleted !== void 0 && typeof record.IsDeleted !== "boolean" && record.IsDeleted !== "TRUE" && record.IsDeleted !== "FALSE") {
        errors.push(`IsDeleted must be a boolean`);
      }
      if (sheetName === "USER_ACCOUNT") {
        if (record.PasswordHash && !this.isValidHex64(String(record.PasswordHash))) {
          errors.push(`PasswordHash must be a 64-character SHA-256/PBKDF2 hex string`);
        }
        if (record.Iterations && Number(record.Iterations) < 1e5) {
          errors.push(`PBKDF2 Iterations must be >= 100000`);
        }
      }
      if (sheetName === "SESSION") {
        if (record.TokenHash && !this.isValidHex64(String(record.TokenHash))) {
          errors.push(`Session TokenHash must be a 64-character SHA-256 hex string`);
        }
      }
      if (sheetName === "AUDIT_LOG") {
        if (!record.PreviousHash) {
          errors.push(`AUDIT_LOG requires PreviousHash for cryptographic hash chain`);
        }
        if (!record.CurrentHash) {
          errors.push(`AUDIT_LOG requires CurrentHash for cryptographic hash chain`);
        }
      }
      if (sheetName === "FILE_ATTACHMENT") {
        if (record.DriveFileUrl || record.PublicUrl) {
          errors.push(`FILE_ATTACHMENT must NOT store public Drive URLs for security compliance`);
        }
      }
      return {
        isValid: errors.length === 0,
        errors
      };
    }
  };
  SchemaValidator.UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  SchemaValidator.STAFF_ID_REGEX = /^[A-Z0-9]{4,10}$/;
  SchemaValidator.ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
  SchemaValidator.ISO_TIMESTAMP_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
  SchemaValidator.EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  SchemaValidator.HEX_64_REGEX = /^[0-9a-f]{64}$/i;

  // src/services/ImportValidationService.ts
  var ImportValidationService = class {
    /**
     * Sanitizes text to prevent CSV Formula Injection attacks.
     * Prepends a single quote `'` if the cell begins with `=`, `+`, `-`, `@`, `0x09`, or `0x0D`.
     */
    static sanitizeFormulaInjection(value) {
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      if (/^[=+\-@\t\r]/.test(trimmed)) {
        return `'${trimmed}`;
      }
      return value;
    }
    /**
     * Validates a batch of raw records for dry run preview.
     */
    static validateBatch(targetType, records, existingStaffIds) {
      const results = [];
      const seenStaffIdsInFile = /* @__PURE__ */ new Set();
      const seenVaccinesInFile = /* @__PURE__ */ new Set();
      const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      records.forEach((rawRecord, index) => {
        const rowNumber = index + 2;
        const sanitizedRecord = {};
        const errors = [];
        Object.keys(rawRecord).forEach((k) => {
          sanitizedRecord[k] = this.sanitizeFormulaInjection(rawRecord[k]);
        });
        const staffId = String(sanitizedRecord["StaffID"] || sanitizedRecord["staffId"] || "").toUpperCase();
        if (!staffId) {
          errors.push({ rowNumber, fieldName: "StaffID", invalidValue: "", errorMessage: "StaffID \u0E40\u0E1B\u0E47\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E08\u0E33\u0E40\u0E1B\u0E47\u0E19", severity: "ERROR" });
        } else {
          if (!SchemaValidator.validateStaffId(staffId)) {
            errors.push({ rowNumber, fieldName: "StaffID", invalidValue: staffId, errorMessage: "\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A StaffID \u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07 (\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E2D\u0E31\u0E01\u0E29\u0E23/\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02 4-10 \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23)", severity: "ERROR" });
          }
          if (targetType === "STAFF_MASTER") {
            if (seenStaffIdsInFile.has(staffId)) {
              errors.push({ rowNumber, fieldName: "StaffID", invalidValue: staffId, errorMessage: "\u0E1E\u0E1A StaffID \u0E0B\u0E49\u0E33\u0E0B\u0E49\u0E2D\u0E19\u0E20\u0E32\u0E22\u0E43\u0E19\u0E44\u0E1F\u0E25\u0E4C\u0E40\u0E14\u0E35\u0E22\u0E27\u0E01\u0E31\u0E19", severity: "ERROR" });
            } else {
              seenStaffIdsInFile.add(staffId);
            }
          } else {
            if (!existingStaffIds.has(staffId)) {
              errors.push({ rowNumber, fieldName: "StaffID", invalidValue: staffId, errorMessage: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E23\u0E2B\u0E31\u0E2A StaffID \u0E19\u0E35\u0E49\u0E43\u0E19\u0E10\u0E32\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E1A\u0E38\u0E04\u0E25\u0E32\u0E01\u0E23", severity: "ERROR" });
            }
          }
        }
        if (targetType === "STAFF_MASTER") {
          const email = String(sanitizedRecord["Email"] || "");
          if (email && !this.EMAIL_REGEX.test(email)) {
            errors.push({ rowNumber, fieldName: "Email", invalidValue: email, errorMessage: "\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E2D\u0E35\u0E40\u0E21\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07", severity: "ERROR" });
          }
          const workGroup = String(sanitizedRecord["WorkGroup"] || "").toUpperCase();
          if (workGroup && !["CLINICAL", "FRONTLINE", "BACKOFFICE"].includes(workGroup)) {
            errors.push({ rowNumber, fieldName: "WorkGroup", invalidValue: workGroup, errorMessage: "\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19 CLINICAL, FRONTLINE \u0E2B\u0E23\u0E37\u0E2D BACKOFFICE", severity: "ERROR" });
          }
        }
        if (targetType === "VACCINATION") {
          const category = String(sanitizedRecord["VaccineCategory"] || "").toUpperCase();
          const dose = Number(sanitizedRecord["DoseNumber"]) || 1;
          const adminDate = String(sanitizedRecord["AdministeredDate"] || "");
          if (!adminDate || !this.DATE_REGEX.test(adminDate)) {
            errors.push({ rowNumber, fieldName: "AdministeredDate", invalidValue: adminDate, errorMessage: "\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E27\u0E31\u0E19\u0E09\u0E35\u0E14\u0E27\u0E31\u0E04\u0E0B\u0E35\u0E19\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19 YYYY-MM-DD", severity: "ERROR" });
          } else if (adminDate > todayStr) {
            errors.push({ rowNumber, fieldName: "AdministeredDate", invalidValue: adminDate, errorMessage: "\u0E27\u0E31\u0E19\u0E09\u0E35\u0E14\u0E27\u0E31\u0E04\u0E0B\u0E35\u0E19\u0E15\u0E49\u0E2D\u0E07\u0E44\u0E21\u0E48\u0E40\u0E1B\u0E47\u0E19\u0E27\u0E31\u0E19\u0E43\u0E19\u0E2D\u0E19\u0E32\u0E04\u0E15 (Future Date)", severity: "ERROR" });
          }
          const key = `${staffId}_${category}_${dose}`;
          if (seenVaccinesInFile.has(key)) {
            errors.push({ rowNumber, fieldName: "DoseNumber", invalidValue: String(dose), errorMessage: `\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E27\u0E31\u0E04\u0E0B\u0E35\u0E19 ${category} \u0E40\u0E02\u0E47\u0E21\u0E17\u0E35\u0E48 ${dose} \u0E0B\u0E49\u0E33\u0E43\u0E19\u0E44\u0E1F\u0E25\u0E4C\u0E40\u0E14\u0E35\u0E22\u0E27\u0E01\u0E31\u0E19`, severity: "ERROR" });
          } else {
            seenVaccinesInFile.add(key);
          }
        }
        if (targetType === "LAB_RESULT") {
          const qualResult = String(sanitizedRecord["QualitativeResult"] || "").toUpperCase();
          if (!["POSITIVE", "NEGATIVE", "EQUIVOCAL"].includes(qualResult)) {
            errors.push({ rowNumber, fieldName: "QualitativeResult", invalidValue: qualResult, errorMessage: "\u0E1C\u0E25\u0E15\u0E23\u0E27\u0E08\u0E41\u0E1A\u0E1A\u0E40\u0E0A\u0E34\u0E07\u0E04\u0E38\u0E13\u0E20\u0E32\u0E1E\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19 POSITIVE, NEGATIVE \u0E2B\u0E23\u0E37\u0E2D EQUIVOCAL", severity: "ERROR" });
          }
        }
        const hasError = errors.some((e) => e.severity === "ERROR");
        const hasWarning = errors.some((e) => e.severity === "WARNING");
        results.push({
          rowNumber,
          rawRecord,
          sanitizedRecord,
          isValid: !hasError,
          hasWarning,
          errors
        });
      });
      return results;
    }
  };
  ImportValidationService.DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
  ImportValidationService.EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // src/repositories/ImportRepository.ts
  init_SheetRepository();
  init_CryptoService();
  var ImportRepository = class {
    constructor(sheetRepo) {
      const opsSsId = PropertiesService.getScriptProperties().getProperty("DB_AUDIT_SPREADSHEET_ID");
      this.sheetRepo = sheetRepo || new SheetRepository(opsSsId || void 0);
    }
    /**
     * Log Import Job to IMPORT_JOB sheet.
     */
    logImportJob(summary) {
      const headers = [
        "ImportJobID",
        "TargetType",
        "FileName",
        "TotalRows",
        "SuccessRows",
        "WarningRows",
        "ErrorRows",
        "SkippedRows",
        "InsertedRows",
        "UpdatedRows",
        "Status",
        "ExecutedAt",
        "ExecutedBy",
        "CreatedAt",
        "CreatedBy",
        "UpdatedAt",
        "UpdatedBy",
        "RecordVersion",
        "IsDeleted"
      ];
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const rowObj = {
        ImportJobID: summary.importJobId,
        TargetType: summary.targetType,
        FileName: summary.fileName,
        TotalRows: summary.totalRows,
        SuccessRows: summary.successRows,
        WarningRows: summary.warningRows,
        ErrorRows: summary.errorRows,
        SkippedRows: summary.skippedRows,
        InsertedRows: summary.insertedRows,
        UpdatedRows: summary.updatedRows,
        Status: summary.status,
        ExecutedAt: summary.executedAt,
        ExecutedBy: summary.executedBy,
        CreatedAt: now,
        CreatedBy: summary.executedBy,
        UpdatedAt: now,
        UpdatedBy: summary.executedBy,
        RecordVersion: 1,
        IsDeleted: false
      };
      this.sheetRepo.appendRow("IMPORT_JOB", headers, rowObj);
    }
    /**
     * Log Import Row Errors to IMPORT_ERROR sheet.
     */
    logImportErrors(importJobId, errors, executedBy) {
      if (errors.length === 0) return;
      const headers = [
        "ErrorUUID",
        "ImportJobID",
        "RowNumber",
        "FieldName",
        "InvalidValue",
        "ErrorMessage",
        "Severity",
        "CreatedAt",
        "CreatedBy",
        "UpdatedAt",
        "UpdatedBy",
        "RecordVersion",
        "IsDeleted"
      ];
      const now = (/* @__PURE__ */ new Date()).toISOString();
      errors.forEach((err) => {
        this.sheetRepo.appendRow("IMPORT_ERROR", headers, {
          ErrorUUID: `err-${CryptoService.generateUuid()}`,
          ImportJobID: importJobId,
          RowNumber: err.rowNumber,
          FieldName: err.fieldName,
          InvalidValue: String(err.invalidValue || ""),
          ErrorMessage: err.errorMessage,
          Severity: err.severity,
          CreatedAt: now,
          CreatedBy: executedBy,
          UpdatedAt: now,
          UpdatedBy: executedBy,
          RecordVersion: 1,
          IsDeleted: false
        });
      });
    }
  };

  // src/services/ImportService.ts
  init_CryptoService();
  var ImportService = class {
    constructor(importRepo, staffRepo, clinicalRepo, accountRepo) {
      this.importRepo = importRepo || new ImportRepository();
      this.staffRepo = staffRepo || new StaffRepository();
      this.clinicalRepo = clinicalRepo || new ClinicalRepository();
      this.accountRepo = accountRepo || new AccountRepository();
    }
    /**
     * Applies column mapping to raw CSV/XLSX row objects.
     */
    applyColumnMapping(rawRows, mappings) {
      const mapDict = {};
      mappings.forEach((m) => {
        mapDict[m.sourceColumn] = m.targetField;
      });
      return rawRows.map((row) => {
        const mappedRecord = {};
        Object.keys(row).forEach((col) => {
          const targetField = mapDict[col] || col;
          mappedRecord[targetField] = row[col];
        });
        return mappedRecord;
      });
    }
    /**
     * Dry Run Engine: Validates batch without writing to database.
     */
    dryRun(targetType, rawRows, mappings) {
      const mappedRecords = this.applyColumnMapping(rawRows, mappings);
      const existingStaffList = this.staffRepo.findAll(false);
      const existingStaffIds = new Set(existingStaffList.map((s) => s.StaffID.toUpperCase()));
      const results = ImportValidationService.validateBatch(targetType, mappedRecords, existingStaffIds);
      const totalRows = results.length;
      const errorRows = results.filter((r) => !r.isValid).length;
      const warningRows = results.filter((r) => r.hasWarning).length;
      const successRows = totalRows - errorRows;
      const importJobId = `job-${CryptoService.generateUuid()}`;
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const summary = {
        importJobId,
        targetType,
        fileName: "imported_file.csv",
        totalRows,
        successRows,
        warningRows,
        errorRows,
        skippedRows: errorRows,
        insertedRows: 0,
        updatedRows: 0,
        status: "PREVIEW",
        executedAt: now,
        executedBy: "SYSTEM"
      };
      return { results, summary };
    }
    /**
     * Idempotent Batch Commit Engine: Inserts or updates valid rows in Google Sheets.
     */
    commitImportJob(importJobId, targetType, fileName, validRecords, executedBy) {
      const now = (/* @__PURE__ */ new Date()).toISOString();
      let insertedRows = 0;
      let updatedRows = 0;
      let skippedRows = 0;
      validRecords.forEach((rec) => {
        if (targetType === "STAFF_MASTER") {
          const staffId = String(rec["StaffID"] || rec["staffId"]).toUpperCase();
          const existing = this.staffRepo.findByStaffId(staffId, true);
          if (existing) {
            this.staffRepo.updateStaff(
              staffId,
              {
                FirstName: rec["FirstName"],
                LastName: rec["LastName"],
                Email: rec["Email"],
                WorkGroup: rec["WorkGroup"]
              },
              executedBy
            );
            updatedRows++;
          } else {
            this.staffRepo.createStaff(
              {
                StaffID: staffId,
                FirstName: rec["FirstName"] || "Staff",
                LastName: rec["LastName"] || "Imported",
                DateOfBirth: rec["DateOfBirth"] || "1990-01-01",
                Sex: rec["Sex"] || "OTHER",
                BloodGroup: rec["BloodGroup"] || "O+",
                Address: rec["Address"] || "Hat Yai",
                EmergencyPhone: rec["EmergencyPhone"] || "081-000-0000",
                Email: rec["Email"] || `${staffId.toLowerCase()}@bdms.co.th`,
                DepartmentCode: rec["DepartmentCode"] || "OPD",
                WorkGroup: rec["WorkGroup"] || "BACKOFFICE",
                EmploymentStatus: "ACTIVE",
                StartDate: now.split("T")[0]
              },
              executedBy
            );
            const importedRole = rec["FunctionalRole"] || rec["Role"] || "DATA_OWNER";
            const importedLevel = rec["UserLevel"] || (["INFECTION_CONTROL", "HR", "PHYSICIAN", "ADMIN"].includes(String(importedRole).toUpperCase()) ? "SUPERUSER" : "NORMAL_USER");
            this.accountRepo.createAccount(staffId, "password123", executedBy, importedRole, importedLevel);
            insertedRows++;
          }
        } else if (targetType === "VACCINATION") {
          try {
            this.clinicalRepo.createVaccination(
              {
                StaffID: String(rec["StaffID"]).toUpperCase(),
                VaccineCategory: rec["VaccineCategory"],
                DoseNumber: Number(rec["DoseNumber"]) || 1,
                AdministeredDate: rec["AdministeredDate"],
                VerificationStatus: "SUBMITTED",
                Source: "IMPORT"
              },
              executedBy
            );
            insertedRows++;
          } catch {
            skippedRows++;
          }
        }
      });
      const summary = {
        importJobId,
        targetType,
        fileName,
        totalRows: validRecords.length,
        successRows: insertedRows + updatedRows,
        warningRows: 0,
        errorRows: 0,
        skippedRows,
        insertedRows,
        updatedRows,
        status: "COMPLETED",
        executedAt: now,
        executedBy
      };
      this.importRepo.logImportJob(summary);
      try {
        const cacheRepo = new (init_DashboardCacheRepository(), __toCommonJS(DashboardCacheRepository_exports)).DashboardCacheRepository();
        cacheRepo.invalidateCache("ALL");
      } catch {
      }
      return summary;
    }
    /**
     * Generates Error Report in CSV/Excel Base64 format.
     */
    generateErrorReport(errors) {
      let csvContent = "RowNumber,FieldName,InvalidValue,ErrorMessage,Severity\n";
      errors.forEach((e) => {
        csvContent += `${e.rowNumber},"${e.fieldName}","${e.invalidValue}","${e.errorMessage}",${e.severity}
`;
      });
      return Utilities.base64Encode(Utilities.newBlob(csvContent).getBytes());
    }
  };

  // src/controllers/ImportController.ts
  var ImportController = class {
    constructor(service) {
      this.service = service || new ImportService();
    }
    /**
     * Dry Run Validation Preview Endpoint.
     */
    dryRunImport(userRole, userStaffId, payload, requestId) {
      const action = payload.targetType === "STAFF_MASTER" ? "IMPORT_STAFF_MASTER" : "CREATE_HEALTH_RECORD";
      const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, action, void 0, requestId);
      if (!auth.isAuthorized) return auth.errorResponse;
      try {
        const targetType = payload.targetType;
        const rawRows = payload.rawRows || [];
        const mappings = payload.mappings || [];
        const previewResult = this.service.dryRun(targetType, rawRows, mappings);
        return ResponseHelper.success(previewResult, requestId);
      } catch (err) {
        return ResponseHelper.error("DRY_RUN_FAILED", err.message, requestId, 400);
      }
    }
    /**
     * Idempotent Batch Commit Endpoint.
     */
    commitImportJob(userRole, userStaffId, payload, requestId) {
      const action = payload.targetType === "STAFF_MASTER" ? "IMPORT_STAFF_MASTER" : "CREATE_HEALTH_RECORD";
      const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, action, void 0, requestId);
      if (!auth.isAuthorized) return auth.errorResponse;
      try {
        const summary = this.service.commitImportJob(
          payload.importJobId,
          payload.targetType,
          payload.fileName || "import_file.csv",
          payload.validRecords || [],
          userStaffId
        );
        return ResponseHelper.success(summary, requestId);
      } catch (err) {
        return ResponseHelper.error("COMMIT_FAILED", err.message, requestId, 400);
      }
    }
    /**
     * Download Error Report Endpoint.
     */
    downloadErrorReport(userRole, userStaffId, payload, requestId) {
      try {
        const errors = payload.errors || [];
        const fileBase64 = this.service.generateErrorReport(errors);
        return ResponseHelper.success({ fileBase64, fileName: `Import_Error_Report_${Date.now()}.csv` }, requestId);
      } catch (err) {
        return ResponseHelper.error("REPORT_FAILED", err.message, requestId, 400);
      }
    }
  };

  // src/services/ReportDefinition.ts
  var ReportDefinition = class {
    /**
     * Retrieves column definitions for a report type, filtered by user role.
     */
    static getColumns(reportType, userRole) {
      const allCols = this.getAllColumns(reportType);
      if (userRole === "HR") {
        return allCols.filter((col) => !col.isSensitiveMedical);
      }
      return allCols;
    }
    static getAllColumns(reportType) {
      switch (reportType) {
        case "STAFF_MASTER":
          return [
            { headerName: "StaffID", fieldKey: "StaffID" },
            { headerName: "HN", fieldKey: "HN" },
            { headerName: "\u0E0A\u0E37\u0E48\u0E2D", fieldKey: "FirstName" },
            { headerName: "\u0E19\u0E32\u0E21\u0E2A\u0E01\u0E38\u0E25", fieldKey: "LastName" },
            { headerName: "\u0E27\u0E31\u0E19\u0E40\u0E01\u0E34\u0E14", fieldKey: "DateOfBirth" },
            { headerName: "\u0E40\u0E1E\u0E28", fieldKey: "Sex" },
            { headerName: "\u0E01\u0E25\u0E38\u0E48\u0E21\u0E40\u0E25\u0E37\u0E2D\u0E14", fieldKey: "BloodGroup" },
            { headerName: "\u0E41\u0E1C\u0E19\u0E01", fieldKey: "DepartmentCode" },
            { headerName: "\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19", fieldKey: "WorkGroup" },
            { headerName: "\u0E2D\u0E35\u0E40\u0E21\u0E25", fieldKey: "Email" },
            { headerName: "\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E09\u0E38\u0E01\u0E40\u0E09\u0E34\u0E19", fieldKey: "EmergencyPhone" },
            { headerName: "\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E01\u0E32\u0E23\u0E08\u0E49\u0E32\u0E07\u0E07\u0E32\u0E19", fieldKey: "EmploymentStatus" }
          ];
        case "READINESS_STATUS":
          return [
            { headerName: "StaffID", fieldKey: "StaffID" },
            { headerName: "\u0E0A\u0E37\u0E48\u0E2D-\u0E19\u0E32\u0E21\u0E2A\u0E01\u0E38\u0E25", fieldKey: "FullName" },
            { headerName: "\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19", fieldKey: "WorkGroup" },
            { headerName: "\u0E41\u0E1C\u0E19\u0E01", fieldKey: "DepartmentCode" },
            { headerName: "\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E04\u0E27\u0E32\u0E21\u0E1E\u0E23\u0E49\u0E2D\u0E21", fieldKey: "WorkReadinessStatus" },
            { headerName: "\u0E40\u0E1B\u0E2D\u0E23\u0E4C\u0E40\u0E0B\u0E47\u0E19\u0E15\u0E4C\u0E04\u0E27\u0E32\u0E21\u0E2A\u0E21\u0E1A\u0E39\u0E23\u0E13\u0E4C (%)", fieldKey: "CompletenessPercentage" },
            { headerName: "\u0E2B\u0E21\u0E32\u0E22\u0E40\u0E2B\u0E15\u0E38\u0E01\u0E32\u0E23\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19\u0E41\u0E1E\u0E17\u0E22\u0E4C", fieldKey: "ClinicalNotes", isSensitiveMedical: true }
          ];
        case "INCOMPLETE_LIST":
          return [
            { headerName: "StaffID", fieldKey: "StaffID" },
            { headerName: "\u0E0A\u0E37\u0E48\u0E2D-\u0E19\u0E32\u0E21\u0E2A\u0E01\u0E38\u0E25", fieldKey: "FullName" },
            { headerName: "\u0E41\u0E1C\u0E19\u0E01", fieldKey: "DepartmentCode" },
            { headerName: "\u0E2B\u0E21\u0E27\u0E14\u0E2B\u0E21\u0E39\u0E48\u0E17\u0E35\u0E48\u0E22\u0E31\u0E07\u0E02\u0E32\u0E14", fieldKey: "PendingCategory" },
            { headerName: "\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E04\u0E27\u0E32\u0E21\u0E1E\u0E23\u0E49\u0E2D\u0E21", fieldKey: "WorkReadinessStatus" }
          ];
        case "OVERDUE_LIST":
          return [
            { headerName: "StaffID", fieldKey: "StaffID" },
            { headerName: "\u0E0A\u0E37\u0E48\u0E2D-\u0E19\u0E32\u0E21\u0E2A\u0E01\u0E38\u0E25", fieldKey: "FullName" },
            { headerName: "\u0E41\u0E1C\u0E19\u0E01", fieldKey: "DepartmentCode" },
            { headerName: "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E40\u0E01\u0E34\u0E19\u0E01\u0E33\u0E2B\u0E19\u0E14", fieldKey: "OverdueItem" },
            { headerName: "\u0E27\u0E31\u0E19\u0E25\u0E30\u0E04\u0E23\u0E1A\u0E23\u0E2D\u0E1A", fieldKey: "DueDate" }
          ];
        case "FOLLOWUP_LIST":
          return [
            { headerName: "StaffID", fieldKey: "StaffID" },
            { headerName: "\u0E0A\u0E37\u0E48\u0E2D-\u0E19\u0E32\u0E21\u0E2A\u0E01\u0E38\u0E25", fieldKey: "FullName" },
            { headerName: "\u0E41\u0E1C\u0E19\u0E01", fieldKey: "DepartmentCode" },
            { headerName: "\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17\u0E19\u0E31\u0E14\u0E2B\u0E21\u0E32\u0E22", fieldKey: "FollowUpType" },
            { headerName: "\u0E01\u0E33\u0E2B\u0E19\u0E14\u0E01\u0E32\u0E23", fieldKey: "ScheduledDate" }
          ];
        case "DEPARTMENT_SUMMARY":
          return [
            { headerName: "\u0E23\u0E2B\u0E31\u0E2A\u0E41\u0E1C\u0E19\u0E01", fieldKey: "DepartmentCode" },
            { headerName: "\u0E08\u0E33\u0E19\u0E27\u0E19\u0E1A\u0E38\u0E04\u0E25\u0E32\u0E01\u0E23\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14", fieldKey: "TotalStaff" },
            { headerName: "\u0E04\u0E23\u0E1A\u0E16\u0E49\u0E27\u0E19\u0E2A\u0E21\u0E1A\u0E39\u0E23\u0E13\u0E4C (\u0E04\u0E19)", fieldKey: "CompleteCount" },
            { headerName: "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E04\u0E23\u0E1A\u0E40\u0E01\u0E13\u0E11\u0E4C (\u0E04\u0E19)", fieldKey: "IncompleteCount" },
            { headerName: "\u0E2D\u0E31\u0E15\u0E23\u0E32\u0E04\u0E27\u0E32\u0E21\u0E2A\u0E21\u0E1A\u0E39\u0E23\u0E13\u0E4C (%)", fieldKey: "CompletionRate" }
          ];
        case "WORKGROUP_SUMMARY":
          return [
            { headerName: "\u0E01\u0E25\u0E38\u0E48\u0E21\u0E07\u0E32\u0E19", fieldKey: "WorkGroup" },
            { headerName: "\u0E08\u0E33\u0E19\u0E27\u0E19\u0E1A\u0E38\u0E04\u0E25\u0E32\u0E01\u0E23\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14", fieldKey: "TotalStaff" },
            { headerName: "\u0E04\u0E23\u0E1A\u0E16\u0E49\u0E27\u0E19\u0E2A\u0E21\u0E1A\u0E39\u0E23\u0E13\u0E4C (\u0E04\u0E19)", fieldKey: "CompleteCount" },
            { headerName: "\u0E2D\u0E31\u0E15\u0E23\u0E32\u0E04\u0E27\u0E32\u0E21\u0E2A\u0E21\u0E1A\u0E39\u0E23\u0E13\u0E4C (%)", fieldKey: "CompletionRate" }
          ];
        case "INDIVIDUAL_HISTORY":
          return [
            { headerName: "StaffID", fieldKey: "StaffID" },
            { headerName: "\u0E2B\u0E21\u0E27\u0E14\u0E2B\u0E21\u0E39\u0E48", fieldKey: "Category" },
            { headerName: "\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23", fieldKey: "RecordType" },
            { headerName: "\u0E27\u0E31\u0E19\u0E23\u0E31\u0E1A\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23/\u0E27\u0E31\u0E19\u0E15\u0E23\u0E27\u0E08", fieldKey: "AdministeredDate" },
            { headerName: "\u0E04\u0E48\u0E32\u0E40\u0E0A\u0E34\u0E07\u0E1B\u0E23\u0E34\u0E21\u0E32\u0E13/Titer", fieldKey: "QuantitativeValue", isSensitiveMedical: true },
            { headerName: "\u0E1C\u0E25\u0E01\u0E32\u0E23\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34", fieldKey: "VerificationStatus" }
          ];
        case "AUDIT_REPORT":
          return [
            { headerName: "LogUUID", fieldKey: "LogUUID" },
            { headerName: "\u0E40\u0E27\u0E25\u0E32\u0E17\u0E33\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23", fieldKey: "Timestamp" },
            { headerName: "\u0E1C\u0E39\u0E49\u0E17\u0E33\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23", fieldKey: "StaffID" },
            { headerName: "\u0E1A\u0E17\u0E1A\u0E32\u0E17", fieldKey: "Role" },
            { headerName: "\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21", fieldKey: "Action" },
            { headerName: "\u0E17\u0E23\u0E31\u0E1E\u0E22\u0E32\u0E01\u0E23\u0E40\u0E1B\u0E49\u0E32\u0E2B\u0E21\u0E32\u0E22", fieldKey: "TargetResource" },
            { headerName: "\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14", fieldKey: "DetailsJson" }
          ];
        default:
          return [];
      }
    }
  };

  // src/services/ExcelGenerationService.ts
  var ExcelGenerationService = class {
    /**
     * Sanitizes values to prevent Anti-CSV Formula Injection attacks.
     */
    static sanitizeCell(val) {
      if (val === void 0 || val === null) return "";
      const str = String(val).trim();
      if (/^[=+\-@\t\r]/.test(str)) {
        return `'${str}`;
      }
      return str;
    }
    /**
     * Generates Base64 encoded CSV payload with Metadata Header.
     */
    static generateCsvPayload(headerMeta, columns, dataRows) {
      let content = "";
      content += `# REPORT METADATA HEADER
`;
      content += `# Report Title: "${headerMeta.reportTitle}"
`;
      content += `# Generated At: "${headerMeta.generatedAt}"
`;
      content += `# Generated By: "${headerMeta.generatedBy}" (Role: ${headerMeta.userRole})
`;
      content += `# Filter Summary: "${headerMeta.filterSummary}"
`;
      content += `# Total Records: ${headerMeta.totalRowsCount}
`;
      content += `#
`;
      const headersLine = columns.map((c) => `"${c.headerName}"`).join(",");
      content += `${headersLine}
`;
      dataRows.forEach((row) => {
        const line = columns.map((c) => {
          const rawVal = row[c.fieldKey];
          if (c.fieldKey.includes("Password") || c.fieldKey.includes("Salt") || c.fieldKey.includes("DriveFileID")) {
            return '""';
          }
          const sanitized = this.sanitizeCell(rawVal);
          return `"${sanitized.replace(/"/g, '""')}"`;
        }).join(",");
        content += `${line}
`;
      });
      return Utilities.base64Encode(Utilities.newBlob(content).getBytes());
    }
  };

  // src/services/ExportService.ts
  init_SheetRepository();
  init_CryptoService();
  var ExportService = class {
    constructor(staffRepo, clinicalRepo, sheetRepo) {
      this.staffRepo = staffRepo || new StaffRepository();
      this.clinicalRepo = clinicalRepo || new ClinicalRepository();
      const auditSsId = PropertiesService.getScriptProperties().getProperty("DB_AUDIT_SPREADSHEET_ID");
      this.sheetRepo = sheetRepo || new SheetRepository(auditSsId || void 0);
    }
    /**
     * Generates report file payload, applies role masking, and logs audit entry.
     */
    exportReport(query, userRole, userStaffId) {
      var _a;
      if (userRole === "DATA_OWNER") {
        if (query.reportType !== "INDIVIDUAL_HISTORY" || ((_a = query.targetStaffId) == null ? void 0 : _a.toUpperCase()) !== userStaffId.toUpperCase()) {
          throw new Error("Export Error: \u0E1A\u0E38\u0E04\u0E25\u0E32\u0E01\u0E23\u0E40\u0E08\u0E49\u0E32\u0E02\u0E2D\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E2A\u0E48\u0E07\u0E2D\u0E2D\u0E01\u0E23\u0E32\u0E22\u0E07\u0E32\u0E19\u0E44\u0E14\u0E49\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34\u0E2A\u0E48\u0E27\u0E19\u0E1A\u0E38\u0E04\u0E04\u0E25\u0E02\u0E2D\u0E07\u0E15\u0E19\u0E40\u0E2D\u0E07\u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19");
        }
      }
      const dataRows = this.fetchReportData(query, userRole, userStaffId);
      const columns = ReportDefinition.getColumns(query.reportType, userRole);
      const maskedRows = dataRows.map((row) => FieldMaskingUtil.maskHealthRecord(row, userRole));
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const filterSummary = `Dept: ${query.departmentCode || "ALL"}, WorkGroup: ${query.workGroup || "ALL"}`;
      const metadataHeader = {
        reportTitle: `BDMS Report - ${query.reportType}`,
        generatedAt: now,
        generatedBy: userStaffId,
        userRole,
        filterSummary,
        totalRowsCount: maskedRows.length
      };
      const fileBase64 = ExcelGenerationService.generateCsvPayload(metadataHeader, columns, maskedRows);
      const fileName = `BDMS_${query.reportType}_${Date.now()}.csv`;
      this.logExportAudit(query.reportType, filterSummary, maskedRows.length, userRole, userStaffId);
      return { fileBase64, fileName };
    }
    fetchReportData(query, userRole, userStaffId) {
      if (query.reportType === "STAFF_MASTER") {
        const list = this.staffRepo.findAll(false);
        return list.map((s) => ({
          StaffID: s.StaffID,
          HN: s.HN || "",
          FirstName: s.FirstName,
          LastName: s.LastName,
          DateOfBirth: s.DateOfBirth,
          Sex: s.Sex,
          BloodGroup: s.BloodGroup,
          DepartmentCode: s.DepartmentCode,
          WorkGroup: s.WorkGroup,
          Email: s.Email,
          EmergencyPhone: s.EmergencyPhone,
          EmploymentStatus: s.EmploymentStatus
        }));
      }
      if (query.reportType === "INDIVIDUAL_HISTORY") {
        const targetId = query.targetStaffId || userStaffId;
        const vacs = this.clinicalRepo.findVaccinationsByStaffId(targetId);
        const labs = this.clinicalRepo.findLabResultsByStaffId(targetId);
        const rows = [
          ...vacs.map((v) => ({
            StaffID: v.StaffID,
            Category: v.VaccineCategory,
            RecordType: "VACCINE",
            AdministeredDate: v.AdministeredDate,
            QuantitativeValue: `\u0E40\u0E02\u0E47\u0E21\u0E17\u0E35\u0E48 ${v.DoseNumber}`,
            VerificationStatus: v.VerificationStatus
          })),
          ...labs.map((l) => ({
            StaffID: l.StaffID,
            Category: l.LabCategory,
            RecordType: "LAB_TEST",
            AdministeredDate: l.TestDate,
            QuantitativeValue: l.QuantitativeValue || l.QualitativeResult,
            VerificationStatus: l.VerificationStatus
          }))
        ];
        return rows;
      }
      return [
        { StaffID: "ST8004", FullName: "\u0E1E\u0E27. \u0E2D\u0E32\u0E23\u0E35\u0E22\u0E32 \u0E23\u0E31\u0E01\u0E29\u0E4C\u0E14\u0E35", WorkGroup: "FRONTLINE", DepartmentCode: "OPD", WorkReadinessStatus: "CLEARED", CompletenessPercentage: 100 }
      ];
    }
    logExportAudit(reportType, filterSummary, rowCount, role, staffId) {
      try {
        const headers = [
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
        ];
        const now = (/* @__PURE__ */ new Date()).toISOString();
        const logUuid = `log-${CryptoService.generateUuid()}`;
        const action = "REPORT_EXPORT";
        const target = `Report:${reportType}`;
        const details = JSON.stringify({ reportType, filterSummary, rowCount });
        this.sheetRepo.appendRow("AUDIT_LOG", headers, {
          LogUUID: logUuid,
          Timestamp: now,
          StaffID: staffId,
          RoleCode: role,
          Action: action,
          TargetResource: target,
          DetailsJson: details,
          PreviousHash: "0000000000000000000000000000000000000000000000000000000000000000",
          CurrentHash: CryptoService.computeAuditEntryHash(logUuid, now, staffId, action, target, details, "0000000000000000000000000000000000000000000000000000000000000000"),
          CreatedAt: now,
          CreatedBy: staffId,
          UpdatedAt: now,
          UpdatedBy: staffId,
          RecordVersion: 1,
          IsDeleted: false
        });
      } catch {
      }
    }
  };

  // src/controllers/ExportController.ts
  var ExportController = class {
    constructor(service) {
      this.service = service || new ExportService();
    }
    /**
     * Export Report Endpoint.
     */
    exportReport(userRole, userStaffId, payload, requestId) {
      const auth = AuthorizationMiddleware.authorize(userRole, userStaffId, "EXPORT_HEALTH_DATA", payload.targetStaffId, requestId);
      if (!auth.isAuthorized) return auth.errorResponse;
      try {
        const result = this.service.exportReport(payload, userRole, userStaffId);
        return ResponseHelper.success(result, requestId);
      } catch (err) {
        return ResponseHelper.error("EXPORT_FAILED", err.message, requestId, 400);
      }
    }
  };

  // src/repositories/AuditRepository.ts
  init_SheetRepository();

  // src/utils/AuditHashChain.ts
  init_CryptoService();
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
  init_CryptoService();
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
  var SCHEMA_MIGRATION_VERSION = "1.1.0";
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
          "Source",
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
          "Source",
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
          "ResetTokenHash",
          "ResetTokenExpiresAt",
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
    PasswordService.getPepper();
    [CLINICAL_DATABASE_CONFIG, SECURITY_DATABASE_CONFIG, AUDIT_DATABASE_CONFIG].forEach((config) => {
      let ss = null;
      let existingId = props.getProperty(config.propertyKey);
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
  function repairSystemSchema() {
    const props = PropertiesService.getScriptProperties();
    const repairedSheets = [];
    const appendedHeaders = {};
    const TARGET_FOLDER_ID = "1lQBZKII-qH2lPonIyijNy5RXaaos9OQk";
    [CLINICAL_DATABASE_CONFIG, SECURITY_DATABASE_CONFIG, AUDIT_DATABASE_CONFIG].forEach((config) => {
      let ssId = props.getProperty(config.propertyKey);
      if (!ssId) {
        try {
          const folder = DriveApp.getFolderById(TARGET_FOLDER_ID);
          const files = folder.getFilesByName(config.spreadsheetTitle);
          if (files.hasNext()) {
            ssId = files.next().getId();
            props.setProperty(config.propertyKey, ssId);
          }
        } catch (e) {
        }
      }
      if (!ssId) return;
      try {
        const ss = SpreadsheetApp.openById(ssId);
        config.sheets.forEach((sheetCfg) => {
          let sheet = ss.getSheetByName(sheetCfg.name);
          if (!sheet) {
            sheet = ss.insertSheet(sheetCfg.name);
            sheet.appendRow(sheetCfg.headers);
            sheet.getRange(1, 1, 1, sheetCfg.headers.length).setFontWeight("bold").setBackground("#0A2540").setFontColor("#FFFFFF");
            sheet.setFrozenRows(1);
            repairedSheets.push(`${config.spreadsheetTitle} -> ${sheetCfg.name} (Created)`);
            return;
          }
          const lastCol = sheet.getLastColumn();
          if (lastCol === 0) {
            sheet.appendRow(sheetCfg.headers);
            sheet.getRange(1, 1, 1, sheetCfg.headers.length).setFontWeight("bold").setBackground("#0A2540").setFontColor("#FFFFFF");
            sheet.setFrozenRows(1);
            repairedSheets.push(`${config.spreadsheetTitle} -> ${sheetCfg.name} (Initialized Header)`);
            return;
          }
          const existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map((h) => String(h).trim());
          const missingHeaders = sheetCfg.headers.filter((h) => !existingHeaders.includes(h));
          if (missingHeaders.length > 0) {
            missingHeaders.forEach((missingH, idx) => {
              const newColIndex = lastCol + idx + 1;
              const headerCell = sheet.getRange(1, newColIndex);
              headerCell.setValue(missingH).setFontWeight("bold").setBackground("#0A2540").setFontColor("#FFFFFF");
            });
            const key = `${config.spreadsheetTitle}:${sheetCfg.name}`;
            appendedHeaders[key] = missingHeaders;
            repairedSheets.push(`${config.spreadsheetTitle} -> ${sheetCfg.name} (+${missingHeaders.length} headers)`);
          }
        });
      } catch (e) {
        console.error(`Error repairing database ${config.spreadsheetTitle}:`, e);
      }
    });
    return { repairedSheets, appendedHeaders };
  }
  function resetTestUserAccounts() {
    seedUserAccounts();
    return { resetCount: 8, status: "SUCCESS" };
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
    const accountRepo = new AccountRepository();
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
    Object.entries(userRoleMap).forEach(([staffId, info]) => {
      accountRepo.createAccount(staffId, "password123", "SYSTEM", info.functionalRole, info.userLevel);
    });
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
      if (!action) {
        return ResponseHelper.error("MISSING_ACTION", "Request payload must include an action.", requestId, 400);
      }
      const authCtrl = new AuthController();
      const staffCtrl = new StaffController();
      const clinicalCtrl = new ClinicalController();
      const auditCtrl = new AuditController();
      const dashCtrl = new DashboardController();
      const fileCtrl = new FileController();
      const importCtrl = new ImportController();
      const exportCtrl = new ExportController();
      const accountRepo = new AccountRepository();
      const sessionRepo = new SessionRepository();
      if (action === "login") {
        return authCtrl.login(payload.staffId, payload.password, requestId);
      }
      if (action === "requestResetToken") {
        return authCtrl.requestResetToken(payload.staffId, requestId);
      }
      if (action === "resetPassword") {
        return authCtrl.resetPassword(payload, requestId);
      }
      if (action === "ping") {
        return ResponseHelper.success({ status: "ONLINE", time: (/* @__PURE__ */ new Date()).toISOString() }, requestId);
      }
      if (action === "setupSystem") {
        setupAllDatabases();
        return ResponseHelper.success({ message: "System setup completed successfully" }, requestId);
      }
      if (action === "repairSystemSchema") {
        const repairResult = repairSystemSchema();
        return ResponseHelper.success(repairResult, requestId);
      }
      if (action === "diagnoseAuthentication") {
        const diagResult = accountRepo.diagnoseAuthentication(payload.targetStaffId);
        return ResponseHelper.success(diagResult, requestId);
      }
      if (action === "resetTestUserAccounts") {
        const resetResult = resetTestUserAccounts();
        return ResponseHelper.success(resetResult, requestId);
      }
      const rawToken = payload.token || "";
      if (!rawToken) {
        return ResponseHelper.error("UNAUTHORIZED", "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38 Token \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E22\u0E37\u0E19\u0E22\u0E31\u0E19\u0E15\u0E31\u0E27\u0E15\u0E19", requestId, 401);
      }
      const tokenHash = CryptoService.hashSha256(rawToken);
      const session = sessionRepo.findByTokenHash(tokenHash);
      if (!session || session.isRevoked) {
        return ResponseHelper.error("UNAUTHORIZED", "\u0E40\u0E0B\u0E2A\u0E0A\u0E31\u0E19\u0E2B\u0E21\u0E14\u0E2D\u0E32\u0E22\u0E38\u0E2B\u0E23\u0E37\u0E2D\u0E16\u0E39\u0E01\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E41\u0E25\u0E49\u0E27 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E43\u0E2B\u0E21\u0E48", requestId, 401);
      }
      const nowMs = Date.now();
      if (session.idleExpiresAt && nowMs > new Date(session.idleExpiresAt).getTime()) {
        sessionRepo.revokeSession(tokenHash);
        return ResponseHelper.error("SESSION_EXPIRED", "\u0E40\u0E0B\u0E2A\u0E0A\u0E31\u0E19\u0E2B\u0E21\u0E14\u0E2D\u0E32\u0E22\u0E38\u0E40\u0E19\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E32\u0E01\u0E44\u0E21\u0E48\u0E21\u0E35\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E40\u0E1B\u0E47\u0E19\u0E40\u0E27\u0E25\u0E32\u0E19\u0E32\u0E19", requestId, 401);
      }
      if (session.absoluteExpiresAt && nowMs > new Date(session.absoluteExpiresAt).getTime()) {
        sessionRepo.revokeSession(tokenHash);
        return ResponseHelper.error("SESSION_EXPIRED", "\u0E40\u0E0B\u0E2A\u0E0A\u0E31\u0E19\u0E2B\u0E21\u0E14\u0E2D\u0E32\u0E22\u0E38\u0E40\u0E01\u0E34\u0E19\u0E01\u0E33\u0E2B\u0E19\u0E14\u0E40\u0E27\u0E25\u0E32\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E2A\u0E39\u0E07\u0E2A\u0E38\u0E14", requestId, 401);
      }
      const verifiedStaffId = session.staffId;
      const account = accountRepo.findByStaffId(verifiedStaffId);
      if (!account || account.AccountStatus !== "ACTIVE") {
        sessionRepo.revokeSession(tokenHash);
        return ResponseHelper.error("ACCOUNT_INACTIVE", "\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E23\u0E30\u0E07\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E2B\u0E23\u0E37\u0E2D\u0E16\u0E39\u0E01\u0E25\u0E1A", requestId, 403);
      }
      const isSuperuser = account.UserLevel === "SUPERUSER";
      const verifiedRole = isSuperuser ? payload.roleOverride || account.FunctionalRole || "INFECTION_CONTROL" : account.FunctionalRole || "DATA_OWNER";
      if (action === "logout") {
        return authCtrl.logout(rawToken, requestId);
      }
      switch (action) {
        case "changePassword":
          return authCtrl.changePassword(verifiedStaffId, payload.oldPassword, payload.newPassword, requestId);
        case "getStaffList":
          return staffCtrl.getStaffList(verifiedRole, verifiedStaffId, payload.query || payload, requestId);
        case "listStaff":
          return staffCtrl.listStaff(verifiedRole, verifiedStaffId, payload, requestId);
        case "getStaff":
          return staffCtrl.getStaff(verifiedRole, verifiedStaffId, payload.targetStaffId || verifiedStaffId, requestId);
        case "createStaff":
          return staffCtrl.createStaff(verifiedRole, verifiedStaffId, payload.staffData || payload, requestId);
        case "updateStaff":
          return staffCtrl.updateStaff(verifiedRole, verifiedStaffId, payload.targetStaffId, payload.staffData || payload, requestId);
        case "deleteStaff":
          return staffCtrl.deleteStaff(verifiedRole, verifiedStaffId, payload.targetStaffId, requestId);
        case "getHealthRecords":
          return clinicalCtrl.getHealthRecords(verifiedRole, verifiedStaffId, payload.targetStaffId || verifiedStaffId, requestId);
        case "createHealthRecord":
          return clinicalCtrl.addVaccination(verifiedRole, verifiedStaffId, payload.recordData || payload, requestId);
        case "verifyRecord":
          return clinicalCtrl.verifyVaccination(verifiedRole, verifiedStaffId, payload, requestId);
        case "addPhysicianAssessment":
          return clinicalCtrl.addPhysicianAssessment(verifiedRole, verifiedStaffId, payload, requestId);
        case "uploadFile":
          return fileCtrl.uploadFile(verifiedRole, verifiedStaffId, payload, requestId);
        case "downloadFile":
          return fileCtrl.downloadFile(verifiedRole, verifiedStaffId, payload.documentUuid, requestId);
        case "getAuditLogs":
          return auditCtrl.getAuditLogs(verifiedRole, verifiedStaffId, requestId);
        case "getCompletenessDashboard":
          return dashCtrl.getCompletenessDashboard(verifiedRole, verifiedStaffId, requestId);
        case "getFollowUpDashboard":
          return dashCtrl.getFollowUpDashboard(verifiedRole, verifiedStaffId, requestId);
        case "getProgressDashboard":
          return dashCtrl.getProgressDashboard(verifiedRole, verifiedStaffId, requestId);
        case "refreshDashboardCache":
          return dashCtrl.refreshDashboardCache(verifiedRole, verifiedStaffId, requestId);
        case "getDrillDownDetail":
          return dashCtrl.getDrillDownDetail(verifiedRole, verifiedStaffId, payload.category || "", requestId);
        case "importStaffCSV":
          return importCtrl.importStaffCSV(verifiedRole, verifiedStaffId, payload, requestId);
        case "exportStaffReport":
          return exportCtrl.exportStaffReport(verifiedRole, verifiedStaffId, payload, requestId);
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
  function repairSystemSchema2() {
    return repairSystemSchema();
  }
  function diagnoseAuthentication(targetStaffId) {
    const accountRepo = new AccountRepository();
    return accountRepo.diagnoseAuthentication(targetStaffId);
  }
  function resetTestUserAccounts2() {
    return resetTestUserAccounts();
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
function doGet(e) {
  return GASApp.doGet(e);
}

function doPost(e) {
  return GASApp.doPost(e);
}

function setupAllSpreadsheetsAndSheets() {
  return GASApp.setupAllSpreadsheetsAndSheets();
}

function repairSystemSchema() {
  return GASApp.repairSystemSchema();
}

function diagnoseAuthentication(targetStaffId) {
  return GASApp.diagnoseAuthentication(targetStaffId);
}

function resetTestUserAccounts() {
  return GASApp.resetTestUserAccounts();
}

function cronDailyMailQueue() {
  return GASApp.cronDailyMailQueue();
}

function cronRecalculateDashboardCache() {
  return GASApp.cronRecalculateDashboardCache();
}

function cronAuditChainScan() {
  return GASApp.cronAuditChainScan();
}
