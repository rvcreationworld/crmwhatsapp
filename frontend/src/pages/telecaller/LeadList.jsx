import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/axios";
import { Search, ChevronLeft, ChevronRight, FileText, ArrowLeft, User } from "lucide-react";
import { TableSkeleton } from "../../components/ui/Skeleton";
import { cn } from "../../components/ui/Skeleton";
import LeadDetailsModal from "../../components/LeadDetailsModal";
import CallButton from "../../components/CallButton";
import CallDot from "../../components/CallDot";
import LeadViewToggle from "../../components/leads/LeadViewToggle";
import LeadCardGrid from "../../components/leads/LeadCardGrid";

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

const LS_KEY = "crm_view_mode_leads_list";

const LeadList = () => {
  let { period, type, year, month } = useParams();
  if (!period && year && month) period = "old";
  const navigate = useNavigate();
  
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [timeFilter, setTimeFilter] = useState("all");
  const [selectedLead, setSelectedLead] = useState(null);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem(LS_KEY) || "list");

  const handleViewChange = (mode) => {
    setViewMode(mode);
    localStorage.setItem(LS_KEY, mode);
  };

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
  else if (period === "ringing") title = "Ringing Leads";
  else if (period === "callback") title = "Call Back Leads";
  else if (period === "kyc") title = "Ready to KYC";
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  if (year && month) {
    title = `${monthNames[parseInt(month) - 1]} ${year}`;
  }
  title += type === "bot" ? " - Bot Leads" : " - Direct Leads";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["telecallerLeadsList", period, type, year, month, page, debouncedSearch, timeFilter],
    queryFn: async () => {
      let endpoint = `/api/telecaller/leads?period=${period}&type=${type}&page=${page}&limit=50`;
      if (year && month) endpoint += `&year=${year}&month=${month}`;
      if (debouncedSearch) endpoint += `&search=${debouncedSearch}`;
      if (period === "current" && timeFilter !== "all") endpoint += `&timeFilter=${timeFilter}`;
      const res = await api.get(endpoint);
      return res.data;
    },
    keepPreviousData: true
  });

  return (
    <div className="space-y-6 animate-fade-in-up h-full flex flex-col">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(`/telecaller/leads/${period}`)}
            className="p-2 bg-white dark:bg-[#1e1e2f] border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            <ArrowLeft size={20} className="text-slate-600 dark:text-slate-300" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{title}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Showing paginated results from your pipeline.</p>
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
          <div className="relative w-full sm:w-72 group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
              <Search size={18} />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 bg-white dark:bg-[#1e1e2f] border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white transition-all shadow-sm text-sm"
              placeholder="Search name or contact..."
            />
          </div>
          <LeadViewToggle viewMode={viewMode} onChange={handleViewChange} />
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton columns={6} rows={8} />
      ) : isError ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-[#1e1e2f] rounded-2xl border border-slate-200 dark:border-slate-800 flex-1">
          <p className="text-red-500 font-medium">Failed to load leads list.</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar pb-4">
          <LeadCardGrid
            leads={data?.data || []}
            onLeadClick={setSelectedLead}
            leadCategory="normal"
          />
          {/* Pagination for grid */}
          <div className="mt-4 flex items-center justify-between px-1">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 bg-white dark:bg-[#1e1e2f] border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm">
              <ChevronLeft size={16} /> Previous
            </button>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-[#1e1e2f] px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
              Page {page} of {data?.totalPages || 1}
            </span>
            <button disabled={page >= data?.totalPages} onClick={() => setPage(p => p + 1)} className="px-4 py-2 bg-white dark:bg-[#1e1e2f] border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm">
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1e1e2f] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col flex-1 overflow-hidden">
          <div className="overflow-auto flex-1 relative custom-scrollbar">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="sticky top-0 z-10 bg-slate-50/90 dark:bg-[#151521]/90 backdrop-blur-md shadow-sm">
                <tr className="text-slate-600 dark:text-slate-300 text-sm font-semibold">
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700">Lead Name</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700 w-[40px] text-center">Call</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700">Contact</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700">Status 1</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700">Status 2</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700">Status 3</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700">Created At</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {data?.data.map((lead) => (
                  <tr 
                    key={lead.id} 
                    onClick={() => setSelectedLead(lead)}
                    className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group"
                  >
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
                    <td className="p-4 text-center">
                      <CallDot type={lead.call_dot_type} />
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-400 font-medium">
                      <div className="flex items-center gap-2">
                        <span>{lead.lead_contact}</span>
                        <CallButton phone={lead.lead_contact} />
                      </div>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-xs font-medium border border-slate-200 dark:border-slate-700 inline-block w-24 text-center truncate align-middle">
                          {lead.status1 ?? lead.status_1 ?? '-'}
                        </span>
                        {lead.status1_locked && (
                          <span title={lead.status1_lock_reason || "Locked"} className="text-amber-600 dark:text-amber-400 cursor-help">🔒</span>
                        )}
                      </div>
                      {lead.status1_locked && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium truncate max-w-[120px]" title={lead.status1_lock_reason}>
                          {lead.status1_lock_reason}
                        </p>
                      )}
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 rounded-md text-xs font-medium border border-indigo-100 dark:border-indigo-500/20 inline-block w-24 text-center truncate align-middle">
                          {lead.status2 ?? lead.status_2 ?? '-'}
                        </span>
                        {lead.status2_locked && (
                          <span title={lead.status2_lock_reason || "Locked"} className="text-amber-600 dark:text-amber-400 cursor-help">🔒</span>
                        )}
                      </div>
                      {lead.status2_locked && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium truncate max-w-[120px]" title={lead.status2_lock_reason}>
                          {lead.status2_lock_reason}
                        </p>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-md text-xs font-semibold border border-black/5 dark:border-white/5 inline-block w-24 text-center truncate align-middle", 
                        STATUS_3_COLORS[lead.status3 ?? lead.status_3] || STATUS_3_COLORS["None"]
                      )}>
                        {lead.status3 ?? lead.status_3 ?? 'New'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 dark:text-slate-400">
                      {new Date(lead.created_at).toLocaleString('en-IN', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true })}
                    </td>
                  </tr>
                ))}
                {data?.data.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-500 dark:text-slate-400">
                      <div className="flex flex-col items-center">
                        <FileText size={48} className="text-slate-300 dark:text-slate-600 mb-4" />
                        <p className="text-lg font-medium text-slate-900 dark:text-white">No leads found.</p>
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
              onClick={() => { setPage(p => p - 1); setSelectedLead(null); }}
              className="px-4 py-2 bg-white dark:bg-[#1e1e2f] border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-[#1e1e2f] px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
              Page {page} of {data?.totalPages || 1}
            </span>
            <button
              disabled={page >= data?.totalPages}
              onClick={() => { setPage(p => p + 1); setSelectedLead(null); }}
              className="px-4 py-2 bg-white dark:bg-[#1e1e2f] border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      <LeadDetailsModal 
        isOpen={!!selectedLead} 
        onClose={() => setSelectedLead(null)} 
        lead={selectedLead} 
        type={type} 
        userRole="TELECALLER"
        queryKeyToInvalidate="telecallerLeadsList"
      />
    </div>
  );
};

export default LeadList;
