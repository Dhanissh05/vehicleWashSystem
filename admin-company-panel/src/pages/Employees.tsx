import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Users, Plus, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import StatusBadge from '../components/StatusBadge';
import { PLATFORM_USERS, CREATE_PLATFORM_USER } from '../apollo/queries';

const ROLE_OPTIONS = [
  { value: 'EMPLOYEE', label: 'Employee' },
  { value: 'VIEWER', label: 'Viewer' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
];

const EMPTY_FORM = { name: '', mobile: '', password: '', role: 'EMPLOYEE' };

export default function Employees() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  const { data, loading, refetch } = useQuery(PLATFORM_USERS);
  const users: any[] = data?.platformUsers ?? [];

  const [createUser, { loading: creating }] = useMutation(CREATE_PLATFORM_USER, {
    onCompleted() {
      toast.success('Platform user created');
      setShowCreate(false);
      setForm(EMPTY_FORM);
      refetch();
    },
    onError(e) { setFormError(e.message); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.name || !form.mobile || !form.password) {
      setFormError('Name, mobile, and password are required.');
      return;
    }
    createUser({ variables: { name: form.name, mobile: form.mobile, password: form.password, role: form.role } });
  };

  const setField = (k: keyof typeof EMPTY_FORM, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const roleLabel: Record<string, string> = { SUPER_ADMIN: 'Super Admin', EMPLOYEE: 'Employee', VIEWER: 'Viewer' };
  const roleBadge: Record<string, string> = {
    SUPER_ADMIN: 'bg-purple-100 text-purple-700',
    EMPLOYEE: 'bg-blue-100 text-blue-700',
    VIEWER: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Platform Users</h1>
          <p className="text-slate-500 text-sm mt-0.5">Sandtell admin panel team members</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Plus size={16} />
          Add User
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Loading…</div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center">
            <Users size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No platform users yet</p>
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Mobile</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{u.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{u.mobile}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${roleBadge[u.role] ?? 'bg-slate-100 text-slate-600'}`}>
                      {roleLabel[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">Add Platform User</h2>
              <button onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); setFormError(''); }} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}
              <div>
                <label className="label-text">Full Name *</label>
                <input className="form-input" value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="Jane Smith" />
              </div>
              <div>
                <label className="label-text">Mobile *</label>
                <input className="form-input" value={form.mobile} onChange={(e) => setField('mobile', e.target.value)} placeholder="9876543210" />
              </div>
              <div>
                <label className="label-text">Password *</label>
                <input className="form-input" type="password" value={form.password} onChange={(e) => setField('password', e.target.value)} placeholder="Min 8 characters" />
              </div>
              <div>
                <label className="label-text">Role</label>
                <select className="form-input" value={form.role} onChange={(e) => setField('role', e.target.value)}>
                  {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); setFormError(''); }} className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-lg text-sm">Cancel</button>
                <button type="submit" disabled={creating} className="flex-1 bg-primary-600 text-white py-2.5 rounded-lg text-sm disabled:opacity-60">{creating ? 'Creating…' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
