import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { RefreshCw, Filter, Calendar } from 'lucide-react';
import OverviewCards from '../../components/analytics/OverviewCards';
import ActionCenterAlerts from '../../components/analytics/ActionCenterAlerts';
import LeaderboardTable from '../../components/analytics/LeaderboardTable';
import HourlyHeatmap from '../../components/analytics/HourlyHeatmap';

const Analytics = () => {
    const [preset, setPreset] = useState('today');
    const [telecallerId, setTelecallerId] = useState('all');
    const [telecallers, setTelecallers] = useState([]);

    useEffect(() => {
        const fetchTelecallers = async () => {
            try {
                const res = await api.get('/api/admin/tele-login');
                if (res.data.success) {
                    setTelecallers(res.data.telecallers);
                }
            } catch (err) {
                console.error("Failed to fetch telecallers", err);
            }
        };
        fetchTelecallers();
    }, []);

    // Queries
    const { data: overview, isLoading: overviewLoading, refetch: refetchOverview } = useQuery({
        queryKey: ['adminAnalyticsOverview', preset, telecallerId],
        queryFn: async () => {
            const res = await api.get(`/api/admin/analytics/overview?preset=${preset}&telecaller_id=${telecallerId}`);
            return res.data.data;
        }
    });

    const { data: leaderboard, isLoading: lbLoading, refetch: refetchLb } = useQuery({
        queryKey: ['adminAnalyticsLeaderboard', preset],
        queryFn: async () => {
            const res = await api.get(`/api/admin/analytics/leaderboard?preset=${preset}`);
            return res.data.data;
        }
    });

    const { data: actionCenter, isLoading: acLoading, refetch: refetchAc } = useQuery({
        queryKey: ['adminAnalyticsActionCenter'],
        queryFn: async () => {
            const res = await api.get(`/api/admin/analytics/action-center`);
            return res.data.data;
        }
    });

    const { data: hourly, isLoading: hourlyLoading, refetch: refetchHourly } = useQuery({
        queryKey: ['adminAnalyticsHourly', preset, telecallerId],
        queryFn: async () => {
            const res = await api.get(`/api/admin/analytics/hourly?preset=${preset}&telecaller_id=${telecallerId}`);
            return res.data.data;
        }
    });

    const handleRefresh = () => {
        refetchOverview();
        refetchLb();
        refetchAc();
        refetchHourly();
    };

    const handleActionClick = (alert) => {
        console.log("Action clicked:", alert);
        // Implement drilldowns based on alert.action (e.g. open a modal, navigate to telecaller)
    };

    return (
        <div className="flex flex-col h-full bg-[#f8f9fa] dark:bg-[#0f0f17]">
            {/* Header */}
            <div className="flex-none bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-6 z-10 sticky top-0">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Analytics Command Center</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Real-time telecaller performance and lead leakage intelligence</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleRefresh}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-semibold transition-colors"
                        >
                            <RefreshCw size={16} className={(overviewLoading || lbLoading) ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                    </div>
                </div>
                
                {/* Filters */}
                <div className="max-w-7xl mx-auto mt-6 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                        {['today', 'yesterday', 'week', 'month'].map(p => (
                            <button
                                key={p}
                                onClick={() => setPreset(p)}
                                className={`px-4 py-1.5 rounded-md text-sm font-bold capitalize transition-all ${preset === p ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                        <Filter size={16} className="text-slate-400 ml-2" />
                        <select 
                            value={telecallerId}
                            onChange={(e) => setTelecallerId(e.target.value)}
                            className="bg-transparent border-none text-sm font-semibold text-slate-700 dark:text-slate-300 focus:ring-0 py-1.5 pl-2 pr-8"
                        >
                            <option value="all">All Telecallers</option>
                            {telecallers.map(t => (
                                <option key={t.id} value={t.id}>{t.telecaller_name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto p-6">
                <div className="max-w-7xl mx-auto">
                    <OverviewCards data={overview} loading={overviewLoading} />
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <LeaderboardTable data={leaderboard} loading={lbLoading} />
                            <HourlyHeatmap data={hourly} loading={hourlyLoading} />
                        </div>
                        <div className="lg:col-span-1">
                            <ActionCenterAlerts alerts={actionCenter} loading={acLoading} onActionClick={handleActionClick} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
