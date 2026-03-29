import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Eye,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Building2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import StatusBadge from '../components/StatusBadge';
import ConfirmModal from '../components/ConfirmModal';
import { ALL_COMPANIES, UPDATE_COMPANY_STATUS, CREATE_COMPANY } from '../apollo/queries';
import { useAuth } from '../contexts/AuthContext';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'LOCKED', label: 'Locked' },
  { value: 'REMOVED', label: 'Removed' },
];

const PAGE_SIZE = 20;

interface CreateCompanyForm {
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  mobile: string;
  email: string;
  adminMobile: string;
  adminName: string;
  adminEmail: string;
}

const EMPTY_FORM: CreateCompanyForm = {
  name: '', address: '', latitude: '', longitude: '',
  mobile: '', email: '', adminMobile: '', adminName: '', adminEmail: '',
};

export default function Companies() {
  const navigate = useNavigate();
  const { canWrite, isSuperAdmin } = useAuth();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [offset, setOffset] = useState(0);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateCompanyForm>(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  const [confirmAction, setConfirmAction] = useState<{
    companyId: string;
    companyName: string;
    action: string;
    variant: 'danger' | 'warning' | 'info';
    title: string;
    message: string;
  } | null>(null);

  const { data, loading, refetch } = useQuery(ALL_COMPANIES, {
    variables: { status: status || undefined, search: search || undefined, limit: PAGE_SIZE, offset },
    fetchPolicy: 'cache-and-network',
  });

  const companies: any[] = data?.allCompanies ?? [];

  const [updateStatus, { loading: updatingStatus }] = useMutation(UPDATE_COMPANY_STATUS, {
    onCompleted() {
      toast.success('Company status updated');
      setConfirmAction(null);
      refetch();
    },
    onError(e) { toast.error(e.message); },
  });

  const [doCreateCompany, { loading: creating }] = useMutation(CREATE_COMPANY, {
    onCompleted() {
      toast.success('Company created successfully');
      setShowCreate(false);
      setForm(EMPTY_FORM);
      refetch();
    },
    onError(e) { setFormError(e.message); },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setOffset(0);
  };

  const handleStatusFilter = (v: string) => {
    setStatus(v);
    setOffset(0);
  };

  const ACTION_TO_STATUS: Record<string, string> = {
    APPROVE: 'APPROVED',
    REJECT: 'REJECTED',
    ACTIVATE: 'ACTIVE',
    LOCK: 'LOCKED',
    UNLOCK: 'APPROVED',
    REMOVE: 'REMOVED',
  };

  const openConfirm = (company: any, action: string) => {
    const configs: Record<string, any> = {
      APPROVE:  { title: 'Approve Company',  message: `Approve "${company.name}"? This will allow them to set up subscriptions.`, variant: 'info' },
      REJECT:   { title: 'Reject Company',   message: `Reject "${company.name}"? They will not be able to log in.`, variant: 'warning' },
      ACTIVATE: { title: 'Activate Company', message: `Activate "${company.name}"?`, variant: 'info' },
      LOCK:     { title: 'Lock Company',     message: `Lock "${company.name}"? All their app users will lose access immediately.`, variant: 'danger' },
      UNLOCK:   { title: 'Unlock Company',   message: `Unlock "${company.name}"?`, variant: 'info' },
      REMOVE:   { title: 'Remove Company',   message: `Permanently remove "${company.name}"? This action cannot be undone.`, variant: 'danger' },
    };
    const cfg = configs[action];
    if (!cfg) return;
    setConfirmAction({ companyId: company.id, companyName: company.name, action, ...cfg });
  };

  const handleConfirm = () => {
    if (!confirmAction) return;
    updateStatus({ variables: { id: confirmAction.companyId, status: ACTION_TO_STATUS[confirmAction.action] ?? confirmAction.action } });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.name || !form.address || !form.mobile || !form.adminMobile || !form.adminName) {
      setFormError('Name, address, mobile, admin mobile and admin name are required.');
      return;
    }
    doCreateCompany({
      variables: {
        input: {
          name: form.name.trim(),
          address: form.address.trim(),
          latitude: form.latitude ? parseFloat(form.latitude) : 0,
          longitude: form.longitude ? parseFloat(form.longitude) : 0,
          mobile: form.mobile.trim(),
          email: form.email.trim() || undefined,
          adminMobile: form.adminMobile.trim(),
          adminName: form.adminName.trim(),
          adminEmail: form.adminEmail.trim() || undefined,
        },
      },
    });
  };

  const setField = (k: keyof CreateCompanyForm, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Companies</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage all registered vehicle wash companies</p>
        </div>
        {canWrite && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Add Company
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name or mobile…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-slate-800 text-white text-sm rounded-lg">
            Search
          </button>
        </form>
        <select
          value={status}
          onChange={(e) => handleStatusFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Company</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Mobile</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Subscription</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Joined</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && companies.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">Loading…</td></tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <Building2 size={40} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500">No companies found</p>
                  </td>
                </tr>
              ) : (
                companies.map((c) => {
                  const activeSub = c.subscriptions?.find((s: any) => s.status === 'ACTIVE' || s.status === 'OVERDUE' || s.status === 'EXPIRED');
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{c.name}</div>
                        <div className="text-xs text-slate-400 truncate max-w-xs">{c.address}</div>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                      <td className="px-4 py-3 text-slate-600">{c.mobile}</td>
                      <td className="px-4 py-3">
                        {activeSub ? (
                          <div>
                            <StatusBadge status={activeSub.status} />
                            <div className="text-xs text-slate-400 mt-0.5">
                              Due: {new Date(activeSub.dueDate).toLocaleDateString('en-IN')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">No active plan</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(c.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => navigate(`/companies/${c.id}`)}
                            title="View details"
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-primary-600"
                          >
                            <Eye size={15} />
                          </button>
                          {canWrite && c.status === 'PENDING_APPROVAL' && (
                            <>
                              <button onClick={() => openConfirm(c, 'APPROVE')} title="Approve" className="p-1.5 rounded hover:bg-green-50 text-slate-400 hover:text-green-600"><CheckCircle size={15} /></button>
                              <button onClick={() => openConfirm(c, 'REJECT')} title="Reject" className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"><XCircle size={15} /></button>
                            </>
                          )}
                          {isSuperAdmin && c.status === 'ACTIVE' && (
                            <button onClick={() => openConfirm(c, 'LOCK')} title="Lock" className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"><Lock size={15} /></button>
                          )}
                          {isSuperAdmin && c.status === 'LOCKED' && (
                            <button onClick={() => openConfirm(c, 'UNLOCK')} title="Unlock" className="p-1.5 rounded hover:bg-green-50 text-slate-400 hover:text-green-600"><Unlock size={15} /></button>
                          )}
                          {isSuperAdmin && c.status !== 'REMOVED' && (
                            <button onClick={() => openConfirm(c, 'REMOVE')} title="Remove" className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600"><Trash2 size={15} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
          <span>Showing {offset + 1}–{offset + companies.length}</span>
          <div className="flex gap-2">
            <button
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              className="p-1 rounded hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              disabled={companies.length < PAGE_SIZE}
              onClick={() => setOffset(offset + PAGE_SIZE)}
              className="p-1 rounded hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirm}
        title={confirmAction?.title ?? ''}
        message={confirmAction?.message ?? ''}
        variant={confirmAction?.variant ?? 'warning'}
        loading={updatingStatus}
      />

      {/* Create Company Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">Add New Company</h2>
            </div>
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="label-text">Company Name *</label>
                  <input className="form-input" value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="Acme Car Wash" />
                </div>
                <div className="sm:col-span-2">
                  <label className="label-text">Address *</label>
                  <input className="form-input" value={form.address} onChange={(e) => setField('address', e.target.value)} placeholder="123 Main St, City" />
                </div>
                <div>
                  <label className="label-text">Latitude</label>
                  <input className="form-input" type="number" step="any" value={form.latitude} onChange={(e) => setField('latitude', e.target.value)} placeholder="13.0827" />
                </div>
                <div>
                  <label className="label-text">Longitude</label>
                  <input className="form-input" type="number" step="any" value={form.longitude} onChange={(e) => setField('longitude', e.target.value)} placeholder="80.2707" />
                </div>
                <div>
                  <label className="label-text">Company Mobile *</label>
                  <input className="form-input" value={form.mobile} onChange={(e) => setField('mobile', e.target.value)} placeholder="9876543210" />
                </div>
                <div>
                  <label className="label-text">Company Email</label>
                  <input className="form-input" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} placeholder="info@company.com" />
                </div>
                <div>
                  <label className="label-text">Admin Name *</label>
                  <input className="form-input" value={form.adminName} onChange={(e) => setField('adminName', e.target.value)} placeholder="John Doe" />
                </div>
                <div>
                  <label className="label-text">Admin Mobile *</label>
                  <input className="form-input" value={form.adminMobile} onChange={(e) => setField('adminMobile', e.target.value)} placeholder="9876543211" />
                </div>
                <div className="sm:col-span-2">
                  <label className="label-text">Admin Email</label>
                  <input className="form-input" type="email" value={form.adminEmail} onChange={(e) => setField('adminEmail', e.target.value)} placeholder="admin@company.com" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); setFormError(''); }}
                  className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-60"
                >
                  {creating ? 'Creating…' : 'Create Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
