import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { Megaphone, Timer, Search, Loader2, PlayCircle, PlusCircle, StopCircle, CheckCircle, Trash2, XCircle, History } from 'lucide-react';
import toast from 'react-hot-toast';

const LiveCountdown = ({ expiresAt, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        clearInterval(interval);
        setTimeLeft('Expired');
        if (onExpire) onExpire();
        return;
      }
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  return <span className="font-mono">{timeLeft}</span>;
};

const AdminGreetings = () => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [duration, setDuration] = useState('4');

  const { data: activeGreeting, isLoading: activeLoading } = useQuery({
    queryKey: ['adminActiveGreeting'],
    queryFn: async () => {
      const res = await api.get('/api/admin/greetings/active');
      return res.data.greeting;
    },
    refetchInterval: 60000
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['adminGreetingsHistory'],
    queryFn: async () => {
      const res = await api.get('/api/admin/greetings');
      return res.data.greetings || [];
    }
  });

  const publishMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/api/admin/greetings', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Greeting published successfully!');
      setTitle('');
      setMessage('');
      setDuration('4');
      queryClient.invalidateQueries(['adminActiveGreeting']);
      queryClient.invalidateQueries(['adminGreetingsHistory']);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to publish greeting');
    }
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.patch(`/api/admin/greetings/${id}/deactivate`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Greeting deactivated.');
      queryClient.invalidateQueries(['adminActiveGreeting']);
      queryClient.invalidateQueries(['adminGreetingsHistory']);
    }
  });

  const handlePublish = (e) => {
    e.preventDefault();
    if (!message.trim()) {
      return toast.error('Message is required.');
    }
    publishMutation.mutate({
      title: title.trim(),
      message: message.trim(),
      duration_hours: parseInt(duration, 10)
    });
  };

  const handleDeactivate = (id) => {
    if (confirm('Are you sure you want to deactivate this active greeting?')) {
      deactivateMutation.mutate(id);
    }
  };

  const isExpired = (expiresAt) => new Date(expiresAt).getTime() <= Date.now();

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Megaphone className="text-pink-500" />
            Celebration Greetings
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Publish top-of-dashboard announcements and shoutouts to all telecallers.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create Greeting Card */}
        <div className="bg-white dark:bg-[#1e1e2f] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <PlusCircle size={20} className="text-indigo-500" /> Create New Greeting
          </h2>
          <form onSubmit={handlePublish} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title (Optional)</label>
              <input 
                type="text" 
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Performer of the Week!"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Message (Required)</label>
              <textarea 
                required
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Write an encouraging message..."
                rows={4}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Duration</label>
              <select 
                value={duration}
                onChange={e => setDuration(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              >
                <option value="1">1 Hour</option>
                <option value="2">2 Hours</option>
                <option value="4">4 Hours</option>
                <option value="8">8 Hours</option>
                <option value="24">24 Hours</option>
                <option value="168">7 Days</option>
              </select>
            </div>
            <button 
              type="submit"
              disabled={publishMutation.isPending}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {publishMutation.isPending ? 'Publishing...' : 'Publish Greeting'}
            </button>
          </form>
        </div>

        {/* Active Greeting Status */}
        <div className="bg-white dark:bg-[#1e1e2f] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <PlayCircle size={20} className="text-emerald-500" /> Currently Active
          </h2>
          {activeLoading ? (
            <div className="flex-1 flex justify-center items-center">
              <Loader2 className="animate-spin text-slate-400" />
            </div>
          ) : activeGreeting ? (
            <div className="flex-1 flex flex-col justify-between">
              <div className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-xl p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                  <Megaphone size={100} />
                </div>
                {activeGreeting.title && (
                  <h3 className="text-xl font-bold text-pink-600 dark:text-pink-400 mb-2 relative z-10">{activeGreeting.title}</h3>
                )}
                <p className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed relative z-10">
                  {activeGreeting.message}
                </p>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Expires At:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {new Date(activeGreeting.expires_at).toLocaleString('en-IN', { hour12: true, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Time Left:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    <LiveCountdown 
                      expiresAt={activeGreeting.expires_at} 
                      onExpire={() => queryClient.invalidateQueries(['adminActiveGreeting'])} 
                    />
                  </span>
                </div>
                <button 
                  onClick={() => handleDeactivate(activeGreeting.id)}
                  className="w-full py-2 bg-red-50 dark:bg-red-500/10 text-red-600 hover:bg-red-100 dark:hover:bg-red-500/20 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <StopCircle size={16} /> Deactivate Now
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center text-center text-slate-400">
              <Megaphone size={40} className="opacity-20 mb-3" />
              <p>No active greetings at the moment.</p>
            </div>
          )}
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white dark:bg-[#1e1e2f] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <History size={20} className="text-slate-500" /> Greeting History
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr className="text-slate-600 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider">
                <th className="p-4 border-b border-slate-200 dark:border-slate-700">Status</th>
                <th className="p-4 border-b border-slate-200 dark:border-slate-700">Title / Preview</th>
                <th className="p-4 border-b border-slate-200 dark:border-slate-700">Starts At</th>
                <th className="p-4 border-b border-slate-200 dark:border-slate-700">Expires At</th>
                <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {historyLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-indigo-500" /></td>
                </tr>
              ) : historyData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">No greetings found.</td>
                </tr>
              ) : (
                historyData.map(g => {
                  const currentlyActive = g.is_active === 1 && !isExpired(g.expires_at);
                  const expired = g.is_active === 1 && isExpired(g.expires_at);
                  const deactivated = g.is_active === 0;

                  return (
                    <tr key={g.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/30">
                      <td className="p-4">
                        {currentlyActive && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"><CheckCircle size={12} /> Active</span>}
                        {expired && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"><Timer size={12} /> Expired</span>}
                        {deactivated && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"><XCircle size={12} /> Deactivated</span>}
                      </td>
                      <td className="p-4 max-w-[300px] truncate">
                        <div className="font-semibold text-slate-900 dark:text-white truncate">{g.title || '—'}</div>
                        <div className="text-xs text-slate-500 truncate mt-0.5">{g.message}</div>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">
                        {new Date(g.starts_at).toLocaleString('en-IN', { hour12: true, month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">
                        {new Date(g.expires_at).toLocaleString('en-IN', { hour12: true, month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })}
                      </td>
                      <td className="p-4 text-right">
                        {currentlyActive && (
                          <button 
                            onClick={() => handleDeactivate(g.id)}
                            className="text-red-500 hover:text-red-600 font-medium text-xs"
                          >
                            Deactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminGreetings;
