import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/axios";
import { PhoneCall, Clock, PhoneMissed, PhoneOff, ArrowUpRight, ArrowDownLeft, Target, Bot } from "lucide-react";
import { TableSkeleton, cn } from "../../components/ui/Skeleton";
import { formatDurationHMS } from "../../utils/formatters";

const CallPulseStats = () => {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);

  const [filterMode, setFilterMode] = useState("Today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const applyPreset = (mode) => {
    setFilterMode(mode);
    setPage(1);
    const d = new Date();
    const todayStr = d.toISOString().split('T')[0];
    
    if (mode === "Today") {
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (mode === "Yesterday") {
      const y = new Date(d);
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      setFromDate(yStr);
      setToDate(yStr);
    } else if (mode === "Weekly") {
      const w = new Date(d);
      w.setDate(w.getDate() - w.getDay() + (w.getDay() === 0 ? -6 : 1));
      setFromDate(w.toISOString().split('T')[0]);
      setToDate(todayStr);
    } else if (mode === "Monthly") {
      const m = new Date(d.getFullYear(), d.getMonth(), 1);
      setFromDate(m.toISOString().split('T')[0]);
      setToDate(todayStr);
    }
  };

  const handleCustomApply = () => {
    if (customFrom && customTo) {
      setFromDate(customFrom);
      setToDate(customTo);
      setPage(1);
    }
  };

  // Set default dates to today
  useEffect(() => {
    applyPreset("Today");
  }, []);

  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ["callpulseTelecallerSummary", fromDate, toDate],
    queryFn: async () => {
      let url = `/api/callpulse/telecaller/summary?fromDate=${fromDate}&toDate=${toDate}`;
      const res = await api.get(url);
      return res.data;
    },
    enabled: !!fromDate && !!toDate
  });

  const { data: logsData, isLoading: isLogsLoading } = useQuery({
    queryKey: ["callpulseTelecallerLogs", fromDate, toDate, page],
    queryFn: async () => {
      let url = `/api/callpulse/telecaller/logs?page=${page}&limit=50&fromDate=${fromDate}&toDate=${toDate}`;
      const res = await api.get(url);
      return res.data;
    },
    enabled: !!fromDate && !!toDate,
    keepPreviousData: true
  });

  const formatDuration = (seconds) => {
    return formatDurationHMS(seconds);
  };

  const mySummary = summary && summary.length > 0 ? summary[0] : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <PhoneCall className="text-indigo-500" /> My CallPulse Stats
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Review your call logs and analytics.</p>
        </div>
      </div>

      {/* Date Filters & Mode Switches */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {["Today", "Yesterday", "Weekly", "Monthly", "Custom"].map(mode => (
            <button
              key={mode}
              onClick={() => {
                if (mode !== "Custom") applyPreset(mode);
                else setFilterMode("Custom");
              }}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border",
                filterMode === mode 
                  ? "bg-indigo-500 text-white border-indigo-500 shadow-sm" 
                  : "bg-white dark:bg-[#1e1e2f] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
              )}
            >
              {mode}
            </button>
          ))}
          
          {filterMode === "Custom" && (
            <div className="flex items-center gap-2 ml-2 animate-in fade-in zoom-in duration-200">
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="px-2 py-1 bg-white dark:bg-[#1e1e2f] border border-slate-200 dark:border-slate-700 rounded-md text-xs dark:text-white" />
              <span className="text-slate-400 text-xs">to</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="px-2 py-1 bg-white dark:bg-[#1e1e2f] border border-slate-200 dark:border-slate-700 rounded-md text-xs dark:text-white" />
              <button onClick={handleCustomApply} className="px-3 py-1 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 text-xs font-semibold rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors">Apply</button>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {mySummary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          <div className="bg-white dark:bg-[#1e1e2f] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 text-indigo-500 mb-2">
              <PhoneCall size={20} />
              <h3 className="font-semibold text-slate-700 dark:text-slate-300">Total Calls</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{mySummary.total_calls}</p>
          </div>
          <div className="bg-white dark:bg-[#1e1e2f] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 text-emerald-500 mb-2">
              <Clock size={20} />
              <h3 className="font-semibold text-slate-700 dark:text-slate-300">Total Duration</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{formatDuration(mySummary.total_duration)}</p>
          </div>
          <div className="bg-white dark:bg-[#1e1e2f] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 text-red-500 mb-2">
              <PhoneMissed size={20} />
              <h3 className="font-semibold text-slate-700 dark:text-slate-300">Missed/Rejected</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {Number(mySummary.missed_calls) + Number(mySummary.rejected_calls)}
            </p>
          </div>
          <div className="bg-white dark:bg-[#1e1e2f] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 text-blue-500 mb-2">
              <Target size={20} />
              <h3 className="font-semibold text-slate-700 dark:text-slate-300">Direct / Bot</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {mySummary.direct_lead_calls} / {mySummary.bot_lead_calls}
            </p>
          </div>
        </div>
      )}

      {/* Logs Table */}
      <div className="bg-white dark:bg-[#1e1e2f] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col flex-1 overflow-hidden">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="sticky top-0 z-10 bg-slate-50/90 dark:bg-[#151521]/90 backdrop-blur-md shadow-sm">
              <tr className="text-slate-600 dark:text-slate-300 text-sm font-semibold">
                <th className="p-4 border-b border-slate-200 dark:border-slate-700">Lead Name</th>
                <th className="p-4 border-b border-slate-200 dark:border-slate-700">Number</th>
                <th className="p-4 border-b border-slate-200 dark:border-slate-700">Type</th>
                <th className="p-4 border-b border-slate-200 dark:border-slate-700">Call Type</th>
                <th className="p-4 border-b border-slate-200 dark:border-slate-700">Duration</th>
                <th className="p-4 border-b border-slate-200 dark:border-slate-700">Time</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {isLogsLoading ? (
                <tr>
                  <td colSpan="6" className="p-4 text-center text-slate-500">Loading call logs...</td>
                </tr>
              ) : logsData?.data?.length > 0 ? (
                logsData.data.map(log => (
                  <tr key={log.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 font-medium text-slate-900 dark:text-white">
                      <div className="flex flex-col gap-0.5">
                        {log.lead_name && log.lead_name !== "Unknown" ? (
                          <span>{log.lead_name}</span>
                        ) : (
                          <span className="text-slate-500 italic">Unknown</span>
                        )}
                        {(!log.lead_name || log.lead_name === "Unknown") && (
                          <span className="text-xs text-slate-400 font-normal">
                            {log.lead_contact || log.dialed_number || log.normalized_number || "Unknown"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">{log.dialed_number}</td>
                    <td className="p-4">
                      {log.lead_type === 'BOT' ? (
                        <span className="flex items-center gap-1 text-slate-500"><Bot size={14}/> Bot</span>
                      ) : log.lead_type === 'FREE' ? (
                        <span className="flex items-center gap-1 text-emerald-500"><Hash size={14}/> Free Lead</span>
                      ) : (
                        <span className="flex items-center gap-1 text-purple-500"><Target size={14}/> Direct</span>
                      )}
                    </td>
                    <td className="p-4">
                      {log.call_type === 'OUTGOING' && <span className="flex items-center gap-1 text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md w-fit"><ArrowUpRight size={14}/> Outgoing</span>}
                      {log.call_type === 'INCOMING' && <span className="flex items-center gap-1 text-blue-500 bg-blue-500/10 px-2 py-1 rounded-md w-fit"><ArrowDownLeft size={14}/> Incoming</span>}
                      {log.call_type === 'MISSED' && <span className="flex items-center gap-1 text-red-500 bg-red-500/10 px-2 py-1 rounded-md w-fit"><PhoneMissed size={14}/> Missed</span>}
                      {log.call_type === 'REJECTED' && <span className="flex items-center gap-1 text-orange-500 bg-orange-500/10 px-2 py-1 rounded-md w-fit"><PhoneOff size={14}/> Rejected</span>}
                      {(!log.call_type || log.call_type === 'UNKNOWN') && <span className="flex items-center gap-1 text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md w-fit"><PhoneCall size={14}/> Unknown</span>}
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-400 font-medium">
                      {formatDuration(log.duration_seconds)}
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">
                      {new Date(log.call_started_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">No call logs found for selected dates.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {logsData?.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151521] shrink-0">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Showing page <span className="font-semibold text-slate-900 dark:text-white">{page}</span> of <span className="font-semibold text-slate-900 dark:text-white">{logsData.totalPages}</span>
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(logsData.totalPages, p + 1))}
                disabled={page === logsData.totalPages}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallPulseStats;
