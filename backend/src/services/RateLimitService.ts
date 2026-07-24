export class RateLimitService {
  public static MAX_ATTEMPTS = 5;
  public static LOCKOUT_SECONDS = 900; // 15 minutes

  /**
   * Checks if an identifier (StaffID or IP) is rate-limited.
   */
  public static isRateLimited(identifier: string): boolean {
    const cache = CacheService.getScriptCache();
    if (!cache) return false;
    const attempts = Number(cache.get(`rate_${identifier}`) || '0');
    return attempts >= this.MAX_ATTEMPTS;
  }

  /**
   * Increments failed attempt counter in CacheService.
   */
  public static incrementAttempts(identifier: string): number {
    const cache = CacheService.getScriptCache();
    if (!cache) return 1;
    const key = `rate_${identifier}`;
    const attempts = Number(cache.get(key) || '0') + 1;
    cache.put(key, String(attempts), this.LOCKOUT_SECONDS);
    return attempts;
  }

  /**
   * Resets rate limit attempt counter upon successful authentication.
   */
  public static resetAttempts(identifier: string): void {
    const cache = CacheService.getScriptCache();
    if (cache) {
      cache.remove(`rate_${identifier}`);
    }
  }
}
