import { SheetRepository } from './SheetRepository';
import { CryptoService } from '../services/CryptoService';

export interface DashboardCacheRecord {
  cacheUuid: string;
  cacheKey: string;
  cachedDataJson: string;
  calculatedAt: string;
  expiresAt: string;
}

export class DashboardCacheRepository {
  private sheetRepo: SheetRepository;

  constructor(sheetRepo?: SheetRepository) {
    const auditSsId = PropertiesService.getScriptProperties().getProperty('DB_AUDIT_SPREADSHEET_ID');
    this.sheetRepo = sheetRepo || new SheetRepository(auditSsId || undefined);
  }

  /**
   * Retrieves valid non-expired dashboard cache record from DASHBOARD_CACHE sheet.
   */
  public getValidCache(cacheKey: string): DashboardCacheRecord | null {
    const rows = this.sheetRepo.getRows('DASHBOARD_CACHE');
    const now = new Date().toISOString();

    const match = rows.find((r) => String(r.CacheKey) === cacheKey && String(r.ExpiresAt) > now && (!r.IsDeleted || String(r.IsDeleted) === 'FALSE'));
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
  public saveCache(cacheKey: string, dataObj: any, ttlMinutes = 30): void {
    this.sheetRepo.executeWithLock(() => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000).toISOString();
      const calculatedAt = now.toISOString();

      const existing = this.getValidCache(cacheKey);
      if (existing) {
        this.sheetRepo.updateRow('DASHBOARD_CACHE', 'CacheKey', cacheKey, {
          CachedDataJson: JSON.stringify(dataObj),
          CalculatedAt: calculatedAt,
          ExpiresAt: expiresAt,
          UpdatedAt: calculatedAt
        });
      } else {
        const headers = [
          'CacheUUID', 'CacheKey', 'CachedDataJson', 'CalculatedAt', 'ExpiresAt',
          'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy', 'RecordVersion', 'IsDeleted'
        ];
        this.sheetRepo.appendRow('DASHBOARD_CACHE', headers, {
          CacheUUID: `cache-${CryptoService.generateUuid()}`,
          CacheKey: cacheKey,
          CachedDataJson: JSON.stringify(dataObj),
          CalculatedAt: calculatedAt,
          ExpiresAt: expiresAt,
          CreatedAt: calculatedAt,
          CreatedBy: 'SYSTEM',
          UpdatedAt: calculatedAt,
          UpdatedBy: 'SYSTEM',
          RecordVersion: 1,
          IsDeleted: false
        });
      }
    });
  }

  /**
   * Invalidates a specific cache key.
   */
  public invalidateCache(cacheKey: string): void {
    this.sheetRepo.executeWithLock(() => {
      this.sheetRepo.updateRow('DASHBOARD_CACHE', 'CacheKey', cacheKey, {
        ExpiresAt: '2000-01-01T00:00:00Z',
        UpdatedAt: new Date().toISOString()
      });
    });
  }
}
