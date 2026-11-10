import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import api from "../../api/axios";
import { Bot, Target, CalendarDays, Loader2, FileText, History, TrendingUp, Gift, ArrowRightLeft, Users } from "lucide-react";
import { cn } from "../../components/ui/Skeleton";

const AdminLeadsDashboard = () => {
  const { period } = useParams();
  const [telecallerId, setTelecallerId] = useState("all");

  const { data: telecallersData } = useQuery({
    queryKey: ["activeTelecallers"],
    queryFn: async () => {
      const res = await api.get('/api/telecallers?limit=100');
      return res.data;
    }
  });

  const { data: summary, isLoading, isError } = useQuery({
    queryKey: ["adminLeadsSummary", telecallerId],
    queryFn: async () => {
      const res = await api.get(`/api/admin/leads/summary?telecaller_id=${telecallerId}`);
      return res.data;
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500">
        <FileText size={48} className="mb-4 text-slate-300 dark:text-slate-700" />
        <p className="text-lg font-medium text-slate-900 dark:text-white">Failed to load leads summary.</p>
      </div>
    );
  }

  const renderCard = (title, count, icon, colorClass, linkTo, subtitle) => (
    <Link 
      to={linkTo + `?telecaller_id=${telecallerId}`}
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
        <div className="ml-auto text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          {count}
        </div>
      </div>
    </Link>
  );

  const botColor = {
    bg: "bg-white dark:bg-[#1e1e2f]",
    border: "border-slate-200 dark:border-slate-700 hover:border-indigo-500",
    hoverBg: "hover:ring-1 hover:ring-indigo-500/20",
    iconBg: "bg-indigo-50 dark:bg-indigo-500/10 group-hover:bg-indigo-100",
    iconText: "text-indigo-600 dark:text-indigo-400"
  };

  const directColor = {
    bg: "bg-white dark:bg-[#1e1e2f]",
    border: "border-slate-200 dark:border-slate-700 hover:border-purple-500",
    hoverBg: "hover:ring-1 hover:ring-purple-500/20",
    iconBg: "bg-purple-50 dark:bg-purple-500/10 group-hover:bg-purple-100",
    iconText: "text-purple-600 dark:text-purple-400"
  };

  const freeColor = {
    bg: "bg-white dark:bg-[#1e1e2f]",
    border: "border-slate-200 dark:border-slate-700 hover:border-amber-500",
    hoverBg: "hover:ring-1 hover:ring-amber-500/20",
    iconBg: "bg-amber-50 dark:bg-amber-500/10 group-hover:bg-amber-100",
    iconText: "text-amber-600 dark:text-amber-400"
  };

  const transferredColor = {
    bg: "bg-white dark:bg-[#1e1e2f]",
    border: "border-slate-200 dark:border-slate-700 hover:border-emerald-500",
    hoverBg: "hover:ring-1 hover:ring-emerald-500/20",
    iconBg: "bg-emerald-50 dark:bg-emerald-500/10 group-hover:bg-emerald-100",
    iconText: "text-emerald-600 dark:text-emerald-400"
  };

  return (
    <div className="space-y-10 animate-fade-in-up h-full overflow-y-auto custom-scrollbar pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link 
            to="/admin/leads"
            className="p-2 bg-white dark:bg-[#1e1e2f] border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600 dark:text-slate-300"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {period === 'current' && 'Current Leads Summary'}
              {period === 'past' && 'Past Month Leads Summary'}
              {period === 'old' && 'Old Leads Summary'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2">Global overview of all telecaller leads.</p>
          </div>
        </div>

        {/* Telecaller Select Dropdown */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
            <Users size={18} className="text-slate-500" />
          </div>
          <select
            value={telecallerId}
            onChange={(e) => setTelecallerId(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-[#1e1e2f] border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm font-medium dark:text-white outline-none cursor-pointer shadow-sm w-48 transition-all"
          >
            <option value="all">All Telecallers</option>
            {telecallersData?.data?.filter(t => t.is_active)?.map(t => (
              <option key={t.id} value={t.id}>{t.telecaller_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Current Leads */}
      {period === 'current' && (
        <section className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {renderCard(
              "Bot Leads", 
              summary.current.bot, 
              <Bot size={24} />, 
              botColor, 
              "/admin/leads/working-sheet/current/bot",
              "Current calendar month"
            )}
            {renderCard(
              "Direct Leads", 
              summary.current.direct, 
              <Target size={24} />, 
              directColor, 
              "/admin/leads/working-sheet/current/direct",
              "Current calendar month"
            )}
            {renderCard(
              "Free Leads", 
              summary.current.free, 
              <Gift size={24} />, 
              freeColor, 
              "/admin/leads/working-sheet/current/free",
              "Current calendar month"
            )}
            {renderCard(
              "Transferred Leads", 
              summary.current.transferred, 
              <ArrowRightLeft size={24} />, 
              transferredColor, 
              "/admin/leads/working-sheet/current/transferred",
              "Current calendar month"
            )}
          </div>
        </section>
      )}

      {/* Past Month Leads */}
      {period === 'past' && (
        <section className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {renderCard(
              "Bot Leads", 
              summary.past.bot, 
              <Bot size={24} />, 
              botColor, 
              "/admin/leads/working-sheet/past/bot",
              "Exactly one month ago"
            )}
            {renderCard(
              "Direct Leads", 
              summary.past.direct, 
              <Target size={24} />, 
              directColor, 
              "/admin/leads/working-sheet/past/direct",
              "Exactly one month ago"
            )}
            {renderCard(
              "Free Leads", 
              summary.past.free, 
              <Gift size={24} />, 
              freeColor, 
              "/admin/leads/working-sheet/past/free",
              "Exactly one month ago"
            )}
            {renderCard(
              "Transferred Leads", 
              summary.past.transferred, 
              <ArrowRightLeft size={24} />, 
              transferredColor, 
              "/admin/leads/working-sheet/past/transferred",
              "Exactly one month ago"
            )}
          </div>
        </section>
      )}

      {/* Old Leads */}
      {period === 'old' && summary.old && summary.old.length > 0 && (
        <section className="space-y-6">
          <div className="space-y-8">
            {summary.old.map((monthData, idx) => (
              <div key={idx} className="bg-slate-50/50 dark:bg-[#151521]/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-800/60">
                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-4">{monthData.monthName} {monthData.year}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {renderCard(
                    "Bot Leads", 
                    monthData.bot, 
                    <Bot size={24} />, 
                    botColor, 
                    `/admin/leads/working-sheet/old/${monthData.year}/${monthData.month}/bot`,
                    monthData.monthName
                  )}
                  {renderCard(
                    "Direct Leads", 
                    monthData.direct, 
                    <Target size={24} />, 
                    directColor, 
                    `/admin/leads/working-sheet/old/${monthData.year}/${monthData.month}/direct`,
                    monthData.monthName
                  )}
                  {renderCard(
                    "Free Leads", 
                    monthData.free, 
                    <Gift size={24} />, 
                    freeColor, 
                    `/admin/leads/working-sheet/old/${monthData.year}/${monthData.month}/free`,
                    monthData.monthName
                  )}
                  {renderCard(
                    "Transferred Leads", 
                    monthData.transferred, 
                    <ArrowRightLeft size={24} />, 
                    transferredColor, 
                    `/admin/leads/working-sheet/old/${monthData.year}/${monthData.month}/transferred`,
                    monthData.monthName
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      
      {period === 'old' && (!summary.old || summary.old.length === 0) && (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-[#1e1e2f] rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed">
          <History size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
          <p className="text-lg font-medium text-slate-900 dark:text-white">No old leads found</p>
          <p className="text-slate-500">Leads older than 1 month will appear here.</p>
        </div>
      )}

    </div>
  );
};

export default AdminLeadsDashboard;
