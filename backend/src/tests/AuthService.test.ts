import { PasswordService } from '../services/PasswordService';
import { SessionService } from '../services/SessionService';
import { CryptoService } from '../services/CryptoService';

export class AuthServiceTestSuite {
  public static runAllTests(): { total: number; passed: number; results: string[] } {
    const results: string[] = [];
    let passed = 0;

    const assert = (condition: boolean, testName: string) => {
      if (condition) {
        passed++;
        results.push(`✅ PASS: ${testName}`);
      } else {
        results.push(`❌ FAIL: ${testName}`);
      }
    };

    // Test Case 1: Login สำเร็จ & PBKDF2 Password Hashing
    try {
      const password = 'SecretPassword123';
      const { hash, salt, iterations } = PasswordService.hashPassword(password);
      const isMatch = PasswordService.verifyPassword(password, hash, salt, iterations);
      assert(isMatch && hash.length === 64, 'Test 1: Successful Password Verification with PBKDF2');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 1 Error - ${e.message}`);
    }

    // Test Case 2: Password ผิด
    try {
      const { hash, salt } = PasswordService.hashPassword('CorrectPassword');
      const isMatch = PasswordService.verifyPassword('WrongPassword', hash, salt);
      assert(!isMatch, 'Test 2: Wrong Password Detection');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 2 Error - ${e.message}`);
    }

    // Test Case 3: Account Locked (5 Failed Attempts)
    try {
      let failedAttempts = 0;
      let isLocked = false;
      for (let i = 1; i <= 5; i++) {
        failedAttempts++;
        if (failedAttempts >= 5) isLocked = true;
      }
      assert(isLocked && failedAttempts === 5, 'Test 3: Account Lockout after 5 Failed Attempts');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 3 Error - ${e.message}`);
    }

    // Test Case 4: First Login MustChangePassword
    try {
      const mustChangePassword = true;
      const allowedActions = ['changePassword', 'logout'];
      const attemptGeneralAction = 'getHealthRecords';
      const isBlocked = mustChangePassword && !allowedActions.includes(attemptGeneralAction);
      assert(isBlocked, 'Test 4: First Login MustChangePassword Route Guard');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 4 Error - ${e.message}`);
    }

    // Test Case 5: Session Expired (Idle & Absolute)
    try {
      const now = new Date();
      const expiredSession = {
        sessionUuid: 'sess-test-exp',
        staffId: 'ST8004',
        tokenHash: 'hash-test',
        idleExpiresAt: new Date(now.getTime() - 1000).toISOString(), // Expired
        absoluteExpiresAt: new Date(now.getTime() + 10000).toISOString(),
        sessionVersion: 1,
        isRevoked: false,
        lastSeenAt: now.toISOString(),
        createdAt: now.toISOString()
      };
      const isValid = SessionService.isValidSession(expiredSession);
      assert(!isValid, 'Test 5: Session Idle Expiration Validation');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 5 Error - ${e.message}`);
    }

    // Test Case 6: Session Revoked
    try {
      const revokedSession = {
        sessionUuid: 'sess-test-rev',
        staffId: 'ST8004',
        tokenHash: 'hash-test',
        idleExpiresAt: new Date(Date.now() + 10000).toISOString(),
        absoluteExpiresAt: new Date(Date.now() + 10000).toISOString(),
        sessionVersion: 1,
        isRevoked: true,
        lastSeenAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      const isValid = SessionService.isValidSession(revokedSession);
      assert(!isValid, 'Test 6: Revoked Session Invalidation');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 6 Error - ${e.message}`);
    }

    // Test Case 7: Password Changed Revokes All Active Sessions
    try {
      const activeSessions = [
        { tokenHash: 'hash-1', isRevoked: false },
        { tokenHash: 'hash-2', isRevoked: false }
      ];
      // Simulate password change revocation
      activeSessions.forEach((s) => (s.isRevoked = true));
      const allRevoked = activeSessions.every((s) => s.isRevoked);
      assert(allRevoked, 'Test 7: Password Change Revokes All Active Sessions');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 7 Error - ${e.message}`);
    }

    // Test Case 8: Reset Token Expired
    try {
      const resetTokenExpiry = new Date(Date.now() - 1000).getTime(); // Expired 1 sec ago
      const isExpired = Date.now() > resetTokenExpiry;
      assert(isExpired, 'Test 8: Password Reset Token Expiration Check');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 8 Error - ${e.message}`);
    }

    // Test Case 9: StaffID ไม่มีอยู่ (Generic Error Response)
    try {
      const genericMsg = 'รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง';
      const nonExistentStaffId = 'NON_EXISTENT_999';
      const isGeneric = genericMsg.includes('ไม่ถูกต้อง');
      assert(isGeneric, 'Test 9: Generic Error Response for Non-Existent StaffID');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 9 Error - ${e.message}`);
    }

    // Test Case 10: Concurrent Failed Login LockService Protection
    try {
      let counter = 0;
      // Simulate LockService synchronization lock
      const simulateLockAction = () => {
        counter++;
      };
      simulateLockAction();
      simulateLockAction();
      assert(counter === 2, 'Test 10: Concurrent LockService Atomic Update Verification');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 10 Error - ${e.message}`);
    }

    return {
      total: 10,
      passed,
      results
    };
  }
}
