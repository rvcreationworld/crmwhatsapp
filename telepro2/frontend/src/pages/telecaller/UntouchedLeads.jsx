import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { Loader2, PhoneCall, RefreshCw, Target } from 'lucide-react';
import toast from 'react-hot-toast';
import LeadViewToggle from '../../components/leads/LeadViewToggle';
import LeadCardGrid from '../../components/leads/LeadCardGrid';

const LS_KEY = 'crm_view_mode_untouched_leads';

const UntouchedLeads = () => {
  const [viewMode, setViewMode] = useState(() => localStorage.getItem(LS_KEY) || 'list');
  const handleViewChange = (mode) => { setViewMode(mode); localStorage.setItem(LS_KEY, mode); };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['untouchedLeads'],
    queryFn: async () => {
      const res = await api.get('/api/telecaller/untouched-leads');
      return res.data;
    }
  });

  const leads = data?.leads || [];

  const handleRefresh = () => {
    toast.promise(refetch(), {
      loading: 'Refreshing...',
      success: 'Refreshed untouched leads',
      error: 'Failed to refresh'
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Target className="text-purple-600" />
            Untouched Direct Leads
          </h1>
          <p className="text-slate-500 mt-1">Direct leads that have not been called yet.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 px-4 py-2 rounded-lg font-bold text-lg">
            {leads.length} <span className="text-sm font-medium opacity-80">Remaining</span>
          </div>
          <button 
            onClick={handleRefresh}
            className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
          >
            <RefreshCw size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
          <LeadViewToggle viewMode={viewMode} onChange={handleViewChange} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64 bg-white dark:bg-[#1e1e2f] border border-slate-200 dark:border-slate-800 rounded-2xl">
          <Loader2 className="animate-spin text-purple-600" size={32} />
        </div>
      ) : isError ? (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-xl border border-red-200 dark:border-red-800 text-center">
          Failed to load untouched leads.
        </div>
      ) : leads.length === 0 ? (
        <div className="bg-white dark:bg-[#1e1e2f] border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-sm">
          <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-4">
            <PhoneCall size={32} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Awesome Work!</h3>
          <p className="text-slate-500 max-w-md mx-auto">
            No untouched leads. All assigned direct leads have been called. Wait for new leads to be assigned.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <LeadCardGrid leads={leads} onLeadClick={() => {}} leadCategory="normal" emptyMessage="No untouched leads." />
      ) : (
        <div className="bg-white dark:bg-[#1e1e2f] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr className="text-slate-600 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider">
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700">Lead Info</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700">Mobile No</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700">Date Added (IST)</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700">Source</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700">Call Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{lead.lead_name || 'Unknown'}</div>
                      {lead.status1 && <div className="text-xs text-slate-500 mt-1">{lead.status1}</div>}
                    </td>
                    <td className="p-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                      {lead.lead_contact || lead.contact_last10}
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">
                      {new Date(lead.created_at).toLocaleString('en-IN', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true })}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md text-xs font-medium">
                        {lead.source || 'DIRECT'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                        Not Called
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default UntouchedLeads;
