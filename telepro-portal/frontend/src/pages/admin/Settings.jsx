import { useState, useEffect } from "react";
import api from "../../api/axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { RefreshCw, Phone, Shield, X, ChevronRight, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Settings = () => {
  const [activeModal, setActiveModal] = useState(null);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncInterval, setSyncInterval] = useState(4);
  const [statusLockingEnabled, setStatusLockingEnabled] = useState(true);

  // CallPulse Settings
  const [cpEnabled, setCpEnabled] = useState(true);
  const [cpGreen, setCpGreen] = useState(100);
  const [cpYellow, setCpYellow] = useState(60);
  const [cpRed, setCpRed] = useState(10);
  const [cpBlue, setCpBlue] = useState(0);
  const navigate = useNavigate();
  
  const queryClient = useQueryClient();

  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ["appSettings"],
    queryFn: async () => {
      const res = await api.get("/api/settings");
      return res.data;
    }
  });

  const { data: callpulseData, isLoading: callpulseLoading } = useQuery({
    queryKey: ["callpulseSettings"],
    queryFn: async () => {
      const res = await api.get("/api/settings/callpulse-status-rules");
      return res.data;
    }
  });

  useEffect(() => {
    if (settingsData) {
      if (settingsData.sync_interval) setSyncInterval(settingsData.sync_interval);
      if (settingsData.status_locking_enabled !== undefined) setStatusLockingEnabled(settingsData.status_locking_enabled === '1');
    }
  }, [settingsData]);

  useEffect(() => {
    if (callpulseData) {
      if (callpulseData.enabled !== undefined) setCpEnabled(callpulseData.enabled);
      if (callpulseData.green_min_seconds !== undefined) setCpGreen(callpulseData.green_min_seconds);
      if (callpulseData.yellow_min_seconds !== undefined) setCpYellow(callpulseData.yellow_min_seconds);
      if (callpulseData.red_min_seconds !== undefined) setCpRed(callpulseData.red_min_seconds);
      if (callpulseData.blue_min_seconds !== undefined) setCpBlue(callpulseData.blue_min_seconds);
    }
  }, [callpulseData]);

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error("Current password is required");
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await api.put("/api/admin/change-credentials", { 
        currentPassword,
        newUsername: newUsername || undefined, 
        newPassword: newPassword || undefined 
      });
      toast.success("Admin password changed successfully. Please login again.");
      
      // Securely logout after changing credentials
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("user");
      navigate("/");
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to update credentials");
    } finally {
      setLoading(false);
    }
  };

  const updateSettingsMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.put("/api/settings", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Settings updated successfully!");
      queryClient.invalidateQueries(["appSettings"]);
      setActiveModal(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update settings");
    }
  });

  const handleSyncSubmit = (e) => {
    e.preventDefault();
    updateSettingsMutation.mutate({ sync_interval: syncInterval });
  };

  const handleStatusLockingSubmit = (e) => {
    e.preventDefault();
    updateSettingsMutation.mutate({ status_locking_enabled: statusLockingEnabled ? '1' : '0' });
  };

  const updateCallpulseMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.put("/api/settings/callpulse-status-rules", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("CallPulse Rules updated successfully!");
      queryClient.invalidateQueries(["callpulseSettings"]);
      setActiveModal(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update CallPulse rules");
    }
  });



  const handleCallPulseSubmit = (e) => {
    e.preventDefault();
    updateCallpulseMutation.mutate({ 
      enabled: cpEnabled,
      green_min_seconds: cpGreen,
      yellow_min_seconds: cpYellow,
      red_min_seconds: cpRed,
      blue_min_seconds: cpBlue
    });
  };

  const SettingBlock = ({ icon: Icon, title, description, value, onClick, isLoading }) => (
    <button
      onClick={onClick}
      className="w-full group relative flex items-center gap-4 sm:gap-6 p-5 bg-white dark:bg-[#1e1e2f] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all text-left overflow-hidden"
    >
      <div className="p-4 bg-indigo-50/50 dark:bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 rounded-xl group-hover:scale-110 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 transition-all duration-300">
        <Icon size={24} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {title}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 pr-4">
          {description}
        </p>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        {value && (
          <div className="hidden sm:flex px-3 py-1 bg-slate-100 dark:bg-[#151521] text-slate-600 dark:text-slate-300 rounded-lg text-sm font-semibold border border-slate-200 dark:border-slate-700">
            {isLoading ? <div className="w-8 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" /> : value}
          </div>
        )}
        <div className="p-2 text-slate-300 group-hover:text-indigo-500 transition-colors group-hover:translate-x-1 duration-300">
          <ChevronRight size={20} />
        </div>
      </div>
    </button>
  );

  // Sub-view rendering
  if (activeModal) {
    let title, icon, content;
    
    if (activeModal === 'sync') {
      title = "Auto-Sync Schedule";
      icon = RefreshCw;
      content = (
        <form onSubmit={handleSyncSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Sync Interval
            </label>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              How often should the system automatically check connected Google Sheets for new leads?
            </p>
            <select
              value={syncInterval}
              onChange={(e) => setSyncInterval(Number(e.target.value))}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-[#151521] border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white transition-all shadow-sm outline-none font-medium"
            >
              <option value={2}>Every 2 minutes</option>
              <option value={4}>Every 4 minutes</option>
              <option value={6}>Every 6 minutes</option>
              <option value={8}>Every 8 minutes</option>
              <option value={10}>Every 10 minutes</option>
            </select>
          </div>
          <button 
            type="submit" 
            disabled={updateSettingsMutation.isLoading || settingsLoading}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-500/20 active:scale-95"
          >
            {updateSettingsMutation.isLoading ? "Saving..." : "Save Changes"}
          </button>
        </form>
      );

    } else if (activeModal === 'callpulse') {
      title = "CallPulse Status Rules";
      icon = Zap;
      content = (
        <form onSubmit={handleCallPulseSubmit} className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-[#151521] border border-slate-200 dark:border-slate-700 rounded-xl">
            <div>
              <label className="text-sm font-bold text-slate-900 dark:text-white">Enable CallPulse Validation</label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">If disabled, status updates won't require call history.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={cpEnabled} onChange={e => setCpEnabled(e.target.checked)} />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-[#151521] border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
              <label className="block text-sm font-semibold text-emerald-600 dark:text-emerald-400">Green Statuses</label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Int Angel, Interested, RdyKYC</p>
              <input type="number" value={cpGreen} onChange={e => setCpGreen(Number(e.target.value))} className="w-full px-4 py-2 bg-white dark:bg-[#1e1e2f] border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500/50 outline-none font-medium dark:text-white" min={0} />
              <div className="text-[10px] text-slate-400 uppercase font-semibold text-right">Seconds required</div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-[#151521] border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
              <label className="block text-sm font-semibold text-yellow-600 dark:text-yellow-400">Yellow Statuses</label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Think&LMK, Info Given</p>
              <input type="number" value={cpYellow} onChange={e => setCpYellow(Number(e.target.value))} className="w-full px-4 py-2 bg-white dark:bg-[#1e1e2f] border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-yellow-500/50 outline-none font-medium dark:text-white" min={0} />
              <div className="text-[10px] text-slate-400 uppercase font-semibold text-right">Seconds required</div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-[#151521] border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
              <label className="block text-sm font-semibold text-red-600 dark:text-red-400">Red Statuses</label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Not Int, Call Back</p>
              <input type="number" value={cpRed} onChange={e => setCpRed(Number(e.target.value))} className="w-full px-4 py-2 bg-white dark:bg-[#1e1e2f] border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500/50 outline-none font-medium dark:text-white" min={0} />
              <div className="text-[10px] text-slate-400 uppercase font-semibold text-right">Seconds required</div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-[#151521] border border-slate-200 dark:border-slate-700 rounded-xl space-y-2 relative opacity-70">
              <label className="block text-sm font-semibold text-blue-600 dark:text-blue-400">Blue Statuses</label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Ringing, Wrong No</p>
              <input type="number" value={cpBlue} readOnly className="w-full px-4 py-2 bg-white dark:bg-[#1e1e2f] border border-slate-300 dark:border-slate-600 rounded-lg outline-none font-medium text-slate-400" />
              <div className="text-[10px] text-blue-500 mt-1 font-semibold leading-tight">Blue statuses only require an outgoing dial. Duration is not enforced.</div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={updateCallpulseMutation.isLoading || callpulseLoading}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-500/20 active:scale-95"
          >
            {updateCallpulseMutation.isLoading ? "Saving..." : "Save CallPulse Rules"}
          </button>
        </form>
      );
    } else if (activeModal === 'credentials') {
      title = "Admin Credentials";
      icon = Shield;
      content = (
        <form onSubmit={handleCredentialsSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Current Password</label>
            <input 
              type="password" 
              placeholder="Enter your current password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-[#151521] border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white transition-all shadow-sm outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">New Username</label>
            <input 
              type="text" 
              placeholder="Leave blank to keep current"
              value={newUsername}
              onChange={e => setNewUsername(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-[#151521] border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white transition-all shadow-sm outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">New Password</label>
            <input 
              type="password" 
              placeholder="Leave blank to keep current"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-[#151521] border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white transition-all shadow-sm outline-none"
            />
          </div>
          {newPassword && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Confirm New Password</label>
              <input 
                type="password" 
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-[#151521] border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white transition-all shadow-sm outline-none"
              />
            </div>
          )}
          <div className="pt-2">
            <button 
              type="submit" 
              disabled={loading || !currentPassword || (!newUsername && !newPassword)}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-500/20 active:scale-95"
            >
              {loading ? "Updating..." : "Save Password"}
            </button>
          </div>
        </form>
      );
    } else if (activeModal === 'status-locking') {
      title = "Status Locking";
      icon = Shield;
      content = (
        <form onSubmit={handleStatusLockingSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Enable Status Locking
            </label>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Control whether telecaller statuses are locked after updates / KYC / Under Us rules.
            </p>
            
            <div className={`p-5 rounded-xl border-2 transition-all ${statusLockingEnabled ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`font-bold ${statusLockingEnabled ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                  {statusLockingEnabled ? 'Locking Active' : 'Locking Disabled'}
                </span>
                <button
                  type="button"
                  onClick={() => setStatusLockingEnabled(!statusLockingEnabled)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${statusLockingEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${statusLockingEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <p className={`text-sm ${statusLockingEnabled ? 'text-indigo-600/80 dark:text-indigo-400/80' : 'text-slate-500 dark:text-slate-400'}`}>
                {statusLockingEnabled 
                  ? "Status locking is active. Original lock rules are applied."
                  : "Status locking is disabled. Telecallers can update statuses anytime."}
              </p>
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={updateSettingsMutation.isLoading}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-500/20 active:scale-95"
          >
            {updateSettingsMutation.isLoading ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      );
    }

    const Icon = icon;

    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-in slide-in-from-right-4 fade-in duration-300 pb-10">
        <button 
          onClick={() => setActiveModal(null)}
          className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors group font-semibold"
        >
          <div className="p-1.5 bg-white dark:bg-[#1a1a24] rounded-lg shadow-sm group-hover:shadow border border-slate-200 dark:border-slate-700">
            <ChevronRight size={18} className="rotate-180" />
          </div>
          Back to Settings
        </button>

        <div className="bg-white dark:bg-[#1e1e2f] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl">
              <Icon size={28} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h2>
            </div>
          </div>
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-10">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">System Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Manage your application's core configuration and rules.</p>
      </div>
      
      <div className="grid gap-4">
        <SettingBlock 
          icon={RefreshCw}
          title="Auto-Sync Schedule"
          description="Configure how often Google Sheets automatically sync new leads."
          value={`${syncInterval} mins`}
          isLoading={settingsLoading}
          onClick={() => setActiveModal('sync')}
        />
        <SettingBlock
          icon={Shield}
          title="Status Locking"
          description="Enable or disable telecaller status lock restrictions."
          value={settingsLoading ? "..." : (statusLockingEnabled ? "ON" : "OFF")}
          onClick={() => setActiveModal('status-locking')}
          isLoading={settingsLoading}
        />

        <SettingBlock 
          icon={Shield}
          title="Admin Credentials"
          description="Update your username or password for the admin dashboard."
          onClick={() => setActiveModal('credentials')}
        />

        <SettingBlock 
          icon={Zap}
          title="CallPulse Status Rules"
          description="Configure required CallPulse connection times for specific statuses."
          value={callpulseLoading ? "" : cpEnabled ? "Enabled" : "Disabled"}
          isLoading={callpulseLoading}
          onClick={() => setActiveModal('callpulse')}
        />
      </div>
    </div>
  );
};

export default Settings;
