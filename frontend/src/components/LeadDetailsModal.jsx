import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/axios";
import { User, Phone, Save, Loader2, X, Tag, Calendar, Clock } from "lucide-react";
import { cn } from "./ui/Skeleton";
import { LeadCallHistory } from "./LeadCallHistory";
import CallButton from "./CallButton";
import toast from "react-hot-toast";

const STATUS_OPTIONS = [
  "None", "Ringing", "Call Back", "Info Given", "Wrong No", "Int Angel", "Think&LMK", "Not Int", "RdyKYC"
];

const STATUS_COLORS = {
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

const StatusCard = ({ label, value, remark, timestamp, locked, lockReason, input, remarkInput, onInput, onRemark, isEditable, options, isBot }) => {
  const isActive = label === "Status 3" || label === "Final Status";
  return (
    <div className={cn(
      "rounded-xl border p-3 flex flex-col gap-2",
      isActive
        ? "bg-indigo-50/60 dark:bg-indigo-500/5 border-indigo-100 dark:border-indigo-500/20"
        : "bg-white dark:bg-[#1a1a24] border-slate-200 dark:border-slate-700"
    )}>
      <div className="flex items-center justify-between gap-2 min-h-[22px]">
        <span className={cn(
          "text-[11px] font-bold uppercase tracking-wider",
          isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"
        )}>{label}</span>
        {locked && (
          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-500/20 shrink-0">
            🔒 {lockReason}
          </span>
        )}
      </div>

      {isEditable ? (
        <>
          <select
            value={input}
            onChange={(e) => onInput(e.target.value)}
            disabled={locked}
            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-[#151521] border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white transition-all outline-none text-sm font-semibold disabled:opacity-50"
          >
            <option value="None" disabled>Select Status</option>
            {(options || STATUS_OPTIONS).filter(o => o !== "None").map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <textarea
            value={remarkInput}
            onChange={(e) => onRemark(e.target.value)}
            disabled={locked}
            rows={2}
            placeholder="Add remark..."
            style={{ minHeight: 62, maxHeight: 80, resize: "none" }}
            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-[#151521] border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white transition-all outline-none text-sm disabled:opacity-50"
          />
          {timestamp && (
            <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
              <Clock size={10} />{new Date(timestamp).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true })}
            </p>
          )}
        </>
      ) : (
        <>
          <span className={cn("px-2 py-0.5 rounded text-xs font-bold self-start", STATUS_COLORS[value] || STATUS_COLORS["None"])}>
            {value || "Not Updated"}
          </span>
          {remark && <p className="text-xs text-slate-500 dark:text-slate-400 italic line-clamp-2">"{remark}"</p>}
          {timestamp && (
            <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
              <Clock size={10} />{new Date(timestamp).toLocaleDateString()}
            </p>
          )}
        </>
      )}
    </div>
  );
};

const LeadDetailsModal = ({ isOpen, onClose, lead, type, userRole, queryKeyToInvalidate }) => {
  const [status1Input, setStatus1Input] = useState(lead?.status1 || "None");
  const [status1RemarkInput, setStatus1RemarkInput] = useState(lead?.status1_remark || "");
  const [status2Input, setStatus2Input] = useState(lead?.status2 || "None");
  const [status2RemarkInput, setStatus2RemarkInput] = useState(lead?.status2_remark || "");
  const [status3Input, setStatus3Input] = useState(lead?.status3 || "None");
  const [status3RemarkInput, setStatus3RemarkInput] = useState(lead?.status3_remark || "");
  const [activeTab, setActiveTab] = useState('PROFILE');

  const queryClient = useQueryClient();

  const { data: validation } = useQuery({
    queryKey: ["statusPermission", type, lead?.id],
    queryFn: async () => {
      if (!lead || userRole !== 'TELECALLER') return null;
      const res = await api.get(`/api/telecaller/leads/${type}/${lead.id}/status-permission`);
      return res.data;
    },
    enabled: !!lead && userRole === 'TELECALLER'
  });

  useEffect(() => {
    if (lead) {
      setStatus1Input(lead.status1 || "None");
      setStatus1RemarkInput(lead.status1_remark || "");
      setStatus2Input(lead.status2 || "None");
      setStatus2RemarkInput(lead.status2_remark || "");
      setStatus3Input(lead.status3 || "None");
      setStatus3RemarkInput(lead.status3_remark || "");
      setActiveTab('PROFILE');
    }
  }, [lead]);

  const updateMutation = useMutation({
    mutationFn: async (payload) => {
      const endpoint = type === "bot"
        ? `/api/working-sheet/${lead.id}/telecaller-update`
        : `/api/direct-leads/${lead.id}/status`;
      const res = await api.put(endpoint, payload);
      return res.data;
    },
    onSuccess: () => {
      if (queryKeyToInvalidate) {
        queryClient.invalidateQueries([queryKeyToInvalidate]);
      } else {
        queryClient.invalidateQueries(["telecallerLeadsList"]);
        queryClient.invalidateQueries(["adminLeadsList"]);
      }
      toast.success("Lead status updated successfully!");
      onClose();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update status. Please try again.");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!lead) return;
    updateMutation.mutate({
      status1: status1Input,
      status1_remark: status1RemarkInput,
      status2: status2Input,
      status2_remark: status2RemarkInput,
      status3: status3Input,
      status3_remark: status3RemarkInput
    });
  };

  const isKycDone = lead?.is_kyc_done === 1 || lead?.status_lock_type === 'KYC_DONE';
  const isUnderUs = lead?.status_lock_type === 'UNDER_US';
  const isStatus1Locked = lead?.status1_locked || validation?.status1_locked || isUnderUs || isKycDone;
  const status1LockReason = validation?.status1_lock_reason || lead?.status1_lock_reason || (isKycDone ? "KYC Done" : isUnderUs ? "Under Us" : "Locked");
  const isStatus2Locked = lead?.status2_locked || validation?.status2_locked || isKycDone;
  const status2LockReason = validation?.status2_lock_reason || lead?.status2_lock_reason || (isKycDone ? "KYC Done" : "Locked");
  const isStatus3Locked = lead?.status3_locked || validation?.status3_locked || isKycDone;

  // For bot: status2 requires status1 locked (set); for direct: requires status1Input set
  const status2Disabled = isStatus2Locked || (type === "bot" ? !isStatus1Locked : (status1Input === 'None' || !isStatus1Locked));
  const status3Disabled = isStatus3Locked || (type === "bot" ? !isStatus1Locked : status2Input === 'None');

  const isAdminOrLocked = userRole === 'ADMIN' || isKycDone || lead?.status_lock_type === 'KYC_DONE';

  if (!isOpen || !lead) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-5"
        onClick={onClose}
      >
        <div
          className="bg-white dark:bg-[#1e1e2f] w-full max-w-[1000px] max-h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ animation: "zoom-in 0.15s ease" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <User size={15} />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight truncate">{lead.lead_name}</h2>
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs font-medium mt-0.5">
                  <Phone size={11} />
                  <span>{lead.lead_contact}</span>
                  <CallButton phone={lead.lead_contact} />
                </div>
              </div>
              {(isKycDone) && (
                <span className="hidden sm:flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 px-2 py-0.5 rounded-full shrink-0">
                  🛡️ KYC Done
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors shrink-0 ml-2"
            >
              <X size={18} />
            </button>
          </div>

          {/* ── Tabs ── */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-[#151521]/50">
            {["PROFILE", "LOGS"].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors",
                  activeTab === tab
                    ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                {tab === "PROFILE" ? "Profile & Status" : "Call Logs"}
              </button>
            ))}
          </div>

          {/* ── Content ── */}
          <div className="flex-1 overflow-hidden flex flex-col">

            {/* Profile Tab */}
            <div className={cn("flex-1 overflow-y-auto p-4 custom-scrollbar", activeTab === 'PROFILE' ? "block" : "hidden")}>
              <div className="space-y-4">

                {/* Meta row */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-[#151521] p-3 rounded-xl border border-slate-100 dark:border-slate-800/50">
                  {userRole === 'ADMIN' && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1"><User size={10} /> Telecaller</p>
                      <p className="text-sm text-slate-900 dark:text-white font-medium truncate">{lead.telecaller_name || 'Unassigned'}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1"><Tag size={10} /> Source</p>
                    <p className="text-sm text-slate-900 dark:text-white font-medium">{lead.source === 'PERSONAL_META_AD' ? 'Meta Campaign' : 'Telegram Bot'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1"><Calendar size={10} /> Created</p>
                    <p className="text-sm text-slate-900 dark:text-white font-medium">{new Date(lead.created_at).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>

                {/* Lock banners */}
                {isKycDone && (
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                    🛡️ KYC Done — All statuses are permanently locked.
                  </div>
                )}
                {!isKycDone && isUnderUs && (
                  <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 rounded-xl text-indigo-800 dark:text-indigo-300 text-xs font-bold flex items-center gap-2">
                    🔒 Status 1 locked by Under Us. Status 2 and 3 remain editable.
                  </div>
                )}

                {/* ── 3-column status grid ── */}
                {isAdminOrLocked ? (
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Status Overview</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <StatusCard label="Status 1" value={lead.status1} remark={lead.status1_remark} timestamp={lead.status1_timestamp} isEditable={false} />
                      <StatusCard label="Status 2" value={lead.status2} remark={lead.status2_remark} timestamp={lead.status2_timestamp} isEditable={false} />
                      <StatusCard label="Final Status" value={lead.status3} remark={lead.status3_remark} timestamp={lead.status3_timestamp} isEditable={false} />
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Update Status</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <StatusCard
                        label={type === "bot" ? "Status 1 (Bot)" : "Status 1"}
                        isEditable={true}
                        input={status1Input}
                        remarkInput={status1RemarkInput}
                        onInput={setStatus1Input}
                        onRemark={setStatus1RemarkInput}
                        locked={isStatus1Locked}
                        lockReason={status1LockReason}
                        timestamp={lead.status1_timestamp}
                      />
                      <StatusCard
                        label={type === "bot" ? "Status 2 (Bot)" : "Status 2"}
                        isEditable={true}
                        input={status2Input}
                        remarkInput={status2RemarkInput}
                        onInput={setStatus2Input}
                        onRemark={setStatus2RemarkInput}
                        locked={status2Disabled}
                        lockReason={status2LockReason}
                        timestamp={lead.status2_timestamp}
                      />
                      <StatusCard
                        label="Final Status"
                        isEditable={true}
                        input={status3Input}
                        remarkInput={status3RemarkInput}
                        onInput={setStatus3Input}
                        onRemark={setStatus3RemarkInput}
                        locked={status3Disabled}
                        timestamp={lead.status3_timestamp}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={updateMutation.isLoading || isKycDone}
                      className={cn(
                        "mt-4 w-full py-2.5 text-white font-bold text-sm rounded-xl transition-all shadow flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700",
                        (updateMutation.isLoading || isKycDone) && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {updateMutation.isLoading ? <Loader2 size={15} className="animate-spin" /> : <><Save size={15} /> Save Status</>}
                    </button>
                  </form>
                )}

              </div>
            </div>

            {/* Call Logs Tab */}
            <div className={cn("flex-1 overflow-hidden flex flex-col bg-slate-50/30 dark:bg-[#151521]/30", activeTab === 'LOGS' ? "flex" : "hidden")}>
              <div className="p-3 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-white/50 dark:bg-[#1e1e2f]/50">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock size={14} className="text-indigo-500" /> Call Logs
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <LeadCallHistory leadId={lead.id} leadType={type.toUpperCase()} minimumDuration={validation?.minimumDuration || 15} />
              </div>
            </div>

          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default LeadDetailsModal;
