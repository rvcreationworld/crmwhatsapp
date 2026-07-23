import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/axios";
import { PhoneCall, Clock, PhoneMissed, PhoneOff, User, ArrowUpRight, ArrowDownLeft, Target, Bot, ChevronLeft, Calendar, UserCheck, Hash } from "lucide-react";
import { TableSkeleton, cn } from "../../components/ui/Skeleton";
import toast from "react-hot-toast";

const StatusCard = ({ title, count }) => (
  <div className="bg-slate-50 dark:bg-[#151521] border border-slate-200 dark:border-slate-800 rounded-lg p-3 flex flex-col items-center justify-center min-w-[100px] hover:bg-slate-100 dark:hover:bg-[#1e1e2f] transition-colors">
    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 text-center">{title}</span>
    <span className="text-xl font-bold text-slate-800 dark:text-slate-200">{count || 0}</span>
  </div>
);

const CallPulseDashboard = () => {
  const [filterMode, setFilterMode] = useState("Today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [detailViewMode, setDetailViewMode] = useState("summary"); // 'summary' or 'logs'

  const [activeDateRange, setActiveDateRange] = useState({ start: "", end: "" });
  const [selectedTelecaller, setSelectedTelecaller] = useState(null);
  
  const [callType, setCallType] = useState("All");
  const [leadType, setLeadType] = useState("All");
  const [page, setPage] = useState(1);

  const applyPreset = (mode) => {
    setFilterMode(mode);
    setPage(1);
    
    // For specific start/end date fields in the UI (used by logs API if needed)
    // Actually the new backend handles the preset directly via `period=today` etc.
    // We just pass `period={filterMode.toLowerCase()}` and backend does the IST logic.
    // We only need customFrom and customTo when mode === "Custom"
  };

  useEffect(() => {
    applyPreset("Today");
  }, []);

  const handleCustomApply = () => {
    if (customFrom && customTo) {
      setFilterMode("Custom");
      setPage(1);
    }
  };

  const periodParam = filterMode.toLowerCase().replace(" ", "_");

  // Global Summary (Agents list)
  const { data: agentsSummary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ["callpulseAdminAgentsSummary", periodParam, customFrom, customTo],
    queryFn: async () => {
      let url = `/api/callpulse/admin/agents/summary?period=${periodParam}`;
      if (periodParam === 'custom') {
        url += `&startDate=${customFrom}&endDate=${customTo}`;
      }
      const res = await api.get(url);
      return res.data.data;
    }
  });

  // Specific Agent Details (Status counts and Lead taken counts)
  const { data: agentDetails, isLoading: isDetailsLoading } = useQuery({
    queryKey: ["callpulseAdminAgentDetails", selectedTelecaller?.telecaller_id, periodParam, customFrom, customTo],
    queryFn: async () => {
      if (!selectedTelecaller || !selectedTelecaller.clickable) return null;
      let url = `/api/callpulse/admin/agents/${selectedTelecaller.telecaller_id}/details?period=${periodParam}`;
      if (periodParam === 'custom') {
        url += `&startDate=${customFrom}&endDate=${customTo}`;
      }
      const res = await api.get(url);
      return res.data;
    },
    enabled: !!selectedTelecaller && selectedTelecaller.clickable
  });

  // Agent Logs (Paginated)
  const { data: logsData, isLoading: isLogsLoading } = useQuery({
    queryKey: ["callpulseAdminLogs", selectedTelecaller?.telecaller_id, callType, leadType, page, periodParam, customFrom, customTo],
    queryFn: async () => {
      if (!selectedTelecaller) return null;
      let url = `/api/callpulse/admin/logs?page=${page}&limit=50&telecallerId=${selectedTelecaller.telecaller_id}&period=${periodParam}`;
      if (periodParam === 'custom') {
        url += `&fromDate=${customFrom}&toDate=${customTo}`;
      }
      if (callType !== "All") url += `&callType=${callType}`;
      if (leadType !== "All") url += `&leadType=${leadType}`;
      const res = await api.get(url);
      return res.data;
    },
    enabled: !!selectedTelecaller,
    keepPreviousData: true
  });

  const formatDuration = (seconds) => {
    if (!seconds) return "0s";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const handleTelecallerClick = (tc) => {
    setSelectedTelecaller(tc);
    setDetailViewMode("summary");
    setPage(1);
    setCallType("All");
    setLeadType("All");
  };

  const statusList = [
    "Ringing", "Call Back", "Info Given", "Int Angel", "Wrong No", 
    "Think&LMK", "RdyKYC", "Not Int", "Not Conn"
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-full flex flex-col pb-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between shrink-0">
        <div>
          {selectedTelecaller ? (
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSelectedTelecaller(null)}
                className="p-2 bg-white dark:bg-[#1e1e2f] border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition-colors shadow-sm"
                title="Back to Telecallers"
              >
                <ChevronLeft size={20} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                   {selectedTelecaller.telecaller_name}'s Detailed Analytics
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{selectedTelecaller.tele_mobile}</p>
              </div>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <PhoneCall className="text-indigo-500" /> CallPulse Analytics
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Telecaller performance, lead utilization, and call logs.</p>
            </div>
          )}
        </div>
      </div>

      {/* Date Filters & Mode Switches */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {["Today", "Yesterday", "Current Month", "Past Month", "Custom"].map(mode => (
            <button
              key={mode}
              onClick={() => {
                if (mode !== "Custom") {
                  applyPreset(mode);
                  setSelectedTelecaller(null); // Reset detail view on filter change
                } else {
                  setFilterMode("Custom");
                }
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
              <button onClick={() => {handleCustomApply(); setSelectedTelecaller(null);}} className="px-3 py-1 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 text-xs font-semibold rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors">Apply</button>
            </div>
          )}

          {selectedTelecaller && (
            <>
              <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-2"></div>
              
              <button
                onClick={() => setDetailViewMode("summary")}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border",
                  detailViewMode === "summary"
                    ? "bg-purple-500 text-white border-purple-500 shadow-sm" 
                    : "bg-white dark:bg-[#1e1e2f] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                Status Counts
              </button>

              <button
                onClick={() => setDetailViewMode("logs")}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border flex items-center gap-1.5",
                  detailViewMode === "logs"
                    ? "bg-purple-500 text-white border-purple-500 shadow-sm" 
                    : "bg-white dark:bg-[#1e1e2f] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                <PhoneCall size={12} /> Call Logs
              </button>
            </>
          )}
        </div>
      </div>

      {/* Conditional Rendering based on selectedTelecaller */}
      {!selectedTelecaller ? (
        /* GRID VIEW */
        <div className="flex-1 overflow-y-auto custom-scrollbar pb-4">
          {isSummaryLoading ? (
            <div className="flex items-center justify-center p-10"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>
          ) : (
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
              {agentsSummary?.map(tc => {
                const isClickable = tc.clickable;

                return (
                  <div 
                    key={tc.telecaller_id} 
                    onClick={() => handleTelecallerClick(tc)}
                    title="Click to view details"
                    className="bg-white dark:bg-[#1e1e2f] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm transition-all duration-300 relative overflow-hidden hover:shadow-xl hover:-translate-y-1 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 cursor-pointer group"
                  >
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/5 group-hover:bg-indigo-500/10 rounded-full blur-3xl transition-colors"></div>
                    
                    <div className="flex items-start justify-between mb-4 relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xl border border-indigo-100 dark:border-indigo-500/20">
                          {tc.telecaller_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-indigo-500 transition-colors">{tc.telecaller_name}</h3>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">{tc.tele_mobile}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 relative z-10 mb-3">
                      <div className="bg-slate-50 dark:bg-[#151521] p-2 rounded-lg border border-slate-100 dark:border-slate-800/50 text-center">
                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Total Dial</div>
                        <div className="font-bold text-sm text-slate-800 dark:text-slate-200">{tc.total_dial}</div>
                      </div>
                      <div className="bg-slate-50 dark:bg-[#151521] p-2 rounded-lg border border-slate-100 dark:border-slate-800/50 text-center">
                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center justify-center gap-1"><Hash size={10}/> Unique</div>
                        <div className="font-bold text-sm text-slate-800 dark:text-slate-200">{tc.unique_dial}</div>
                      </div>
                      <div className="bg-slate-50 dark:bg-[#151521] p-2 rounded-lg border border-slate-100 dark:border-slate-800/50 text-center">
                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Duration</div>
                        <div className="font-bold text-xs text-slate-800 dark:text-slate-200 mt-1.5">{formatDuration(tc.total_duration_seconds)}</div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800/50 pt-3 relative z-10">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 text-center">Leads Taken in Period</p>
                      <div className="grid grid-cols-4 gap-1">
                        <div className="text-center" title="Direct Leads">
                          <div className="text-[10px] text-slate-500 font-medium">Direct</div>
                          <div className="font-bold text-sm text-purple-600 dark:text-purple-400">{tc.total_direct_leads_taken}</div>
                        </div>
                        <div className="text-center" title="Free Leads">
                          <div className="text-[10px] text-slate-500 font-medium">Free</div>
                          <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400">{tc.total_free_leads_taken}</div>
                        </div>
                        <div className="text-center" title="Bot/Pool Leads">
                          <div className="text-[10px] text-slate-500 font-medium">Pool</div>
                          <div className="font-bold text-sm text-blue-600 dark:text-blue-400">{tc.total_pool_leads_taken}</div>
                        </div>
                        <div className="text-center" title="Transferred Leads">
                          <div className="text-[10px] text-slate-500 font-medium">Transfer</div>
                          <div className="font-bold text-sm text-amber-600 dark:text-amber-400">{tc.total_transferred_leads_taken}</div>
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* DETAIL VIEW */
        <div className="flex-1 flex flex-col gap-6 min-h-0 animate-in slide-in-from-bottom-4">
          
          {/* Status Counts Blocks */}
          {detailViewMode === "summary" && (
            <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-2 pb-6">
              {isDetailsLoading ? (
                <div className="p-10 text-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div>
              ) : agentDetails?.status_counts ? (
                <>
                {/* Total Leads Summary Block */}
                <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/10 dark:to-[#1e1e2f] rounded-xl border border-indigo-100 dark:border-indigo-800/30 p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-indigo-800 dark:text-indigo-400 mb-4 flex items-center gap-2">
                    <Target size={16} />
                    Total Normal Leads Assigned
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-500 font-medium mb-1">Direct Leads</span>
                      <span className="text-2xl font-bold text-slate-800 dark:text-slate-200">{agentDetails.lead_taken_counts?.direct_leads || 0}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-500 font-medium mb-1">Bot / Pool Leads</span>
                      <span className="text-2xl font-bold text-slate-800 dark:text-slate-200">{agentDetails.lead_taken_counts?.bot_leads || 0}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold mb-1">Total (Direct + Bot)</span>
                      <span className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{agentDetails.lead_taken_counts?.normal_leads || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Status 1 */}
                {agentDetails.status_counts.status1 && (
                  <div className="bg-white dark:bg-[#1e1e2f] rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                      <Target size={16} className="text-indigo-500"/>
                      Status 1 Counts (Direct & Pool)
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {statusList.map(status => (
                        <StatusCard key={status} title={status} count={agentDetails.status_counts.status1[status]} />
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Status 2 */}
                {agentDetails.status_counts.status2 && (
                  <div className="bg-white dark:bg-[#1e1e2f] rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                      <Target size={16} className="text-blue-500"/>
                      Status 2 Counts (Direct & Pool)
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {statusList.map(status => (
                        <StatusCard key={status} title={status} count={agentDetails.status_counts.status2[status]} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Status 3 */}
                {agentDetails.status_counts.status3 && (
                  <div className="bg-white dark:bg-[#1e1e2f] rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                      <Target size={16} className="text-purple-500"/>
                      Status 3 Counts (Direct & Pool)
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {statusList.map(status => (
                        <StatusCard key={status} title={status} count={agentDetails.status_counts.status3[status]} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Free Leads Status 4 */}
                {agentDetails.status_counts.freeStatus4 && (
                  <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-200 dark:border-emerald-800/30 p-4 shadow-sm">
                    <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-400 mb-3 flex items-center gap-2">
                      <Bot size={16} />
                      Free Leads Status 4
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {statusList.map(status => (
                        <StatusCard key={status} title={status} count={agentDetails.status_counts.freeStatus4[status]} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Transferred Leads Status 4 */}
                {agentDetails.status_counts.transferredStatus4 && (
                  <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800/30 p-4 shadow-sm">
                    <h3 className="text-sm font-bold text-amber-800 dark:text-amber-400 mb-3 flex items-center gap-2">
                      <UserCheck size={16} />
                      Transferred Leads Status 4
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {statusList.map(status => (
                        <StatusCard key={status} title={status} count={agentDetails.status_counts.transferredStatus4[status]} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : null}
            </div>
          )}

          {/* Logs Table Filters */}
          {detailViewMode === "logs" && (
            <>
              <div className="flex items-center justify-between shrink-0 bg-white dark:bg-[#1e1e2f] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="font-bold text-slate-800 dark:text-white">Call Logs for {selectedTelecaller.telecaller_name}</h3>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Call Type:</label>
                    <select value={callType} onChange={e => {setCallType(e.target.value); setPage(1);}} className="w-32 px-2 py-1.5 bg-slate-50 dark:bg-[#151521] border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium dark:text-white outline-none">
                      <option value="All">All Calls</option>
                      <option value="OUTGOING">Outgoing</option>
                      <option value="INCOMING">Incoming</option>
                      <option value="MISSED">Missed</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Lead Type:</label>
                    <select value={leadType} onChange={e => {setLeadType(e.target.value); setPage(1);}} className="w-32 px-2 py-1.5 bg-slate-50 dark:bg-[#151521] border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium dark:text-white outline-none">
                      <option value="All">All Leads</option>
                      <option value="BOT">Bot / Pool Leads</option>
                      <option value="DIRECT">Direct Leads</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Logs Table */}
          <div className="bg-white dark:bg-[#1e1e2f] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col flex-1 min-h-[250px] overflow-hidden">
            <div className="overflow-auto flex-1 custom-scrollbar">
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
                            <span className="flex items-center gap-1 text-slate-500"><Bot size={14}/> Bot / Pool</span>
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
                      <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <PhoneCall size={32} className="text-slate-300 dark:text-slate-600" />
                          <p className="text-lg font-medium text-slate-500 dark:text-slate-400">No calls found in this period.</p>
                        </div>
                      </td>
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
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(logsData.totalPages, p + 1))}
                    disabled={page === logsData.totalPages}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
          </>
          )}
        </div>
      )}
    </div>
  );
};

export default CallPulseDashboard;
