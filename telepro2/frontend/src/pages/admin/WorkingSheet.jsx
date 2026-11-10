import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/axios";
import { Search, ChevronLeft, ChevronRight, User, Database, ArrowLeft } from "lucide-react";
import LeadViewToggle from "../../components/leads/LeadViewToggle";
import LeadCardGrid from "../../components/leads/LeadCardGrid";
const WS_LS_KEY = "crm_view_mode_admin_leads";
import { TableSkeleton } from "../../components/ui/Skeleton";
import { cn } from "../../components/ui/Skeleton";
import LeadDetailsModal from "../../components/LeadDetailsModal";
import AdminFreeLeadModal from "../../components/leads/AdminFreeLeadModal";
import AdminTransferredLeadModal from "../../components/leads/AdminTransferredLeadModal";
import CallDot from "../../components/CallDot";

const STATUS_3_COLORS = {
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

const STATUS_4_COLORS = {
  "None": "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  "Call Back": "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300",
  "Ringing": "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300",
  "Info Given": "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-300",
  "Int Angel": "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300",
  "Think&LMK": "bg-pink-100 text-pink-800 dark:bg-pink-500/20 dark:text-pink-300",
  "RdyKYC": "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  "Not Int": "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300",
  "Wrong No": "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
};

const WorkingSheet = () => {
  let { period, type, year, month } = useParams();
  if (!period && year && month) period = "old";
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const telecallerId = searchParams.get("telecaller_id") || "all";

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [timeFilter, setTimeFilter] = useState("all");
  const [selectedLead, setSelectedLead] = useState(null);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem(WS_LS_KEY) || "list");
  const handleViewChange = (mode) => { setViewMode(mode); localStorage.setItem(WS_LS_KEY, mode); };

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  let title = "";
  if (period === "current") title = "Current Month";
  else if (period === "past") title = "Past Month";
  else if (period === "old") title = "Old Leads";
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  if (year && month) {
    title = `${monthNames[parseInt(month) - 1]} ${year}`;
  }
  
  if (type === "bot") title += " - Bot Leads";
  else if (type === "direct") title += " - Direct Leads";
  else if (type === "free") title += " - Free Leads";
  else if (type === "transferred") title += " - Transferred Leads";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["adminLeadsList", period, type, year, month, page, debouncedSearch, timeFilter, telecallerId],
    queryFn: async () => {
      let endpoint = `/api/admin/leads/list?period=${period}&type=${type}&page=${page}&limit=50&telecaller_id=${telecallerId}`;
      if (year && month) endpoint += `&year=${year}&month=${month}`;
      if (debouncedSearch) endpoint += `&search=${debouncedSearch}`;
      if (period === "current" && timeFilter !== "all") endpoint += `&timeFilter=${timeFilter}`;
      const res = await api.get(endpoint);
      return res.data;
    },
    keepPreviousData: true
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(`/admin/leads/${period}`)}
            className="p-2 bg-white dark:bg-[#1e1e2f] border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            <ArrowLeft size={20} className="text-slate-600 dark:text-slate-300" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{title}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Comprehensive view of all working leads.</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {period === "current" && (
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="w-full sm:w-auto px-4 py-2.5 bg-white dark:bg-[#1e1e2f] border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white transition-all shadow-sm text-sm outline-none cursor-pointer"
            >
              <option value="all">All (Current Month)</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
            </select>
          )}
          <div className="relative w-full sm:w-80 group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
              <Search size={18} />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 bg-white dark:bg-[#1e1e2f] border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white transition-all shadow-sm text-sm"
              placeholder="Search by name, contact, or telecaller..."
            />
          </div>
          {(type === "bot" || type === "direct") && (
            <LeadViewToggle viewMode={viewMode} onChange={handleViewChange} />
          )}
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton columns={8} rows={10} />
      ) : isError ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-[#1e1e2f] rounded-2xl border border-slate-200 dark:border-slate-800 flex-1">
          <p className="text-red-500 font-medium">Failed to load leads database.</p>
        </div>
      ) : viewMode === "grid" && (type === "bot" || type === "direct") ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar pb-4">
          <LeadCardGrid leads={data?.data || []} onLeadClick={setSelectedLead} showTelecaller={true} leadCategory="normal" />
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1e1e2f] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col flex-1 overflow-hidden">
          <div className="overflow-auto flex-1 relative custom-scrollbar">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="sticky top-0 z-10 bg-slate-50/90 dark:bg-[#151521]/90 backdrop-blur-md shadow-sm">
                <tr className="text-slate-600 dark:text-slate-300 text-sm font-semibold">
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700">Sr No.</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700">Lead Name</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700">Contact</th>
                  
                  {type === "free" && (
                    <>
                      <th className="p-4 border-b border-slate-200 dark:border-slate-700">Telecaller</th>
                      <th className="p-4 border-b border-slate-200 dark:border-slate-700">Source</th>
                      <th className="p-4 border-b border-slate-200 dark:border-slate-700">Free Status</th>
                      <th className="p-4 border-b border-slate-200 dark:border-slate-700">Date</th>
                      <th className="p-4 border-b border-slate-200 dark:border-slate-700">Status 4</th>
                      <th className="p-4 border-b border-slate-200 dark:border-slate-700">Status 4 Time</th>
                    </>
                  )}

                  {type === "transferred" && (
                    <>
                      <th className="p-4 border-b border-slate-200 dark:border-slate-700">Prev. Telecaller</th>
                      <th className="p-4 border-b border-slate-200 dark:border-slate-700">Cur. Telecaller</th>
                      <th className="p-4 border-b border-slate-200 dark:border-slate-700">Transfer Status</th>
                      <th className="p-4 border-b border-slate-200 dark:border-slate-700">Reason</th>
                      <th className="p-4 border-b border-slate-200 dark:border-slate-700">Transferred At</th>
                      <th className="p-4 border-b border-slate-200 dark:border-slate-700">Status 4</th>
                      <th className="p-4 border-b border-slate-200 dark:border-slate-700">Status 4 Time</th>
                    </>
                  )}

                  {(type === "bot" || type === "direct") && (
                    <>
                      <th className="p-4 border-b border-slate-200 dark:border-slate-700 w-[40px] text-center">Call</th>
                      <th className="p-4 border-b border-slate-200 dark:border-slate-700">Telecaller</th>
                      <th className="p-4 border-b border-slate-200 dark:border-slate-700">Source</th>
                      <th className="p-4 border-b border-slate-200 dark:border-slate-700">Status 1</th>
                      <th className="p-4 border-b border-slate-200 dark:border-slate-700">Status 2</th>
                      <th className="p-4 border-b border-slate-200 dark:border-slate-700">Status 3</th>
                      <th className="p-4 border-b border-slate-200 dark:border-slate-700">Date</th>
                    </>
                  )}
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {data?.data.map((lead, index) => (
                  <tr 
                    key={lead.id} 
                    onClick={() => setSelectedLead(lead)}
                    className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group"
                  >
                    <td className="p-4 text-slate-500 font-medium">{(page - 1) * 50 + index + 1}</td>
                    <td className="p-4 font-medium text-slate-900 dark:text-white">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                          <User size={14} />
                        </div>
                        <span className="truncate max-w-[150px]" title={lead.lead_name}>{lead.lead_name}</span>
                        <div 
                          title={lead.is_wa_interested ? "WhatsApp Interested" : "No WhatsApp Response"} 
                          className={cn(
                            "w-5 h-5 ml-1 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0", 
                            lead.is_wa_interested 
                              ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20" 
                              : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                          )}
                        >
                          W
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-400 font-medium">{lead.lead_contact}</td>
                    
                    {type === "free" && (
                      <>
                        <td className="p-4 text-slate-600 dark:text-slate-400">{lead.current_telecaller_name || 'Unassigned'}</td>
                        <td className="p-4">
                          {lead.import_source === 'BULK_UPLOAD' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">BULK</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">AUTO 30 DAYS</span>
                          )}
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-400 font-medium">{lead.free_status}</td>
                        <td className="p-4 text-slate-500 dark:text-slate-400">
                          {new Date(lead.fetched_at || lead.moved_to_free_at || lead.created_at).toLocaleString('en-IN', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true })}
                        </td>
                        <td className="p-4">
                          <span className={cn(
                            "px-2.5 py-1 rounded-md text-xs font-semibold border border-black/5 dark:border-white/5 inline-block w-24 text-center truncate align-middle", 
                            STATUS_4_COLORS[lead.status4] || STATUS_4_COLORS["None"]
                          )}>
                            {lead.status4 || 'None'}
                          </span>
                        </td>
                        <td className="p-4 text-slate-500 dark:text-slate-400">
                          {lead.status4_timestamp ? new Date(lead.status4_timestamp).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }) : '-'}
                        </td>
                      </>
                    )}

                    {type === "transferred" && (
                      <>
                        <td className="p-4 text-slate-600 dark:text-slate-400">{lead.previous_telecaller_name || 'N/A'}</td>
                        <td className="p-4 text-slate-600 dark:text-slate-400">{lead.current_telecaller_name || 'Unassigned'}</td>
                        <td className="p-4 text-slate-600 dark:text-slate-400 font-medium">{lead.transfer_status}</td>
                        <td className="p-4 text-slate-600 dark:text-slate-400 text-xs truncate max-w-[150px]" title={lead.transfer_reason}>{lead.transfer_reason}</td>
                        <td className="p-4 text-slate-500 dark:text-slate-400">
                          {new Date(lead.transferred_at || lead.created_at).toLocaleString('en-IN', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true })}
                        </td>
                        <td className="p-4">
                          <span className={cn(
                            "px-2.5 py-1 rounded-md text-xs font-semibold border border-black/5 dark:border-white/5 inline-block w-24 text-center truncate align-middle", 
                            STATUS_4_COLORS[lead.status4] || STATUS_4_COLORS["None"]
                          )}>
                            {lead.status4 || 'None'}
                          </span>
                        </td>
                        <td className="p-4 text-slate-500 dark:text-slate-400">
                          {lead.status4_timestamp ? new Date(lead.status4_timestamp).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }) : '-'}
                        </td>
                      </>
                    )}

                    {(type === "bot" || type === "direct") && (
                      <>
                        <td className="p-4 text-center">
                          <CallDot type={lead.call_dot_type} />
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-400">{lead.telecaller_name || 'Unassigned'}</td>
                        <td className="p-4">
                          {lead.source === 'PERSONAL_META_AD' ? (
                            <span className="px-2.5 py-1 bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 rounded-md text-xs font-bold border border-purple-200 dark:border-purple-500/30">META</span>
                          ) : (
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded-md text-xs font-bold border border-slate-200 dark:border-slate-700">BOT</span>
                          )}
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-400">
                          <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-xs font-medium border border-slate-200 dark:border-slate-700 inline-block w-24 text-center truncate align-middle">{lead.status1 || '-'}</span>
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-400">
                          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 rounded-md text-xs font-medium border border-indigo-100 dark:border-indigo-500/20 inline-block w-24 text-center truncate align-middle">{lead.status2 || '-'}</span>
                        </td>
                        <td className="p-4">
                          <span className={cn(
                            "px-2.5 py-1 rounded-md text-xs font-semibold border border-black/5 dark:border-white/5 inline-block w-24 text-center truncate align-middle", 
                            STATUS_3_COLORS[lead.status3] || STATUS_3_COLORS["None"]
                          )}>
                            {lead.status3 || 'None'}
                          </span>
                        </td>
                        <td className="p-4 text-slate-500 dark:text-slate-400">
                          {new Date(lead.created_at).toLocaleString('en-IN', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true })}
                        </td>
                      </>
                    )}
                    
                    <td className="p-4">
                       <button className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">View</button>
                    </td>
                  </tr>
                ))}
                {data?.data.length === 0 && (
                  <tr>
                    <td colSpan={12} className="p-12 text-center text-slate-500 dark:text-slate-400">
                      <div className="flex flex-col items-center">
                        <Database size={48} className="text-slate-300 dark:text-slate-600 mb-4" />
                        <p className="text-lg font-medium text-slate-900 dark:text-white">No leads found</p>
                        <p className="text-sm mt-1">Try adjusting your search criteria.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#151521] shrink-0">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 bg-white dark:bg-[#1e1e2f] border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-[#1e1e2f] px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
              Page {page} of {data?.totalPages || 1}
            </span>
            <button
              disabled={page >= data?.totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 bg-white dark:bg-[#1e1e2f] border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {(type === "bot" || type === "direct") && (
        <LeadDetailsModal 
          isOpen={!!selectedLead && (type === "bot" || type === "direct")} 
          onClose={() => setSelectedLead(null)} 
          lead={selectedLead} 
          type={type} 
          userRole="ADMIN"
          queryKeyToInvalidate="adminLeadsList"
        />
      )}
      
      {type === "free" && (
         <AdminFreeLeadModal
           isOpen={!!selectedLead && type === "free"}
           onClose={() => setSelectedLead(null)}
           leadId={selectedLead?.id}
         />
      )}

      {type === "transferred" && (
         <AdminTransferredLeadModal
           isOpen={!!selectedLead && type === "transferred"}
           onClose={() => setSelectedLead(null)}
           leadId={selectedLead?.id}
         />
      )}
    </div>
  );
};

export default WorkingSheet;
