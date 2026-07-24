import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginView } from '../features/auth/LoginView';
import { ForceChangePasswordView } from '../features/auth/ForceChangePasswordView';
import { ForgotPasswordView } from '../features/auth/ForgotPasswordView';
import { DashboardView } from '../features/dashboard/DashboardView';
import { StaffListView } from '../features/staff/StaffListView';
import { RegistryView } from '../features/registry/RegistryView';
import { PhysicianView } from '../features/physician/PhysicianView';
import { RuleConfiguratorView } from '../features/rules/RuleConfiguratorView';
import { AuditLogView } from '../features/audit/AuditLogView';
import { MyHealthRecordView } from '../features/health/MyHealthRecordView';
import { UnauthorizedView } from '../features/error/UnauthorizedView';
import { OfflineView } from '../features/error/OfflineView';
import { RoleGuard } from '../components/guard/RoleGuard';
import { getStoredSession } from '../services/api';

export const AppRoutes: React.FC = () => {
  const session = getStoredSession();
  const role = session?.role || 'DATA_OWNER';

  return (
    <Routes>
      {/* Public / Auth Routes */}
      <Route path="/login" element={<LoginView onLoginSuccess={() => window.location.hash = '#/dashboard'} />} />
      <Route path="/force-change-password" element={<ForceChangePasswordView />} />
      <Route path="/forgot-password" element={<ForgotPasswordView />} />
      <Route path="/unauthorized" element={<UnauthorizedView />} />
      <Route path="/offline" element={<OfflineView />} />

      {/* Authenticated Routes with Role Guards */}
      <Route
        path="/dashboard"
        element={
          <RoleGuard allowedRoles={['INFECTION_CONTROL', 'HR', 'PHYSICIAN']}>
            <DashboardView userRole={role} />
          </RoleGuard>
        }
      />

      <Route
        path="/staff-registry"
        element={
          <RoleGuard allowedRoles={['INFECTION_CONTROL', 'HR', 'PHYSICIAN']}>
            <StaffListView userRole={role} />
          </RoleGuard>
        }
      />

      <Route
        path="/registry"
        element={
          <RoleGuard allowedRoles={['INFECTION_CONTROL', 'HR', 'PHYSICIAN', 'DATA_OWNER']}>
            <RegistryView userRole={role} staffId={session?.staffId || 'ST8004'} />
          </RoleGuard>
        }
      />

      <Route
        path="/physician-assessment"
        element={
          <RoleGuard allowedRoles={['PHYSICIAN', 'INFECTION_CONTROL']}>
            <PhysicianView />
          </RoleGuard>
        }
      />

      <Route
        path="/rule-management"
        element={
          <RoleGuard allowedRoles={['INFECTION_CONTROL', 'PHYSICIAN']}>
            <RuleConfiguratorView />
          </RoleGuard>
        }
      />

      <Route
        path="/audit-log"
        element={
          <RoleGuard allowedRoles={['INFECTION_CONTROL']}>
            <AuditLogView />
          </RoleGuard>
        }
      />

      <Route
        path="/my-health-record"
        element={
          <RoleGuard allowedRoles={['DATA_OWNER', 'INFECTION_CONTROL', 'HR', 'PHYSICIAN']}>
            <MyHealthRecordView />
          </RoleGuard>
        }
      />

      {/* Default Fallback Redirect */}
      <Route
        path="*"
        element={<Navigate to={session ? (role === 'DATA_OWNER' ? '/my-health-record' : '/dashboard') : '/login'} replace />}
      />
    </Routes>
  );
};
