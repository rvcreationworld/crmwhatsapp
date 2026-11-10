import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { Loader2, Database, History, CheckCircle, RefreshCw } from 'lucide-react';

const STATUS_4_OPTIONS = [
  'Ringing',
  'Call Back',
  'Info Given',
  'Wrong No',
  'Int Angel',
  'Think&LMK',
  'Not Int',
  'RdyKYC'
];

export default function FetchFreeLead() {
  const queryClient = useQueryClient();
  const [status4, setStatus4] = useState('');
  const [remark, setRemark] = useState('');
  
  const { data: statusData, isLoading, refetch } = useQuery({
    queryKey: ['telecallerFreeLeadsStatus'],
    queryFn: async () => {
      const res = await api.get('/api/telecaller/free-leads/status');
      return res.data;
    }
  });

  const fetchMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/api/telecaller/free-leads/fetch');
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['telecallerFreeLeadsStatus']);
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Error fetching lead';
      alert(msg);
    }
  });

  const status4Mutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.post(`/api/telecaller/free-leads/${id}/status4`, {
        status4,
        status4_remark: remark
      });
      return res.data;
    },
    onSuccess: (data) => {
      alert(data.message);
      setStatus4('');
      setRemark('');
      queryClient.invalidateQueries(['telecallerFreeLeadsStatus']);
      queryClient.invalidateQueries(['telecallerMyFreeLeads']);
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Error updating status 4');
    }
  });

  if (isLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  }

  const { availableCount = 0, assignedLead, history = [], is_queued, queue_position } = statusData || {};

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-[#1a1a24] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Database className="text-indigo-500" /> Fetch Free Lead
          </h1>
          <div className="text-sm text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-4">
            <span>Available Leads in Pool: <span className="font-bold text-indigo-600 dark:text-indigo-400 text-lg">{availableCount}</span></span>
            {is_queued && (
              <span className="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                In Queue: Position {queue_position}
              </span>
            )}
          </div>
        </div>
        
        {!assignedLead && (
          <button
            onClick={() => fetchMutation.mutate()}
            disabled={fetchMutation.isPending}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-all"
          >
            {fetchMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
            Fetch New Lead
          </button>
        )}
      </div>

      {assignedLead && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-[#1a1a24] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Lead Details</h2>
                <span className="px-3 py-1 bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 rounded-lg text-xs font-bold uppercase tracking-wider">
                  Pending Status 4
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Name</p>
                  <p className="font-semibold text-lg dark:text-white">{assignedLead.lead_name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Mobile</p>
                  <p className="font-semibold text-lg dark:text-white">{assignedLead.lead_contact || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Previous Telecaller</p>
                  <p className="font-medium text-slate-800 dark:text-slate-200">{assignedLead.previous_telecaller_name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Fetched At</p>
                  <p className="font-medium text-slate-800 dark:text-slate-200">{new Date(assignedLead.fetched_at).toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1a1a24] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <CheckCircle className="text-emerald-500" size={20} /> Update Status 4
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Status 4 *</label>
                  <select 
                    value={status4}
                    onChange={(e) => setStatus4(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#151521] dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">Select Status 4</option>
                    {STATUS_4_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Remark (Optional)</label>
                  <textarea 
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#151521] dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px]"
                    placeholder="Enter remarks here..."
                  />
                </div>
                <button
                  onClick={() => status4Mutation.mutate(assignedLead.id)}
                  disabled={!status4 || status4Mutation.isPending}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-50"
                >
                  {status4Mutation.isPending ? <Loader2 size={18} className="animate-spin mx-auto" /> : "Submit Status 4 & Complete"}
                </button>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-[#1a1a24] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm sticky top-6 h-fit max-h-[85vh] overflow-y-auto">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <History className="text-indigo-500" size={20} /> History
              </h2>
              
              <div className="space-y-6">
                {history.map((hist, idx) => (
                  <div key={idx} className="relative pl-6 pb-6 border-l-2 border-slate-200 dark:border-slate-700 last:border-0 last:pb-0">
                    <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-indigo-500 ring-4 ring-white dark:ring-[#1a1a24]" />
                    
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-bold px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded">
                        {hist.action_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400">{new Date(hist.created_at).toLocaleString()}</span>
                    </div>
                    
                    {hist.action_type === 'MOVED_TO_FREE' && (
                      <div className="mt-3 space-y-2 bg-slate-50 dark:bg-[#151521] p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        {hist.status1 && <div className="text-xs"><span className="text-slate-500 font-semibold">Status 1:</span> <span className="font-bold text-slate-800 dark:text-slate-200">{hist.status1}</span> {hist.status1_remark && <span className="text-slate-400 italic">({hist.status1_remark})</span>}</div>}
                        {hist.status2 && <div className="text-xs"><span className="text-slate-500 font-semibold">Status 2:</span> <span className="font-bold text-slate-800 dark:text-slate-200">{hist.status2}</span> {hist.status2_remark && <span className="text-slate-400 italic">({hist.status2_remark})</span>}</div>}
                        {hist.status3 && <div className="text-xs"><span className="text-slate-500 font-semibold">Status 3:</span> <span className="font-bold text-slate-800 dark:text-slate-200">{hist.status3}</span> {hist.status3_remark && <span className="text-slate-400 italic">({hist.status3_remark})</span>}</div>}
                      </div>
                    )}
                    
                    {hist.notes && <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{hist.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
