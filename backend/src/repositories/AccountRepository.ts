import { SheetRepository } from './SheetRepository';
import { PasswordService } from '../services/PasswordService';
import { CryptoService } from '../services/CryptoService';

export interface UserAccountRecord {
  UserUUID: string;
  StaffID: string;
  PasswordHash: string;
  Salt: string;
  Iterations: number;
  FailedLoginCount: number;
  LockoutUntil?: string;
  MustChangePassword: boolean;
  AccountStatus: 'ACTIVE' | 'DISABLED' | 'LOCKED';
  FunctionalRole?: string;
  UserLevel?: 'SUPERUSER' | 'NORMAL_USER';
  ResetTokenHash?: string;
  ResetTokenExpiresAt?: string;
  CreatedAt: string;
  CreatedBy: string;
  UpdatedAt: string;
  UpdatedBy: string;
  RecordVersion: number;
  IsDeleted: boolean;
}

export class AccountRepository {
  private sheetRepo: SheetRepository;

  constructor(sheetRepo?: SheetRepository) {
    const securitySsId = typeof PropertiesService !== 'undefined' 
      ? PropertiesService.getScriptProperties().getProperty('DB_SECURITY_SPREADSHEET_ID') 
      : null;
    this.sheetRepo = sheetRepo || new SheetRepository(securitySsId || '1oOCXuIPbsEMy154OivVKqquFMt4wfK8LXqhNngH47M8');
  }

  /**
   * Finds user account by StaffID.
   */
  public findByStaffId(staffId: string): UserAccountRecord | null {
    const rows = this.sheetRepo.getRows('USER_ACCOUNT');
    const user = rows.find((r) => String(r.StaffID).toUpperCase() === staffId.toUpperCase() && !r.IsDeleted);
    if (!user) return null;

    return {
      UserUUID: String(user.UserUUID),
      StaffID: String(user.StaffID),
      PasswordHash: String(user.PasswordHash),
      Salt: String(user.Salt),
      Iterations: Number(user.Iterations) || PasswordService.DEFAULT_ITERATIONS,
      FailedLoginCount: Number(user.FailedLoginCount) || 0,
      LockoutUntil: user.LockoutUntil ? String(user.LockoutUntil) : undefined,
      MustChangePassword: user.MustChangePassword === true || String(user.MustChangePassword) === 'TRUE',
      AccountStatus: (user.AccountStatus as any) || 'ACTIVE',
      FunctionalRole: user.FunctionalRole ? String(user.FunctionalRole) : 'DATA_OWNER',
      UserLevel: user.UserLevel ? (String(user.UserLevel) as any) : 'NORMAL_USER',
      ResetTokenHash: user.ResetTokenHash ? String(user.ResetTokenHash) : undefined,
      ResetTokenExpiresAt: user.ResetTokenExpiresAt ? String(user.ResetTokenExpiresAt) : undefined,
      CreatedAt: String(user.CreatedAt),
      CreatedBy: String(user.CreatedBy),
      UpdatedAt: String(user.UpdatedAt),
      UpdatedBy: String(user.UpdatedBy),
      RecordVersion: Number(user.RecordVersion) || 1,
      IsDeleted: user.IsDeleted === true || String(user.IsDeleted) === 'TRUE'
    };
  }

  /**
   * Updates failed login count and triggers lockout if attempts >= 5. Wrapped in LockService.
   */
  public handleFailedLogin(staffId: string): { failedCount: number; isLocked: boolean } {
    return this.sheetRepo.executeWithLock(() => {
      const user = this.findByStaffId(staffId);
      if (!user) return { failedCount: 0, isLocked: false };

      const newFailedCount = user.FailedLoginCount + 1;
      let newStatus = user.AccountStatus;
      let lockoutUntil = user.LockoutUntil;

      if (newFailedCount >= 5) {
        newStatus = 'LOCKED';
        lockoutUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes lockout
      }

      this.sheetRepo.updateRow(
        'USER_ACCOUNT',
        'StaffID',
        staffId,
        {
          FailedLoginCount: newFailedCount,
          AccountStatus: newStatus,
          LockoutUntil: lockoutUntil,
          UpdatedAt: new Date().toISOString()
        },
        user.RecordVersion
      );

      return { failedCount: newFailedCount, isLocked: newFailedCount >= 5 };
    });
  }

  /**
   * Resets failed login counter and clears lockout status upon successful login.
   */
  public resetFailedLogin(staffId: string): void {
    const user = this.findByStaffId(staffId);
    if (!user) return;

    this.sheetRepo.updateRow(
      'USER_ACCOUNT',
      'StaffID',
      staffId,
      {
        FailedLoginCount: 0,
        LockoutUntil: '',
        AccountStatus: 'ACTIVE',
        UpdatedAt: new Date().toISOString()
      },
      user.RecordVersion
    );
  }

  /**
   * Updates user password hash, salt, iterations, records history, and clears reset token.
   */
  public updatePassword(staffId: string, newHash: string, newSalt: string, iterations = PasswordService.DEFAULT_ITERATIONS): void {
    const user = this.findByStaffId(staffId);
    if (!user) return;

    // Record password in history before updating
    PasswordService.recordPasswordHistory(staffId, newHash, newSalt, iterations);

    this.sheetRepo.updateRow(
      'USER_ACCOUNT',
      'StaffID',
      staffId,
      {
        PasswordHash: newHash,
        Salt: newSalt,
        Iterations: iterations,
        MustChangePassword: false,
        ResetTokenHash: '',
        ResetTokenExpiresAt: '',
        UpdatedAt: new Date().toISOString()
      },
      user.RecordVersion
    );
  }

  /**
   * Auto-upgrades a legacy password hash to the current peppered PBKDF2 scheme.
   */
  public upgradeLegacyPassword(staffId: string, plainPassword: string): void {
    const { hash, salt, iterations } = PasswordService.hashPassword(plainPassword);
    this.updatePassword(staffId, hash, salt, iterations);
  }

  /**
   * Sets one-time password reset token hash and expiration.
   */
  public setResetToken(staffId: string, tokenHash: string, expiresAt: string): void {
    const user = this.findByStaffId(staffId);
    if (!user) return;

    this.sheetRepo.updateRow(
      'USER_ACCOUNT',
      'StaffID',
      staffId,
      {
        ResetTokenHash: tokenHash,
        ResetTokenExpiresAt: expiresAt,
        UpdatedAt: new Date().toISOString()
      },
      user.RecordVersion
    );
  }

  /**
   * Creates a new user account with a hashed password.
   */
  public createAccount(
    staffId: string,
    plainPassword = 'password123',
    createdBy = 'SYSTEM',
    functionalRole = 'DATA_OWNER',
    userLevel: 'SUPERUSER' | 'NORMAL_USER' = 'NORMAL_USER'
  ): void {
    const existing = this.findByStaffId(staffId);
    if (existing) return; // Account already exists

    const { hash, salt, iterations } = PasswordService.hashPassword(plainPassword);
    const now = new Date().toISOString();
    const userUuid = `usr-${typeof CryptoService !== 'undefined' && CryptoService.generateUuid ? CryptoService.generateUuid() : Utilities.getUuid()}`;

    const headers = [
      'UserUUID',
      'StaffID',
      'PasswordHash',
      'Salt',
      'Iterations',
      'FailedLoginCount',
      'LockoutUntil',
      'MustChangePassword',
      'AccountStatus',
      'FunctionalRole',
      'UserLevel',
      'ResetTokenHash',
      'ResetTokenExpiresAt',
      'CreatedAt',
      'CreatedBy',
      'UpdatedAt',
      'UpdatedBy',
      'RecordVersion',
      'IsDeleted'
    ];

    const rowObject = {
      UserUUID: userUuid,
      StaffID: staffId,
      PasswordHash: hash,
      Salt: salt,
      Iterations: iterations,
      FailedLoginCount: 0,
      LockoutUntil: '',
      MustChangePassword: true, // Force password change on first login
      AccountStatus: 'ACTIVE',
      FunctionalRole: functionalRole,
      UserLevel: userLevel,
      ResetTokenHash: '',
      ResetTokenExpiresAt: '',
      CreatedAt: now,
      CreatedBy: createdBy,
      UpdatedAt: now,
      UpdatedBy: createdBy,
      RecordVersion: 1,
      IsDeleted: false
    };

    this.sheetRepo.appendRow('USER_ACCOUNT', headers, rowObject);
    PasswordService.recordPasswordHistory(staffId, hash, salt, iterations);
  }

  /**
   * Soft deletes / disables a user account.
   */
  public softDeleteAccount(staffId: string): void {
    const user = this.findByStaffId(staffId);
    if (!user) return;

    this.sheetRepo.updateRow(
      'USER_ACCOUNT',
      'StaffID',
      staffId,
      {
        AccountStatus: 'DISABLED',
        IsDeleted: true,
        UpdatedAt: new Date().toISOString()
      },
      user.RecordVersion
    );
  }

  /**
   * Returns account diagnostic status for security auditing (WITHOUT password hashes or salts!).
   */
  public diagnoseAuthentication(targetStaffId?: string): any[] {
    const rows = this.sheetRepo.getRows('USER_ACCOUNT');
    const now = new Date().toISOString();

    return rows
      .filter((r) => !r.IsDeleted && (!targetStaffId || String(r.StaffID).toUpperCase() === targetStaffId.toUpperCase()))
      .map((r) => {
        const lockoutUntil = r.LockoutUntil ? String(r.LockoutUntil) : '';
        const isLocked = r.AccountStatus === 'LOCKED' || (lockoutUntil && lockoutUntil > now);

        return {
          staffId: String(r.StaffID),
          accountStatus: String(r.AccountStatus || 'ACTIVE'),
          functionalRole: String(r.FunctionalRole || 'DATA_OWNER'),
          userLevel: String(r.UserLevel || 'NORMAL_USER'),
          failedLoginCount: Number(r.FailedLoginCount) || 0,
          isLocked: isLocked,
          lockoutUntil: lockoutUntil,
          mustChangePassword: r.MustChangePassword === true || String(r.MustChangePassword) === 'TRUE',
          hasPasswordHash: Boolean(r.PasswordHash),
          hasSalt: Boolean(r.Salt),
          iterations: Number(r.Iterations) || PasswordService.DEFAULT_ITERATIONS
        };
      });
  }
}
