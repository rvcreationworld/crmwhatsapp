import { useQuery } from "@tanstack/react-query";
import api from "../api/axios";
import { PhoneCall, ArrowUpRight, ArrowDownLeft, PhoneMissed, PhoneOff, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "./ui/Skeleton";

export const LeadCallHistory = ({ leadId, leadType, minimumDuration = 15 }) => {
  const { data: logs, isLoading, isError } = useQuery({
    queryKey: ["leadCallHistory", leadId, leadType],
    queryFn: async () => {
      const res = await api.get(`/api/callpulse/lead-history?leadId=${leadId}&leadType=${leadType}`);
      return res.data;
    },
    enabled: !!leadId && !!leadType
  });

  const formatDuration = (seconds) => {
    if (!seconds) return "0s";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  if (isLoading) {
    return <div className="text-sm text-slate-500 py-4 text-center">Loading call history...</div>;
  }

  if (isError || !logs) {
    return <div className="text-sm text-red-500 py-4 text-center">Failed to load call history.</div>;
  }

  const totalCalls = logs.length;
  const totalDuration = logs.reduce((acc, log) => acc + log.duration_seconds, 0);

  return (
    <div className="space-y-4">
      {totalCalls > 0 ? (
        <div className="flex gap-4 p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl border border-indigo-100 dark:border-indigo-500/20">
          <div className="flex-1">
            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">Total Calls</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalCalls}</p>
          </div>
          <div className="w-px bg-indigo-200 dark:bg-indigo-500/30" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">Duration</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatDuration(totalDuration)}</p>
          </div>
        </div>
      ) : (
        <div className="text-center p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
          <PhoneCall size={24} className="mx-auto text-slate-400 mb-2" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No call history recorded.</p>
        </div>
      )}

      {logs.length > 0 && (
        <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
          {logs.map(log => {
            const isConnected = log.call_type !== 'MISSED' && log.call_type !== 'REJECTED';
            const isValidForStatus = isConnected && log.duration_seconds >= minimumDuration;
            const isTooShort = isConnected && log.duration_seconds > 0 && log.duration_seconds < minimumDuration;

            return (
              <div key={log.id} className={cn(
                "flex items-center justify-between p-3 border rounded-lg shadow-sm transition-all relative overflow-hidden",
                isValidForStatus ? "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-500/5 dark:border-emerald-500/20" : 
                isTooShort ? "bg-rose-50/50 border-rose-200 dark:bg-rose-500/5 dark:border-rose-500/20" :
                "bg-white dark:bg-[#151521] border-slate-200 dark:border-slate-800"
              )}>
                {/* Side accent border */}
                {isValidForStatus && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />}
                {isTooShort && <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500" />}

                <div className="flex items-center gap-3 pl-2">
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    {log.call_type === 'OUTGOING' && <ArrowUpRight size={14} className="text-emerald-500" />}
                    {log.call_type === 'INCOMING' && <ArrowDownLeft size={14} className="text-blue-500" />}
                    {log.call_type === 'MISSED' && <PhoneMissed size={14} className="text-red-500" />}
                    {log.call_type === 'REJECTED' && <PhoneOff size={14} className="text-orange-500" />}
                    {(!log.call_type || log.call_type === 'UNKNOWN') && <PhoneCall size={14} className="text-slate-500" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-900 dark:text-white capitalize">
                        {log.call_type?.toLowerCase()}
                      </p>
                      {isValidForStatus && <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"><CheckCircle2 size={10} /> Valid</span>}
                      {isTooShort && <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"><AlertCircle size={10} /> Too Short</span>}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {new Date(log.call_started_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  </div>
                </div>
                <div className={cn(
                  "flex items-center gap-1.5 text-sm font-bold px-2.5 py-1 rounded-md shrink-0",
                  isValidForStatus ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" :
                  isTooShort ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400" :
                  "text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800"
                )}>
                  <Clock size={12} className={isValidForStatus ? "text-emerald-500" : isTooShort ? "text-rose-500" : "text-slate-400"} />
                  {formatDuration(log.duration_seconds)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
