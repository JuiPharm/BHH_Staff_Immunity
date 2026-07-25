# Real Database Integration & Dashboard Calculation Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate all hardcoded/mock data and fix missing backend router endpoints so the entire BDMS Staff Immunity application works with real Google Sheets database queries and accurate dynamic dashboard calculations.

**Architecture:** Update `backend/src/index.ts` action router, implement missing `getHealthRecords` and `addPhysicianAssessment` in `ClinicalController.ts`, refactor `DashboardAggregationService.ts` to compute real-time metrics, and connect all Frontend views (`MyHealthRecordView`, `RuleConfiguratorView`, `UploadModal`) to real API endpoints. Recompile backend to `backend/src/Code.js`.

**Tech Stack:** TypeScript, Google Apps Script (esbuild), React 18, Material UI, Lucide Icons, Vite.

## Global Constraints
- Do not introduce breaking API changes.
- Ensure all role-based authorization (IDOR checks) remain enforced.
- All code must pass `npm run build` in both `backend/` and `frontend/`.

---

### Task 1: Fix Backend Entrypoint Router & Clinical Controller

**Files:**
- Modify: `backend/src/controllers/ClinicalController.ts`
- Modify: `backend/src/index.ts`
- Test: `backend/src/tests/ClinicalModule.test.ts`

**Interfaces:**
- Consumes: `ClinicalRepository`, `VaccinationDTO`, `LabResultDTO`
- Produces: `getHealthRecords`, `addPhysicianAssessment`, and updated `doPost` switch handler.

- [ ] **Step 1: Implement `getHealthRecords` and `addPhysicianAssessment` in `ClinicalController.ts`**
  - Add `getHealthRecords(userRole, userStaffId, targetStaffId, requestId)` returning all merged records (vaccines, labs, CXR) for `targetStaffId`.
  - Add `addPhysicianAssessment(userRole, userStaffId, payload, requestId)` calling `AssessmentService.addAssessment`.

- [ ] **Step 2: Update `doPost` in `backend/src/index.ts`**
  - Register cases: `getHealthRecords`, `createHealthRecord`, `verifyRecord`, `addPhysicianAssessment`, `uploadFile`, `downloadFile`, `createRuleVersion`.

- [ ] **Step 3: Test and compile backend**
  - Run `npm test` in `backend/`
  - Run `npm run build` in `backend/` to update `Code.js`.

---

### Task 2: Refactor Dashboard Aggregation Engine with Real DB Queries

**Files:**
- Modify: `backend/src/services/DashboardAggregationService.ts`
- Test: `backend/src/tests/DashboardAggregation.test.ts`

**Interfaces:**
- Consumes: `StaffRepository`, `ClinicalRepository`, `DashboardCacheRepository`, `SheetRepository`
- Produces: Dynamic completion rates, real overdue counts, 7/30/60-day expiry windows, missing action totals, and monthly trends.

- [ ] **Step 1: Refactor `getCompletenessDashboard`**
  - Query actual `STAFF` records and evaluate readiness using real vaccination and lab records.

- [ ] **Step 2: Refactor `getFollowUpDashboard`**
  - Calculate real `overdueCount`, `dueWithin7Days`, `dueWithin30Days`, `dueWithin60Days`, `vaccineRequired`, `labRequired`, `cxrRequired`, and `physicianReviewRequired` from database timestamps and expiry dates.

- [ ] **Step 3: Refactor `getProgressDashboard`**
  - Compute actual monthly action totals and monthly completion rates from database records.

- [ ] **Step 4: Recompile backend**
  - Run `npm run build` in `backend/` to update `Code.js`.

---

### Task 3: Connect Frontend Views to Real API Endpoints

**Files:**
- Modify: `frontend/src/features/health/MyHealthRecordView.tsx`
- Modify: `frontend/src/features/rules/RuleConfiguratorView.tsx`
- Modify: `frontend/src/features/registry/UploadModal.tsx`
- Modify: `frontend/src/features/physician/PhysicianView.tsx`

- [ ] **Step 1: Update `MyHealthRecordView.tsx`**
  - Fetch real records via `apiService.getHealthRecords(session.staffId)` and render in table.

- [ ] **Step 2: Update `RuleConfiguratorView.tsx`**
  - Wire draft rule creation modal to API call saving rule versions to backend.

- [ ] **Step 3: Update `UploadModal.tsx` and `PhysicianView.tsx`**
  - Ensure form submissions hit real backend endpoints and refresh views.

- [ ] **Step 4: Build and test frontend**
  - Run `npm run build` in `frontend/`.
