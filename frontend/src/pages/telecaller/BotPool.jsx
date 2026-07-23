import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/axios";
import { Database, Clock, AlertCircle, CheckCircle2, Loader2, Phone, User, Send, ArrowRight, ShieldAlert, Sparkles, XCircle } from "lucide-react";
import { cn } from "../../components/ui/Skeleton";
import CallButton from "../../components/CallButton";
import toast from "react-hot-toast";

const STATUS_OPTIONS = [
  "Ringing", "Call Back", "Info Given", "Wrong No", "Int Angel", "Think&LMK", "Not Int", "RdyKYC", "Night Chat"
];

const BotPool = () => {
  const queryClient = useQueryClient();
  const [status1, setStatus1] = useState("");
  const [remark, setRemark] = useState("");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["botPoolStatus"],
    queryFn: async () => {
      const res = await api.get("/api/telecaller/bot-pool/status");
      return res.data;
    },
    refetchInterval: 5000 // auto refresh every 5s to check queue/pool changes
  });

  const activeLeadId = data?.latest_assigned_lead?.id;

  const { data: validation, isLoading: validationLoading } = useQuery({
    queryKey: ["statusPermission", "bot", activeLeadId],
    queryFn: async () => {
      if (!activeLeadId) return null;
      const res = await api.get(`/api/telecaller/leads/bot/${activeLeadId}/status-permission`);
      return res.data;
    },
    enabled: !!activeLeadId,
    refetchInterval: 3000
  });

  const fetchMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/api/telecaller/bot-pool/fetch");
      return res.data;
    },
    onSuccess: (resData) => {
      if (resData.assigned) {
        toast.success("Lead assigned successfully!");
        // Reset local form inputs
        setStatus1("");
        setRemark("");
      } else if (resData.queued) {
        toast.success(resData.message || "Added to waiting queue!");
      }
      queryClient.invalidateQueries(["botPoolStatus"]);
      queryClient.invalidateQueries(["telecallerLeadsSummary"]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to fetch lead.");
    }
  });

  const exitQueueMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/api/telecaller/bot-pool/exit-queue");
      return res.data;
    },
    onSuccess: (resData) => {
      toast.success(resData.message || "Exited queue successfully!");
      queryClient.invalidateQueries(["botPoolStatus"]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to exit queue.");
    }
  });

  const statusMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/api/telecaller/bot-pool/status1", payload);
      return res.data;
    },
    onSuccess: (resData) => {
      toast.success(resData.message || "Status 1 updated!");
      setStatus1("");
      setRemark("");
      queryClient.invalidateQueries(["botPoolStatus"]);
      queryClient.invalidateQueries(["telecallerLeadsSummary"]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to update Status 1.");
    }
  });

  const handleSubmitStatus = (e) => {
    e.preventDefault();
    if (!data?.latest_assigned_lead?.id) return;
    if (!status1) {
      toast.error("Please select a Status 1 option.");
      return;
    }

    statusMutation.mutate({
      lead_id: data.latest_assigned_lead.id,
      status1: status1,
      status1_remark: remark
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (isError) {
    const isPaused = error?.response?.status === 403;
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-slate-500">
        <AlertCircle size={48} className={`mb-4 ${isPaused ? 'text-orange-400' : 'text-red-400'}`} />
        <p className="text-lg font-medium text-slate-900 dark:text-white">
          {isPaused ? error.response.data?.message : "Failed to load Bot Pool status."}
        </p>
        {!isPaused && (
          <button 
            onClick={() => refetch()} 
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  const availableCount = data?.available_count || 0;
  const isWaiting = data?.queue_position > 0;
  const isBlocked = !data?.is_eligible_for_fetch;
  const activeLead = data?.latest_assigned_lead;
  const isStatus1Locked = activeLead?.status1_locked || validation?.status1_locked || activeLead?.status_lock_type === 'UNDER_US' || activeLead?.is_kyc_done === 1;
  const status1LockReason = validation?.status1_lock_reason || activeLead?.status1_lock_reason || (activeLead?.is_kyc_done === 1 ? "KYC Done" : activeLead?.status_lock_type === 'UNDER_US' ? "Locked by Admin" : "Locked after midnight");

  return (
    <div className="space-y-8 animate-fade-in-up max-w-5xl mx-auto pb-12">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900/40 via-purple-900/20 to-transparent p-6 rounded-3xl border border-indigo-500/20 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/10">
            <Database className="w-7 h-7 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Bot Pool <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">
              Fetch real-time leads from the Common Campaign pool and initiate first contact.
            </p>
          </div>
        </div>
      </div>

      {/* Blocking Alert */}
      {isBlocked && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-start gap-3 text-amber-800 dark:text-amber-300">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div>
            <h4 className="font-bold text-sm">Status 1 Update Required</h4>
            <p className="text-xs mt-0.5 opacity-90">
              You must submit Status 1 for your currently assigned lead before fetching another lead from the pool.
            </p>
          </div>
        </div>
      )}

      {/* Pool Stats & Action Area */}
      {!activeLead && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in zoom-in-95 duration-200">
          
          {/* Available Leads Block */}
          <div className="bg-white dark:bg-[#1e1e2f] p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-indigo-500/50 transition-all duration-300">
            <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/10 dark:group-hover:bg-indigo-500/20 transition-all duration-500" />
            
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                <Database size={24} />
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-full flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Pool
              </span>
            </div>

            <div>
              <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                Available Leads
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                  {availableCount}
                </span>
                <span className="text-sm font-bold text-slate-400 dark:text-slate-500">leads in queue</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>Auto-refreshes every 5s</span>
              <span className="text-indigo-500">LIFO Priority</span>
            </div>
          </div>

          {/* Action Block */}
          <div className="bg-white dark:bg-[#1e1e2f] p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold">
                  <Clock size={24} />
                </div>
                {isWaiting && (
                  <span className="text-xs font-bold px-3 py-1 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-full animate-bounce">
                    In Queue: #{data.queue_position}
                  </span>
                )}
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {isWaiting ? "Waiting for Lead Assignment" : "Ready to Work?"}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                {isWaiting 
                  ? `You are currently # ${data.queue_position} in line. As soon as a lead is added to the pool or released, you will be assigned automatically.`
                  : "Click below to grab the freshest lead from the Bot Pool. Once assigned, you must initiate a call and update Status 1 to proceed."
                }
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/80">
              {isWaiting ? (
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="w-full sm:w-auto flex-1 py-3.5 px-6 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 font-bold text-sm flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Waiting in Queue (Pos: #{data.queue_position})</span>
                  </div>
                  <button
                    onClick={() => exitQueueMutation.mutate()}
                    disabled={exitQueueMutation.isPending}
                    className="w-full sm:w-auto py-3.5 px-5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-sm rounded-2xl transition-colors flex items-center justify-center gap-2 border border-rose-200 dark:border-rose-500/30"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Exit Queue</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fetchMutation.mutate()}
                  disabled={fetchMutation.isPending || isBlocked}
                  className={cn(
                    "w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 shadow-lg",
                    fetchMutation.isPending || isBlocked
                      ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none"
                      : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0"
                  )}
                >
                  {fetchMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Assigning Lead...</span>
                    </>
                  ) : (
                    <>
                      <span>Fetch Lead Now</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Assigned Lead Card (Pending Status 1) */}
      {activeLead ? (
        <div className="bg-white dark:bg-[#1e1e2f] rounded-3xl border-2 border-indigo-500/30 dark:border-indigo-500/40 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-gradient-to-r from-indigo-600/10 via-purple-600/10 to-transparent p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-indigo-500 animate-ping" />
              <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Currently Assigned Lead
              </h2>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
              Pending Status 1
            </span>
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            
            {/* Lead Details Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 font-bold text-xl">
                  {activeLead.lead_name?.charAt(0).toUpperCase() || <User size={24} />}
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Lead Name
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                    {activeLead.lead_name || "Unknown Lead"}
                  </h3>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Phone Number
                  </span>
                  <span className="text-base font-mono font-bold text-slate-900 dark:text-white mt-0.5 block">
                    {activeLead.lead_contact || "N/A"}
                  </span>
                </div>
                {activeLead.lead_contact && (
                  <CallButton phone={activeLead.lead_contact} leadId={activeLead.id} />
                )}
              </div>
            </div>



            {/* Status 1 Update Form */}
            {isStatus1Locked && (
              <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl text-amber-800 dark:text-amber-300 text-sm font-bold flex items-center gap-2">
                <span>🔒 Status 1 cannot be edited: {status1LockReason}</span>
              </div>
            )}
            <form onSubmit={handleSubmitStatus} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Status 1 Dropdown */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                    Select Status 1 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={status1}
                    onChange={(e) => setStatus1(e.target.value)}
                    required
                    disabled={isStatus1Locked}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white text-sm font-semibold outline-none transition-all cursor-pointer disabled:opacity-50"
                  >
                    <option value="" disabled>-- Choose Status --</option>
                    {STATUS_OPTIONS.map((opt) => {
                      if (opt === "Night Chat") {
                        const kolkataTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata", hour12: false, hour: "numeric" });
                        const hour = parseInt(kolkataTime, 10);
                        const isNightChatAllowed = hour >= 21 || hour < 9;
                        if (!isNightChatAllowed) {
                          return null; // Hide it completely when outside allowed hours
                        }
                      }
                      return (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Remark Textarea */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                    Remark (Optional)
                  </label>
                  <input
                    type="text"
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    disabled={isStatus1Locked}
                    placeholder="Enter short conversation notes..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white text-sm outline-none transition-all disabled:opacity-50"
                  />
                </div>

              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isStatus1Locked || !status1 || statusMutation.isPending}
                  className={cn(
                    "px-8 py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider transition-all duration-200 flex items-center gap-2 shadow-lg",
                    isStatus1Locked || !status1 || statusMutation.isPending
                      ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0"
                  )}
                >
                  {statusMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Status 1</span>
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      ) : (
        /* Empty state when no lead is currently pending */
        <div className="bg-white dark:bg-[#1e1e2f] rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 border-dashed space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500">
            <CheckCircle2 size={32} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Pending Leads</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              You don't have any fetched leads waiting for Status 1. Click the <span className="font-bold text-indigo-500">Fetch Lead</span> button above to grab a new lead from the pool!
            </p>
          </div>
        </div>
      )}

    </div>
  );
};

export default BotPool;
