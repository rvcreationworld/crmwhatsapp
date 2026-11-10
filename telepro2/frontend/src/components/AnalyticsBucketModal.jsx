import { X, Phone, User, Clock, PhoneCall, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "./ui/Skeleton";

const formatQualityTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const AnalyticsBucketModal = ({ isOpen, onClose, data }) => {
  if (!isOpen || !data) return null;

  const { bucket, details, statusBreakdown, recentCalls } = data;

  return (
    <div 
      className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm z-50 transition-opacity flex items-center justify-center p-4 sm:p-6" 
      onClick={onClose}
    >
      <div 
        className="bg-slate-50 dark:bg-[#151521] w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 bg-white dark:bg-[#1e1e2f] border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Detailed Breakdown</h2>
            <p className="text-indigo-600 dark:text-indigo-400 text-sm mt-0.5 font-bold tracking-wide uppercase">{bucket?.label}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 custom-scrollbar space-y-8">
          
          {/* Summary Metrics Grid */}
          <section>
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Summary Metrics</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-[#1e1e2f] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Total Leads</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{details?.totalLeads}</p>
                <div className="flex gap-2 mt-2 text-[10px] font-medium text-slate-400">
                  <span>BOT: {details?.botLeads}</span>
                  <span>DIR: {details?.directLeads}</span>
                </div>
              </div>
              <div className="bg-white dark:bg-[#1e1e2f] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Contacted Leads</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{details?.contactedLeads}</p>
              </div>
              <div className="bg-white dark:bg-[#1e1e2f] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Total Calls</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{details?.totalCalls}</p>
                <div className="flex gap-2 mt-2 text-[10px] font-medium text-slate-400">
                  <span className="text-emerald-500">Conn: {details?.connectedCalls}</span>
                  <span className="text-rose-500">Miss: {details?.missedRejectedCalls}</span>
                </div>
              </div>
              <div className="bg-white dark:bg-[#1e1e2f] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Quality Time</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{formatQualityTime(details?.averageQualityTimeSeconds)}</p>
                <p className="mt-2 text-[10px] font-medium text-slate-400">Avg per connected call</p>
              </div>
            </div>
          </section>

          {/* Status Bifurcation */}
          <section>
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Status Bifurcation</h3>
            {statusBreakdown && statusBreakdown.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {statusBreakdown.map((s, idx) => (
                  <div key={idx} className="flex items-center bg-white dark:bg-[#1e1e2f] border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
                    <div className="px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50">
                      {s.status}
                    </div>
                    <div className="px-3 py-2 text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-500/10 border-l border-slate-200 dark:border-slate-800">
                      {s.count}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-white dark:bg-[#1e1e2f] rounded-xl border border-slate-200 dark:border-slate-800 border-dashed text-slate-400 text-sm text-center">
                No statuses found in this period.
              </div>
            )}
          </section>

          {/* Recent Calls */}
          <section>
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex justify-between items-center">
              <span>Recent Calls</span>
              <span className="text-[10px] text-slate-400 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">Top 20</span>
            </h3>
            
            {recentCalls && recentCalls.length > 0 ? (
              <div className="bg-white dark:bg-[#1e1e2f] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left whitespace-nowrap">
                    <thead className="bg-slate-50 dark:bg-[#1a1a24] text-xs uppercase text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Lead</th>
                        <th className="px-4 py-3">Number</th>
                        <th className="px-4 py-3">Call Type</th>
                        <th className="px-4 py-3">Duration</th>
                        <th className="px-4 py-3">Time</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm text-slate-700 dark:text-slate-300 divide-y divide-slate-100 dark:divide-slate-800">
                      {recentCalls.map((call, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-4 py-3 font-medium flex items-center gap-2">
                            <span className="w-6 h-6 rounded bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs">
                              {call.leadType === 'BOT' ? 'B' : 'D'}
                            </span>
                            {call.leadName}
                          </td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-xs">{call.number}</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "px-2 py-1 rounded text-[10px] font-bold tracking-wider",
                              call.callType === 'INCOMING' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" :
                              call.callType === 'OUTGOING' ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" :
                              "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
                            )}>
                              {call.callType}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">
                            {call.durationSeconds > 0 ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">{formatQualityTime(call.durationSeconds)}</span>
                            ) : (
                              <span className="text-rose-500 dark:text-rose-400 font-medium">00:00</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                            {new Date(call.callStartedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-8 bg-white dark:bg-[#1e1e2f] rounded-xl border border-slate-200 dark:border-slate-800 border-dashed flex flex-col items-center justify-center text-slate-400">
                <PhoneCall size={32} className="mb-3 opacity-20" />
                <p className="text-sm font-medium">No calls logged in this period.</p>
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
};

export default AnalyticsBucketModal;
