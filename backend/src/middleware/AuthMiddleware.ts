import { SessionRepository } from '../repositories/SessionRepository';
import { AccountRepository } from '../repositories/AccountRepository';
import { SessionService, SessionData } from '../services/SessionService';
import { ResponseHelper } from '../utils/ResponseHelper';

export interface AuthenticatedUser {
  staffId: string;
  mustChangePassword: boolean;
  session: SessionData;
}

export class AuthMiddleware {
  private sessionRepo: SessionRepository;
  private accountRepo: AccountRepository;

  constructor(sessionRepo?: SessionRepository, accountRepo?: AccountRepository) {
    this.sessionRepo = sessionRepo || new SessionRepository();
    this.accountRepo = accountRepo || new AccountRepository();
  }

  /**
   * Validates Session Token from request headers / payload.
   * Enforces:
   * - Token Expiration (Idle & Absolute)
   * - Token Revocation
   * - Account Status (DISABLED -> Revokes session immediately)
   * - MustChangePassword Route Guard
   */
  public authenticateRequest(
    rawToken: string,
    action: string,
    requestId: string
  ): { user?: AuthenticatedUser; errorResponse?: GoogleAppsScript.Content.TextOutput } {
    if (!rawToken) {
      return { errorResponse: ResponseHelper.error('UNAUTHORIZED', 'Authentication token is required.', requestId, 401) };
    }

    const tokenHash = SessionService.hashToken(rawToken);
    const session = this.sessionRepo.findByTokenHash(tokenHash);

    if (!session || !SessionService.isValidSession(session)) {
      return { errorResponse: ResponseHelper.error('INVALID_SESSION', 'Session is invalid or has expired.', requestId, 401) };
    }

    // Verify User Account Status
    const account = this.accountRepo.findByStaffId(session.staffId);
    if (!account || account.AccountStatus === 'DISABLED') {
      // Revoke session if account disabled
      this.sessionRepo.revokeSession(tokenHash);
      return { errorResponse: ResponseHelper.error('ACCOUNT_DISABLED', 'User account is disabled.', requestId, 403) };
    }

    // Enforce First Login / MustChangePassword Guard
    if (account.MustChangePassword) {
      const allowedFirstLoginActions = ['changePassword', 'logout', 'getProfile'];
      if (!allowedFirstLoginActions.includes(action)) {
        return {
          errorResponse: ResponseHelper.error(
            'PASSWORD_CHANGE_REQUIRED',
            'You must change your initial password before accessing this resource.',
            requestId,
            403
          )
        };
      }
    }

    return {
      user: {
        staffId: session.staffId,
        mustChangePassword: account.MustChangePassword,
        session
      }
    };
  }
}
