import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/axios";
import { Download, Filter, BarChart3, PieChart as PieChartIcon, Target } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie, Legend } from "recharts";
import { TableSkeleton } from "../../components/ui/Skeleton";
import toast from "react-hot-toast";

const Reports = () => {
  const [sourceFilter, setSourceFilter] = useState("ALL");

  const { data: statusSummary, isLoading: loadingStatus } = useQuery({
    queryKey: ["statusSummary", sourceFilter],
    queryFn: async () => {
      const res = await api.get(`/api/reports/status-summary?source=${sourceFilter}`);
      return res.data;
    }
  });

  const { data: telecallerPerf, isLoading: loadingPerf } = useQuery({
    queryKey: ["telecallerPerf", sourceFilter],
    queryFn: async () => {
      const res = await api.get(`/api/reports/telecaller-performance?source=${sourceFilter}`);
      return res.data;
    }
  });

  const { data: campaignPerf, isLoading: loadingCampaign } = useQuery({
    queryKey: ["campaignPerf"],
    queryFn: async () => {
      const res = await api.get(`/api/reports/campaign-performance`);
      return res.data;
    }
  });

  const handleExport = async (type) => {
    const toastId = toast.loading("Preparing export...");
    try {
      const res = await api.get(`/api/reports/export?type=${type}&source=${sourceFilter}`);
      const data = res.data;
      if (!data || data.length === 0) {
        toast.error("No data available to export.", { id: toastId });
        return;
      }
      
      const keys = Object.keys(data[0]);
      const csv = [
        keys.join(','),
        ...data.map(row => keys.map(k => `"${(row[k] || '').toString().replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_export_${sourceFilter}_${new Date().getTime()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success("Export downloaded successfully!", { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error("Failed to export data.", { id: toastId });
    }
  };

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#14b8a6', '#3b82f6'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Analytics & Reports</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Deep dive into CRM performance and conversions.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Filter size={16} />
            </div>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full sm:w-48 pl-9 pr-8 py-2.5 bg-white dark:bg-[#1e1e2f] border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-sm outline-none appearance-none"
              style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
            >
              <option value="ALL">All Sources</option>
              <option value="BOT">Telegram Bot Leads</option>
              <option value="PERSONAL_META_AD">Personal Meta Ads</option>
            </select>
          </div>
          <button 
            onClick={() => handleExport('working_sheet')}
            className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-500/20 active:scale-95"
          >
            <Download size={18} />
            Export Data
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Summary */}
        <div className="bg-white dark:bg-[#1e1e2f] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col h-full overflow-hidden hover:shadow-md transition-shadow">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg text-indigo-600 dark:text-indigo-400">
              <PieChartIcon size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Lead Funnel Distribution</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Global breakdown by Status 3</p>
            </div>
          </div>
          
          <div className="p-6 flex-1 flex flex-col">
            {loadingStatus ? (
              <TableSkeleton columns={2} rows={5} />
            ) : statusSummary?.length > 0 ? (
              <div className="flex-1 min-h-[300px] flex flex-col">
                <div className="h-64 w-full mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusSummary}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="status1"
                        stroke="none"
                      >
                        {statusSummary.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '12px', 
                          border: '1px solid #e2e8f0', 
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                          backgroundColor: '#ffffff',
                          color: '#0f172a',
                          fontWeight: 500
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mt-auto">
                  {statusSummary.slice(0, 6).map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-slate-600 dark:text-slate-400 truncate flex-1" title={s.status1}>{s.status1}</span>
                      <span className="font-bold text-slate-900 dark:text-white">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                <PieChartIcon size={48} className="text-slate-200 dark:text-slate-700 mb-4" />
                <p>No funnel data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Telecaller Performance */}
        <div className="bg-white dark:bg-[#1e1e2f] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col h-full overflow-hidden hover:shadow-md transition-shadow">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg text-emerald-600 dark:text-emerald-400">
              <BarChart3 size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Agent Performance</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Conversion and activity tracking</p>
            </div>
          </div>
          
          <div className="p-0 flex-1 flex flex-col overflow-hidden">
            {loadingPerf ? (
              <div className="p-6">
                <TableSkeleton columns={4} rows={6} />
              </div>
            ) : (
              <div className="overflow-y-auto max-h-[450px] custom-scrollbar">
                <table className="w-full text-left border-collapse relative">
                  <thead className="sticky top-0 bg-slate-50/90 dark:bg-[#151521]/90 backdrop-blur-md z-10">
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider font-bold">
                      <th className="p-4">Agent Name</th>
                      <th className="p-4 text-right">Assigned</th>
                      <th className="p-4 text-right text-emerald-600 dark:text-emerald-400">Closed</th>
                      <th className="p-4 text-right text-orange-600 dark:text-orange-400">Follow-up</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {telecallerPerf?.map((t, i) => (
                      <tr key={i} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 font-semibold text-slate-900 dark:text-white">{t.telecaller_name || 'Unassigned'}</td>
                        <td className="p-4 text-right text-slate-600 dark:text-slate-400 font-mono">{t.total_assigned}</td>
                        <td className="p-4 text-right text-emerald-600 dark:text-emerald-400 font-mono font-bold bg-emerald-50/30 dark:bg-emerald-500/5">{t.closed_count}</td>
                        <td className="p-4 text-right text-orange-600 dark:text-orange-400 font-mono font-bold bg-orange-50/30 dark:bg-orange-500/5">{t.followup_count}</td>
                      </tr>
                    ))}
                    {telecallerPerf?.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-12 text-center text-slate-500 dark:text-slate-400">No performance data available.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Campaign Performance */}
        {(sourceFilter === 'ALL' || sourceFilter === 'PERSONAL_META_AD') && (
          <div className="bg-white dark:bg-[#1e1e2f] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col lg:col-span-2 overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-500/20 rounded-lg text-purple-600 dark:text-purple-400">
                <Target size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Meta Campaign ROI</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Lead quality and conversion metrics for imported campaigns</p>
              </div>
            </div>
            
            <div className="p-0 flex-1 overflow-hidden">
              {loadingCampaign ? (
                <div className="p-6">
                  <TableSkeleton columns={6} rows={5} />
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[400px] custom-scrollbar">
                  <table className="w-full text-left border-collapse relative">
                    <thead className="sticky top-0 bg-slate-50/90 dark:bg-[#151521]/90 backdrop-blur-md z-10">
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider font-bold whitespace-nowrap">
                        <th className="p-4">Campaign Name</th>
                        <th className="p-4">Assigned Agent</th>
                        <th className="p-4 text-right">Leads Uploaded</th>
                        <th className="p-4 text-right">Actioned</th>
                        <th className="p-4 text-right text-emerald-600 dark:text-emerald-400">Converted</th>
                        <th className="p-4 text-right">Upload Date</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {campaignPerf?.map((c, i) => {
                        const conversionRate = c.total_imported > 0 ? ((c.closed_count / c.total_imported) * 100).toFixed(1) : 0;
                        return (
                          <tr key={i} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors whitespace-nowrap">
                            <td className="p-4 font-semibold text-slate-900 dark:text-white">{c.campaign_name}</td>
                            <td className="p-4 text-slate-600 dark:text-slate-400">{c.telecaller_name}</td>
                            <td className="p-4 text-right text-slate-600 dark:text-slate-400 font-mono">{c.total_imported}</td>
                            <td className="p-4 text-right text-slate-600 dark:text-slate-400 font-mono">
                              {c.actioned_count} 
                              <span className="text-xs text-slate-400 ml-1">({Math.round((c.actioned_count/c.total_imported)*100)}%)</span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{c.closed_count}</span>
                                <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold">{conversionRate}%</span>
                              </div>
                            </td>
                            <td className="p-4 text-right text-slate-500 dark:text-slate-400">{new Date(c.created_at).toLocaleString('en-IN', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true })}</td>
                          </tr>
                        );
                      })}
                      {campaignPerf?.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-16 text-center text-slate-500 dark:text-slate-400">
                            <div className="flex flex-col items-center">
                              <Target size={48} className="text-slate-300 dark:text-slate-600 mb-4" />
                              <p className="text-lg font-medium text-slate-900 dark:text-white">No campaigns tracked</p>
                              <p className="text-sm mt-1">Upload meta ad leads to see performance ROI.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
