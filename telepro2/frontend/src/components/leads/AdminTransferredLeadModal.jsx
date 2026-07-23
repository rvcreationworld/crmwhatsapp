import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/axios";
import { Loader2, X, Phone, User, Clock, Building2, UserCircle2, ArrowRightLeft } from "lucide-react";
import { cn } from "../../components/ui/Skeleton";

const formatDurationHMS = (seconds) => {
  if (!seconds) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const STATUS_COLORS = {
  "None": "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  "Ringing": "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300",
  "Call Back": "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300",
  "Info Given": "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-300",
  "Wrong No": "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  "Int Angel": "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300",
  "Think&LMK": "bg-pink-100 text-pink-800 dark:bg-pink-500/20 dark:text-pink-300",
  "Not Int": "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300",
  "RdyKYC": "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
};

const AdminTransferredLeadModal = ({ isOpen, onClose, leadId }) => {
  const { data: detailsData, isLoading, isError } = useQuery({
    queryKey: ["adminTransferredLeadDetails", leadId],
    queryFn: async () => {
      const res = await api.get(`/api/admin/transferred-leads/${leadId}/details`);
      return res.data;
    },
    enabled: !!leadId && isOpen
  });

  if (!isOpen) return null;

  const lead = detailsData?.lead;
  const history = detailsData?.status4History || [];
  const callLogs = detailsData?.callLogs || [];

  return (
    <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1e1e2f] rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-[#151521]/50 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Transferred Lead Details
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">TRANSFERRED</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">ID: {leadId}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
              <p className="text-slate-500 font-medium">Loading lead details...</p>
            </div>
          ) : isError ? (
            <div className="text-center py-20 text-red-500 font-medium">
              Failed to load details.
            </div>
          ) : (
            <div className="space-y-8">
              
              {/* Profile Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-[#151521] rounded-xl p-5 border border-slate-200 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                    <User size={16} /> Basic Details
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Name:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{lead?.lead_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Contact:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{lead?.lead_contact}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Transfer Status:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{lead?.transfer_status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Transfer Reason:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{lead?.transfer_reason}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Transferred At:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {new Date(lead?.transferred_at || lead?.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-[#151521] rounded-xl p-5 border border-slate-200 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                    <ArrowRightLeft size={16} /> Transfer Details
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center bg-white dark:bg-slate-800/50 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex flex-col">
                        <span className="text-xs text-slate-500">From</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{lead?.previous_telecaller_name || 'N/A'}</span>
                      </div>
                      <ArrowRightLeft size={14} className="text-slate-400" />
                      <div className="flex flex-col text-right">
                        <span className="text-xs text-slate-500">To</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{lead?.current_telecaller_name || 'Unassigned'}</span>
                      </div>
                    </div>
                    
                    {lead?.status1 && (
                      <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg border border-indigo-100 dark:border-indigo-500/20">
                        <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">Original Status</p>
                        <div className="flex gap-2">
                          <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold", STATUS_COLORS[lead.status1] || STATUS_COLORS["None"])}>{lead.status1}</span>
                          <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold", STATUS_COLORS[lead.status2] || STATUS_COLORS["None"])}>{lead.status2}</span>
                          <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold", STATUS_COLORS[lead.status3] || STATUS_COLORS["None"])}>{lead.status3}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status 4 Timeline */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Status 4 History</h3>
                {history.length === 0 ? (
                  <div className="text-sm text-slate-500 dark:text-slate-400 py-4 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 border-dashed text-center">
                    No Status 4 updates yet.
                  </div>
                ) : (
                  <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 dark:before:via-slate-700 before:to-transparent">
                    {history.map((h, i) => (
                      <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-[#1e1e2f] bg-indigo-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                          <User size={16} />
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#151521] shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <span className={cn("px-2 py-0.5 rounded text-xs font-bold", STATUS_COLORS[h.status4] || STATUS_COLORS["None"])}>
                              {h.status4}
                            </span>
                            <time className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              {new Date(h.created_at).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </time>
                          </div>
                          {h.status4_remark && (
                            <p className="text-sm text-slate-600 dark:text-slate-300 italic mb-2">"{h.status4_remark}"</p>
                          )}
                          <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Updated by: {h.telecaller_name || `ID ${h.telecaller_id}`}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* CallPulse Logs */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">CallPulse Call Logs</h3>
                {callLogs.length === 0 ? (
                  <div className="text-sm text-slate-500 dark:text-slate-400 py-4 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 border-dashed text-center">
                    No CallPulse logs found for this lead.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#151521]">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                        <tr>
                          <th className="p-3 font-semibold border-b dark:border-slate-700">Date & Time</th>
                          <th className="p-3 font-semibold border-b dark:border-slate-700">Type</th>
                          <th className="p-3 font-semibold border-b dark:border-slate-700">Dialed Number</th>
                          <th className="p-3 font-semibold border-b dark:border-slate-700">Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        {callLogs.map((log) => (
                          <tr key={log.id} className="border-b dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/20">
                            <td className="p-3 text-slate-700 dark:text-slate-300 font-medium">
                              {new Date(log.call_started_at).toLocaleString()}
                            </td>
                            <td className="p-3">
                              <span className={cn(
                                "px-2 py-1 rounded text-xs font-bold",
                                log.call_type === 'OUTGOING' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                              )}>
                                {log.call_type}
                              </span>
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-400 font-mono">{log.dialed_number}</td>
                            <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                              {formatDurationHMS(log.duration_seconds)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminTransferredLeadModal;
