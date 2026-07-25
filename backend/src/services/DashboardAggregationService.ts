import { DashboardCacheRepository } from '../repositories/DashboardCacheRepository';
import { StaffRepository } from '../repositories/StaffRepository';
import { ClinicalRepository } from '../repositories/ClinicalRepository';
import { SheetRepository } from '../repositories/SheetRepository';
import { UserRole } from '../types';
import { FieldMaskingUtil } from '../utils/FieldMaskingUtil';

export class DashboardAggregationService {
  private cacheRepo: DashboardCacheRepository;
  private staffRepo: StaffRepository;
  private clinicalRepo: ClinicalRepository;
  private sheetRepo: SheetRepository;

  constructor(
    cacheRepo?: DashboardCacheRepository,
    staffRepo?: StaffRepository,
    clinicalRepo?: ClinicalRepository,
    sheetRepo?: SheetRepository
  ) {
    this.cacheRepo = cacheRepo || new DashboardCacheRepository();
    this.staffRepo = staffRepo || new StaffRepository();
    this.clinicalRepo = clinicalRepo || new ClinicalRepository();

    const clinicalSsId = typeof PropertiesService !== 'undefined'
      ? PropertiesService.getScriptProperties().getProperty('DB_CLINICAL_SPREADSHEET_ID')
      : null;
    this.sheetRepo = sheetRepo || new SheetRepository(clinicalSsId || '1IFJOErjojIQJq02l6i2a022EEy7YIrh1eRTwpxzXJRE');
  }

  private isPending(status: any): boolean {
    const s = String(status || '').toUpperCase();
    return s === 'PENDING' || s === 'PENDING_VERIFICATION';
  }

  private isVerified(status: any): boolean {
    const s = String(status || '').toUpperCase();
    return s === 'VERIFIED' || s === 'APPROVED';
  }

  private isRejected(status: any): boolean {
    const s = String(status || '').toUpperCase();
    return s === 'REJECTED';
  }

  /**
   * Batch fetches all clinical records in 1 single pass to avoid O(N*K) sheet reads.
   */
  private fetchAllClinicalDataInPass(): {
    staffList: any[];
    vacMap: Map<string, any[]>;
    labMap: Map<string, any[]>;
    cxrMap: Map<string, any[]>;
    tbMap: Map<string, any[]>;
    medAssMap: Map<string, any[]>;
  } {
    const staffList = this.staffRepo.findAll(false);

    const vacRows = this.sheetRepo.getRows('VACCINATION');
    const labRows = this.sheetRepo.getRows('LAB_RESULT');
    const cxrRows = this.sheetRepo.getRows('CHEST_XRAY');
    const tbRows = this.sheetRepo.getRows('TB_ASSESSMENT');
    const medAssRows = this.sheetRepo.getRows('MEDICAL_ASSESSMENT');

    const groupByStaff = (rows: any[], staffIdKey = 'StaffID') => {
      const map = new Map<string, any[]>();
      rows.forEach((r) => {
        if (r.IsDeleted || String(r.IsDeleted) === 'TRUE') return;
        const sid = String(r[staffIdKey] || '').toUpperCase();
        if (!sid) return;
        if (!map.has(sid)) map.set(sid, []);
        map.get(sid)!.push(r);
      });
      return map;
    };

    return {
      staffList,
      vacMap: groupByStaff(vacRows),
      labMap: groupByStaff(labRows),
      cxrMap: groupByStaff(cxrRows),
      tbMap: groupByStaff(tbRows),
      medAssMap: groupByStaff(medAssRows)
    };
  }

  /**
   * Completeness Dashboard Aggregation (Optimized Batch Fast Read).
   */
  public getCompletenessDashboard(userRole: UserRole, forceRefresh = false): any {
    const cacheKey = 'DASHBOARD_COMPLETENESS_SUMMARY';

    if (!forceRefresh) {
      const ramCache = CacheService.getScriptCache().get(cacheKey);
      if (ramCache) {
        return this.applyRoleMasking(JSON.parse(ramCache), userRole);
      }

      const dbCache = this.cacheRepo.getValidCache(cacheKey);
      if (dbCache) {
        CacheService.getScriptCache().put(cacheKey, dbCache.cachedDataJson, 1800);
        return this.applyRoleMasking(JSON.parse(dbCache.cachedDataJson), userRole);
      }
    }

    const { staffList, vacMap, labMap, cxrMap, tbMap } = this.fetchAllClinicalDataInPass();
    const totalStaff = staffList.length;

    let completeCount = 0;
    let pendingVerificationQueue = 0;

    const workGroupBreakdown: Record<string, { total: number; complete: number; rate: number }> = {
      CLINICAL: { total: 0, complete: 0, rate: 0 },
      FRONTLINE: { total: 0, complete: 0, rate: 0 },
      BACKOFFICE: { total: 0, complete: 0, rate: 0 }
    };

    const departmentBreakdown: Record<string, { total: number; complete: number; rate: number }> = {};

    staffList.forEach((staff) => {
      const sid = String(staff.StaffID).toUpperCase();
      const wg = staff.WorkGroup || 'BACKOFFICE';
      const dept = staff.DepartmentCode || 'OTHER';

      if (!workGroupBreakdown[wg]) workGroupBreakdown[wg] = { total: 0, complete: 0, rate: 0 };
      if (!departmentBreakdown[dept]) departmentBreakdown[dept] = { total: 0, complete: 0, rate: 0 };

      workGroupBreakdown[wg].total++;
      departmentBreakdown[dept].total++;

      const vacs = vacMap.get(sid) || [];
      const labs = labMap.get(sid) || [];
      const cxrs = cxrMap.get(sid) || [];
      const tbs = tbMap.get(sid) || [];

      const pendingCount =
        vacs.filter((v) => this.isPending(v.VerificationStatus)).length +
        labs.filter((l) => this.isPending(l.VerificationStatus)).length +
        cxrs.filter((c) => this.isPending(c.VerificationStatus)).length +
        tbs.filter((t) => this.isPending(t.VerificationStatus)).length;

      pendingVerificationQueue += pendingCount;

      const verifiedCount =
        vacs.filter((v) => this.isVerified(v.VerificationStatus)).length +
        labs.filter((l) => this.isVerified(l.VerificationStatus)).length +
        cxrs.filter((c) => this.isVerified(c.VerificationStatus)).length;

      const isComplete = verifiedCount >= 1;

      if (isComplete) {
        completeCount++;
        workGroupBreakdown[wg].complete++;
        departmentBreakdown[dept].complete++;
      }
    });

    Object.keys(workGroupBreakdown).forEach((k) => {
      const g = workGroupBreakdown[k];
      g.rate = g.total > 0 ? Math.round((g.complete / g.total) * 100) : 0;
    });

    Object.keys(departmentBreakdown).forEach((k) => {
      const d = departmentBreakdown[k];
      d.rate = d.total > 0 ? Math.round((d.complete / d.total) * 100) : 0;
    });

    const completionRate = totalStaff > 0 ? Math.round((completeCount / totalStaff) * 100) : 0;

    const dataObj = {
      totalStaff,
      completeCount,
      incompleteCount: Math.max(0, totalStaff - completeCount),
      completionRate,
      workGroupBreakdown,
      departmentBreakdown,
      pendingVerificationQueue,
      calculatedAt: new Date().toISOString()
    };

    this.cacheRepo.saveCache(cacheKey, dataObj, 30);
    CacheService.getScriptCache().put(cacheKey, JSON.stringify(dataObj), 1800);

    return this.applyRoleMasking(dataObj, userRole);
  }

  /**
   * Follow-up Dashboard Aggregation (Optimized Batch Fast Read).
   */
  public getFollowUpDashboard(userRole: UserRole, forceRefresh = false): any {
    const cacheKey = 'DASHBOARD_FOLLOWUP_SUMMARY';

    if (!forceRefresh) {
      const ramCache = CacheService.getScriptCache().get(cacheKey);
      if (ramCache) {
        return this.applyRoleMasking(JSON.parse(ramCache), userRole);
      }
    }

    const { staffList, vacMap, labMap, cxrMap, medAssMap } = this.fetchAllClinicalDataInPass();
    const nowMs = Date.now();
    const msPerDay = 24 * 60 * 60 * 1000;

    let vaccineRequired = 0;
    let labRequired = 0;
    let cxrRequired = 0;
    let physicianReviewRequired = 0;
    let overdueCount = 0;
    let dueWithin7Days = 0;
    let dueWithin30Days = 0;
    let dueWithin60Days = 0;
    let rejectedEvidenceCount = 0;

    staffList.forEach((staff) => {
      const sid = String(staff.StaffID).toUpperCase();
      const vacs = vacMap.get(sid) || [];
      const labs = labMap.get(sid) || [];
      const cxrs = cxrMap.get(sid) || [];
      const medAss = medAssMap.get(sid) || [];

      const verifiedVacs = vacs.filter((v) => this.isVerified(v.VerificationStatus));
      const rejectedVacs = vacs.filter((v) => this.isRejected(v.VerificationStatus));
      const rejectedLabs = labs.filter((l) => this.isRejected(l.VerificationStatus));
      const rejectedCxrs = cxrs.filter((c) => this.isRejected(c.VerificationStatus));

      rejectedEvidenceCount += rejectedVacs.length + rejectedLabs.length + rejectedCxrs.length;

      if (verifiedVacs.length === 0) {
        vaccineRequired++;
      }

      if (staff.WorkGroup === 'CLINICAL') {
        if (labs.filter((l) => this.isVerified(l.VerificationStatus)).length === 0) labRequired++;
        if (cxrs.filter((c) => this.isVerified(c.VerificationStatus)).length === 0) cxrRequired++;
      }

      if (medAss.length === 0) {
        physicianReviewRequired++;
      }

      let earliestDueDate: number | null = null;

      [...vacs, ...cxrs].forEach((rec: any) => {
        if (rec.ExpiryDate) {
          const expMs = new Date(rec.ExpiryDate).getTime();
          if (!isNaN(expMs)) {
            if (earliestDueDate === null || expMs < earliestDueDate) earliestDueDate = expMs;
          }
        }
      });

      medAss.forEach((ma) => {
        if (ma.NextReviewDate) {
          const revMs = new Date(ma.NextReviewDate).getTime();
          if (!isNaN(revMs)) {
            if (earliestDueDate === null || revMs < earliestDueDate) earliestDueDate = revMs;
          }
        }
      });

      if (earliestDueDate === null && verifiedVacs.length === 0) {
        overdueCount++;
      } else if (earliestDueDate !== null) {
        const daysDiff = Math.ceil((earliestDueDate - nowMs) / msPerDay);
        if (daysDiff < 0) {
          overdueCount++;
        } else if (daysDiff <= 7) {
          dueWithin7Days++;
        } else if (daysDiff <= 30) {
          dueWithin30Days++;
        } else if (daysDiff <= 60) {
          dueWithin60Days++;
        }
      }
    });

    const dataObj = {
      vaccineRequired,
      labRequired,
      cxrRequired,
      physicianReviewRequired,
      overdueCount,
      dueWithin7Days,
      dueWithin30Days,
      dueWithin60Days,
      rejectedEvidenceCount,
      emailFailedCount: 0,
      calculatedAt: new Date().toISOString()
    };

    this.cacheRepo.saveCache(cacheKey, dataObj, 30);
    CacheService.getScriptCache().put(cacheKey, JSON.stringify(dataObj), 1800);

    return this.applyRoleMasking(dataObj, userRole);
  }

  /**
   * Progress Dashboard Aggregation (Real Historical Data & Dynamic Trend %).
   */
  public getProgressDashboard(userRole: UserRole, forceRefresh = false): any {
    const cacheKey = 'DASHBOARD_PROGRESS_SUMMARY';

    if (!forceRefresh) {
      const ramCache = CacheService.getScriptCache().get(cacheKey);
      if (ramCache) {
        return this.applyRoleMasking(JSON.parse(ramCache), userRole);
      }
    }

    const { staffList, vacMap } = this.fetchAllClinicalDataInPass();
    const totalStaff = staffList.length || 1;

    const now = new Date();
    const months: { label: string; year: number; month: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
      months.push({
        label: thaiMonths[d.getMonth()],
        year: d.getFullYear(),
        month: d.getMonth()
      });
    }

    let completedThisMonth = 0;
    let newThisMonth = 0;

    const completionTrend = months.map((m) => {
      const endOfMonthMs = new Date(m.year, m.month + 1, 0, 23, 59, 59).getTime();

      let completedCountAtMonth = 0;
      staffList.forEach((s) => {
        const sid = String(s.StaffID).toUpperCase();
        const vacs = vacMap.get(sid) || [];
        const verifiedBeforeMonth = vacs.filter((v) => {
          if (!this.isVerified(v.VerificationStatus)) return false;
          const vDate = new Date(v.AdministeredDate || v.CreatedAt).getTime();
          return vDate <= endOfMonthMs;
        });

        if (verifiedBeforeMonth.length >= 1) {
          completedCountAtMonth++;
        }
      });

      const rate = Math.round((completedCountAtMonth / totalStaff) * 100);
      return { month: m.label, rate };
    });

    const startOfCurrentMonthMs = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    staffList.forEach((s) => {
      const sid = String(s.StaffID).toUpperCase();
      const createdMs = new Date(s.CreatedAt || s.StartDate).getTime();
      if (createdMs >= startOfCurrentMonthMs) newThisMonth++;

      const vacs = vacMap.get(sid) || [];
      const verifiedThisMonth = vacs.filter((v) => {
        if (!this.isVerified(v.VerificationStatus)) return false;
        const vDate = new Date(v.AdministeredDate || v.CreatedAt).getTime();
        return vDate >= startOfCurrentMonthMs;
      });

      if (verifiedThisMonth.length >= 1) completedThisMonth++;
    });

    const overdueCountCurrent = staffList.filter((s) => {
      const sid = String(s.StaffID).toUpperCase();
      const vacs = vacMap.get(sid) || [];
      return vacs.filter((v) => this.isVerified(v.VerificationStatus)).length === 0;
    }).length;

    // Calculate real dynamic trend % vs last month
    const prevMonthEndMs = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).getTime();
    const overdueCountPrevMonth = staffList.filter((s) => {
      const sid = String(s.StaffID).toUpperCase();
      const vacs = vacMap.get(sid) || [];
      return vacs.filter((v) => {
        if (!this.isVerified(v.VerificationStatus)) return false;
        return new Date(v.AdministeredDate || v.CreatedAt).getTime() <= prevMonthEndMs;
      }).length === 0;
    }).length;

    let overdueTrendMessage = 'คำนวณจากประวัติการอนุมัติจริง';
    if (overdueCountPrevMonth > 0) {
      const diff = overdueCountCurrent - overdueCountPrevMonth;
      const pct = Math.abs(Math.round((diff / overdueCountPrevMonth) * 100));
      if (diff < 0) {
        overdueTrendMessage = `ลดลง ${pct}% จากเดือนที่แล้ว`;
      } else if (diff > 0) {
        overdueTrendMessage = `เพิ่มขึ้น ${pct}% จากเดือนที่แล้ว`;
      } else {
        overdueTrendMessage = `เท่ากับเดือนที่แล้ว (ไม่เปลี่ยนแปลง)`;
      }
    }

    const dataObj = {
      completionTrend,
      completedActionsThisMonth: completedThisMonth,
      newActionsThisMonth: newThisMonth,
      overdueTrendCount: overdueCountCurrent,
      overdueTrendMessage,
      calculatedAt: new Date().toISOString()
    };

    this.cacheRepo.saveCache(cacheKey, dataObj, 30);
    CacheService.getScriptCache().put(cacheKey, JSON.stringify(dataObj), 1800);

    return this.applyRoleMasking(dataObj, userRole);
  }

  /**
   * Manual Cache Refresh Trigger.
   */
  public refreshAllCaches(): void {
    CacheService.getScriptCache().removeAll([
      'DASHBOARD_COMPLETENESS_SUMMARY',
      'DASHBOARD_FOLLOWUP_SUMMARY',
      'DASHBOARD_PROGRESS_SUMMARY'
    ]);
    this.cacheRepo.invalidateCache('DASHBOARD_COMPLETENESS_SUMMARY');
    this.cacheRepo.invalidateCache('DASHBOARD_FOLLOWUP_SUMMARY');
    this.cacheRepo.invalidateCache('DASHBOARD_PROGRESS_SUMMARY');
  }

  /**
   * Drill-down Staff Detail List by Category from Real Database (Optimized Fast Pass).
   */
  public getDrillDownDetail(category: string, userRole: UserRole): any {
    const { staffList, vacMap, labMap, cxrMap, tbMap, medAssMap } = this.fetchAllClinicalDataInPass();
    const catUpper = String(category || 'TOTAL').toUpperCase();
    const nowMs = Date.now();
    const msPerDay = 24 * 60 * 60 * 1000;

    let filteredStaff: typeof staffList = [];

    if (catUpper === 'TOTAL') {
      filteredStaff = staffList;
    } else if (catUpper === 'COMPLETE') {
      filteredStaff = staffList.filter((s) => {
        const sid = String(s.StaffID).toUpperCase();
        const vacs = vacMap.get(sid) || [];
        return vacs.some((v) => this.isVerified(v.VerificationStatus));
      });
    } else if (catUpper === 'INCOMPLETE') {
      filteredStaff = staffList.filter((s) => {
        const sid = String(s.StaffID).toUpperCase();
        const vacs = vacMap.get(sid) || [];
        return !vacs.some((v) => this.isVerified(v.VerificationStatus));
      });
    } else if (catUpper === 'PENDING_VERIFICATION') {
      filteredStaff = staffList.filter((s) => {
        const sid = String(s.StaffID).toUpperCase();
        const vacs = vacMap.get(sid) || [];
        const labs = labMap.get(sid) || [];
        const cxrs = cxrMap.get(sid) || [];
        const tbs = tbMap.get(sid) || [];

        return (
          vacs.some((v) => this.isPending(v.VerificationStatus)) ||
          labs.some((l) => this.isPending(l.VerificationStatus)) ||
          cxrs.some((c) => this.isPending(c.VerificationStatus)) ||
          tbs.some((t) => this.isPending(t.VerificationStatus))
        );
      });
    } else if (catUpper === 'VACCINE_REQUIRED') {
      filteredStaff = staffList.filter((s) => {
        const sid = String(s.StaffID).toUpperCase();
        const vacs = vacMap.get(sid) || [];
        return !vacs.some((v) => this.isVerified(v.VerificationStatus));
      });
    } else if (catUpper === 'LAB_REQUIRED') {
      filteredStaff = staffList.filter((s) => {
        if (s.WorkGroup !== 'CLINICAL') return false;
        const sid = String(s.StaffID).toUpperCase();
        const labs = labMap.get(sid) || [];
        return !labs.some((l) => this.isVerified(l.VerificationStatus));
      });
    } else if (catUpper === 'CXR_REQUIRED') {
      filteredStaff = staffList.filter((s) => {
        if (s.WorkGroup !== 'CLINICAL') return false;
        const sid = String(s.StaffID).toUpperCase();
        const cxrs = cxrMap.get(sid) || [];
        return !cxrs.some((c) => this.isVerified(c.VerificationStatus));
      });
    } else if (catUpper === 'PHYSICIAN_REVIEW_REQUIRED') {
      filteredStaff = staffList.filter((s) => {
        const sid = String(s.StaffID).toUpperCase();
        const medAss = medAssMap.get(sid) || [];
        return medAss.length === 0;
      });
    } else if (catUpper === 'OVERDUE') {
      filteredStaff = staffList.filter((s) => {
        const sid = String(s.StaffID).toUpperCase();
        const vacs = vacMap.get(sid) || [];
        const verifiedVacs = vacs.filter((v) => this.isVerified(v.VerificationStatus));
        if (verifiedVacs.length === 0) return true;

        let hasExpired = false;
        vacs.forEach((v) => {
          if (v.ExpiryDate && new Date(v.ExpiryDate).getTime() < nowMs) hasExpired = true;
        });
        return hasExpired;
      });
    } else if (catUpper === 'DUE_7_DAYS') {
      filteredStaff = staffList.filter((s) => {
        const sid = String(s.StaffID).toUpperCase();
        const vacs = vacMap.get(sid) || [];
        const cxrs = cxrMap.get(sid) || [];
        let match = false;
        [...vacs, ...cxrs].forEach((rec: any) => {
          if (rec.ExpiryDate) {
            const daysDiff = Math.ceil((new Date(rec.ExpiryDate).getTime() - nowMs) / msPerDay);
            if (daysDiff >= 0 && daysDiff <= 7) match = true;
          }
        });
        return match;
      });
    } else if (catUpper === 'DUE_30_DAYS') {
      filteredStaff = staffList.filter((s) => {
        const sid = String(s.StaffID).toUpperCase();
        const vacs = vacMap.get(sid) || [];
        const cxrs = cxrMap.get(sid) || [];
        let match = false;
        [...vacs, ...cxrs].forEach((rec: any) => {
          if (rec.ExpiryDate) {
            const daysDiff = Math.ceil((new Date(rec.ExpiryDate).getTime() - nowMs) / msPerDay);
            if (daysDiff > 7 && daysDiff <= 30) match = true;
          }
        });
        return match;
      });
    } else if (catUpper === 'DUE_60_DAYS') {
      filteredStaff = staffList.filter((s) => {
        const sid = String(s.StaffID).toUpperCase();
        const vacs = vacMap.get(sid) || [];
        const cxrs = cxrMap.get(sid) || [];
        let match = false;
        [...vacs, ...cxrs].forEach((rec: any) => {
          if (rec.ExpiryDate) {
            const daysDiff = Math.ceil((new Date(rec.ExpiryDate).getTime() - nowMs) / msPerDay);
            if (daysDiff > 30 && daysDiff <= 60) match = true;
          }
        });
        return match;
      });
    } else if (catUpper === 'REJECTED_EVIDENCE') {
      filteredStaff = staffList.filter((s) => {
        const sid = String(s.StaffID).toUpperCase();
        const vacs = vacMap.get(sid) || [];
        const labs = labMap.get(sid) || [];
        const cxrs = cxrMap.get(sid) || [];
        return (
          vacs.some((v) => this.isRejected(v.VerificationStatus)) ||
          labs.some((l) => this.isRejected(l.VerificationStatus)) ||
          cxrs.some((c) => this.isRejected(c.VerificationStatus))
        );
      });
    } else if (['CLINICAL', 'FRONTLINE', 'BACKOFFICE'].includes(catUpper)) {
      filteredStaff = staffList.filter((s) => String(s.WorkGroup).toUpperCase() === catUpper);
    } else {
      filteredStaff = staffList;
    }

    const items = filteredStaff.map((s) => {
      const sid = String(s.StaffID).toUpperCase();
      const name = `${s.TitleTH || ''} ${s.FirstName || ''} ${s.LastName || ''}`.trim() || s.StaffID;
      const vacs = vacMap.get(sid) || [];
      const isComplete = vacs.some((v) => this.isVerified(v.VerificationStatus));
      return {
        staffId: s.StaffID,
        name: name,
        department: s.DepartmentCode || 'N/A',
        workGroup: s.WorkGroup || 'BACKOFFICE',
        status: isComplete ? 'ครบถ้วน (Complete)' : 'ต้องติดตาม (Incomplete)'
      };
    });

    return {
      category: catUpper,
      totalCount: items.length,
      items: items
    };
  }

  private applyRoleMasking(dataObj: any, userRole: UserRole): any {
    if (userRole === 'HR') {
      return FieldMaskingUtil.maskHealthRecord(dataObj, 'HR');
    }
    return dataObj;
  }
}
