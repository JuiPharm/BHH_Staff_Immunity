import { AuditRedactionUtility } from '../utils/AuditRedactionUtility';
import { AuditHashChain } from '../utils/AuditHashChain';
import { AuditLogEntryDTO } from '../dto/AuditDTO';

export class AuditTamperingTestSuite {
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

    // Test Case 1: Sensitive Data Redaction
    try {
      const sensitivePayload = {
        staffId: 'ST8004',
        password: 'SuperSecretPassword123',
        sessionToken: 'token-abc-123',
        action: 'LOGIN'
      };
      const redactedJson = AuditRedactionUtility.redactToJson(sensitivePayload);

      const isPasswordRedacted = redactedJson.includes('[REDACTED]') && !redactedJson.includes('SuperSecretPassword123');
      const isTokenRedacted = !redactedJson.includes('token-abc-123');

      assert(isPasswordRedacted && isTokenRedacted, 'Test 1: Sensitive Data Redaction (Passwords & Tokens Redacted)');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 1 Error - ${e.message}`);
    }

    // Test Case 2: Cryptographic Hash Chain Link Generation
    try {
      const log1: AuditLogEntryDTO = {
        auditId: 'log-1',
        timestamp: '2026-07-24T10:00:00Z',
        actorStaffId: 'IC8001',
        actorRole: 'INFECTION_CONTROL',
        action: 'LOGIN_SUCCESS',
        entityType: 'User',
        entityId: 'IC8001',
        requestId: 'req-1',
        oldValueHash: '0000000000000000000000000000000000000000000000000000000000000000',
        newValueHash: '0000000000000000000000000000000000000000000000000000000000000000',
        metadataJson: '{}',
        ipAddress: '10.20.4.12',
        userAgentHash: '0000000000000000000000000000000000000000000000000000000000000000',
        success: true,
        failureReason: '',
        previousHash: AuditHashChain.GENESIS_PREVIOUS_HASH,
        currentHash: ''
      };
      log1.currentHash = AuditHashChain.computeEntryHash(log1);

      const log2: AuditLogEntryDTO = {
        auditId: 'log-2',
        timestamp: '2026-07-24T10:05:00Z',
        actorStaffId: 'MD8003',
        actorRole: 'PHYSICIAN',
        action: 'PHYSICIAN_OVERRIDE',
        entityType: 'HealthRecord',
        entityId: 'rec-1',
        requestId: 'req-2',
        oldValueHash: '0000000000000000000000000000000000000000000000000000000000000000',
        newValueHash: '0000000000000000000000000000000000000000000000000000000000000000',
        metadataJson: '{"reason":"Override"}',
        ipAddress: '10.20.4.15',
        userAgentHash: '0000000000000000000000000000000000000000000000000000000000000000',
        success: true,
        failureReason: '',
        previousHash: log1.currentHash,
        currentHash: ''
      };
      log2.currentHash = AuditHashChain.computeEntryHash(log2);

      const verification = AuditHashChain.verifyChain([log1, log2]);
      assert(verification.isValid, 'Test 2: Cryptographic Hash Chain Link Generation & Verification');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 2 Error - ${e.message}`);
    }

    // Test Case 3: Tampered Log Entry Detection
    try {
      const log1: AuditLogEntryDTO = {
        auditId: 'log-1',
        timestamp: '2026-07-24T10:00:00Z',
        actorStaffId: 'IC8001',
        actorRole: 'INFECTION_CONTROL',
        action: 'LOGIN_SUCCESS',
        entityType: 'User',
        entityId: 'IC8001',
        requestId: 'req-1',
        oldValueHash: '0000000000000000000000000000000000000000000000000000000000000000',
        newValueHash: '0000000000000000000000000000000000000000000000000000000000000000',
        metadataJson: '{}',
        ipAddress: '10.20.4.12',
        userAgentHash: '0000000000000000000000000000000000000000000000000000000000000000',
        success: true,
        failureReason: '',
        previousHash: AuditHashChain.GENESIS_PREVIOUS_HASH,
        currentHash: ''
      };
      log1.currentHash = AuditHashChain.computeEntryHash(log1);

      // Maliciously alter log1 metadata without updating CurrentHash
      const tamperedLog1 = { ...log1, metadataJson: '{"hacked":true}' };

      const verification = AuditHashChain.verifyChain([tamperedLog1]);
      assert(!verification.isValid && verification.tamperedLogId === 'log-1', 'Test 3: Tampered Log Entry Content Detection');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 3 Error - ${e.message}`);
    }

    // Test Case 4: Deleted Log Entry Detection
    try {
      const log1: AuditLogEntryDTO = {
        auditId: 'log-1',
        timestamp: '2026-07-24T10:00:00Z',
        actorStaffId: 'IC8001',
        actorRole: 'INFECTION_CONTROL',
        action: 'LOGIN_SUCCESS',
        entityType: 'User',
        entityId: 'IC8001',
        requestId: 'req-1',
        oldValueHash: '0000000000000000000000000000000000000000000000000000000000000000',
        newValueHash: '0000000000000000000000000000000000000000000000000000000000000000',
        metadataJson: '{}',
        ipAddress: '10.20.4.12',
        userAgentHash: '0000000000000000000000000000000000000000000000000000000000000000',
        success: true,
        failureReason: '',
        previousHash: AuditHashChain.GENESIS_PREVIOUS_HASH,
        currentHash: ''
      };
      log1.currentHash = AuditHashChain.computeEntryHash(log1);

      const log2: AuditLogEntryDTO = {
        auditId: 'log-2',
        timestamp: '2026-07-24T10:05:00Z',
        actorStaffId: 'MD8003',
        actorRole: 'PHYSICIAN',
        action: 'PHYSICIAN_OVERRIDE',
        entityType: 'HealthRecord',
        entityId: 'rec-1',
        requestId: 'req-2',
        oldValueHash: '0000000000000000000000000000000000000000000000000000000000000000',
        newValueHash: '0000000000000000000000000000000000000000000000000000000000000000',
        metadataJson: '{}',
        ipAddress: '10.20.4.15',
        userAgentHash: '0000000000000000000000000000000000000000000000000000000000000000',
        success: true,
        failureReason: '',
        previousHash: log1.currentHash,
        currentHash: ''
      };
      log2.currentHash = AuditHashChain.computeEntryHash(log2);

      // Maliciously delete log1 (log2 is now first row, but its previousHash links to log1)
      const verification = AuditHashChain.verifyChain([log2]);
      assert(!verification.isValid, 'Test 4: Deleted Log Entry Detection (Broken PreviousHash Link)');
    } catch (e: any) {
      results.push(`❌ FAIL: Test 4 Error - ${e.message}`);
    }

    return {
      total: 4,
      passed,
      results
    };
  }
}
