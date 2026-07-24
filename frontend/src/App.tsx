import React, { useState } from 'react';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { bdmsTheme } from './theme/bdmsTheme';
import { getStoredSession, setStoredSession } from './services/api';
import { UserSession, UserRole } from './types';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';

import { LoginView } from './features/auth/LoginView';
import { PasswordChangeModal } from './features/auth/PasswordChangeModal';
import { DashboardView } from './features/dashboard/DashboardView';
import { RegistryView } from './features/registry/RegistryView';
import { StaffListView } from './features/staff/StaffListView';
import { PhysicianView } from './features/physician/PhysicianView';
import { RuleConfiguratorView } from './features/rules/RuleConfiguratorView';
import { AuditLogView } from './features/audit/AuditLogView';

export const App: React.FC = () => {
  const [session, setSession] = useState<UserSession | null>(() => getStoredSession());
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const handleLoginSuccess = (newSession: UserSession) => {
    setSession(newSession);
    if (newSession.mustChangePassword) {
      setPasswordModalOpen(true);
    }
  };

  const handleLogout = () => {
    setStoredSession(null);
    setSession(null);
  };

  const handleRoleSwitch = (newRole: UserRole) => {
    if (session) {
      const updated: UserSession = { ...session, role: newRole };
      setStoredSession(updated);
      setSession(updated);
    }
  };

  if (!session) {
    return (
      <ThemeProvider theme={bdmsTheme}>
        <CssBaseline />
        <LoginView onLoginSuccess={handleLoginSuccess} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={bdmsTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
        <Header
          session={session}
          onLogout={handleLogout}
          onRoleSwitch={handleRoleSwitch}
          onChangePassword={() => setPasswordModalOpen(true)}
        />

        <Box sx={{ display: 'flex', flexGrow: 1 }}>
          <Sidebar currentTab={currentTab} onTabChange={setCurrentTab} userRole={session.role} />

          <Box component="main" sx={{ flexGrow: 1, minWidth: 0, overflowY: 'auto' }}>
            {currentTab === 'dashboard' && <DashboardView userRole={session.role} />}
            {currentTab === 'registry' && <RegistryView userRole={session.role} staffId={session.staffId} />}
            {currentTab === 'staff' && <StaffListView userRole={session.role} />}
            {currentTab === 'physician' && <PhysicianView />}
            {currentTab === 'rules' && <RuleConfiguratorView />}
            {currentTab === 'audit' && <AuditLogView />}
          </Box>
        </Box>

        <PasswordChangeModal
          open={passwordModalOpen || Boolean(session.mustChangePassword)}
          staffId={session.staffId}
          isMandatory={session.mustChangePassword}
          onClose={() => setPasswordModalOpen(false)}
          onSuccess={() => {
            if (session) {
              const updated = { ...session, mustChangePassword: false };
              setStoredSession(updated);
              setSession(updated);
            }
          }}
        />
      </Box>
    </ThemeProvider>
  );
};
