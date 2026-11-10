import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import api from "../../api/axios";
import { Bot, Target, CalendarDays, Loader2, FileText, History, TrendingUp, ArrowRightLeft } from "lucide-react";
import { cn } from "../../components/ui/Skeleton";

const MyLeadsDashboard = () => {
  const { period } = useParams();
  const { data: userProfile } = useQuery({
    queryKey: ["authMe"],
    queryFn: async () => {
      const res = await api.get('/api/auth/me');
      return res.data.user;
    }
  });

  const { data: summary, isLoading, isError } = useQuery({
    queryKey: ["telecallerLeadsSummary"],
    queryFn: async () => {
      const res = await api.get('/api/telecaller/leads/summary');
      return res.data;
    }
  });

  const hasCampaignsEnabled = userProfile?.own_campaign_enabled === 1;

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
    border: "border-slate-200 dark:border-slate-700 hover:border-emerald-500",
    hoverBg: "hover:ring-1 hover:ring-emerald-500/20",
    iconBg: "bg-emerald-50 dark:bg-emerald-500/10 group-hover:bg-emerald-100",
    iconText: "text-emerald-600 dark:text-emerald-400"
  };

  const transferColor = {
    bg: "bg-white dark:bg-[#1e1e2f]",
    border: "border-slate-200 dark:border-slate-700 hover:border-blue-500",
    hoverBg: "hover:ring-1 hover:ring-blue-500/20",
    iconBg: "bg-blue-50 dark:bg-blue-500/10 group-hover:bg-blue-100",
    iconText: "text-blue-600 dark:text-blue-400"
  };

  return (
    <div className="space-y-10 animate-fade-in-up h-full overflow-y-auto custom-scrollbar pb-10">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          {period === 'current' && 'Current Leads'}
          {period === 'past' && 'Past Month Leads'}
          {period === 'old' && 'Old Leads'}
          {period === 'kyc' && 'Ready to KYC Leads'}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Manage your pipeline efficiently.</p>
      </div>

      {/* Current Leads */}
      {period === 'current' && (
        <section className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderCard(
              "Bot Leads", 
              summary.current.bot, 
              <Bot size={24} />, 
              botColor, 
              "/telecaller/leads/list/current/bot",
              "Current calendar month"
            )}
            {renderCard(
              "Direct Leads (Campaigns)", 
              summary.current.direct, 
              <Target size={24} />, 
              directColor, 
              "/telecaller/leads/list/current/direct",
              "Current calendar month"
            )}
            {renderCard(
              "Free Leads", 
              summary.current.free, 
              <FileText size={24} />, 
              freeColor, 
              "/telecaller/free-leads?period=current",
              "Current calendar month"
            )}
            {renderCard(
              "Transferred Leads", 
              summary.current.transferred, 
              <ArrowRightLeft size={24} />, 
              transferColor, 
              "/telecaller/transferred-leads?period=current",
              "Current calendar month"
            )}
          </div>
        </section>
      )}

      {/* Past Month Leads */}
      {period === 'past' && (
        <section className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderCard(
              "Bot Leads", 
              summary.past.bot, 
              <Bot size={24} />, 
              botColor, 
              "/telecaller/leads/list/past/bot",
              "Exactly one month ago"
            )}
            {renderCard(
              "Direct Leads (Campaigns)", 
              summary.past.direct, 
              <Target size={24} />, 
              directColor, 
              "/telecaller/leads/list/past/direct",
              "Exactly one month ago"
            )}
            {renderCard(
              "Free Leads", 
              summary.past.free, 
              <FileText size={24} />, 
              freeColor, 
              "/telecaller/free-leads?period=past",
              "Exactly one month ago"
            )}
            {renderCard(
              "Transferred Leads", 
              summary.past.transferred, 
              <ArrowRightLeft size={24} />, 
              transferColor, 
              "/telecaller/transferred-leads?period=past",
              "Exactly one month ago"
            )}
          </div>
        </section>
      )}

      {/* Old Leads */}
      {period === 'old' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {summary.old.map((monthData, idx) => (
            <div key={idx} className="bg-white dark:bg-[#1e1e2f] rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg transition-shadow group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <History size={64} className="text-slate-900 dark:text-white" />
              </div>
              <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-6 flex items-center gap-2 relative z-10">
                <CalendarDays className="text-indigo-500" size={20} />
                {monthData.monthName}
              </h3>
              <div className="space-y-4 relative z-10">
                <Link 
                  to={`/telecaller/leads/list/old/${monthData.year}/${monthData.month}/bot`}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors border border-transparent hover:border-indigo-100 dark:hover:border-indigo-500/20"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <Bot size={16} className="text-indigo-500" /> Bot Leads
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">{monthData.bot}</span>
                </Link>
                {hasCampaignsEnabled && (
                  <Link 
                    to={`/telecaller/leads/list/old/${monthData.year}/${monthData.month}/direct`}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors border border-transparent hover:border-purple-100 dark:hover:border-purple-500/20"
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      <Target size={16} className="text-purple-500" /> Direct Leads
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">{monthData.direct}</span>
                  </Link>
                )}
              </div>
            </div>
          ))}
          {summary.old.length === 0 && (
            <div className="col-span-full p-8 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-[#1e1e2f] rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed">
              No old leads found in the database.
            </div>
          )}
        </div>
      )}

      {/* KYC Leads */}
      {period === 'kyc' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {renderCard(
            "Bot Leads",
            summary.kyc.bot,
            <Bot size={24} />,
            botColor,
            `/telecaller/leads/list/kyc/bot`,
            "Leads marked Ready to KYC"
          )}
          {hasCampaignsEnabled && renderCard(
            "Direct Leads",
            summary.kyc.direct,
            <Target size={24} />,
            directColor,
            `/telecaller/leads/list/kyc/direct`,
            "Campaign leads ready to KYC"
          )}
        </div>
      )}
      
      {period === 'old' && (!summary.old || summary.old.length === 0) && (
        <div className="text-center p-12 bg-white dark:bg-[#1e1e2f] border border-slate-200 dark:border-slate-800 rounded-2xl">
          <History size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
          <p className="text-lg font-medium text-slate-900 dark:text-white">No old leads found</p>
        </div>
      )}

    </div>
  );
};

export default MyLeadsDashboard;
