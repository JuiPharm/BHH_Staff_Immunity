import { DashboardCacheRepository } from '../repositories/DashboardCacheRepository';
import { StaffRepository } from '../repositories/StaffRepository';
import { ClinicalRepository } from '../repositories/ClinicalRepository';
import { UserRole } from '../types';
import { FieldMaskingUtil } from '../utils/FieldMaskingUtil';

export class DashboardAggregationService {
  private cacheRepo: DashboardCacheRepository;
  private staffRepo: StaffRepository;
  private clinicalRepo: ClinicalRepository;

  constructor(cacheRepo?: DashboardCacheRepository, staffRepo?: StaffRepository, clinicalRepo?: ClinicalRepository) {
    this.cacheRepo = cacheRepo || new DashboardCacheRepository();
    this.staffRepo = staffRepo || new StaffRepository();
    this.clinicalRepo = clinicalRepo || new ClinicalRepository();
  }

  /**
   * Helper: Check if status represents pending verification.
   */
  private isPending(status: any): boolean {
    const s = String(status || '').toUpperCase();
    return s === 'PENDING' || s === 'PENDING_VERIFICATION';
  }

  /**
   * Helper: Check if status represents verified.
   */
  private isVerified(status: any): boolean {
    const s = String(status || '').toUpperCase();
    return s === 'VERIFIED' || s === 'APPROVED';
  }

  /**
   * Helper: Check if status represents rejected.
   */
  private isRejected(status: any): boolean {
    const s = String(status || '').toUpperCase();
    return s === 'REJECTED';
  }

  /**
   * Completeness Dashboard Aggregation with 2-tier Caching.
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

    const staffList = this.staffRepo.findAll(false);
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
      const wg = staff.WorkGroup || 'BACKOFFICE';
      const dept = staff.DepartmentCode || 'OTHER';

      if (!workGroupBreakdown[wg]) workGroupBreakdown[wg] = { total: 0, complete: 0, rate: 0 };
      if (!departmentBreakdown[dept]) departmentBreakdown[dept] = { total: 0, complete: 0, rate: 0 };

      workGroupBreakdown[wg].total++;
      departmentBreakdown[dept].total++;

      // Check all clinical record tables for pending verification
      const vacs = this.clinicalRepo.findVaccinationsByStaffId(staff.StaffID);
      const labs = this.clinicalRepo.findLabResultsByStaffId(staff.StaffID);
      const cxrs = this.clinicalRepo.findChestXraysByStaffId(staff.StaffID);
      const tbs = this.clinicalRepo.findTbAssessmentsByStaffId(staff.StaffID);

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
      incompleteCount: totalStaff - completeCount,
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
   * Follow-up Dashboard Aggregation with Dynamic Real Date Differences.
   */
  public getFollowUpDashboard(userRole: UserRole, forceRefresh = false): any {
    const cacheKey = 'DASHBOARD_FOLLOWUP_SUMMARY';

    if (!forceRefresh) {
      const ramCache = CacheService.getScriptCache().get(cacheKey);
      if (ramCache) {
        return this.applyRoleMasking(JSON.parse(ramCache), userRole);
      }
    }

    const staffList = this.staffRepo.findAll(false);
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
      const vacs = this.clinicalRepo.findVaccinationsByStaffId(staff.StaffID);
      const labs = this.clinicalRepo.findLabResultsByStaffId(staff.StaffID);
      const cxrs = this.clinicalRepo.findChestXraysByStaffId(staff.StaffID);
      const medAss = this.clinicalRepo.findMedicalAssessmentsByStaffId(staff.StaffID);

      const verifiedVacs = vacs.filter((v) => this.isVerified(v.VerificationStatus));
      const rejectedVacs = vacs.filter((v) => this.isRejected(v.VerificationStatus));
      const rejectedLabs = labs.filter((l) => this.isRejected(l.VerificationStatus));
      const rejectedCxrs = cxrs.filter((c) => this.isRejected(c.VerificationStatus));

      rejectedEvidenceCount += rejectedVacs.length + rejectedLabs.length + rejectedCxrs.length;

      // Vaccine requirement
      if (verifiedVacs.length === 0) {
        vaccineRequired++;
      }

      // Clinical group requirement
      if (staff.WorkGroup === 'CLINICAL') {
        if (labs.filter((l) => this.isVerified(l.VerificationStatus)).length === 0) labRequired++;
        if (cxrs.filter((c) => this.isVerified(c.VerificationStatus)).length === 0) cxrRequired++;
      }

      // Physician Review requirement
      if (medAss.length === 0) {
        physicianReviewRequired++;
      }

      // Dynamic Due Date & Overdue Calculation based on Expiry Date / Next Review Date
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
        // Staff has zero verified vaccines -> classified as overdue
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
   * Progress Dashboard Aggregation with Real Monthly Historical Breakdown.
   */
  public getProgressDashboard(userRole: UserRole, forceRefresh = false): any {
    const cacheKey = 'DASHBOARD_PROGRESS_SUMMARY';

    if (!forceRefresh) {
      const ramCache = CacheService.getScriptCache().get(cacheKey);
      if (ramCache) {
        return this.applyRoleMasking(JSON.parse(ramCache), userRole);
      }
    }

    const staffList = this.staffRepo.findAll(false);
    const totalStaff = staffList.length || 1;

    // Monthly historical progress calculation based on record dates
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
        const vacs = this.clinicalRepo.findVaccinationsByStaffId(s.StaffID);
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

    // Count completions this current month
    const startOfCurrentMonthMs = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    staffList.forEach((s) => {
      const createdMs = new Date(s.CreatedAt || s.StartDate).getTime();
      if (createdMs >= startOfCurrentMonthMs) newThisMonth++;

      const vacs = this.clinicalRepo.findVaccinationsByStaffId(s.StaffID);
      const verifiedThisMonth = vacs.filter((v) => {
        if (!this.isVerified(v.VerificationStatus)) return false;
        const vDate = new Date(v.AdministeredDate || v.CreatedAt).getTime();
        return vDate >= startOfCurrentMonthMs;
      });

      if (verifiedThisMonth.length >= 1) completedThisMonth++;
    });

    const currentRate = completionTrend[completionTrend.length - 1]?.rate || 0;
    const pendingCount = staffList.filter((s) => {
      const vacs = this.clinicalRepo.findVaccinationsByStaffId(s.StaffID);
      return vacs.filter((v) => this.isVerified(v.VerificationStatus)).length === 0;
    }).length;

    const dataObj = {
      completionTrend,
      completedActionsThisMonth: completedThisMonth,
      newActionsThisMonth: newThisMonth,
      overdueTrendCount: pendingCount,
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
   * Drill-down Staff Detail List by Category from Real Database!
   */
  public getDrillDownDetail(category: string, userRole: UserRole): any {
    const staffList = this.staffRepo.findAll(false);
    const catUpper = String(category || 'TOTAL').toUpperCase();
    const nowMs = Date.now();
    const msPerDay = 24 * 60 * 60 * 1000;

    let filteredStaff: typeof staffList = [];

    if (catUpper === 'TOTAL') {
      filteredStaff = staffList;
    } else if (catUpper === 'COMPLETE') {
      filteredStaff = staffList.filter((s) => {
        const vacs = this.clinicalRepo.findVaccinationsByStaffId(s.StaffID);
        return vacs.some((v) => this.isVerified(v.VerificationStatus));
      });
    } else if (catUpper === 'INCOMPLETE') {
      filteredStaff = staffList.filter((s) => {
        const vacs = this.clinicalRepo.findVaccinationsByStaffId(s.StaffID);
        return !vacs.some((v) => this.isVerified(v.VerificationStatus));
      });
    } else if (catUpper === 'PENDING_VERIFICATION') {
      filteredStaff = staffList.filter((s) => {
        const vacs = this.clinicalRepo.findVaccinationsByStaffId(s.StaffID);
        const labs = this.clinicalRepo.findLabResultsByStaffId(s.StaffID);
        const cxrs = this.clinicalRepo.findChestXraysByStaffId(s.StaffID);
        const tbs = this.clinicalRepo.findTbAssessmentsByStaffId(s.StaffID);

        return (
          vacs.some((v) => this.isPending(v.VerificationStatus)) ||
          labs.some((l) => this.isPending(l.VerificationStatus)) ||
          cxrs.some((c) => this.isPending(c.VerificationStatus)) ||
          tbs.some((t) => this.isPending(t.VerificationStatus))
        );
      });
    } else if (catUpper === 'VACCINE_REQUIRED') {
      filteredStaff = staffList.filter((s) => {
        const vacs = this.clinicalRepo.findVaccinationsByStaffId(s.StaffID);
        return !vacs.some((v) => this.isVerified(v.VerificationStatus));
      });
    } else if (catUpper === 'LAB_REQUIRED') {
      filteredStaff = staffList.filter((s) => {
        if (s.WorkGroup !== 'CLINICAL') return false;
        const labs = this.clinicalRepo.findLabResultsByStaffId(s.StaffID);
        return !labs.some((l) => this.isVerified(l.VerificationStatus));
      });
    } else if (catUpper === 'CXR_REQUIRED') {
      filteredStaff = staffList.filter((s) => {
        if (s.WorkGroup !== 'CLINICAL') return false;
        const cxrs = this.clinicalRepo.findChestXraysByStaffId(s.StaffID);
        return !cxrs.some((c) => this.isVerified(c.VerificationStatus));
      });
    } else if (catUpper === 'PHYSICIAN_REVIEW_REQUIRED') {
      filteredStaff = staffList.filter((s) => {
        const medAss = this.clinicalRepo.findMedicalAssessmentsByStaffId(s.StaffID);
        return medAss.length === 0;
      });
    } else if (catUpper === 'OVERDUE') {
      filteredStaff = staffList.filter((s) => {
        const vacs = this.clinicalRepo.findVaccinationsByStaffId(s.StaffID);
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
        const vacs = this.clinicalRepo.findVaccinationsByStaffId(s.StaffID);
        const cxrs = this.clinicalRepo.findChestXraysByStaffId(s.StaffID);
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
        const vacs = this.clinicalRepo.findVaccinationsByStaffId(s.StaffID);
        const cxrs = this.clinicalRepo.findChestXraysByStaffId(s.StaffID);
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
        const vacs = this.clinicalRepo.findVaccinationsByStaffId(s.StaffID);
        const cxrs = this.clinicalRepo.findChestXraysByStaffId(s.StaffID);
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
        const vacs = this.clinicalRepo.findVaccinationsByStaffId(s.StaffID);
        const labs = this.clinicalRepo.findLabResultsByStaffId(s.StaffID);
        const cxrs = this.clinicalRepo.findChestXraysByStaffId(s.StaffID);
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
      const name = `${s.TitleTH || ''} ${s.FirstName || ''} ${s.LastName || ''}`.trim() || s.StaffID;
      const vacs = this.clinicalRepo.findVaccinationsByStaffId(s.StaffID);
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
