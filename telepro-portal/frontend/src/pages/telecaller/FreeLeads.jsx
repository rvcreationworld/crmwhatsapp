import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import api from '../../api/axios';
import { Loader2, Search, History, X } from 'lucide-react';
import { cn } from '../../components/ui/Skeleton';
import LeadViewToggle from '../../components/leads/LeadViewToggle';
import LeadCardGrid from '../../components/leads/LeadCardGrid';

const LS_KEY = 'crm_view_mode_free_leads';

export default function FreeLeads() {
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem(LS_KEY) || 'list');
  const handleViewChange = (mode) => { setViewMode(mode); localStorage.setItem(LS_KEY, mode); };
  const [searchParams] = useSearchParams();
  const period = searchParams.get("period");

  const { data: leadsData, isLoading } = useQuery({
    queryKey: ['telecallerMyFreeLeads', period],
    queryFn: async () => {
      const res = await api.get(`/api/telecaller/free-leads/my${period ? '?period=' + period : ''}`);
      return res.data;
    }
  });

  const { data: leadDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['adminFreeLeadDetails', selectedLead?.id],
    queryFn: async () => {
      if (!selectedLead?.id) return null;
      const res = await api.get(`/api/telecaller/free-leads/${selectedLead.id}`);
      return res.data;
    },
    enabled: !!selectedLead?.id
  });

  const queryClient = useQueryClient();
  const [status4, setStatus4] = useState('');
  const [remark, setRemark] = useState('');
  
  // Set initial status 4 when lead selected
  React.useEffect(() => {
    if (selectedLead) {
      setStatus4(selectedLead.status4 || '');
      setRemark(selectedLead.status4_remark || '');
    }
  }, [selectedLead]);

  const status4Mutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.post(`/api/telecaller/free-leads/${id}/status4`, {
        status4,
        status4_remark: remark
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Status 4 updated successfully');
      queryClient.invalidateQueries(['telecallerMyFreeLeads']);
      queryClient.invalidateQueries(['adminFreeLeadDetails', selectedLead?.id]);
      setSelectedLead(prev => ({...prev, status4, status4_remark: remark}));
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Error updating status 4');
    }
  });

  const { data: callPulseLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['callPulseLeadLogs', 'FREE', selectedLead?.id],
    queryFn: async () => {
      if (!selectedLead?.id) return null;
      const res = await api.get(`/api/callpulse/lead-history?leadType=FREE&leadId=${selectedLead.id}`);
      return res.data;
    },
    enabled: !!selectedLead?.id
  });

  const filteredLeads = leadsData?.leads?.filter(lead => 
    lead.lead_name?.toLowerCase().includes(search.toLowerCase()) || 
    lead.lead_contact?.includes(search)
  ) || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Free Leads</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">View free leads you have fetched and completed.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search name or mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white dark:bg-[#1a1a24] border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full md:w-64 dark:text-white"
            />
          </div>
          <LeadViewToggle viewMode={viewMode} onChange={handleViewChange} />
        </div>
      </div>

      {viewMode === 'grid' ? (
        <LeadCardGrid leads={filteredLeads} onLeadClick={setSelectedLead} leadCategory="free" emptyMessage="No free leads found." />
      ) : (
      <div className="bg-white dark:bg-[#1a1a24] rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Lead Name</th>
                <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Mobile</th>
                <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Prev Telecaller</th>
                <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Status 4</th>
                <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Status 4 Time</th>
                <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">State</th>
                <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr><td colSpan="7" className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500" /></td></tr>
              ) : filteredLeads.length === 0 ? (
                <tr><td colSpan="7" className="p-8 text-center text-slate-500">No free leads found.</td></tr>
              ) : (
                filteredLeads.map(lead => (
                  <tr 
                    key={lead.id} 
                    onClick={() => setSelectedLead(lead)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{lead.lead_name || '-'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{lead.lead_contact || '-'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{lead.previous_telecaller_name || '-'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-bold">{lead.status4 || '-'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{lead.status4_timestamp ? new Date(lead.status4_timestamp).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "px-2.5 py-1 rounded-md text-xs font-bold",
                        lead.free_status === 'ASSIGNED' ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                      )}>
                        {lead.free_status === 'ASSIGNED' ? 'PENDING STATUS 4' : 'COMPLETED'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedLead(lead)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors"
                        title="View History"
                      >
                        <History size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#151521] rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#1a1a24]">
              <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                <History className="text-indigo-500" size={20} />
                Lead Details & History
              </h3>
              <button onClick={() => setSelectedLead(null)} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Left Column: Details & Edit */}
                <div className="space-y-6">
                  {/* Lead Info */}
                  <div className="bg-slate-50 dark:bg-[#1a1a24] p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase">Name</p>
                      <p className="font-semibold text-slate-900 dark:text-white">{selectedLead.lead_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase">Mobile</p>
                      <p className="font-semibold text-slate-900 dark:text-white">{selectedLead.lead_contact || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase">Current Status 4</p>
                      <p className="font-semibold text-emerald-600 dark:text-emerald-400">{selectedLead.status4 || 'Not Set'}</p>
                    </div>
                  </div>

                  {/* Edit Status 4 Form */}
                  <div className="bg-white dark:bg-[#1a1a24] p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h4 className="font-bold text-slate-800 dark:text-white mb-4">Edit Status 4</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">New Status 4 *</label>
                        <select 
                          value={status4}
                          onChange={(e) => setStatus4(e.target.value)}
                          className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#151521] dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                          <option value="">Select Status 4</option>
                          {['Ringing', 'Call Back', 'Info Given', 'Wrong No', 'Int Angel', 'Think&LMK', 'Not Int', 'RdyKYC'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Remark (Optional)</label>
                        <textarea 
                          value={remark}
                          onChange={(e) => setRemark(e.target.value)}
                          className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#151521] dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px]"
                          placeholder="Enter remarks here..."
                        />
                      </div>
                      <button
                        onClick={() => status4Mutation.mutate(selectedLead.id)}
                        disabled={!status4 || status4Mutation.isPending}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-md transition-all disabled:opacity-50"
                      >
                        {status4Mutation.isPending ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Save Status 4'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column: History & Call Logs */}
                <div className="space-y-6">
                  
                  {/* CallPulse Logs */}
                  <div className="bg-slate-50 dark:bg-[#1a1a24] p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <h4 className="font-bold text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2 mb-4">CallPulse Logs</h4>
                    {logsLoading ? (
                      <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-indigo-500" /></div>
                    ) : callPulseLogs?.length > 0 ? (
                      <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                        {callPulseLogs.map(log => (
                          <div key={log.id} className="bg-white dark:bg-[#151521] p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-sm flex justify-between items-center shadow-sm">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={cn(
                                  "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider",
                                  log.call_type === 'OUTGOING' ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400" :
                                  log.call_type === 'INCOMING' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" :
                                  "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                                )}>{log.call_type}</span>
                                <span className="font-semibold dark:text-white">{log.dialed_number}</span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(log.call_started_at).toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-slate-700 dark:text-slate-300">{log.duration_seconds}s</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-slate-500 text-sm py-4">No calls logged yet.</p>
                    )}
                  </div>

                  {/* Action History */}
                  <div className="bg-slate-50 dark:bg-[#1a1a24] p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <h4 className="font-bold text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2 mb-4">Action History</h4>
                    {detailsLoading ? (
                      <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-indigo-500" /></div>
                    ) : leadDetails?.history?.length > 0 ? (
                      <div className="space-y-6">
                        {leadDetails.history.map((hist, idx) => (
                          <div key={idx} className="relative pl-6 pb-4 border-l-2 border-slate-200 dark:border-slate-700 last:border-0 last:pb-0">
                            <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-indigo-500 ring-4 ring-white dark:ring-[#151521]" />
                            
                            <div className="mb-1 flex items-center justify-between">
                              <span className="text-xs font-bold px-2 py-1 bg-white dark:bg-[#151521] text-slate-600 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700">
                                {hist.action_type.replace(/_/g, ' ')}
                              </span>
                              <span className="text-[10px] text-slate-400">{new Date(hist.created_at).toLocaleString()}</span>
                            </div>
                            
                            {hist.action_type === 'MOVED_TO_FREE' && (
                              <div className="mt-2 space-y-1 bg-white dark:bg-[#151521] p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                                <p className="text-[11px] font-semibold text-slate-500">Prev Telecaller: {hist.telecaller_name}</p>
                                {hist.status1 && <div className="text-[11px]"><span className="font-semibold text-slate-600 dark:text-slate-400">Status 1:</span> <span className="font-bold">{hist.status1}</span> {hist.status1_remark && <span className="italic">({hist.status1_remark})</span>}</div>}
                                {hist.status2 && <div className="text-[11px]"><span className="font-semibold text-slate-600 dark:text-slate-400">Status 2:</span> <span className="font-bold">{hist.status2}</span> {hist.status2_remark && <span className="italic">({hist.status2_remark})</span>}</div>}
                                {hist.status3 && <div className="text-[11px]"><span className="font-semibold text-slate-600 dark:text-slate-400">Status 3:</span> <span className="font-bold">{hist.status3}</span> {hist.status3_remark && <span className="italic">({hist.status3_remark})</span>}</div>}
                              </div>
                            )}
                            
                            {hist.action_type === 'STATUS4_UPDATED' && (
                              <div className="mt-2 bg-emerald-50 dark:bg-emerald-500/10 p-2 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
                                 <div className="text-[11px]"><span className="text-emerald-700 dark:text-emerald-400 font-semibold">Status 4:</span> <span className="font-bold text-emerald-900 dark:text-emerald-300">{hist.status4}</span></div>
                                 {hist.status4_remark && <div className="text-[11px] mt-1 text-emerald-600 dark:text-emerald-500 italic">"{hist.status4_remark}"</div>}
                              </div>
                            )}

                            {hist.notes && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{hist.notes}</p>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-slate-500 text-sm py-4">No history recorded.</p>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
