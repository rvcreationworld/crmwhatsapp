import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { Trophy, X } from 'lucide-react';
import confetti from 'canvas-confetti';

const DashboardGreeting = () => {
  const queryClient = useQueryClient();
  const [visible, setVisible] = useState(true);
  const [timeLeft, setTimeLeft] = useState('');

  const { data: greeting, isLoading } = useQuery({
    queryKey: ['telecallerActiveGreeting'],
    queryFn: async () => {
      const res = await api.get('/api/telecaller/greetings/active');
      return res.data.greeting;
    },
    staleTime: 0,
    gcTime: 0
  });

  const markSeenMutation = useMutation({
    mutationFn: async (id) => {
      await api.post(`/api/telecaller/greetings/${id}/seen`);
    }
  });

  useEffect(() => {
    if (greeting) {
      const sessionKey = `confetti_${greeting.id}`;
      const hasSeenThisSession = sessionStorage.getItem(sessionKey);

      if (!hasSeenThisSession) {
        sessionStorage.setItem(sessionKey, 'true');
        
        // Trigger confetti
        const duration = 3000;
        const end = Date.now() + duration;

        const frame = () => {
          confetti({
            particleCount: 5,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b']
          });
          confetti({
            particleCount: 5,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b']
          });

          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        };
        frame();

        // Still mark as seen in backend just in case we need the analytics
        if (!greeting.already_seen) {
          markSeenMutation.mutate(greeting.id);
        }
      }
    }
  }, [greeting]); // Run when greeting loads

  useEffect(() => {
    if (!greeting?.expires_at) return;

    const interval = setInterval(() => {
      const diff = new Date(greeting.expires_at).getTime() - Date.now();
      if (diff <= 0) {
        clearInterval(interval);
        setVisible(false);
        queryClient.invalidateQueries(['telecallerActiveGreeting']);
        return;
      }
      
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(`${h}h ${m}m`);
    }, 1000);

    return () => clearInterval(interval);
  }, [greeting?.expires_at, queryClient]);

  if (isLoading || !greeting || !visible) return null;

  return (
    <div className="relative mb-8 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-6 shadow-xl shadow-purple-500/20 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl"></div>
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
      
      <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6 text-white text-center sm:text-left">
        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
          <Trophy size={32} className="text-yellow-300" />
        </div>
        <div className="flex-1 space-y-1">
          {greeting.title && (
            <h2 className="text-xl font-bold tracking-tight text-white/95">
              {greeting.title}
            </h2>
          )}
          <p className="text-white/80 font-medium text-sm leading-relaxed max-w-3xl">
            {greeting.message}
          </p>
        </div>
        <div className="shrink-0 flex flex-col items-center sm:items-end mt-4 sm:mt-0 space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-white/60">Expires in</span>
          <span className="px-3 py-1 bg-black/20 rounded-full text-sm font-mono font-bold backdrop-blur-sm border border-white/10">
            {timeLeft || '...'}
          </span>
        </div>
        <button 
          onClick={() => setVisible(false)}
          className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default DashboardGreeting;
