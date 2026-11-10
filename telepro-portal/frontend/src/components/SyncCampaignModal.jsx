import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../api/axios";
import { Link2, Loader2, Target } from "lucide-react";
import toast from "react-hot-toast";

const SyncCampaignModal = ({ telecaller, isOpen, onClose, onSuccess }) => {
  const [campaignName, setCampaignName] = useState("");
  const [googleSheetLink, setGoogleSheetLink] = useState("");
  const [selectedTelecallerId, setSelectedTelecallerId] = useState(telecaller?.id || "");
  const [loading, setLoading] = useState(false);

  // Only fetch telecallers if a specific telecaller wasn't passed via props
  const { data: telecallersData } = useQuery({
    queryKey: ["activeTelecallers"],
    queryFn: async () => {
      const res = await api.get('/api/telecallers?limit=100');
      // Filter for active ones, allowing admin to assign a campaign to any active telecaller
      return res.data.data.filter(t => Number(t.is_active) === 1);
    },
    enabled: !telecaller && isOpen
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalTelecallerId = telecaller?.id || selectedTelecallerId;

    if (!finalTelecallerId) {
      toast.error("Please select a telecaller.");
      return;
    }
    if (!campaignName || !googleSheetLink) {
      toast.error("Please provide both Campaign Name and a Google Sheet Link.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Adding campaign and scheduling sync...");
    
    try {
      const res = await api.post("/api/campaigns/sync-sheet", {
        telecaller_id: finalTelecallerId,
        campaign_name: campaignName,
        google_sheet_link: googleSheetLink
      });
      
      toast.success(res.data.message || "Campaign Added!", { id: toastId, duration: 5000 });
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to add campaign", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1e1e2f] rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 transform transition-all duration-300">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#151521]/50 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Target size={20} className="text-purple-500" />
            Add Meta Campaign
          </h3>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-xl rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            &times;
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Target Telecaller</label>
            {telecaller ? (
              <input 
                type="text" 
                value={telecaller.telecaller_name}
                disabled
                className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 font-medium cursor-not-allowed"
              />
            ) : (
              <select
                value={selectedTelecallerId}
                onChange={(e) => setSelectedTelecallerId(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-[#151521] border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 dark:text-white transition-all shadow-sm outline-none"
              >
                <option value="">-- Select Telecaller --</option>
                {telecallersData?.map(t => (
                  <option key={t.id} value={t.id}>{t.telecaller_name} ({t.tele_mobile})</option>
                ))}
              </select>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Campaign Name</label>
            <input 
              type="text" 
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="e.g. Diwali Facebook Ads"
              className="w-full px-4 py-2.5 bg-white dark:bg-[#151521] border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 dark:text-white transition-all shadow-sm outline-none"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Link2 size={16} /> Public Google Sheet Link
            </label>
            <input 
              type="url" 
              value={googleSheetLink}
              onChange={(e) => setGoogleSheetLink(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="w-full px-4 py-2.5 bg-white dark:bg-[#151521] border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 dark:text-white transition-all shadow-sm outline-none"
            />
            <div className="mt-3 p-3 bg-purple-50/50 dark:bg-purple-500/5 border border-purple-100 dark:border-purple-500/10 rounded-lg">
              <p className="text-xs text-purple-700 dark:text-purple-400 leading-relaxed font-medium">
                The sheet must be set to <strong>"Anyone with the link can view"</strong>.
                <br className="my-1"/>
                Required columns: <code className="bg-white dark:bg-[#1e1e2f] px-1 py-0.5 rounded shadow-sm text-[10px]">first_name</code>, <code className="bg-white dark:bg-[#1e1e2f] px-1 py-0.5 rounded shadow-sm text-[10px]">phone_number</code>, <code className="bg-white dark:bg-[#1e1e2f] px-1 py-0.5 rounded shadow-sm text-[10px]">created_time</code>.
              </p>
            </div>
          </div>
          
          <div className="flex gap-3 pt-2">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-white dark:bg-[#1e1e2f] border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading || !googleSheetLink || !campaignName || (!telecaller && !selectedTelecallerId)}
              className="flex-[2] px-4 py-2.5 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-all shadow-md shadow-purple-500/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Saving...
                </>
              ) : (
                "Add Campaign"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SyncCampaignModal;
