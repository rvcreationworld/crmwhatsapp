import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/axios";
import { Plus, Edit2, KeyRound, UploadCloud, Trash2, Power, Shield, Search } from "lucide-react";
import SyncCampaignModal from "../../components/SyncCampaignModal";
import toast from "react-hot-toast";

const Telecallers = () => {
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedTelecaller, setSelectedTelecaller] = useState(null);
  const [errorModalMsg, setErrorModalMsg] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to first page when searching
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);
  
  const [formData, setFormData] = useState({
    id: null,
    telecaller_name: "",
    tele_mobile: "",
    password: "",
    is_active: 1,
    own_campaign_enabled: 0,
    interakt_agent_email: "",
    interakt_agent_status: "NOT_REGISTERED",
    interakt_last_verified_at: null
  });

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["telecallers", page, debouncedSearch],
    queryFn: async () => {
      const res = await api.get(`/api/telecallers?page=${page}&limit=50&search=${encodeURIComponent(debouncedSearch)}`);
      return res.data;
    },
    keepPreviousData: true
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const res = await api.post('/api/telecallers', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["telecallers"]);
      setIsModalOpen(false);
      toast.success("Telecaller created successfully");
    },
    onError: (err) => {
      setErrorModalMsg(err.response?.data?.message || err.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const res = await api.put(`/api/telecallers/${data.id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["telecallers"]);
      setIsModalOpen(false);
      toast.success("Telecaller updated successfully");
    },
    onError: (err) => {
      setErrorModalMsg(err.response?.data?.message || err.message);
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, newPassword }) => {
      const res = await api.put(`/api/telecallers/${id}/reset-password`, { newPassword });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Password reset successfully");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.message);
    }
  });

  const toggleBotLeadsMutation = useMutation({
    mutationFn: async ({ id, bot_leads_paused }) => {
      const res = await api.put(`/api/telecallers/${id}/bot-leads-pause`, { bot_leads_paused });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(["telecallers"]);
      toast.success(data.message || "BOT Leads status updated");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.id) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (t) => {
    setFormData({
      id: t.id,
      telecaller_name: t.telecaller_name,
      tele_mobile: t.tele_mobile,
      password: "",
      is_active: t.is_active,
      own_campaign_enabled: t.own_campaign_enabled,
      interakt_agent_email: t.interakt_agent_email || "",
      interakt_agent_status: t.interakt_agent_status || "NOT_REGISTERED",
      interakt_last_verified_at: t.interakt_last_verified_at || null
    });
    setIsModalOpen(true);
  };

  const handleResetPassword = (id) => {
    const newPass = prompt("Enter new password for this telecaller:");
    if (newPass) {
      resetPasswordMutation.mutate({ id, newPassword: newPass });
    }
  };

  const handleSoftDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this telecaller? This will hide them but preserve their lead history.")) {
      updateMutation.mutate({ id, is_deleted: 1 });
    }
  };

  const handleToggleActive = (t) => {
    updateMutation.mutate({ id: t.id, is_active: t.is_active ? 0 : 1 });
  };

  const handleUploadClick = (t) => {
    setSelectedTelecaller(t);
    setIsUploadModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Telecallers Management</h1>
        <button 
          onClick={() => {
            setFormData({ 
              id: null, telecaller_name: "", tele_mobile: "", password: "", is_active: 1, own_campaign_enabled: 0, 
              interakt_agent_email: "", interakt_agent_status: "NOT_REGISTERED", interakt_last_verified_at: null 
            });
            setIsModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Add Telecaller
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by name or mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-shadow"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
                <th className="p-4 font-semibold">Name</th>
                <th className="p-4 font-semibold">Mobile</th>
                <th className="p-4 font-semibold text-center">Status</th>
                <th className="p-4 font-semibold text-center">BOT Leads</th>
                <th className="p-4 font-semibold text-center">Meta Ads</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Loading telecallers...</td></tr>
              ) : data?.data.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-medium text-slate-800">{t.telecaller_name}</td>
                  <td className="p-4 text-slate-600">{t.tele_mobile}</td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => handleToggleActive(t)}
                      className={`px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${t.is_active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                      title="Click to toggle status"
                    >
                      <Power size={12} />
                      {t.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => toggleBotLeadsMutation.mutate({ id: t.id, bot_leads_paused: !t.bot_leads_paused })}
                      disabled={toggleBotLeadsMutation.isLoading}
                      className={`px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${!t.bot_leads_paused ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-red-100 text-red-700 hover:bg-red-200'} ${toggleBotLeadsMutation.isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title="Click to toggle BOT leads"
                    >
                      <Power size={12} />
                      {!t.bot_leads_paused ? 'Active' : 'Paused'}
                    </button>
                  </td>
                  <td className="p-4 text-center">
                    {t.own_campaign_enabled === 1 ? (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-bold">ENABLED</span>
                    ) : (
                      <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded text-xs font-bold">DISABLED</span>
                    )}
                  </td>
                  <td className="p-4 flex items-center justify-end gap-3">
                    <button onClick={() => handleEdit(t)} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors" title="Edit Telecaller">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleResetPassword(t.id)} className="text-amber-600 hover:bg-amber-50 p-2 rounded-lg transition-colors" title="Reset Password">
                      <KeyRound size={18} />
                    </button>
                    <button onClick={() => handleSoftDelete(t.id)} className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Delete Telecaller">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1e1e2f] rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 transition-all duration-300">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#151521]/50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">{formData.id ? 'Edit Telecaller' : 'Add Telecaller'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-xl rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Name</label>
                <input 
                  type="text" required
                  value={formData.telecaller_name}
                  onChange={e => setFormData({...formData, telecaller_name: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white dark:bg-[#151521] border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:text-white transition-all shadow-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Mobile Number <span className="text-slate-400 font-normal">{formData.id && "(Cannot be edited)"}</span></label>
                <input 
                  type="text" required
                  value={formData.tele_mobile}
                  disabled={!!formData.id}
                  onChange={e => setFormData({...formData, tele_mobile: e.target.value})}
                  className={`w-full px-4 py-2.5 bg-white dark:bg-[#151521] border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:text-white transition-all shadow-sm outline-none ${formData.id ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-500 cursor-not-allowed' : ''}`}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Password <span className="text-slate-400 font-normal">{formData.id && "(Leave blank to keep current)"}</span>
                </label>
                <input 
                  type="password" required={!formData.id}
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white dark:bg-[#151521] border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:text-white transition-all shadow-sm outline-none"
                />
              </div>
              
              <div className="flex items-center gap-3 pt-2">
                <input 
                  type="checkbox" id="campaign_toggle"
                  checked={formData.own_campaign_enabled === 1}
                  onChange={e => setFormData({...formData, own_campaign_enabled: e.target.checked ? 1 : 0})}
                  className="w-4 h-4 text-blue-600 dark:bg-slate-800 border-gray-300 dark:border-slate-700 rounded focus:ring-blue-500/50"
                />
                <label htmlFor="campaign_toggle" className="text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Allow Personal Meta Campaign Leads
                </label>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input 
                  type="checkbox" id="active_toggle"
                  checked={formData.is_active === 1}
                  onChange={e => setFormData({...formData, is_active: e.target.checked ? 1 : 0})}
                  className="w-4 h-4 text-blue-600 dark:bg-slate-800 border-gray-300 dark:border-slate-700 rounded focus:ring-blue-500/50"
                />
                <label htmlFor="active_toggle" className="text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Account is Active
                </label>
              </div>

              {/* Interakt Integration Section */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                <h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Interakt Integration</h4>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Interakt Agent Email</label>
                  <input 
                    type="email" 
                    required={formData.interakt_agent_status === 'ACTIVE'}
                    value={formData.interakt_agent_email}
                    onChange={e => setFormData({...formData, interakt_agent_email: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white dark:bg-[#151521] border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:text-white transition-all shadow-sm outline-none placeholder:text-slate-400"
                    placeholder="agent@example.com"
                  />
                  {formData.interakt_agent_status === 'ACTIVE' && (
                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">Email is mandatory when status is Active.</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Status</label>
                    <select 
                      value={formData.interakt_agent_status}
                      onChange={e => setFormData({...formData, interakt_agent_status: e.target.value})}
                      className="w-full px-4 py-2.5 bg-white dark:bg-[#151521] border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:text-white transition-all shadow-sm outline-none"
                    >
                      <option value="NOT_REGISTERED">NOT REGISTERED</option>
                      <option value="PENDING">PENDING</option>
                      <option value="ACTIVE">ACTIVE</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Last Verified</label>
                    <div className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 text-sm">
                      {formData.interakt_last_verified_at ? new Date(formData.interakt_last_verified_at).toLocaleDateString() : 'Verify Later'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-5 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={createMutation.isLoading || updateMutation.isLoading} className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md shadow-blue-500/20 active:scale-95">
                  Save Telecaller
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isUploadModalOpen && selectedTelecaller && (
        <SyncCampaignModal 
          telecaller={selectedTelecaller}
          onClose={() => setIsUploadModalOpen(false)}
          onSuccess={() => {}}
        />
      )}

      {/* Error Warning Modal */}
      {errorModalMsg && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-[#1e1e2f] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-blue-500/30 transition-all duration-300 animate-fade-in-up">
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-2 border border-red-500/20">
                <Shield className="text-red-600 dark:text-red-400 w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Error</h3>
              <p className="text-slate-600 dark:text-slate-300 font-medium text-sm leading-relaxed px-2">
                {errorModalMsg}
              </p>
              <div className="pt-4">
                <button 
                  onClick={() => setErrorModalMsg("")} 
                  className="w-full px-5 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                >
                  Okay, Understood
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Telecallers;
