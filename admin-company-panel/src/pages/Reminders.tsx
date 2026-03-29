import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Bell, Eye } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { ALL_COMPANIES, REMINDER_LOGS } from '../apollo/queries';

export default function Reminders() {
  const navigate = useNavigate();
  const [selectedCompany, setSelectedCompany] = useState('');

  const { data: companiesData } = useQuery(ALL_COMPANIES, {
    variables: { limit: 200 },
    fetchPolicy: 'cache-first',
  });

  const { data, loading } = useQuery(REMINDER_LOGS, {
    variables: { centerId: selectedCompany },
    skip: !selectedCompany,
  });

  const companies: any[] = companiesData?.allCompanies ?? [];
  const reminders: any[] = data?.reminderLogs ?? [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reminders</h1>
          <p className="text-slate-500 text-sm mt-0.5">Reminder history across all companies</p>
        </div>
        <select
          value={selectedCompany}
          onChange={(e) => setSelectedCompany(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-64"
        >
          <option value="">— Select a company —</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {!selectedCompany ? (
        <div className="bg-white rounded-xl border border-slate-200 py-24 text-center">
          <Bell size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">Select a company to view its reminder history</p>
        </div>
      ) : loading ? (
        <div className="text-slate-400 text-sm">Loading…</div>
      ) : reminders.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
          <Bell size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">No reminders sent yet for this company</p>
          <button
            onClick={() => navigate(`/companies/${selectedCompany}`)}
            className="mt-4 text-sm text-primary-600 hover:underline"
          >
            Go to company detail to send a reminder
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {reminders.map((r) => (
            <div key={r.id} className="px-5 py-4 flex items-start justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={r.type} />
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{r.channel}</span>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${r.success ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
                    {r.success ? 'Delivered' : 'Failed'}
                  </span>
                </div>
                {r.message && (
                  <p className="text-sm text-slate-700 mt-1.5">{r.message}</p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-slate-400">{new Date(r.sentAt).toLocaleString('en-IN')}</span>
                <button
                  onClick={() => navigate(`/companies/${selectedCompany}`)}
                  title="View company"
                  className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-primary-600"
                >
                  <Eye size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
