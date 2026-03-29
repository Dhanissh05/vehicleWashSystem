import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  FileText,
  Bell,
  BarChart3,
  Users,
  LogOut,
  Menu,
  X,
  Shield,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  superAdminOnly?: boolean;
}

const navItems: NavItem[] = [
  { name: 'Dashboard',     path: '/',             icon: LayoutDashboard },
  { name: 'Companies',     path: '/companies',    icon: Building2 },
  { name: 'Subscriptions', path: '/subscriptions', icon: CreditCard },
  { name: 'Invoices',      path: '/invoices',     icon: FileText },
  { name: 'Reminders',     path: '/reminders',    icon: Bell },
  { name: 'Reports',       path: '/reports',      icon: BarChart3 },
  { name: 'Employees',     path: '/employees',    icon: Users, superAdminOnly: true },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout, isSuperAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const visibleNavItems = navItems.filter(
    (item) => !item.superAdminOnly || isSuperAdmin
  );

  const roleLabel: Record<string, string> = {
    SUPER_ADMIN: 'Super Admin',
    EMPLOYEE:    'Employee',
    VIEWER:      'Viewer',
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside
        className={`${
          collapsed ? 'w-16' : 'w-64'
        } bg-slate-900 text-white transition-all duration-300 ease-in-out flex flex-col shadow-xl`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          {!collapsed && (
            <div>
              <div className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-primary-400" />
                <span className="font-bold text-lg text-white">Sandtell</span>
              </div>
              <span className="text-xs text-slate-400 ml-8">Admin Panel</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg hover:bg-slate-700 transition-colors text-slate-400 hover:text-white"
          >
            {collapsed ? <Menu size={18} /> : <X size={18} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));

            return (
              <Link
                key={item.path}
                to={item.path}
                title={collapsed ? item.name : undefined}
                className={`flex items-center gap-3 px-4 py-2.5 mx-2 my-0.5 rounded-lg transition-all group ${
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={18} className="flex-shrink-0" />
                {!collapsed && (
                  <span className="text-sm font-medium">{item.name}</span>
                )}
                {!collapsed && isActive && (
                  <ChevronRight size={14} className="ml-auto opacity-70" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User info + Logout */}
        <div className="p-4 border-t border-slate-700">
          {!collapsed && (
            <div className="mb-3 px-2">
              <p className="text-sm font-semibold text-white truncate">
                {user?.name || user?.mobile}
              </p>
              <p className="text-xs text-slate-400">
                {roleLabel[user?.role || ''] || user?.role}
              </p>
            </div>
          )}
          <button
            onClick={handleLogout}
            title={collapsed ? 'Logout' : undefined}
            className="flex items-center gap-3 w-full px-2 py-2 rounded-lg text-slate-400 hover:bg-red-900/30 hover:text-red-400 transition-colors"
          >
            <LogOut size={18} className="flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
