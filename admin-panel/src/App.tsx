import React, { useState } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { LayoutDashboard, Car, Users, CreditCard, Settings, LogOut, Menu, X, FileText } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import EstimationsPage from './pages/EstimationsPage';
import EstimationFormPage from './pages/EstimationFormPage';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
  };

  if (!token && location.pathname !== '/login') {
    return <Navigate to="/login" />;
  }

  if (location.pathname === '/login') {
    return (
      <>
        <Login onLogin={setToken} />
        <Toaster position="top-right" />
      </>
    );
  }

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Vehicles', path: '/vehicles', icon: Car },
    { name: 'Estimations', path: '/estimations', icon: FileText },
    { name: 'Users', path: '/users', icon: Users },
    { name: 'Payments', path: '/payments', icon: CreditCard },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-white shadow-lg transition-all duration-300 ease-in-out`}
      >
        <div className="flex items-center justify-between p-4 border-b">
          {sidebarOpen && (
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              Vehicle Wash
            </h1>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="mt-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
                           (item.path === '/estimations' && location.pathname.startsWith('/estimations'));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-3 mx-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon size={20} />
                {sidebarOpen && <span className="ml-3 font-medium">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t">
          <button
            onClick={handleLogout}
            className={`flex items-center w-full px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors`}
          >
            <LogOut size={20} />
            {sidebarOpen && <span className="ml-3 font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/vehicles" element={<div className="p-6">Vehicles Page</div>} />
          <Route path="/estimations" element={<EstimationsPage />} />
          <Route path="/estimations/new" element={<EstimationFormPage />} />
          <Route path="/estimations/:id" element={<EstimationFormPage />} />
          <Route path="/users" element={<div className="p-6">Users Page</div>} />
          <Route path="/payments" element={<div className="p-6">Payments Page</div>} />
          <Route path="/settings" element={<div className="p-6">Settings Page</div>} />
        </Routes>
      </main>

      <Toaster position="top-right" />
    </div>
  );
}

export default App;
