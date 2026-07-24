import { CryptoService } from './CryptoService';

export interface PasswordHashResult {
  hash: string;
  salt: string;
  iterations: number;
}

export class PasswordService {
  public static DEFAULT_ITERATIONS = 100000;

  /**
   * Hashes password using PBKDF2-HMAC-SHA256 with a unique random salt.
   * NEVER logs or stores plain-text password.
   */
  public static hashPassword(password: string, customSalt?: string, iterations = PasswordService.DEFAULT_ITERATIONS): PasswordHashResult {
    const salt = customSalt || CryptoService.generateSalt(16);
    const hash = CryptoService.pbkdf2(password, salt, iterations);
    return { hash, salt, iterations };
  }

  /**
   * Verifies password using constant-time string comparison.
   */
  public static verifyPassword(password: string, expectedHash: string, salt: string, iterations = PasswordService.DEFAULT_ITERATIONS): boolean {
    const { hash } = this.hashPassword(password, salt, iterations);
    return CryptoService.constantTimeCompare(hash, expectedHash);
  }

  /**
   * Hashes a one-time password reset token (SHA-256).
   */
  public static hashResetToken(token: string): string {
    return CryptoService.hashSha256(token);
  }

  /**
   * Generates a new random one-time reset token and its SHA-256 hash.
   */
  public static generateResetToken(): { token: string; tokenHash: string } {
    const token = `reset-${CryptoService.generateUuid()}`;
    const tokenHash = this.hashResetToken(token);
    return { token, tokenHash };
  }
}
