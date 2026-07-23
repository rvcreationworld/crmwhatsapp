import React from 'react';
import { PhoneCall, Phone, PhoneForwarded, Clock, CheckCircle2, UserCheck, PhoneMissed, Database } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';

const StatCard = ({ title, value, icon: Icon, colorClass, loading }) => {
    if (loading) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse shrink-0" />
                <div className="space-y-2 flex-1">
                    <Skeleton rows={1} columns={1} className="h-4 w-1/2" />
                    <Skeleton rows={1} columns={1} className="h-6 w-1/3" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow group">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                <Icon size={24} />
            </div>
            <div>
                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</h4>
                <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {value}
                    </span>
                </div>
            </div>
        </div>
    );
};

const OverviewCards = ({ data, loading }) => {
    
    // Format duration helper
    const formatDuration = (seconds) => {
        if (!seconds) return '0m';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard 
                title="Active Telecallers" 
                value={data?.activeTelecallers || 0} 
                icon={UserCheck} 
                colorClass="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
                loading={loading}
            />
            <StatCard 
                title="Total Calls (CRM)" 
                value={data?.totalCalls || 0} 
                icon={Phone} 
                colorClass="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                loading={loading}
            />
            <StatCard 
                title="Unique Dials" 
                value={data?.uniqueDials || 0} 
                icon={PhoneForwarded} 
                colorClass="bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400"
                loading={loading}
            />
            <StatCard 
                title="Connected Calls" 
                value={data?.connectedCalls || 0} 
                icon={PhoneCall} 
                colorClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                loading={loading}
            />
            <StatCard 
                title="Total Talk Time" 
                value={formatDuration(data?.totalTalkTime)} 
                icon={Clock} 
                colorClass="bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400"
                loading={loading}
            />
            <StatCard 
                title="Avg Talk Time" 
                value={`${data?.avgTalkTime || 0}s`} 
                icon={Clock} 
                colorClass="bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-500/10 dark:text-fuchsia-400"
                loading={loading}
            />
            <StatCard 
                title="Missed/Rejected" 
                value={data?.missedRejected || 0} 
                icon={PhoneMissed} 
                colorClass="bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                loading={loading}
            />
            <StatCard 
                title="KYC Done" 
                value={data?.kycDone || 0} 
                icon={CheckCircle2} 
                colorClass="bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400"
                loading={loading}
            />
        </div>
    );
};

export default OverviewCards;
