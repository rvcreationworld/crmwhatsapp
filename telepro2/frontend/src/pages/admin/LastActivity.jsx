import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { Loader2, Activity, RefreshCw, Clock, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';

const LiveTimer = ({ initialSeconds }) => {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    if (initialSeconds === null || initialSeconds === undefined) return;
    setSeconds(initialSeconds);
    
    const interval = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [initialSeconds]);

  if (initialSeconds === null || initialSeconds === undefined) {
    return <span>No calls yet</span>;
  }

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  
  const pad = (n) => n.toString().padStart(2, '0');
  
  return <span>{pad(h)}:{pad(m)}:{pad(s)}</span>;
};

const LastActivity = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['lastActivity'],
    queryFn: async () => {
      const res = await api.get('/api/admin/last-activity');
      return res.data;
    },
    refetchInterval: 60000 // auto-refresh every 60 seconds
  });

  const telecallers = data?.telecallers || [];

  const handleRefresh = () => {
    toast.promise(refetch(), {
      loading: 'Refreshing activity...',
      success: 'Activity refreshed',
      error: 'Failed to refresh'
    });
  };

  const filteredTelecallers = telecallers.filter(t => 
    (t.telecaller_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.tele_mobile || '').includes(searchTerm)
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="text-purple-600" />
            Last Activity
          </h1>
          <p className="text-slate-500 mt-1">Real-time telecaller engagement and untouched leads monitor.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by name/mobile..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <button 
            onClick={handleRefresh}
            disabled={isFetching}
            className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={20} className={`text-slate-600 dark:text-slate-400 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64 bg-white dark:bg-[#1e1e2f] border border-slate-200 dark:border-slate-800 rounded-2xl">
          <Loader2 className="animate-spin text-purple-600" size={32} />
        </div>
      ) : isError ? (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-xl border border-red-200 dark:border-red-800 text-center">
          Failed to load last activity.
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1e1e2f] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr className="text-slate-600 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider">
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700">Telecaller Info</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700">Mobile</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700">Untouched Direct Leads</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700">Untouched Bot Leads</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700">Last Call Time</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700">Last Call Gap</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700">Total Calls</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredTelecallers.map((t) => {
                  const isHighGap = t.last_call_gap_seconds > 3600 || t.last_call_gap_seconds === null;
                  
                  return (
                    <tr key={t.telecaller_id} className={`border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors ${isHighGap ? 'bg-amber-50/30 dark:bg-amber-900/10' : ''}`}>
                      <td className="p-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{t.telecaller_name || 'Unknown'}</div>
                        <div className="text-xs text-slate-500 mt-0.5">ID: {t.telecaller_id}</div>
                      </td>
                      <td className="p-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                        {t.tele_mobile}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${
                          t.untouched_lead_count > 0 
                            ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20' 
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                        }`}>
                          {t.untouched_lead_count} Untouched
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${
                          t.untouched_bot_lead_count > 0 
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20' 
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                        }`}>
                          {t.untouched_bot_lead_count} Untouched
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">
                        {t.last_call_at ? new Date(t.last_call_at).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }) : '—'}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 font-semibold ${
                          t.last_call_gap_seconds === null 
                            ? 'text-red-500 dark:text-red-400' 
                            : t.last_call_gap_seconds > 3600 
                              ? 'text-amber-600 dark:text-amber-400' 
                              : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          <Clock size={14} />
                          <LiveTimer initialSeconds={t.last_call_gap_seconds} />
                        </span>
                      </td>
                      <td className="p-4 font-medium text-slate-900 dark:text-white">
                        {t.total_calls}
                      </td>
                    </tr>
                  );
                })}
                {filteredTelecallers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      No telecallers found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default LastActivity;
