import React from 'react';
import { Navigate } from 'react-router-dom';
import { getStoredSession } from '../../services/api';
import { UserRole } from '../../types';

interface RoleGuardProps {
  allowedRoles: (UserRole | 'SYSTEM')[];
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
  const session = getStoredSession();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (session.mustChangePassword) {
    return <Navigate to="/force-change-password" replace />;
  }

  if (!allowedRoles.includes(session.role as any)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
