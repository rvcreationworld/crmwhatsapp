import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/axios";
import { Target, Search, Loader2, PlayCircle, ExternalLink, RefreshCw, AlertCircle, CheckCircle2, Clock, Edit2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { TableSkeleton, cn } from "../../components/ui/Skeleton";
import SyncCampaignModal from "../../components/SyncCampaignModal";
import EditCampaignModal from "../../components/EditCampaignModal";
import CommonCampaignTab from "./CommonCampaignTab";

const Campaigns = () => {
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("direct");
  const queryClient = useQueryClient();

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const res = await api.get('/api/campaigns');
      return res.data;
    },
    refetchInterval: 15000 // Refetch every 15 seconds to update sync status
  });

  const syncNowMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.post(`/api/campaigns/${id}/sync-now`);
      return res.data;
    },
    onSuccess: (data) => {
      if (data.message) {
        toast.success(data.message);
      } else {
        toast.success("Manual sync completed!");
      }
      queryClient.invalidateQueries(["campaigns"]);
      queryClient.invalidateQueries(["workingSheet"]);
      queryClient.invalidateQueries(["myLeads"]);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to trigger manual sync");
      queryClient.invalidateQueries(["campaigns"]);
    }
  });

  const handleSyncNow = (id) => {
    toast.loading("Syncing campaign...", { id: "sync-toast" });
    syncNowMutation.mutate(id, {
      onSettled: () => toast.dismiss("sync-toast")
    });
  };

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/api/campaigns/${id}`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Campaign deleted successfully");
      queryClient.invalidateQueries(["campaigns"]);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to delete campaign");
    }
  });

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this campaign? This cannot be undone.")) {
      deleteMutation.mutate(id);
    }
  };

  const filteredCampaigns = campaigns?.filter(c => 
    c.campaign_name.toLowerCase().includes(search.toLowerCase()) || 
    c.telecaller_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Meta Campaigns</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage continuous Google Sheet syncs for Direct Leads.</p>
        </div>
      </div>

      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("direct")}
          className={`px-4 py-2 font-medium text-sm transition-colors relative ${
            activeTab === "direct" 
              ? "text-purple-600 dark:text-purple-400" 
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          }`}
        >
          Direct Campaigns
          {activeTab === "direct" && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 dark:bg-purple-400 rounded-t-full"></span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("common")}
          className={`px-4 py-2 font-medium text-sm transition-colors relative ${
            activeTab === "common" 
              ? "text-purple-600 dark:text-purple-400" 
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          }`}
        >
          Common Campaign
          {activeTab === "common" && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 dark:bg-purple-400 rounded-t-full"></span>
          )}
        </button>
      </div>

      {activeTab === "direct" && (
        <>
          <div className="flex items-center gap-3 w-full sm:w-auto self-end">
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64 group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-purple-500 transition-colors">
              <Search size={18} />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 bg-white dark:bg-[#1e1e2f] border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 dark:text-white transition-all shadow-sm text-sm"
              placeholder="Search campaigns..."
            />
          </div>
          <button 
            onClick={() => setIsSyncModalOpen(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-md shadow-purple-500/20 active:scale-95 shrink-0"
          >
            <Target size={18} />
            Add Campaign
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1e1e2f] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col flex-1 overflow-hidden">
        {isLoading ? (
          <TableSkeleton columns={7} rows={8} />
        ) : (
          <div className="overflow-auto flex-1">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="sticky top-0 z-10 bg-slate-50/90 dark:bg-[#151521]/90 backdrop-blur-md shadow-sm">
                <tr className="text-slate-600 dark:text-slate-300 text-sm font-semibold">
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700">Campaign Name</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700">Telecaller</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700">Google Sheet</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700">Last Synced</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700">Leads</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700">Status</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredCampaigns?.map((campaign) => (
                  <tr key={campaign.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 font-medium text-slate-900 dark:text-white">
                      {campaign.campaign_name}
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">
                      {campaign.telecaller_name}
                    </td>
                    <td className="p-4">
                      {campaign.sheet_url ? (
                        <a href={campaign.sheet_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 rounded-lg text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors">
                          <ExternalLink size={14} /> Open Sheet
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">No link</span>
                      )}
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">
                      {campaign.last_synced_at ? (
                        <span className="flex items-center gap-1.5"><Clock size={14}/> {new Date(campaign.last_synced_at).toLocaleString('en-IN', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true })}</span>
                      ) : (
                        <span className="text-slate-400">Never</span>
                      )}
                    </td>
                    <td className="p-4 font-semibold text-purple-600 dark:text-purple-400">
                      {campaign.total_imported} <span className="text-xs text-slate-500 font-normal">rows</span>
                    </td>
                    <td className="p-4">
                      {campaign.sync_status === 'SUCCESS' && <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded text-xs"><CheckCircle2 size={14}/> Synced</span>}
                      {campaign.sync_status === 'SYNCING' && <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded text-xs"><Loader2 size={14} className="animate-spin"/> Syncing...</span>}
                      {campaign.sync_status === 'IDLE' && <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs">Waiting</span>}
                      {campaign.sync_status === 'ERROR' && (
                        <div className="flex flex-col gap-1" title={campaign.sync_error}>
                          <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-500/10 px-2 py-1 rounded text-xs"><AlertCircle size={14}/> Error</span>
                          <span className="text-[10px] text-red-500 truncate max-w-[150px]">{campaign.sync_error}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleSyncNow(campaign.id)}
                          disabled={syncNowMutation.isLoading && syncNowMutation.variables === campaign.id || !campaign.sheet_url}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#151521] border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 dark:hover:bg-purple-500/10 dark:hover:text-purple-300 dark:hover:border-purple-500/30 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          {syncNowMutation.isLoading && syncNowMutation.variables === campaign.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <RefreshCw size={14} />
                          )}
                          Sync Now
                        </button>
                        <button 
                          onClick={() => setEditingCampaign(campaign)}
                          className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 p-1.5 rounded-lg transition-colors" 
                          title="Edit Campaign"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(campaign.id)}
                          className="text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 p-1.5 rounded-lg transition-colors" 
                          title="Delete Campaign"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredCampaigns?.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-500 dark:text-slate-400">
                      <div className="flex flex-col items-center">
                        <Target size={48} className="text-slate-300 dark:text-slate-600 mb-4" />
                        <p className="text-lg font-medium text-slate-900 dark:text-white">No campaigns found.</p>
                        <p className="text-sm mt-1">Click Add Campaign to link a Google Sheet.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SyncCampaignModal 
        isOpen={isSyncModalOpen} 
        onClose={() => setIsSyncModalOpen(false)} 
        onSuccess={() => queryClient.invalidateQueries(["campaigns"])} 
      />
      <EditCampaignModal
        campaign={editingCampaign}
        isOpen={!!editingCampaign}
        onClose={() => setEditingCampaign(null)}
        onSuccess={() => queryClient.invalidateQueries(["campaigns"])}
      />
        </>
      )}

      {activeTab === "common" && (
        <CommonCampaignTab />
      )}
    </div>
  );
};

export default Campaigns;
