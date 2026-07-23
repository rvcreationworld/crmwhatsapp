import { LayoutList, LayoutGrid } from "lucide-react";
import { cn } from "../ui/Skeleton";

/**
 * LeadViewToggle — compact List/Grid toggle button pair.
 * Props:
 *   viewMode: "list" | "grid"
 *   onChange: (mode: "list" | "grid") => void
 */
const LeadViewToggle = ({ viewMode, onChange }) => {
  return (
    <div className="flex items-center gap-0 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 shrink-0">
      <button
        onClick={() => onChange("list")}
        title="List View"
        className={cn(
          "p-1.5 rounded-md transition-all",
          viewMode === "list"
            ? "bg-white dark:bg-[#1e1e2f] text-indigo-600 dark:text-indigo-400 shadow-sm"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
        )}
      >
        <LayoutList size={16} />
      </button>
      <button
        onClick={() => onChange("grid")}
        title="Grid View"
        className={cn(
          "p-1.5 rounded-md transition-all",
          viewMode === "grid"
            ? "bg-white dark:bg-[#1e1e2f] text-indigo-600 dark:text-indigo-400 shadow-sm"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
        )}
      >
        <LayoutGrid size={16} />
      </button>
    </div>
  );
};

export default LeadViewToggle;
