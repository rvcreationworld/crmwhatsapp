import { useState, useEffect } from "react";
import api from "../api/axios";
import { Link2, Loader2, Edit } from "lucide-react";
import toast from "react-hot-toast";

const EditCampaignModal = ({ campaign, isOpen, onClose, onSuccess }) => {
  const [campaignName, setCampaignName] = useState("");
  const [googleSheetLink, setGoogleSheetLink] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (campaign) {
      setCampaignName(campaign.campaign_name || "");
      setGoogleSheetLink(campaign.sheet_url || "");
    }
  }, [campaign]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!campaignName || !googleSheetLink) {
      toast.error("Please provide both Campaign Name and a Google Sheet Link.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Updating campaign...");
    
    try {
      const res = await api.put(`/api/campaigns/${campaign.id}`, {
        campaign_name: campaignName,
        google_sheet_link: googleSheetLink
      });
      
      toast.success(res.data.message || "Campaign Updated!", { id: toastId, duration: 5000 });
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to update campaign", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1e1e2f] rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 transform transition-all duration-300">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#151521]/50 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Edit size={20} className="text-purple-500" />
            Edit Meta Campaign
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
              disabled={loading || !googleSheetLink || !campaignName}
              className="flex-[2] px-4 py-2.5 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-all shadow-md shadow-purple-500/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Campaign"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCampaignModal;
