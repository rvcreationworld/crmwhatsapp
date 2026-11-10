import React from 'react';
import { AlertCircle, AlertTriangle, Info, ArrowRight } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';

const ActionCenterAlerts = ({ alerts, loading, onActionClick }) => {
    if (loading) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm mb-8">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Action Center</h3>
                <div className="space-y-3">
                    <Skeleton rows={3} columns={1} className="h-12 w-full" />
                </div>
            </div>
        );
    }

    if (!alerts || alerts.length === 0) {
        return null;
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm mb-8">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                    </span>
                    Action Center
                </h3>
                <span className="text-sm text-slate-500 font-medium">{alerts.length} Active Alerts</span>
            </div>
            
            <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {alerts.map((alert) => {
                    let Icon = Info;
                    let colorClass = 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-700/50 dark:text-slate-200 dark:border-slate-600';
                    let iconColor = 'text-slate-500';
                    let btnColor = 'bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-white';

                    if (alert.severity === 'CRITICAL') {
                        Icon = AlertCircle;
                        colorClass = 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:border-rose-500/20';
                        iconColor = 'text-rose-500';
                        btnColor = 'bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-500/20 dark:hover:bg-rose-500/30 dark:text-rose-300';
                    } else if (alert.severity === 'WARNING') {
                        Icon = AlertTriangle;
                        colorClass = 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-500/20';
                        iconColor = 'text-amber-500';
                        btnColor = 'bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 dark:text-amber-300';
                    }

                    return (
                        <div key={alert.id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border ${colorClass} transition-colors`}>
                            <div className="flex items-start sm:items-center gap-3">
                                <Icon size={20} className={`mt-0.5 sm:mt-0 shrink-0 ${iconColor}`} />
                                <div>
                                    <p className="font-semibold">{alert.message}</p>
                                    <p className="text-xs opacity-75 mt-0.5">{alert.telecaller_name} • {alert.severity}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => onActionClick(alert)}
                                className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold transition-colors shrink-0 ${btnColor}`}
                            >
                                {alert.action}
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ActionCenterAlerts;
