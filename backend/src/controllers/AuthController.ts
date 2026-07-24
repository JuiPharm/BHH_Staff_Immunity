import { AccountRepository } from '../repositories/AccountRepository';
import { SessionRepository } from '../repositories/SessionRepository';
import { StaffRepository } from '../repositories/StaffRepository';
import { PasswordService } from '../services/PasswordService';
import { SessionService } from '../services/SessionService';
import { RateLimitService } from '../services/RateLimitService';
import { CryptoService } from '../services/CryptoService';
import { ResponseHelper } from '../utils/ResponseHelper';

export class AuthController {
  private accountRepo: AccountRepository;
  private sessionRepo: SessionRepository;
  private staffRepo: StaffRepository;

  constructor(accountRepo?: AccountRepository, sessionRepo?: SessionRepository, staffRepo?: StaffRepository) {
    this.accountRepo = accountRepo || new AccountRepository();
    this.sessionRepo = sessionRepo || new SessionRepository();
    this.staffRepo = staffRepo || new StaffRepository();
  }

  /**
   * Generic Error Message to prevent Account Enumeration.
   */
  private static GENERIC_AUTH_ERROR = 'รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง';

  /**
   * Handle User Login
   */
  public login(staffId: string, password: string, requestId: string): GoogleAppsScript.Content.TextOutput {
    if (!staffId || !password) {
      return ResponseHelper.error('INVALID_INPUT', AuthController.GENERIC_AUTH_ERROR, requestId, 400);
    }

    // Rate Limit Check
    if (RateLimitService.isRateLimited(staffId)) {
      return ResponseHelper.error(
        'TOO_MANY_REQUESTS',
        'พยายามเข้าสู่ระบบผิดพลาดเกินกำหนด กรุณาลองใหม่ในอีก 15 นาที',
        requestId,
        429
      );
    }

    const account = this.accountRepo.findByStaffId(staffId);

    // Generic error if account not found to prevent enumeration
    if (!account) {
      RateLimitService.incrementAttempts(staffId);
      return ResponseHelper.error('INVALID_CREDENTIALS', AuthController.GENERIC_AUTH_ERROR, requestId, 401);
    }

    // Account Status & Lockout Check
    if (account.AccountStatus === 'DISABLED') {
      return ResponseHelper.error('ACCOUNT_DISABLED', 'บัญชีผู้ใช้งานนี้ถูกระงับการใช้งาน', requestId, 403);
    }

    if (account.AccountStatus === 'LOCKED' && account.LockoutUntil) {
      const lockoutExpiry = new Date(account.LockoutUntil).getTime();
      if (Date.now() < lockoutExpiry) {
        return ResponseHelper.error(
          'ACCOUNT_LOCKED',
          'บัญชีผู้ใช้ถูกล็อกชั่วคราวเนื่องจากใส่รหัสผ่านผิดเกิน 5 ครั้ง กรุณาลองใหม่ภายหลัง',
          requestId,
          423
        );
      }
    }

    // Password Verification using Constant-Time PBKDF2
    const isValid = PasswordService.verifyPassword(password, account.PasswordHash, account.Salt, account.Iterations);

    if (!isValid) {
      RateLimitService.incrementAttempts(staffId);
      const { failedCount, isLocked } = this.accountRepo.handleFailedLogin(staffId);

      const msg = isLocked
        ? 'บัญชีผู้ใช้ถูกล็อกชั่วคราวเนื่องจากใส่รหัสผ่านผิดครบ 5 ครั้ง'
        : AuthController.GENERIC_AUTH_ERROR;

      return ResponseHelper.error('INVALID_CREDENTIALS', msg, requestId, 401);
    }

    // Login Success: Reset attempts & lockout counters
    RateLimitService.resetAttempts(staffId);
    this.accountRepo.resetFailedLogin(staffId);

    // Create Cryptographic Session Token & Save SHA-256 TokenHash
    const { token, session } = SessionService.createSession(staffId);
    this.sessionRepo.saveSession(session);

    // Fetch Staff Profile
    const staff = this.staffRepo.findByStaffId(staffId);
    const userRole = account.FunctionalRole || 'DATA_OWNER';

    return ResponseHelper.success(
      {
        token,
        staffId: account.StaffID,
        role: userRole,
        userLevel: account.UserLevel || 'NORMAL_USER',
        firstName: staff ? staff.FirstName : account.StaffID,
        lastName: staff ? staff.LastName : '',
        department: staff ? staff.DepartmentCode : 'General',
        workGroup: staff ? staff.WorkGroup : 'CLINICAL',
        email: staff ? staff.Email : '',
        mustChangePassword: account.MustChangePassword
      },
      requestId
    );
  }

  /**
   * Handle Password Change (Revokes ALL active sessions on success)
   */
  public changePassword(staffId: string, oldPassword: string, newPassword: string, requestId: string): GoogleAppsScript.Content.TextOutput {
    if (!oldPassword || !newPassword || newPassword.length < 8) {
      return ResponseHelper.error('INVALID_INPUT', 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร', requestId, 400);
    }

    const account = this.accountRepo.findByStaffId(staffId);
    if (!account) {
      return ResponseHelper.error('NOT_FOUND', 'ไม่พบผู้ใช้งาน', requestId, 404);
    }

    const isValid = PasswordService.verifyPassword(oldPassword, account.PasswordHash, account.Salt, account.Iterations);
    if (!isValid) {
      return ResponseHelper.error('INVALID_PASSWORD', 'รหัสผ่านเดิมไม่ถูกต้อง', requestId, 400);
    }

    // Generate new PBKDF2 hash & salt
    const { hash, salt } = PasswordService.hashPassword(newPassword);
    this.accountRepo.updatePassword(staffId, hash, salt);

    // Revoke ALL active sessions for this StaffID upon password change
    this.sessionRepo.revokeAllSessionsForStaff(staffId);

    return ResponseHelper.success({ message: 'เปลี่ยนรหัสผ่านสำเร็จ และยกเลิกเซสชันเดิมทั้งหมดเรียบร้อย' }, requestId);
  }

  /**
   * Request Password Reset (Generates one-time token hash; NO plain-text password sent in email)
   */
  public requestResetToken(staffId: string, requestId: string): GoogleAppsScript.Content.TextOutput {
    const account = this.accountRepo.findByStaffId(staffId);
    // Generic response to prevent enumeration
    if (account) {
      const { tokenHash } = PasswordService.generateResetToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour validity
      this.accountRepo.setResetToken(staffId, tokenHash, expiresAt);
    }

    return ResponseHelper.success({ message: 'หากรหัสพนักงานถูกต้อง ระบบได้ส่งคำขอรีเซ็ตรหัสผ่านแล้ว' }, requestId);
  }

  /**
   * Perform One-Time Token Reset Password (Revokes ALL active sessions on success)
   */
  public resetPassword(payload: any, requestId: string): GoogleAppsScript.Content.TextOutput {
    const { staffId, resetToken, newPassword } = payload;
    if (!staffId || !resetToken || !newPassword || newPassword.length < 8) {
      return ResponseHelper.error('INVALID_INPUT', 'ข้อมูลการรีเซ็ตรหัสผ่านไม่ครบถ้วน', requestId, 400);
    }

    const account = this.accountRepo.findByStaffId(staffId);
    if (!account || !account.ResetTokenHash || !account.ResetTokenExpiresAt) {
      return ResponseHelper.error('INVALID_TOKEN', 'Reset Token ไม่ถูกต้องหรือหมดอายุ', requestId, 400);
    }

    // Check token expiration
    if (Date.now() > new Date(account.ResetTokenExpiresAt).getTime()) {
      return ResponseHelper.error('TOKEN_EXPIRED', 'Reset Token หมดอายุแล้ว กรุณาส่งคำขอใหม่', requestId, 400);
    }

    // Verify token hash
    const inputTokenHash = PasswordService.hashResetToken(resetToken);
    if (!CryptoService.constantTimeCompare(inputTokenHash, account.ResetTokenHash)) {
      return ResponseHelper.error('INVALID_TOKEN', 'Reset Token ไม่ถูกต้อง', requestId, 400);
    }

    // Update password and revoke all sessions
    const { hash, salt } = PasswordService.hashPassword(newPassword);
    this.accountRepo.updatePassword(staffId, hash, salt);
    this.sessionRepo.revokeAllSessionsForStaff(staffId);

    return ResponseHelper.success({ message: 'รีเซ็ตรหัสผ่านใหม่สำเร็จ และยกเลิกเซสชันทั้งหมดเรียบร้อย' }, requestId);
  }

  /**
   * Handle Logout
   */
  public logout(rawToken: string, requestId: string): GoogleAppsScript.Content.TextOutput {
    if (rawToken) {
      const tokenHash = SessionService.hashToken(rawToken);
      this.sessionRepo.revokeSession(tokenHash);
    }
    return ResponseHelper.success({ message: 'ออกจากระบบสำเร็จ' }, requestId);
  }
}
