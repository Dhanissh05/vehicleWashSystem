import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  superAdminOnly?: boolean;
}

export default function ProtectedRoute({ children, superAdminOnly = false }: ProtectedRouteProps) {
  const { token, isSuperAdmin } = useAuth();

  if (!token) return <Navigate to="/login" replace />;
  if (superAdminOnly && !isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center">
        <p className="text-2xl font-bold text-slate-400 mb-2">Access Denied</p>
        <p className="text-slate-500 text-sm">Super Admin access required for this section.</p>
      </div>
    );
  }

  return <>{children}</>;
}
