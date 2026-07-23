import React from 'react';
import { Activity } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';

const HourlyHeatmap = ({ data, loading }) => {
    if (loading) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden mb-8">
                <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Hourly Working Pattern</h3>
                </div>
                <div className="p-6 h-64 flex flex-col justify-end gap-2">
                    <Skeleton rows={1} columns={12} className="h-40 w-full" />
                </div>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden mb-8 p-8 text-center text-slate-500">
                No hourly activity data available for this period.
            </div>
        );
    }

    // Map hours 9 to 21 (9 AM to 9 PM)
    const hours = Array.from({ length: 13 }, (_, i) => i + 9);
    
    // Find max dials for scaling the bars
    const maxDials = Math.max(...data.map(d => d.dials), 1);

    const getHourLabel = (hour) => {
        if (hour === 12) return '12 PM';
        if (hour > 12) return `${hour - 12} PM`;
        return `${hour} AM`;
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden mb-8">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Activity className="text-indigo-500" size={20} />
                    Hourly Working Pattern (Dials)
                </h3>
            </div>
            
            <div className="p-6">
                <div className="flex items-end justify-between gap-2 h-48 mb-2">
                    {hours.map(hour => {
                        const hData = data.find(d => d.hour === hour) || { dials: 0, connected: 0, talk_time: 0 };
                        const heightPercent = Math.max((hData.dials / maxDials) * 100, 2); // min 2% for visibility of 0
                        const isZero = hData.dials === 0;

                        return (
                            <div key={hour} className="flex flex-col items-center flex-1 group">
                                <div className="w-full relative flex justify-center h-full items-end pb-2">
                                    {/* Tooltip */}
                                    <div className="absolute -top-10 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap pointer-events-none">
                                        {hData.dials} Dials<br/>
                                        {hData.connected} Connected
                                    </div>
                                    <div 
                                        className={`w-full max-w-[40px] rounded-t-md transition-all duration-300 ${isZero ? 'bg-slate-100 dark:bg-slate-700' : 'bg-indigo-500 hover:bg-indigo-400 dark:bg-indigo-600 dark:hover:bg-indigo-500'}`}
                                        style={{ height: `${heightPercent}%` }}
                                    ></div>
                                </div>
                                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                    {getHourLabel(hour)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default HourlyHeatmap;
