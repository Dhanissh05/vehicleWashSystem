import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Eye, CheckCircle, ChevronLeft, ChevronRight, CreditCard, Plus, PencilLine } from 'lucide-react';
import toast from 'react-hot-toast';
import StatusBadge from '../components/StatusBadge';
import ConfirmModal from '../components/ConfirmModal';
import { COMPANY_SUBSCRIPTIONS, UPDATE_SUBSCRIPTION_STATUS, SUBSCRIPTION_PLANS, CREATE_SUBSCRIPTION_PLAN, UPDATE_SUBSCRIPTION_PLAN } from '../apollo/queries';
import { useAuth } from '../contexts/AuthContext';

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'LOCKED', label: 'Locked' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const PAGE_SIZE = 20;

export default function Subscriptions() {
  const navigate = useNavigate();
  const { canWrite, isSuperAdmin } = useAuth();
  const [statusFilter, setStatusFilter] = useState('');
  const [offset, setOffset] = useState(0);
  const [confirmAction, setConfirmAction] = useState<any>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [planForm, setPlanForm] = useState({ planName: '', price: '', billingCycle: 'MONTHLY', validityDays: '30', gracePeriodDays: '7', isActive: true });

  const { data, loading, refetch } = useQuery(COMPANY_SUBSCRIPTIONS, {
    variables: { status: statusFilter || undefined, limit: PAGE_SIZE, offset },
    fetchPolicy: 'cache-and-network',
  });

  const { data: plansData, refetch: refetchPlans } = useQuery(SUBSCRIPTION_PLANS, {
    variables: { includeInactive: true },
    fetchPolicy: 'cache-and-network',
  });

  const subscriptions: any[] = data?.companySubscriptions ?? [];
  const plans: any[] = plansData?.subscriptionPlans ?? [];

  const [updateSubStatus, { loading: updating }] = useMutation(UPDATE_SUBSCRIPTION_STATUS, {
    onCompleted() { toast.success('Subscription updated'); setConfirmAction(null); refetch(); },
    onError(e) { toast.error(e.message); },
  });

  const [createPlan, { loading: creatingPlan }] = useMutation(CREATE_SUBSCRIPTION_PLAN, {
    onCompleted() { toast.success('Plan created'); setShowPlanModal(false); setEditingPlan(null); refetchPlans(); },
    onError(e) { toast.error(e.message); },
  });

  const [updatePlan, { loading: updatingPlan }] = useMutation(UPDATE_SUBSCRIPTION_PLAN, {
    onCompleted() { toast.success('Plan updated'); setShowPlanModal(false); setEditingPlan(null); refetchPlans(); },
    onError(e) { toast.error(e.message); },
  });

  const openPlanModal = (plan?: any) => {
    setEditingPlan(plan || null);
    setPlanForm(plan
      ? {
          planName: plan.planName,
          price: String(plan.price),
          billingCycle: plan.billingCycle,
          validityDays: plan.validityDays ? String(plan.validityDays) : '',
          gracePeriodDays: String(plan.gracePeriodDays),
          isActive: plan.isActive,
        }
      : { planName: '', price: '', billingCycle: 'MONTHLY', validityDays: '30', gracePeriodDays: '7', isActive: true });
    setShowPlanModal(true);
  };

  const submitPlan = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      planName: planForm.planName,
      price: parseFloat(planForm.price),
      billingCycle: planForm.billingCycle,
      validityDays: planForm.billingCycle === 'LIFETIME' ? null : parseInt(planForm.validityDays, 10),
      gracePeriodDays: parseInt(planForm.gracePeriodDays, 10),
      isActive: planForm.isActive,
    };
    if (editingPlan) {
      updatePlan({ variables: { id: editingPlan.id, input: payload } });
      return;
    }
    createPlan({ variables: { input: payload } });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Plan Templates</h2>
          <p className="text-sm text-slate-500">Monthly, yearly, and lifetime plans configured by Super Admin.</p>
        </div>
        {isSuperAdmin && (
          <button onClick={() => openPlanModal()} className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus size={16} /> New Plan
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <h3 className="font-semibold text-slate-800">{plan.planName}</h3>
                <p className="text-sm text-slate-500">{plan.billingCycle}</p>
              </div>
              <StatusBadge status={plan.isActive ? 'ACTIVE' : 'REMOVED'} />
            </div>
            <p className="text-2xl font-bold text-slate-900 mb-1">₹{plan.price.toLocaleString('en-IN')}</p>
            <p className="text-sm text-slate-500">
              {plan.billingCycle === 'LIFETIME' ? 'No renewal' : `${plan.validityDays} days validity`} · Grace {plan.gracePeriodDays}d
            </p>
            {isSuperAdmin && (
              <button onClick={() => openPlanModal(plan)} className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700">
                <PencilLine size={14} /> Edit Plan
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Subscriptions</h1>
          <p className="text-slate-500 text-sm mt-0.5">All company subscription plans</p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setOffset(0); }}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
        >
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Company</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Due Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Grace</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && subscriptions.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">Loading…</td></tr>
              ) : subscriptions.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center">
                  <CreditCard size={40} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">No subscriptions found</p>
                </td></tr>
              ) : (
                subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{sub.center?.name ?? '—'}</div>
                      <div className="text-xs text-slate-400">{sub.center?.mobile}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{sub.plan?.planName ?? sub.planType}</td>
                    <td className="px-4 py-3"><StatusBadge status={sub.status} /></td>
                    <td className="px-4 py-3 font-medium text-slate-800">₹{sub.amount.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-slate-500">{sub.billingCycle === 'LIFETIME' ? 'No renewal' : new Date(sub.nextDueDate ?? sub.dueDate).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3 text-slate-500">{sub.gracePeriodDays}d</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => navigate(`/companies/${sub.center?.id}`)} title="View company" className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-primary-600">
                          <Eye size={14} />
                        </button>
                        {canWrite && sub.status === 'OVERDUE' && (
                          <button
                            onClick={() => setConfirmAction({ subId: sub.id, action: 'ACTIVE', title: 'Activate Subscription', message: 'Mark this subscription as active?', variant: 'info' })}
                            title="Activate"
                            className="p-1.5 rounded hover:bg-green-50 text-slate-400 hover:text-green-600"
                          >
                            <CheckCircle size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
          <span>Showing {offset + 1}–{offset + subscriptions.length}</span>
          <div className="flex gap-2">
            <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} className="p-1 rounded hover:bg-slate-100 disabled:opacity-40"><ChevronLeft size={16} /></button>
            <button disabled={subscriptions.length < PAGE_SIZE} onClick={() => setOffset(offset + PAGE_SIZE)} className="p-1 rounded hover:bg-slate-100 disabled:opacity-40"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => updateSubStatus({ variables: { subscriptionId: confirmAction.subId, status: confirmAction.action } })}
        title={confirmAction?.title ?? ''}
        message={confirmAction?.message ?? ''}
        variant={confirmAction?.variant ?? 'info'}
        loading={updating}
      />

      {showPlanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">{editingPlan ? 'Edit Plan' : 'Create Plan'}</h3>
              <button onClick={() => { setShowPlanModal(false); setEditingPlan(null); }} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={submitPlan} className="p-5 space-y-4">
              <div>
                <label className="label-text">Plan Name</label>
                <input className="form-input" value={planForm.planName} onChange={(e) => setPlanForm((prev) => ({ ...prev, planName: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-text">Billing Cycle</label>
                  <select className="form-input" value={planForm.billingCycle} onChange={(e) => setPlanForm((prev) => ({ ...prev, billingCycle: e.target.value, validityDays: e.target.value === 'YEARLY' ? '365' : e.target.value === 'MONTHLY' ? '30' : '' }))}>
                    <option value="MONTHLY">MONTHLY</option>
                    <option value="YEARLY">YEARLY</option>
                    <option value="LIFETIME">LIFETIME</option>
                  </select>
                </div>
                <div>
                  <label className="label-text">Price</label>
                  <input type="number" min="0" className="form-input" value={planForm.price} onChange={(e) => setPlanForm((prev) => ({ ...prev, price: e.target.value }))} required />
                </div>
              </div>
              {planForm.billingCycle !== 'LIFETIME' && (
                <div>
                  <label className="label-text">Validity Days</label>
                  <input type="number" min="1" className="form-input" value={planForm.validityDays} onChange={(e) => setPlanForm((prev) => ({ ...prev, validityDays: e.target.value }))} required />
                </div>
              )}
              <div>
                <label className="label-text">Grace Period Days</label>
                <input type="number" min="0" className="form-input" value={planForm.gracePeriodDays} onChange={(e) => setPlanForm((prev) => ({ ...prev, gracePeriodDays: e.target.value }))} required />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={planForm.isActive} onChange={(e) => setPlanForm((prev) => ({ ...prev, isActive: e.target.checked }))} />
                Plan is active
              </label>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowPlanModal(false); setEditingPlan(null); }} className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-lg text-sm">Cancel</button>
                <button type="submit" disabled={creatingPlan || updatingPlan} className="flex-1 bg-primary-600 text-white py-2.5 rounded-lg text-sm disabled:opacity-60">{creatingPlan || updatingPlan ? 'Saving…' : editingPlan ? 'Update Plan' : 'Create Plan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
