import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/axios";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell 
} from "recharts";
import { 
  BarChart3, Loader2, Calendar, Target, PhoneCall, Clock, CheckCircle2, 
  AlertCircle, Users, Activity
} from "lucide-react";
import { cn } from "../../components/ui/Skeleton";
import AnalyticsBucketModal from "../../components/AnalyticsBucketModal";

const formatQualityTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const FILTER_OPTIONS = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
  { id: 'custom', label: 'Custom' }
];

const TelecallerAnalytics = () => {
  const [range, setRange] = useState('today');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedBucket, setSelectedBucket] = useState(null);

  const { data: analytics, isLoading, isError } = useQuery({
    queryKey: ["telecallerAnalytics", range, startDate, endDate],
    queryFn: async () => {
      let url = `/api/telecaller/analytics?range=${range}`;
      if (range === 'custom') {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      const res = await api.get(url);
      return res.data;
    },
    keepPreviousData: true
  });

  const { data: bucketDetails, isLoading: bucketLoading } = useQuery({
    queryKey: ["telecallerAnalyticsBucket", selectedBucket?.start, selectedBucket?.end],
    queryFn: async () => {
      if (!selectedBucket) return null;
      const res = await api.get(`/api/telecaller/analytics/bucket`, {
        params: {
          start: selectedBucket.start,
          end: selectedBucket.end,
          label: selectedBucket.label
        }
      });
      return res.data;
    },
    enabled: !!selectedBucket
  });

  const handleBarClick = (data) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const clickedData = data.activePayload[0].payload;
      setSelectedBucket(clickedData);
    }
  };

  const summary = analytics?.summary || {};
  const bars = analytics?.bars || [];

  const summaryCards = useMemo(() => [
    { title: "Total Assigned Leads", value: summary.totalAssignedLeads || 0, icon: <Users size={20} className="text-blue-500" /> },
    { title: "BOT Leads", value: summary.botLeads || 0, icon: <Target size={20} className="text-indigo-500" /> },
    { title: "Own Campaign Leads", value: summary.directLeads || 0, icon: <Activity size={20} className="text-purple-500" /> },
    { title: "Contacted Leads", value: summary.contactedLeads || 0, icon: <PhoneCall size={20} className="text-emerald-500" /> },
    { title: "Calls Synced", value: summary.callsSynced || 0, icon: <PhoneCall size={20} className="text-amber-500" /> },
    { title: "Average Quality Time", value: formatQualityTime(summary.averageQualityTimeSeconds), icon: <Clock size={20} className="text-teal-500" /> },
    { title: "Ready to KYC Leads", value: summary.readyToKycLeads || 0, icon: <CheckCircle2 size={20} className="text-green-500" /> },
    { title: "Follow-ups", value: summary.followUps || 0, icon: <AlertCircle size={20} className="text-orange-500" /> },
    { title: "Closed Leads", value: summary.closedLeads || 0, icon: <CheckCircle2 size={20} className="text-rose-500" /> },
    { title: "Pending Leads", value: summary.pendingLeads || 0, icon: <Clock size={20} className="text-slate-500" /> },
    { title: "Conversion Rate", value: `${summary.conversionRate || 0}%`, icon: <BarChart3 size={20} className="text-indigo-500" /> },
  ], [summary]);

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
      
      {/* Header & Filters */}
      <div className="shrink-0 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="text-indigo-500" /> My Analytics
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Track your leads, calls, and performance securely.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-[#1e1e2f] p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f.id}
              onClick={() => setRange(f.id)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200",
                range === f.id 
                  ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/20" 
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              {f.label}
            </button>
          ))}
          
          {range === 'custom' && (
            <div className="flex items-center gap-2 ml-auto">
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-[#151521] border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500"
              />
              <span className="text-slate-400">-</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-[#151521] border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500"
              />
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={40} className="animate-spin text-indigo-500" />
        </div>
      ) : isError ? (
        <div className="flex-1 flex items-center justify-center bg-white dark:bg-[#1e1e2f] rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="text-center">
            <p className="text-red-500 font-medium">Failed to load analytics data.</p>
            <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">Retry</button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pb-6 pr-2">
          
          {/* Interactive Chart */}
          <div className="bg-white dark:bg-[#1e1e2f] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="mb-6 flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Leads Activity Graph</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Total leads aggregated by time buckets. Click any bar for details.</p>
              </div>
            </div>

            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={bars} 
                  margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                  onClick={handleBarClick}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} 
                    axisLine={false} 
                    tickLine={false}
                    dy={15}
                  />
                  <YAxis 
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} 
                    axisLine={false} 
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: '1px solid #e2e8f0', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                      fontWeight: 600,
                      padding: '12px'
                    }}
                    labelStyle={{ color: '#64748b', marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    itemStyle={{ color: '#4f46e5', fontWeight: 700 }}
                    formatter={(value) => [`${value} Leads`, 'Total Generated']}
                  />
                  <Bar 
                    dataKey="totalLeads" 
                    radius={[6, 6, 0, 0]} 
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    maxBarSize={60}
                  >
                    {bars.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="#6366f1" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500 font-medium">
              <div className="w-3 h-3 rounded bg-indigo-500"></div> Total Generated Leads
            </div>
          </div>

          {/* Summary Cards */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-4 flex items-center gap-2">
              <Activity className="text-indigo-500" /> Basic Analytics
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {summaryCards.map((card, idx) => (
                <div key={idx} className="bg-white dark:bg-[#1e1e2f] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider line-clamp-2 leading-tight">
                      {card.title}
                    </p>
                    <div className="p-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-md shrink-0">
                      {card.icon}
                    </div>
                  </div>
                  <p className="text-xl font-black text-slate-800 dark:text-white tracking-tight truncate">
                    {card.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <AnalyticsBucketModal 
        isOpen={!!selectedBucket}
        onClose={() => setSelectedBucket(null)}
        data={bucketLoading ? null : bucketDetails}
      />
    </div>
  );
};

export default TelecallerAnalytics;
