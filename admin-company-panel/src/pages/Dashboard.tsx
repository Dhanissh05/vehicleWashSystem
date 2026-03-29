import React from 'react';
import { useQuery } from '@apollo/client';
import {
  Building2,
  CheckCircle2,
  Lock,
  Clock,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import { PLATFORM_METRICS } from '../apollo/queries';

interface PlatformMetrics {
  totalCompanies: number;
  activeCompanies: number;
  lockedCompanies: number;
  pendingApprovals: number;
  totalRevenueAllTime: number;
  overduePayments: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  recentOverdueCompanies: {
    id: string;
    name: string;
    status: string;
    subscriptions: {
      dueDate: string;
      status: string;
    }[];
  }[];
  monthlyRevenue: {
    month: string;
    revenue: number;
  }[];
}

export default function Dashboard() {
  const { data, loading, error, refetch } = useQuery<{ platformMetrics: PlatformMetrics }>(
    PLATFORM_METRICS,
    { pollInterval: 30000 }
  );

  const m = data?.platformMetrics;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Platform overview</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-primary-600 transition-colors"
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-6">
          Failed to load metrics: {error.message}
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="Total Companies"
          value={loading ? '—' : String(m?.totalCompanies ?? 0)}
          icon={Building2}
        />
        <MetricCard
          title="Active"
          value={loading ? '—' : String(m?.activeCompanies ?? 0)}
          icon={CheckCircle2}
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
        <MetricCard
          title="Locked"
          value={loading ? '—' : String(m?.lockedCompanies ?? 0)}
          icon={Lock}
          iconColor="text-red-500"
          iconBg="bg-red-50"
        />
        <MetricCard
          title="Pending Approvals"
          value={loading ? '—' : String(m?.pendingApprovals ?? 0)}
          icon={Clock}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <MetricCard
          title="Total Revenue"
          value={loading ? '—' : formatCurrency(m?.totalRevenueAllTime ?? 0)}
          icon={DollarSign}
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
        <MetricCard
          title="Revenue This Month"
          value={loading ? '—' : formatCurrency(m?.revenueThisMonth ?? 0)}
          icon={TrendingUp}
          trend={
            m
              ? {
                  up: m.revenueThisMonth >= m.revenueLastMonth,
                  value: `vs ₹${(m.revenueLastMonth ?? 0).toLocaleString('en-IN')} last month`,
                }
              : undefined
          }
        />
        <MetricCard
          title="Overdue Payments"
          value={loading ? '—' : String(m?.overduePayments ?? 0)}
          icon={AlertTriangle}
          iconColor="text-red-500"
          iconBg="bg-red-50"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Monthly Revenue (last 6 months)</h2>
          {loading ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Loading…</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={m?.monthlyRevenue ?? []} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(v: number) => [formatCurrency(v), 'Revenue']}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Overdue Companies */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />
            Overdue Companies
          </h2>
          {loading ? (
            <div className="text-sm text-slate-400">Loading…</div>
          ) : !m?.recentOverdueCompanies?.length ? (
            <div className="text-sm text-slate-400 text-center py-8">No overdue companies</div>
          ) : (
            <ul className="space-y-3">
              {m.recentOverdueCompanies.slice(0, 8).map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-slate-700 truncate">{c.name}</span>
                  <StatusBadge status={c.status} size="xs" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
