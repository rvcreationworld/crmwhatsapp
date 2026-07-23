import { Link } from "react-router-dom";
import { CalendarDays, History, TrendingUp } from "lucide-react";
import { cn } from "../../components/ui/Skeleton";

const AdminLeadsHome = () => {
  const renderCard = (title, icon, linkTo, colorClass, subtitle) => (
    <Link 
      to={linkTo}
      className={cn(
        "relative p-6 rounded-2xl border transition-all duration-300 overflow-hidden group block hover:-translate-y-1 hover:shadow-lg",
        colorClass.bg, colorClass.border, colorClass.hoverBg
      )}
    >
      <div className="flex items-center gap-4 relative z-10">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors",
          colorClass.iconBg, colorClass.iconText
        )}>
          {icon}
        </div>
        <div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-current transition-colors">
            {title}
          </h3>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>
        </div>
      </div>
    </Link>
  );

  const colors = {
    current: {
      bg: "bg-white dark:bg-[#1e1e2f]",
      border: "border-slate-200 dark:border-slate-700 hover:border-indigo-500",
      hoverBg: "hover:ring-1 hover:ring-indigo-500/20",
      iconBg: "bg-indigo-50 dark:bg-indigo-500/10 group-hover:bg-indigo-100",
      iconText: "text-indigo-600 dark:text-indigo-400"
    },
    past: {
      bg: "bg-white dark:bg-[#1e1e2f]",
      border: "border-slate-200 dark:border-slate-700 hover:border-emerald-500",
      hoverBg: "hover:ring-1 hover:ring-emerald-500/20",
      iconBg: "bg-emerald-50 dark:bg-emerald-500/10 group-hover:bg-emerald-100",
      iconText: "text-emerald-600 dark:text-emerald-400"
    },
    old: {
      bg: "bg-white dark:bg-[#1e1e2f]",
      border: "border-slate-200 dark:border-slate-700 hover:border-amber-500",
      hoverBg: "hover:ring-1 hover:ring-amber-500/20",
      iconBg: "bg-amber-50 dark:bg-amber-500/10 group-hover:bg-amber-100",
      iconText: "text-amber-600 dark:text-amber-400"
    }
  };

  return (
    <div className="space-y-10 animate-fade-in-up h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Leads Base</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Select a time period to view leads.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {renderCard(
          "Current Month Leads", 
          <CalendarDays size={24} />, 
          "/admin/leads/current",
          colors.current,
          "Leads from the current calendar month"
        )}
        
        {renderCard(
          "Past Month Leads", 
          <TrendingUp size={24} />, 
          "/admin/leads/past",
          colors.past,
          "Leads exactly from last month"
        )}
        
        {renderCard(
          "Old Leads", 
          <History size={24} />, 
          "/admin/leads/old",
          colors.old,
          "Leads older than 1 month"
        )}
      </div>
    </div>
  );
};

export default AdminLeadsHome;
