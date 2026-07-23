import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/axios";
import { Loader2, RefreshCw, Save, CheckCircle2, AlertCircle, Clock, PlayCircle, PauseCircle } from "lucide-react";
import toast from "react-hot-toast";

const CommonCampaignTab = () => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({ campaign_name: "Common Campaign", sheet_url: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["commonCampaign"],
    queryFn: async () => {
      const res = await api.get('/api/admin/common-campaign');
      if (res.data.campaign) {
        setFormData({
          campaign_name: res.data.campaign.campaign_name,
          sheet_url: res.data.campaign.sheet_url || ""
        });
      }
      return res.data;
    },
    refetchInterval: 15000
  });

  const campaign = data?.campaign;
  const recentImports = data?.recentImports || [];

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/api/admin/common-campaign', payload);
      return res.data;
    },
    onSuccess: (resData) => {
      toast.success(resData.message);
      queryClient.invalidateQueries(["commonCampaign"]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to save common campaign");
    }
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/api/admin/common-campaign/sync');
      return res.data;
    },
    onSuccess: (resData) => {
      toast.success(resData.message || "Manual sync completed!");
      queryClient.invalidateQueries(["commonCampaign"]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to trigger sync");
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (isActive) => {
      const res = await api.patch('/api/admin/common-campaign/status', { is_active: isActive });
      return res.data;
    },
    onSuccess: (resData) => {
      toast.success(resData.message);
      queryClient.invalidateQueries(["commonCampaign"]);
    },
    onError: (err) => {
      toast.error("Failed to toggle status");
    }
  });

  const toggleAutoSyncMutation = useMutation({
    mutationFn: async (autoSyncEnabled) => {
      const res = await api.patch('/api/admin/common-campaign/auto-sync', { auto_sync_enabled: autoSyncEnabled });
      return res.data;
    },
    onSuccess: (resData) => {
      toast.success(resData.message);
      queryClient.invalidateQueries(["commonCampaign"]);
    },
    onError: (err) => {
      toast.error("Failed to toggle auto sync");
    }
  });

  const handleSave = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleSync = () => {
    toast.loading("Syncing common campaign...", { id: "sync-toast" });
    syncMutation.mutate(undefined, {
      onSettled: () => toast.dismiss("sync-toast")
    });
  };

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-purple-600" size={32} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Configuration Card */}
        <div className="bg-white dark:bg-[#1e1e2f] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Configuration</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Campaign Name</label>
              <input
                type="text"
                required
                value={formData.campaign_name}
                onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Google Sheet Link (Public)</label>
              <input
                type="url"
                required
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={formData.sheet_url}
                onChange={(e) => setFormData({ ...formData, sheet_url: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-xs text-slate-500 mt-1">Make sure the Google Sheet is accessible (Anyone with the link can view).</p>
            </div>
            <div className="pt-2">
              <button
                type="submit"
                disabled={saveMutation.isLoading}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {saveMutation.isLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save Configuration
              </button>
            </div>
          </form>

          {campaign && (
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
              <h3 className="text-md font-semibold text-slate-900 dark:text-white mb-4">Controls</h3>
              <div className="flex flex-wrap gap-4 items-center">
                <button
                  onClick={handleSync}
                  disabled={syncMutation.isLoading || !campaign.sheet_url}
                  className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={16} className={syncMutation.isLoading ? "animate-spin" : ""} />
                  Manual Sync Now
                </button>

                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Auto Sync</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={campaign.auto_sync_enabled === 1}
                      onChange={(e) => toggleAutoSyncMutation.mutate(e.target.checked ? 1 : 0)}
                      disabled={toggleAutoSyncMutation.isLoading}
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                <button
                  onClick={() => toggleStatusMutation.mutate(campaign.is_active === 1 ? 0 : 1)}
                  disabled={toggleStatusMutation.isLoading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors border ${
                    campaign.is_active === 1 
                      ? "text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400 dark:hover:bg-amber-500/20"
                      : "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                  }`}
                >
                  {campaign.is_active === 1 ? (
                    <><PauseCircle size={16} /> Pause Campaign</>
                  ) : (
                    <><PlayCircle size={16} /> Resume Campaign</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Status Card */}
        {campaign && (
          <div className="bg-white dark:bg-[#1e1e2f] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Sync Status</h2>
            <div className="grid grid-cols-2 gap-4 flex-1">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Status</p>
                <div className="flex items-center gap-2">
                  {campaign.is_active === 1 ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold"><PlayCircle size={16}/> Active</span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold"><PauseCircle size={16}/> Paused</span>
                  )}
                </div>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Auto Sync</p>
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  {campaign.auto_sync_enabled === 1 ? <span className="text-emerald-600 dark:text-emerald-400">ON</span> : <span className="text-slate-500">OFF</span>}
                </p>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Total Imported</p>
                <p className="text-2xl font-black text-purple-600 dark:text-purple-400">{campaign.total_imported}</p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Last Synced</p>
                <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                  {campaign.last_synced_at ? (
                    <span className="flex items-center gap-1"><Clock size={14}/> {new Date(campaign.last_synced_at).toLocaleString('en-IN', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true })}</span>
                  ) : "Never"}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">Current Operation</p>
              {campaign.sync_status === 'SUCCESS' && <div className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-lg text-sm"><CheckCircle2 size={16}/> Sync completed successfully</div>}
              {campaign.sync_status === 'SYNCING' && <div className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-500/10 px-3 py-1.5 rounded-lg text-sm"><Loader2 size={16} className="animate-spin"/> Syncing right now...</div>}
              {campaign.sync_status === 'IDLE' && <div className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg text-sm">Waiting for first sync</div>}
              {campaign.sync_status === 'ERROR' && (
                <div className="flex flex-col gap-1.5 text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-500/10 p-3 rounded-lg text-sm">
                  <div className="flex items-center gap-1.5"><AlertCircle size={16}/> Error during last sync</div>
                  <span className="text-xs text-red-500">{campaign.sync_error}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Preview Table */}
      {campaign && (
        <div className="bg-white dark:bg-[#1e1e2f] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-slate-900 dark:text-white">Recent Imports Preview</h3>
            <p className="text-xs text-slate-500">Showing last 10 rows imported directly into the New Leads bot pool.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr className="text-slate-600 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider">
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700">Full Name</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700">Phone No</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700">Date (IST)</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {recentImports.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 font-medium text-slate-900 dark:text-white">{row.full_name}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">{row.phone_no}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">
                      {new Date(row.sheet_created_time).toLocaleString('en-IN', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true })}
                    </td>
                  </tr>
                ))}
                {recentImports.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-slate-500">No imports found yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommonCampaignTab;
