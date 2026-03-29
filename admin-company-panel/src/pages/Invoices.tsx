import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Eye, CheckCircle, Download, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import StatusBadge from '../components/StatusBadge';
import { COMPANY_INVOICES, RECORD_INVOICE_PAYMENT, GENERATE_INVOICE_PDF } from '../apollo/queries';
import { useAuth } from '../contexts/AuthContext';

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PAID', label: 'Paid' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const PAGE_SIZE = 20;

export default function Invoices() {
  const navigate = useNavigate();
  const { canWrite } = useAuth();
  const [statusFilter, setStatusFilter] = useState('');
  const [offset, setOffset] = useState(0);

  const { data, loading, refetch } = useQuery(COMPANY_INVOICES, {
    variables: { status: statusFilter || undefined, limit: PAGE_SIZE, offset },
    fetchPolicy: 'cache-and-network',
  });

  const invoices: any[] = data?.companyInvoices ?? [];

  const [recordPayment, { loading: recording }] = useMutation(RECORD_INVOICE_PAYMENT, {
    onCompleted() { toast.success('Payment recorded'); refetch(); },
    onError(e) { toast.error(e.message); },
  });

  const [generatePdf] = useMutation(GENERATE_INVOICE_PDF, {
    onCompleted(data) {
      const url = data.generateInvoicePdf;
      if (url) window.open(`${import.meta.env.VITE_API_URL.replace('/graphql', '')}${url}`, '_blank');
    },
    onError(e) { toast.error(e.message); },
  });

  const totalPaid = invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + i.amount, 0);
  const totalPending = invoices.filter(i => i.status !== 'PAID' && i.status !== 'CANCELLED').reduce((s, i) => s + i.amount, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Invoices</h1>
          <p className="text-slate-500 text-sm mt-0.5">All platform invoices</p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setOffset(0); }}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
        >
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4">
          <p className="text-xs text-green-600 font-medium uppercase tracking-wide">Collected</p>
          <p className="text-2xl font-bold text-green-700 mt-1">₹{totalPaid.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
          <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Outstanding</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">₹{totalPending.toLocaleString('en-IN')}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Invoice #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Company</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Due</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Paid On</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && invoices.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">Loading…</td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center">
                  <FileText size={40} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">No invoices found</p>
                </td></tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => navigate(`/companies/${inv.center?.id}`)} className="font-medium text-primary-600 hover:underline text-left">
                        {inv.center?.name ?? '—'}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">₹{inv.amount.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                    <td className="px-4 py-3 text-slate-500">{new Date(inv.dueDate).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {inv.paidAt ? new Date(inv.paidAt).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {canWrite && inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                          <button
                            onClick={() => recordPayment({ variables: { invoiceId: inv.id } })}
                            title="Mark Paid"
                            disabled={recording}
                            className="p-1.5 rounded hover:bg-green-50 text-slate-400 hover:text-green-600 disabled:opacity-40"
                          >
                            <CheckCircle size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => generatePdf({ variables: { invoiceId: inv.id } })}
                          title="Download PDF"
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-primary-600"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
          <span>Showing {offset + 1}–{offset + invoices.length}</span>
          <div className="flex gap-2">
            <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} className="p-1 rounded hover:bg-slate-100 disabled:opacity-40"><ChevronLeft size={16} /></button>
            <button disabled={invoices.length < PAGE_SIZE} onClick={() => setOffset(offset + PAGE_SIZE)} className="p-1 rounded hover:bg-slate-100 disabled:opacity-40"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
