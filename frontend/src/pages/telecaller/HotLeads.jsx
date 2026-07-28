import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/axios";
import { Flame, Search, Phone, Calendar, Clock, Database, Tag } from "lucide-react";
import { TableSkeleton } from "../../components/ui/Skeleton";
import LeadViewToggle from "../../components/leads/LeadViewToggle";
import LeadCardGrid from "../../components/leads/LeadCardGrid";
import LeadDetailsModal from "../../components/LeadDetailsModal";

const StatusBadgeInline = ({ status }) => {
  if (!status) return <span className="text-xs text-slate-400">New</span>;
  return (
    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
      {status}
    </span>
  );
};

const LS_KEY = "crm_view_mode_hot_leads";

const HotLeads = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState(() => localStorage.getItem(LS_KEY) || "list");
  const [selectedLead, setSelectedLead] = useState(null);
  const handleViewChange = (mode) => { setViewMode(mode); localStorage.setItem(LS_KEY, mode); };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["hotLeads"],
    queryFn: async () => {
      const res = await api.get("/api/telecaller/hot-leads");
      return res.data;
    }
  });

  const leads = data?.leads || [];

  const filteredLeads = leads.filter((c) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    const nameMatch = c.lead_name && c.lead_name.toLowerCase().includes(q);
    const phoneMatch = c.lead_contact && c.lead_contact.toLowerCase().includes(q);
    return nameMatch || phoneMatch;
  });

  const formatDuration = (seconds) => {
    if (!seconds) return '0m 0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-xl shadow-inner shadow-orange-500/10">
              <Flame size={24} className="fill-orange-500/20" />
            </div>
            Hot Leads
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Leads with over 5 minutes of total talk time across all categories.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-orange-50 dark:bg-orange-500/10 text-orange-800 dark:text-orange-300 px-4 py-2 rounded-xl text-sm font-bold border border-orange-200 dark:border-orange-500/30 flex items-center gap-2 shadow-sm">
            <Flame size={18} className="text-orange-600 dark:text-orange-400" />
            <span>Total Hot Leads: {leads.length}</span>
          </div>
          <LeadViewToggle viewMode={viewMode} onChange={handleViewChange} />
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by Lead Name or Mobile Number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
          />
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Hot Leads Roster</h3>
          <span className="text-xs text-slate-400">Showing {filteredLeads.length} of {leads.length} leads</span>
        </div>

        {viewMode === 'grid' && !isLoading && !isError ? (
          <div className="p-4">
            <LeadCardGrid 
              leads={filteredLeads} 
              onLeadClick={(lead) => setSelectedLead(lead)} 
              leadCategory="dhan" 
              emptyMessage="No Hot Leads found." 
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-6">
                <TableSkeleton rows={8} columns={6} />
              </div>
            ) : isError ? (
              <div className="p-12 text-center text-rose-500 text-sm font-semibold">
                Failed to load Hot Leads data. Please try refreshing.
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="p-16 text-center text-slate-400 dark:text-slate-500 space-y-3">
                <Flame className="mx-auto text-slate-300 dark:text-slate-600" size={48} />
                <p className="text-base font-medium">No Hot Leads found</p>
                <p className="text-xs text-slate-400">Leads with over 5 mins of talk time will automatically appear here.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="px-6 py-4 font-semibold w-1/4">Lead Info</th>
                    <th className="px-6 py-4 font-semibold w-1/6">Total Talk Time</th>
                    <th className="px-6 py-4 font-semibold w-1/6">Lead Source</th>
                    <th className="px-6 py-4 font-semibold w-1/6">Current Status</th>
                    <th className="px-6 py-4 font-semibold">Last Call</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {filteredLeads.map((lead) => (
                    <tr 
                      key={lead.id + lead.lead_type} 
                      onClick={() => setSelectedLead(lead)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 dark:text-white mb-1 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                          {lead.lead_name || 'No Name'}
                        </div>
                        <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                          <Phone size={12} className="mr-1.5 opacity-70" />
                          {lead.lead_contact}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-orange-500" />
                          <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{formatDuration(lead.total_duration)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md text-[11px] font-bold w-max">
                           <Database size={12} />
                           {lead.lead_type}
                         </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadgeInline status={lead.status1} />
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                        {lead.last_call_at ? (
                          <div className="flex items-center gap-1.5">
                            <Calendar size={13} className="opacity-70" />
                            {new Date(lead.last_call_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' })}
                          </div>
                        ) : (
                          <span className="italic text-slate-400 text-xs">No calls recorded</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <LeadDetailsModal 
        isOpen={!!selectedLead} 
        onClose={() => setSelectedLead(null)} 
        lead={selectedLead} 
        type={selectedLead ? selectedLead.lead_type.toLowerCase() : ""} 
        userRole="TELECALLER"
        queryKeyToInvalidate="hotLeads"
      />
    </div>
  );
};

export default HotLeads;
