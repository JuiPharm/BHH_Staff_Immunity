export class CryptoService {
  /**
   * Generates a random cryptographic salt (hex string).
   */
  public static generateSalt(length = 16): string {
    const bytes = [];
    for (let i = 0; i < length; i++) {
      bytes.push(Math.floor(Math.random() * 256));
    }
    return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Computes SHA-256 hash of a string using GAS Utilities.
   */
  public static hashSha256(input: string): string {
    const signature = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input, Utilities.Charset.UTF_8);
    return signature.map((b) => (b < 0 ? b + 256 : b).toString(16).padStart(2, '0')).join('');
  }

  /**
   * PBKDF2-HMAC-SHA256 implementation using GAS Utilities.computeHmacSha256Signature.
   */
  public static pbkdf2(password: string, salt: string, iterations = 100000): string {
    let key = password + salt;
    for (let i = 0; i < iterations; i++) {
      const sig = Utilities.computeHmacSha256Signature(key, salt);
      key = sig.map((b) => (b < 0 ? b + 256 : b).toString(16).padStart(2, '0')).join('');
    }
    return key;
  }

  /**
   * Generates a random UUIDv4 string.
   */
  public static generateUuid(): string {
    return Utilities.getUuid();
  }

  /**
   * Computes the Audit Log Hash-Chain Entry Hash.
   * EntryHash = SHA256(logUuid + timestamp + staffId + action + targetResource + detailsJson + previousHash)
   */
  public static computeAuditEntryHash(
    logUuid: string,
    timestamp: string,
    staffId: string,
    action: string,
    targetResource: string,
    detailsJson: string,
    previousHash: string
  ): string {
    const payload = `${logUuid}|${timestamp}|${staffId}|${action}|${targetResource}|${detailsJson}|${previousHash}`;
    return CryptoService.hashSha256(payload);
  }

  /**
   * Constant-time comparison to prevent timing attacks.
   */
  public static constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }
}
