import React, { useState, useRef } from 'react';
import { useQuery } from '@apollo/client';
import { Download, FileText, Printer } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { ALL_COMPANIES, COMPANY_INVOICES } from '../apollo/queries';

export default function Reports() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [fromDate, setFromDate] = useState(firstOfMonth.toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(today.toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  const { data: invoicesData, loading } = useQuery(COMPANY_INVOICES, {
    variables: {
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      status: statusFilter || undefined,
      limit: 500,
    },
    fetchPolicy: 'cache-and-network',
  });

  const invoices: any[] = (invoicesData?.companyInvoices ?? []).filter((inv: any) => {
    const d = new Date(inv.issuedAt ?? inv.dueDate);
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });

  const totalRevenue = invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + i.amount, 0);
  const totalPending = invoices.filter(i => i.status !== 'PAID' && i.status !== 'CANCELLED').reduce((s, i) => s + i.amount, 0);

  const exportCsv = () => {
    const headers = ['Invoice #', 'Company', 'Amount', 'Status', 'Due Date', 'Paid On'];
    const rows = invoices.map(inv => [
      inv.invoiceNumber,
      inv.center?.name ?? '',
      inv.amount,
      inv.status,
      new Date(inv.dueDate).toLocaleDateString('en-IN'),
      inv.paidAt ? new Date(inv.paidAt).toLocaleDateString('en-IN') : '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(String).map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sandtell-report-${fromDate}-to-${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printReport = () => window.print();

  return (
    <div className="p-6 max-w-7xl mx-auto" id="print-area">
      <style>{`@media print { body > *:not(#print-area) { display: none } .no-print { display: none !important } }`}</style>

      <div className="flex items-center justify-between mb-6 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
          <p className="text-slate-500 text-sm mt-0.5">Revenue & subscription analytics</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="flex items-center gap-2 border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm hover:bg-slate-50">
            <Download size={14} /> CSV
          </button>
          <button onClick={printReport} className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-700">
            <Printer size={14} /> Print / PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 no-print">
        <div>
          <label className="block text-xs text-slate-500 mb-1">From</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">To</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">All</option>
            <option value="PAID">Paid</option>
            <option value="PENDING">Pending</option>
            <option value="OVERDUE">Overdue</option>
          </select>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-6">
        <h2 className="text-xl font-bold">Sandtell Platform — Revenue Report</h2>
        <p className="text-sm text-slate-600">Period: {fromDate} to {toDate}</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard label="Total Invoices" value={String(invoices.length)} />
        <SummaryCard label="Collected" value={`₹${totalRevenue.toLocaleString('en-IN')}`} color="green" />
        <SummaryCard label="Outstanding" value={`₹${totalPending.toLocaleString('en-IN')}`} color="amber" />
        <SummaryCard label="Paid Rate" value={invoices.length ? `${Math.round((invoices.filter(i => i.status === 'PAID').length / invoices.length) * 100)}%` : '—'} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Invoice #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Company</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Due Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Paid On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && invoices.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400">Loading…</td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center">
                  <FileText size={40} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">No data for selected filters</p>
                </td></tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{inv.center?.name ?? '—'}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">₹{inv.amount.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                    <td className="px-4 py-3 text-slate-500">{new Date(inv.dueDate).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3 text-slate-500">{inv.paidAt ? new Date(inv.paidAt).toLocaleDateString('en-IN') : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color = 'default' }: { label: string; value: string; color?: 'green' | 'amber' | 'default' }) {
  const bg = color === 'green' ? 'bg-green-50 border-green-200' : color === 'amber' ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200';
  const text = color === 'green' ? 'text-green-700' : color === 'amber' ? 'text-amber-700' : 'text-slate-800';
  const label_color = color === 'green' ? 'text-green-600' : color === 'amber' ? 'text-amber-600' : 'text-slate-500';
  return (
    <div className={`rounded-xl border px-5 py-4 ${bg}`}>
      <p className={`text-xs font-medium uppercase tracking-wide ${label_color}`}>{label}</p>
      <p className={`text-2xl font-bold mt-1 ${text}`}>{value}</p>
    </div>
  );
}
