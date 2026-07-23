import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { Target, Bot, Layers, AlertCircle, Calendar as CalendarIcon, Phone, User, Users, PhoneCall, PhoneForwarded, Clock } from 'lucide-react';
import { BarChart, Bar, Line, ComposedChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { CardSkeleton } from '../../components/ui/Skeleton';
import { formatDurationHMS } from '../../utils/formatters';

const AdminDashboard = () => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  const [selectedTelecaller, setSelectedTelecaller] = useState('all');

  const [callPulseMonth, setCallPulseMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });
  const [callPulseTelecaller, setCallPulseTelecaller] = useState('all');

  const { data: telecallersData } = useQuery({
    queryKey: ['adminTelecallersList'],
    queryFn: async () => {
      const res = await api.get('/api/telecallers');
      // Extract array safely depending on response wrapper
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    }
  });

  const telecallers = Array.isArray(telecallersData) ? telecallersData : [];

  const { data: leadSourceData, isLoading: isLoadingLeadSource, isError: isErrorLeadSource } = useQuery({
    queryKey: ['adminAnalyticsDaily', selectedMonth],
    queryFn: async () => {
      const res = await api.get(`/api/dashboard/lead-source-daily?month=${selectedMonth}`);
      return res.data;
    }
  });

  const { data: statusUpdatesData, isLoading: isLoadingStatus, isError: isErrorStatus } = useQuery({
    queryKey: ['adminStatusUpdatesDaily', selectedMonth, selectedTelecaller],
    queryFn: async () => {
      const res = await api.get(`/api/dashboard/status-updates-daily?month=${selectedMonth}&telecaller_id=${selectedTelecaller}`);
      return res.data;
    }
  });

  const { data: callPulseData, isLoading: isLoadingCallPulse, isError: isErrorCallPulse } = useQuery({
    queryKey: ['adminCallPulseDaily', callPulseMonth, callPulseTelecaller],
    queryFn: async () => {
      const res = await api.get(`/api/dashboard/callpulse-daily?month=${callPulseMonth}&telecaller_id=${callPulseTelecaller}`);
      return res.data;
    }
  });

  const setMonthOffset = (offsetMonths, setter) => {
    const now = new Date();
    now.setMonth(now.getMonth() + offsetMonths);
    setter(`${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`);
  };

  const formatDuration = (seconds) => {
    return formatDurationHMS(seconds);
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto w-full pb-10">
      
      {/* ---------------- DIRECT LEADS VS BOT LEADS ---------------- */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Dashboard Analytics</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Direct Leads vs Bot Leads daily performance.</p>
          </div>
          
          <div className="flex items-center gap-2 bg-white dark:bg-[#1e1e2f] p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <button 
              onClick={() => setMonthOffset(-1, setSelectedMonth)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Last Month
            </button>
            <button 
              onClick={() => setMonthOffset(0, setSelectedMonth)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Current Month
            </button>
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1"></div>
            <div className="flex items-center gap-2 px-2">
              <CalendarIcon size={14} className="text-slate-400" />
              <input 
                type="month" 
                value={selectedMonth}
                max={`${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        {isErrorLeadSource ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500 bg-white dark:bg-[#1e1e2f] border border-slate-200 dark:border-slate-800 rounded-2xl">
            <AlertCircle size={48} className="text-red-400 mb-4" />
            <p className="text-lg font-medium text-slate-800 dark:text-slate-200">Failed to load lead source analytics.</p>
          </div>
        ) : isLoadingLeadSource ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
            <div className="h-96 bg-white dark:bg-[#1e1e2f] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-[#1e1e2f] rounded-2xl p-5 flex flex-col justify-between border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300 group">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-purple-50 dark:bg-purple-500/10 text-purple-500 group-hover:scale-110 transition-transform">
                    <Target size={20} />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Direct Leads</p>
                </div>
                <p className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight ml-13">
                  {leadSourceData?.totals?.direct_leads || 0}
                </p>
              </div>
              
              <div className="bg-white dark:bg-[#1e1e2f] rounded-2xl p-5 flex flex-col justify-between border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300 group">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 dark:bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
                    <Bot size={20} />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Bot Leads</p>
                </div>
                <p className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight ml-13">
                  {leadSourceData?.totals?.bot_leads || 0}
                </p>
              </div>

              <div className="bg-white dark:bg-[#1e1e2f] rounded-2xl p-5 flex flex-col justify-between border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300 group">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 group-hover:scale-110 transition-transform">
                    <Layers size={20} />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Combined Total</p>
                </div>
                <p className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight ml-13">
                  {leadSourceData?.totals?.total || 0}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1e1e2f] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex-1 flex flex-col min-h-[400px]">
              <div className="mb-6 shrink-0">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Direct Leads vs Bot Leads
                  {leadSourceData?.is_current_month && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-full">
                      In Progress
                    </span>
                  )}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Daily breakdown by first activity date for {selectedMonth}</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Lead dates are based on first available status timestamp. created_at may represent import date.</p>
              </div>
              
              <div className="flex-1 w-full relative h-80 min-h-[320px]">
                {(!leadSourceData?.days || leadSourceData.days.length === 0) ? (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                    No data available for this month
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={leadSourceData.days} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                      <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip 
                        cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                        contentStyle={{ borderRadius: '12px', border: '1px solid rgba(148, 163, 184, 0.2)', backgroundColor: 'rgba(30, 30, 47, 0.95)', color: '#fff', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', backdropFilter: 'blur(8px)' }}
                        formatter={(value, name) => [value, name === 'direct_leads' ? 'Direct Leads' : 'Bot Leads']}
                        labelFormatter={(label) => `Day ${label}, ${selectedMonth}`}
                      />
                      <Legend iconType="circle" formatter={(value) => <span className="text-slate-600 dark:text-slate-300 text-sm font-medium">{value === 'direct_leads' ? 'Direct Leads' : 'Bot Leads'}</span>} wrapperStyle={{ paddingTop: '20px' }} />
                      <Bar dataKey="direct_leads" stackId="a" fill="#8b5cf6" radius={[0, 0, 4, 4]} maxBarSize={40} animationDuration={1000} />
                      <Bar dataKey="bot_leads" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} animationDuration={1000} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </>
        )}
      </section>

      {/* ---------------- DAILY STATUS UPDATES ---------------- */}
      <section className="space-y-6 pt-6 border-t border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Daily Status Updates</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Status 1, 2, 3, and 4 updates grouped by day.</p>
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-[#1e1e2f] p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <Users size={16} className="text-slate-400 ml-2" />
            <select
              value={selectedTelecaller}
              onChange={(e) => setSelectedTelecaller(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer pr-4 py-1"
            >
              <option value="all">All Telecallers</option>
              {telecallers.map(t => (
                <option key={t.id} value={t.id}>{t.telecaller_name || t.name || t.id}</option>
              ))}
            </select>
          </div>
        </div>

        {isErrorStatus ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500 bg-white dark:bg-[#1e1e2f] border border-slate-200 dark:border-slate-800 rounded-2xl">
            <AlertCircle size={48} className="text-red-400 mb-4" />
            <p className="text-lg font-medium text-slate-800 dark:text-slate-200">Failed to load status updates analytics.</p>
          </div>
        ) : isLoadingStatus ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
            <div className="h-96 bg-white dark:bg-[#1e1e2f] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: 'Total S1', value: statusUpdatesData?.totals?.s1 || 0, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
                { label: 'Total S2', value: statusUpdatesData?.totals?.s2 || 0, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
                { label: 'Total S3', value: statusUpdatesData?.totals?.s3 || 0, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
                { label: 'Total S4', value: statusUpdatesData?.totals?.s4 || 0, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10' },
                { label: 'Overall Total', value: statusUpdatesData?.totals?.total || 0, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
              ].map((stat, i) => (
                <div key={i} className="bg-white dark:bg-[#1e1e2f] rounded-2xl p-4 flex flex-col justify-between border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${stat.bg} ${stat.color}`}>
                      <Target size={16} />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold">{stat.label}</p>
                  </div>
                  <p className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight ml-10">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="bg-white dark:bg-[#1e1e2f] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex-1 flex flex-col min-h-[400px]">
              <div className="mb-6 shrink-0">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Daily Status Updates
                  {statusUpdatesData?.is_current_month && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-full">
                      In Progress
                    </span>
                  )}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Updates breakdown for {selectedMonth}</p>
              </div>
              
              <div className="flex-1 w-full relative h-80 min-h-[320px]">
                {(!statusUpdatesData?.days || statusUpdatesData.days.length === 0) ? (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                    No data available for this month
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={statusUpdatesData.days} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                      <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip 
                        cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                        contentStyle={{ borderRadius: '12px', border: '1px solid rgba(148, 163, 184, 0.2)', backgroundColor: 'rgba(30, 30, 47, 0.95)', color: '#fff', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', backdropFilter: 'blur(8px)' }}
                        formatter={(value, name) => {
                          const labels = { s1: 'S1', s2: 'S2', s3: 'S3', s4: 'S4' };
                          return [value, labels[name] || name];
                        }}
                        labelFormatter={(label) => `Day ${label}, ${selectedMonth}`}
                      />
                      <Legend 
                        iconType="circle" 
                        formatter={(value) => {
                          const labels = { s1: 'S1', s2: 'S2', s3: 'S3', s4: 'S4' };
                          return <span className="text-slate-600 dark:text-slate-300 text-sm font-medium">{labels[value] || value}</span>;
                        }} 
                        wrapperStyle={{ paddingTop: '20px' }} 
                      />
                      <Bar dataKey="s1" stackId="a" fill="#f59e0b" animationDuration={1000} />
                      <Bar dataKey="s2" stackId="a" fill="#10b981" animationDuration={1000} />
                      <Bar dataKey="s3" stackId="a" fill="#3b82f6" animationDuration={1000} />
                      <Bar dataKey="s4" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} animationDuration={1000} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </>
        )}
      </section>

      {/* ---------------- DAILY CALLPULSE ACTIVITY ---------------- */}
      <section className="space-y-6 pt-6 border-t border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Daily CallPulse Activity</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Dialed calls, connected calls, and duration.</p>
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-[#1e1e2f] p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <button 
              onClick={() => setMonthOffset(-1, setCallPulseMonth)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Last Month
            </button>
            <button 
              onClick={() => setMonthOffset(0, setCallPulseMonth)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Current Month
            </button>
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1"></div>
            <div className="flex items-center gap-2 px-2">
              <CalendarIcon size={14} className="text-slate-400" />
              <input 
                type="month" 
                value={callPulseMonth}
                max={`${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`}
                onChange={(e) => setCallPulseMonth(e.target.value)}
                className="bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
              />
            </div>
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1"></div>
            <div className="flex items-center gap-2 px-2 pr-1">
              <Users size={14} className="text-slate-400" />
              <select
                value={callPulseTelecaller}
                onChange={(e) => setCallPulseTelecaller(e.target.value)}
                className="bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer pr-4 py-1"
              >
                <option value="all">All Telecallers</option>
                {telecallers.map(t => (
                  <option key={t.id} value={t.id}>{t.telecaller_name || t.name || t.id}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {isErrorCallPulse ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500 bg-white dark:bg-[#1e1e2f] border border-slate-200 dark:border-slate-800 rounded-2xl">
            <AlertCircle size={48} className="text-red-400 mb-4" />
            <p className="text-lg font-medium text-slate-800 dark:text-slate-200">Failed to load CallPulse analytics.</p>
          </div>
        ) : isLoadingCallPulse ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
            <div className="h-96 bg-white dark:bg-[#1e1e2f] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-[#1e1e2f] rounded-2xl p-5 flex flex-col justify-between border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300 group">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 dark:bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
                    <PhoneForwarded size={20} />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Dialed</p>
                </div>
                <p className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight ml-13">
                  {callPulseData?.totals?.total_dialed || 0}
                </p>
              </div>

              <div className="bg-white dark:bg-[#1e1e2f] rounded-2xl p-5 flex flex-col justify-between border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300 group">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform">
                    <PhoneCall size={20} />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Connected</p>
                </div>
                <p className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight ml-13">
                  {callPulseData?.totals?.total_connected || 0}
                </p>
              </div>

              <div className="bg-white dark:bg-[#1e1e2f] rounded-2xl p-5 flex flex-col justify-between border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300 group">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-rose-50 dark:bg-rose-500/10 text-rose-500 group-hover:scale-110 transition-transform">
                    <Clock size={20} />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Duration</p>
                </div>
                <p className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight ml-13">
                  {formatDuration(callPulseData?.totals?.total_duration_seconds)}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1e1e2f] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex-1 flex flex-col min-h-[400px]">
              <div className="mb-6 shrink-0">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  CallPulse Activity
                  {callPulseData?.is_current_month && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-full">
                      In Progress
                    </span>
                  )}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Activity breakdown for {callPulseMonth}</p>
              </div>
              
              <div className="flex-1 w-full relative h-80 min-h-[320px]">
                {(!callPulseData?.days || callPulseData.days.length === 0) ? (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                    No data available for this month
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <ComposedChart data={callPulseData.days} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                      <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                      <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip 
                        cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                        contentStyle={{ borderRadius: '12px', border: '1px solid rgba(148, 163, 184, 0.2)', backgroundColor: 'rgba(30, 30, 47, 0.95)', color: '#fff', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', backdropFilter: 'blur(8px)' }}
                        formatter={(value, name, props) => {
                          if (name === 'total_dialed') return [value, 'Total Dialed'];
                          if (name === 'total_connected') return [value, 'Total Connected'];
                          if (name === 'total_duration_minutes') {
                            const totalSecs = props.payload.total_duration_seconds || 0;
                            return [formatDurationHMS(totalSecs), 'Total Duration'];
                          }
                          return [value, name];
                        }}
                        labelFormatter={(label) => `Day ${label}, ${callPulseMonth}`}
                      />
                      <Legend 
                        iconType="circle" 
                        formatter={(value) => {
                          const labels = { 
                            total_dialed: 'Total Dialed', 
                            total_connected: 'Total Connected', 
                            total_duration_minutes: 'Duration (Min)' 
                          };
                          return <span className="text-slate-600 dark:text-slate-300 text-sm font-medium">{labels[value] || value}</span>;
                        }} 
                        wrapperStyle={{ paddingTop: '20px' }} 
                      />
                      <Bar yAxisId="left" dataKey="total_dialed" fill="#818cf8" radius={[4, 4, 0, 0]} barSize={20} animationDuration={1000} />
                      <Bar yAxisId="left" dataKey="total_connected" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} animationDuration={1000} />
                      <Line yAxisId="right" type="monotone" dataKey="total_duration_minutes" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} animationDuration={1000} />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </>
        )}
      </section>

    </div>
  );
};

export default AdminDashboard;
