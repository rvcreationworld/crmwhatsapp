import { FileText } from "lucide-react";
import LeadCard from "./LeadCard";

/**
 * LeadCardGrid — responsive grid of LeadCard components.
 * Props:
 *   leads: array of lead objects
 *   onLeadClick: (lead) => void
 *   showTelecaller: boolean
 *   leadCategory: "normal" | "free" | "transferred" | "closed"
 *   emptyMessage: optional string
 */
const LeadCardGrid = ({ leads = [], onLeadClick, showTelecaller = false, leadCategory = "normal", emptyMessage = "No leads found." }) => {
  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <FileText size={48} className="text-slate-300 dark:text-slate-600 mb-4" />
        <p className="text-lg font-medium text-slate-900 dark:text-white">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {leads.map((lead, idx) => (
        <LeadCard
          key={lead.id ?? idx}
          lead={lead}
          onClick={() => onLeadClick(lead)}
          showTelecaller={showTelecaller}
          leadCategory={leadCategory}
        />
      ))}
    </div>
  );
};

export default LeadCardGrid;
