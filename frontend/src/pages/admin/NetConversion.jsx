import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { Loader2, RefreshCw, Search, Percent } from 'lucide-react';
import toast from 'react-hot-toast';

const NetConversion = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['adminNetConversion'],
    queryFn: async () => {
      const res = await api.get('/api/admin/net-conversion');
      return res.data;
    }
  });

  const rawData = data?.data || [];

  const handleRefresh = () => {
    toast.promise(refetch(), {
      loading: 'Refreshing...',
      success: 'Data refreshed!',
      error: 'Failed to refresh'
    });
  };

  const getAngelConversion = (t) => {
    const totalLeads = (t.bot_leads_count || 0) + (t.direct_leads_count || 0);
    if (totalLeads === 0) return 0;
    return (t.angel_one_count || 0) / totalLeads;
  };

  const filteredData = rawData
    .filter(t => t.telecaller_name?.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => getAngelConversion(b) - getAngelConversion(a));

  // Totals
  const totalBotLeads = filteredData.reduce((sum, t) => sum + (t.bot_leads_count || 0), 0);
  const totalDirectLeads = filteredData.reduce((sum, t) => sum + (t.direct_leads_count || 0), 0);
  const totalAngelOne = filteredData.reduce((sum, t) => sum + (t.angel_one_count || 0), 0);
  const totalDhan = filteredData.reduce((sum, t) => sum + (t.dhan_count || 0), 0);

  const calculateConversion = (part, botLeads, directLeads) => {
    const totalLeads = (botLeads || 0) + (directLeads || 0);
    if (totalLeads === 0) return '0.00%';
    return ((part / totalLeads) * 100).toFixed(2) + '%';
  };

  const calculateAdNet = (angel, dhan, botLeads, directLeads) => {
    const totalLeads = (botLeads || 0) + (directLeads || 0);
    if (totalLeads === 0) return '0.00%';
    return (((angel + dhan) / totalLeads) * 100).toFixed(2) + '%';
  };

  return (
    <div className="space-y-6 animate-fade-in-up h-full overflow-y-auto custom-scrollbar pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#1e1e2f] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
            <Percent className="text-indigo-600 dark:text-indigo-400" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Net Conversion</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Real-time conversion metrics per telecaller</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search telecaller..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm w-64 text-slate-900 dark:text-white"
            />
          </div>
          <button 
            onClick={handleRefresh}
            disabled={isFetching}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors font-medium"
          >
            <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-[#1e1e2f] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
          <p className="text-slate-500 font-medium">Loading conversion data...</p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-[#1e1e2f] border border-red-200 dark:border-red-900/30 rounded-2xl shadow-sm text-center">
          <p className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">Error Loading Data</p>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Failed to load net conversion data. Please try again.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1e1e2f] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr className="text-slate-600 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider">
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700">Telecaller</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-right">Bot Leads</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-right">Direct Leads</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-right">Angel One</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-right">Dhan</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-right">Angel Conversion</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-right">Dhan Conversion</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-right">AD NET</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredData.map((t) => {
                  return (
                    <tr key={t.telecaller_id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 font-medium text-slate-900 dark:text-white">
                        {t.telecaller_name || 'Unknown'}
                      </td>
                      <td className="p-4 text-right font-semibold text-slate-700 dark:text-slate-300">
                        {t.bot_leads_count || 0}
                      </td>
                      <td className="p-4 text-right font-semibold text-slate-700 dark:text-slate-300">
                        {t.direct_leads_count || 0}
                      </td>
                      <td className="p-4 text-right">
                        <span className="inline-flex px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 font-bold text-xs">
                          {t.angel_one_count || 0}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="inline-flex px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 font-bold text-xs">
                          {t.dhan_count || 0}
                        </span>
                      </td>
                      <td className="p-4 text-right font-bold text-indigo-600 dark:text-indigo-400">
                        {calculateConversion(t.angel_one_count || 0, t.bot_leads_count, t.direct_leads_count)}
                      </td>
                      <td className="p-4 text-right font-bold text-indigo-600 dark:text-indigo-400">
                        {calculateConversion(t.dhan_count || 0, t.bot_leads_count, t.direct_leads_count)}
                      </td>
                      <td className="p-4 text-right">
                        <span className="inline-flex px-3 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-black text-sm">
                          {calculateAdNet(t.angel_one_count || 0, t.dhan_count || 0, t.bot_leads_count, t.direct_leads_count)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-slate-500 dark:text-slate-400">
                      No telecallers found matching "{searchTerm}"
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-slate-100 dark:bg-slate-800/80 font-bold text-slate-900 dark:text-white border-t-2 border-slate-200 dark:border-slate-700">
                <tr>
                  <td className="p-4">TOTAL</td>
                  <td className="p-4 text-right">{totalBotLeads}</td>
                  <td className="p-4 text-right">{totalDirectLeads}</td>
                  <td className="p-4 text-right text-blue-700 dark:text-blue-400">{totalAngelOne}</td>
                  <td className="p-4 text-right text-orange-700 dark:text-orange-400">{totalDhan}</td>
                  <td className="p-4 text-right text-indigo-600 dark:text-indigo-400">
                    {calculateConversion(totalAngelOne, totalBotLeads, totalDirectLeads)}
                  </td>
                  <td className="p-4 text-right text-indigo-600 dark:text-indigo-400">
                    {calculateConversion(totalDhan, totalBotLeads, totalDirectLeads)}
                  </td>
                  <td className="p-4 text-right text-emerald-600 dark:text-emerald-400 text-lg">
                    {calculateAdNet(totalAngelOne, totalDhan, totalBotLeads, totalDirectLeads)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default NetConversion;
