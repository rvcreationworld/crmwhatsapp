import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { Target, AlertCircle, RefreshCw, CheckCircle2, XCircle, Users, Activity, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const BotAutoAssignment = () => {
  const queryClient = useQueryClient();

  const { data: statusData, isLoading: isStatusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['botAutoAssignStatus'],
    queryFn: async () => {
      const res = await api.get('/api/admin/bot-auto-assign/status');
      return res.data;
    },
    refetchInterval: 30000 // auto refresh every 30s
  });

  const { data: top10Data, isLoading: isTop10Loading, refetch: refetchTop10 } = useQuery({
    queryKey: ['botAutoAssignTop10'],
    queryFn: async () => {
      const res = await api.get('/api/admin/bot-auto-assign/top-telecallers');
      return res.data;
    },
    refetchInterval: 30000 // auto refresh every 30s
  });

  const toggleMutation = useMutation({
    mutationFn: async (isEnabled) => {
      const res = await api.put('/api/admin/bot-auto-assign/status', { is_enabled: isEnabled });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.is_enabled ? 'Auto Assign Enabled' : 'Auto Assign Disabled');
      queryClient.invalidateQueries(['botAutoAssignStatus']);
      queryClient.invalidateQueries(['botAutoAssignTop10']);
    },
    onError: () => {
      toast.error('Failed to update status');
    }
  });

  const handleToggle = () => {
    if (!statusData) return;
    toggleMutation.mutate(!statusData.is_enabled);
  };

  const handleManualRefresh = () => {
    refetchStatus();
    refetchTop10();
    toast.success('Refreshed data');
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Target className="text-indigo-500" />
          BOT Auto Assignment
        </h1>
        <button
          onClick={handleManualRefresh}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500"
          title="Refresh Data"
        >
          <RefreshCw size={20} className={isStatusLoading || isTop10Loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex gap-3">
        <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={20} />
        <div>
          <h3 className="font-semibold text-blue-800 dark:text-blue-300">How it works</h3>
          <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
            Manual Fetch BOT Lead requests always receive priority. Remaining BOT leads are automatically distributed round-robin among the current eligible Top 10 telecallers based on 7-day rolling call times.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Card */}
        <div className="bg-white dark:bg-[#1e1e2f] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 lg:col-span-1">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">System Status</h2>
            <button
              onClick={handleToggle}
              disabled={toggleMutation.isLoading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                statusData?.is_enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  statusData?.is_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800/50">
              <span className="text-slate-500 text-sm">Pool Count (new_leads)</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{statusData?.pool_count || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800/50">
              <span className="text-slate-500 text-sm">Manual Queue Count</span>
              <span className={`font-bold ${statusData?.manual_queue_count > 0 ? 'text-amber-500' : 'text-slate-800 dark:text-slate-200'}`}>
                {statusData?.manual_queue_count || 0}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800/50">
              <span className="text-slate-500 text-sm">Auto-Assigned Today</span>
              <span className="font-bold text-indigo-500">{statusData?.auto_assigned_today || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800/50">
              <span className="text-slate-500 text-sm">Last Assigned</span>
              <span className="font-medium text-slate-800 dark:text-slate-200 text-right text-sm">
                {statusData?.last_telecaller_name || 'None'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800/50">
              <span className="text-slate-500 text-sm">Next Likely Assignee</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400 text-right text-sm">
                {statusData?.next_telecaller?.telecaller_name || 'None'}
              </span>
            </div>
            
            <div className="mt-4 text-xs text-center text-slate-400">
              Last ranking refresh: {statusData?.calculated_at ? new Date(statusData.calculated_at).toLocaleTimeString() : 'Never'}
            </div>
          </div>
        </div>

        {/* Top 10 Table */}
        <div className="bg-white dark:bg-[#1e1e2f] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 lg:col-span-2 overflow-hidden flex flex-col">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Top 10 Active Telecallers</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700/50 text-xs uppercase text-slate-500 font-semibold bg-slate-50 dark:bg-[#151521]">
                  <th className="px-4 py-3 rounded-tl-lg">Rank</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">7-Day Call Time</th>
                  <th className="px-4 py-3 text-center">Connected</th>
                  <th className="px-4 py-3 text-center">Assigned Today</th>
                  <th className="px-4 py-3 text-center rounded-tr-lg">Eligibility</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {!top10Data?.top10?.length && (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-slate-500">
                      No telecallers in Top 10 list.
                    </td>
                  </tr>
                )}
                {top10Data?.top10?.map((tc) => (
                  <tr key={tc.telecaller_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">
                      #{tc.rank}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {tc.telecaller_name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      {formatDuration(tc.total_call_time_seconds)}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-medium">
                      {tc.connected_calls}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-indigo-500">
                      {tc.bot_leads_assigned_today}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {tc.is_blocked ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20">
                          <XCircle size={14} /> Blocked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                          <CheckCircle2 size={14} /> Eligible
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BotAutoAssignment;
