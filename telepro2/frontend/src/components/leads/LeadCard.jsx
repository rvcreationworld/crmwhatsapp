import { cn } from "../ui/Skeleton";
import { User, Phone, Calendar, ArrowRight } from "lucide-react";

const STATUS_COLORS = {
  "None": "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  "Ringing": "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300",
  "Call Back": "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300",
  "Info Given": "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-300",
  "Wrong No": "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  "Int Angel": "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300",
  "Think&LMK": "bg-pink-100 text-pink-800 dark:bg-pink-500/20 dark:text-pink-300",
  "Not Int": "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300",
  "RdyKYC": "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  // Closed
  "Not Int": "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300",
  "Wrong No": "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
};

/**
 * Compute latest status for display.
 * leadCategory: "normal" | "free" | "transferred" | "closed"
 */
export const getLatestStatus = (lead, leadCategory = "normal") => {
  if (leadCategory === "closed") {
    return lead.closing_status || lead.status4 || lead.status3 || lead.status2 || lead.status1 || null;
  }
  if (leadCategory === "free" || leadCategory === "transferred") {
    return lead.status4 || lead.status3 || lead.status2 || lead.status1 || null;
  }
  return lead.status3 || lead.status2 || lead.status1 || null;
};

export const getLatestTimestamp = (lead, leadCategory = "normal") => {
  if (leadCategory === "closed") {
    return lead.closing_status ? lead.status4_timestamp : (lead.status3_timestamp || lead.status2_timestamp || lead.status1_timestamp);
  }
  if (leadCategory === "free" || leadCategory === "transferred") {
    return lead.status4_timestamp || lead.status3_timestamp || lead.status2_timestamp || lead.status1_timestamp;
  }
  return lead.status3_timestamp || lead.status2_timestamp || lead.status1_timestamp;
};

/**
 * LeadCard — compact card showing one lead.
 * Props:
 *   lead: lead object
 *   onClick: () => void — opens details modal
 *   showTelecaller: boolean — admin view
 *   leadCategory: "normal" | "free" | "transferred" | "closed"
 *   sourceLabel: optional string override for source
 */
const LeadCard = ({ lead, onClick, showTelecaller = false, leadCategory = "normal", sourceLabel }) => {
  const latestStatus = getLatestStatus(lead, leadCategory);
  const latestTimestamp = getLatestTimestamp(lead, leadCategory);
  const statusColor = STATUS_COLORS[latestStatus] || STATUS_COLORS["None"];

  const displaySource = sourceLabel
    || (lead.source === 'PERSONAL_META_AD' ? 'Meta Campaign'
      : lead.source === 'BOT_POOL' ? 'Bot Pool'
      : lead.original_table ? lead.original_table
      : lead.source || 'Unknown');

  return (
    <div
      onClick={onClick}
      className="group bg-white dark:bg-[#1e1e2f] border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all cursor-pointer flex flex-col gap-3"
    >
      {/* Top row: avatar + name + status badge */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
          <User size={15} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {lead.lead_name || "Unknown"}
          </h3>
          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            <Phone size={10} />
            <span className="font-medium">{lead.lead_contact || lead.contact_last10 || "—"}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {latestStatus && (
            <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold", statusColor)}>
              {latestStatus}
            </span>
          )}
          {lead.is_untouched && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 border border-red-200 dark:border-red-800/30">
              Untouched
            </span>
          )}
          {leadCategory === 'free' && lead.import_source === 'BULK_UPLOAD' && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400 border border-purple-200 dark:border-purple-800/30">
              BULK
            </span>
          )}
          {leadCategory === 'free' && (!lead.import_source || lead.import_source === 'AUTO_30_DAYS') && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-200 dark:border-blue-800/30">
              AUTO 30 DAYS
            </span>
          )}
        </div>
      </div>

      {/* Meta row */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
        <div>
          <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px] block">Source</span>
          <span className="text-slate-700 dark:text-slate-300 font-medium truncate block">{displaySource}</span>
        </div>
        {showTelecaller && (
          <div>
            <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px] block">Telecaller</span>
            <span className="text-slate-700 dark:text-slate-300 font-medium truncate block">{lead.telecaller_name || lead.current_telecaller_name || "—"}</span>
          </div>
        )}
        <div>
          <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px] block flex items-center gap-1">
            <Calendar size={8} /> 
            {leadCategory === 'free' && lead.import_source === 'BULK_UPLOAD' ? 'Uploaded At' : 'Created'}
          </span>
          <span className="text-slate-700 dark:text-slate-300 font-medium">
            {leadCategory === 'free' && lead.import_source === 'BULK_UPLOAD' 
              ? new Date(lead.moved_to_free_at || lead.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
              : new Date(lead.created_at || lead.original_created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
          </span>
        </div>
        {latestTimestamp && (
          <div>
            <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px] block">Last Updated</span>
            <span className="text-slate-700 dark:text-slate-300 font-medium">{new Date(latestTimestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end pt-1 border-t border-slate-100 dark:border-slate-800">
        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:gap-2 transition-all">
          View Details <ArrowRight size={12} />
        </span>
      </div>
    </div>
  );
};

export default LeadCard;
