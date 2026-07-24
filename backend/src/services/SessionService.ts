import { CryptoService } from './CryptoService';

export interface SessionData {
  sessionUuid: string;
  staffId: string;
  tokenHash: string;
  idleExpiresAt: string;
  absoluteExpiresAt: string;
  sessionVersion: number;
  isRevoked: boolean;
  lastSeenAt: string;
  createdAt: string;
}

export class SessionService {
  public static IDLE_TIMEOUT_MINS = 30;
  public static ABSOLUTE_TIMEOUT_HOURS = 12;

  /**
   * Hashes session token using SHA-256.
   */
  public static hashToken(token: string): string {
    return CryptoService.hashSha256(token);
  }

  /**
   * Generates a new random cryptographic session token and session data object.
   * Stores ONLY the token hash in database.
   */
  public static createSession(staffId: string): { token: string; session: SessionData } {
    const rawToken = `sess-${CryptoService.generateUuid()}`;
    const tokenHash = this.hashToken(rawToken);

    const now = new Date();
    const idleExpires = new Date(now.getTime() + this.IDLE_TIMEOUT_MINS * 60 * 1000);
    const absoluteExpires = new Date(now.getTime() + this.ABSOLUTE_TIMEOUT_HOURS * 60 * 60 * 1000);

    const session: SessionData = {
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
  public static isValidSession(session: SessionData): boolean {
    if (session.isRevoked) return false;

    const now = new Date().getTime();
    const idleTime = new Date(session.idleExpiresAt).getTime();
    const absoluteTime = new Date(session.absoluteExpiresAt).getTime();

    if (now > idleTime || now > absoluteTime) return false;
    return true;
  }
}
