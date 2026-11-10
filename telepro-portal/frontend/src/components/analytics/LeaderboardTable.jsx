import React, { useState } from 'react';
import { Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import { Skeleton, TableSkeleton } from '../ui/Skeleton';

const LeaderboardTable = ({ data, loading }) => {
    const [sortConfig, setSortConfig] = useState({ key: 'score', direction: 'desc' });

    if (loading) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden mb-8">
                <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Performance Leaderboard</h3>
                </div>
                <div className="p-6">
                    <TableSkeleton rows={5} columns={6} />
                </div>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden mb-8 p-8 text-center text-slate-500">
                No telecaller data available for this period.
            </div>
        );
    }

    const handleSort = (key) => {
        let direction = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const sortedData = [...data].sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const formatDuration = (seconds) => {
        if (!seconds) return '0m';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    const getScoreColor = (score) => {
        if (score >= 80) return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30';
        if (score >= 60) return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30';
        if (score >= 40) return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30';
        return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30';
    };

    const SortIcon = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) return <ChevronDown size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />;
        return sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-indigo-500" /> : <ChevronDown size={14} className="text-indigo-500" />;
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden mb-8">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Trophy className="text-amber-500" size={20} />
                    Performance Leaderboard
                </h3>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                    <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-200 font-bold text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                        <tr>
                            <th className="py-3 px-4 w-16 text-center">Rank</th>
                            <th className="py-3 px-4">Telecaller</th>
                            <th className="py-3 px-4 cursor-pointer group hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" onClick={() => handleSort('score')}>
                                <div className="flex items-center gap-1">Score <SortIcon columnKey="score" /></div>
                            </th>
                            <th className="py-3 px-4 cursor-pointer group hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" onClick={() => handleSort('unique_dials')}>
                                <div className="flex items-center gap-1">Unique Dials <SortIcon columnKey="unique_dials" /></div>
                            </th>
                            <th className="py-3 px-4 cursor-pointer group hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" onClick={() => handleSort('connected_calls')}>
                                <div className="flex items-center gap-1">Connected <SortIcon columnKey="connected_calls" /></div>
                            </th>
                            <th className="py-3 px-4 cursor-pointer group hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" onClick={() => handleSort('talk_time')}>
                                <div className="flex items-center gap-1">Talk Time <SortIcon columnKey="talk_time" /></div>
                            </th>
                            <th className="py-3 px-4 cursor-pointer group hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" onClick={() => handleSort('status_updates')}>
                                <div className="flex items-center gap-1">Status Updates <SortIcon columnKey="status_updates" /></div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {sortedData.map((row, index) => (
                            <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors group">
                                <td className="py-3 px-4 text-center font-mono font-bold text-slate-400">
                                    #{index + 1}
                                </td>
                                <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                                    {row.telecaller_name}
                                </td>
                                <td className="py-3 px-4">
                                    <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-extrabold border shadow-sm ${getScoreColor(row.score)}`}>
                                        {row.score}
                                    </span>
                                </td>
                                <td className="py-3 px-4 font-medium">
                                    {row.unique_dials} <span className="text-xs text-slate-400 font-normal">/ {row.total_dials} total</span>
                                </td>
                                <td className="py-3 px-4 font-medium">
                                    {row.connected_calls}
                                </td>
                                <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-200">
                                    {formatDuration(row.talk_time)}
                                </td>
                                <td className="py-3 px-4 font-medium">
                                    {row.status_updates}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LeaderboardTable;
