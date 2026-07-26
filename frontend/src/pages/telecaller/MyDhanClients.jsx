import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/axios";
import { UserCheck, Search, Phone, Calendar, ShieldCheck, Database } from "lucide-react";
import { TableSkeleton } from "../../components/ui/Skeleton";
import LeadViewToggle from "../../components/leads/LeadViewToggle";
import LeadCardGrid from "../../components/leads/LeadCardGrid";

const LS_KEY = "crm_view_mode_my_dhan_clients";

const MyDhanClients = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState(() => localStorage.getItem(LS_KEY) || "list");
  const handleViewChange = (mode) => { setViewMode(mode); localStorage.setItem(LS_KEY, mode); };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["myDhanClients"],
    queryFn: async () => {
      const res = await api.get("/api/telecaller/my-clients/dhan");
      return res.data;
    }
  });

  const clients = data?.clients || [];

  const filteredClients = clients.filter((c) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    const nameMatch = c.lead_name && c.lead_name.toLowerCase().includes(q);
    const phoneMatch = c.lead_contact && c.lead_contact.toLowerCase().includes(q);
    return nameMatch || phoneMatch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl">
              <UserCheck size={24} />
            </div>
            My Dhan Clients
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Read-only repository of all your verified clients who have completed KYC.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-300 px-4 py-2 rounded-xl text-sm font-bold border border-blue-200 dark:border-blue-500/30 flex items-center gap-2 shadow-sm">
            <ShieldCheck size={18} className="text-blue-600 dark:text-blue-400" />
            <span>Total Dhan Clients: {clients.length}</span>
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
            placeholder="Search by Client Name or Mobile Number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
          />
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Verified Clients Roster</h3>
          <span className="text-xs text-slate-400">Showing {filteredClients.length} of {clients.length} clients</span>
        </div>

        {viewMode === 'grid' && !isLoading && !isError ? (
          <div className="p-4">
            <LeadCardGrid leads={filteredClients} onLeadClick={() => {}} leadCategory="dhan" emptyMessage="No Dhan clients found." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-6">
                <TableSkeleton rows={8} columns={5} />
              </div>
            ) : isError ? (
              <div className="p-12 text-center text-rose-500 text-sm font-semibold">
                Failed to load My Dhan Clients data. Please try refreshing.
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="p-16 text-center text-slate-400 dark:text-slate-500 space-y-3">
                <UserCheck className="mx-auto text-slate-300 dark:text-slate-600" size={48} />
                <p className="text-base font-medium">No Dhan clients found</p>
                <p className="text-xs text-slate-400">When your leads are uploaded for Dhan KYC by Admin, they will appear here automatically.</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-200 font-bold text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3.5 px-6">Client Name</th>
                    <th className="py-3.5 px-6">Mobile Number</th>
                    <th className="py-3.5 px-6">Source</th>
                    <th className="py-3.5 px-6">Dhan KYC Date</th>
                    <th className="py-3.5 px-6 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {filteredClients.map((client) => (
                    <tr key={`${client.lead_table}-${client.id}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-extrabold flex items-center justify-center text-xs shrink-0">
                            {client.lead_name ? client.lead_name.charAt(0).toUpperCase() : "C"}
                          </div>
                          <span>{client.lead_name || "Unknown Client"}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-mono font-semibold text-slate-800 dark:text-slate-200">
                        <div className="flex items-center gap-2">
                          <Phone size={14} className="text-slate-400" />
                          <span>{client.lead_contact || "—"}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-600">
                          <Database size={12} className="text-slate-400" />
                          {client.source || (client.lead_table === "direct_leads" ? "DIRECT" : "BOT_POOL")}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Calendar size={14} className="text-slate-400" />
                          {client.uploaded_at ? new Date(client.uploaded_at).toLocaleDateString("en-US", { timeZone: "UTC", year: "numeric", month: "short", day: "numeric" })
                            : "—"}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 shadow-sm border border-blue-200 dark:border-blue-500/30">
                          <ShieldCheck size={14} className="text-blue-600 dark:text-blue-400" />
                          Dhan KYC Done
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

      </div>

    </div>
  );
};

export default MyDhanClients;
