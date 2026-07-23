import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { Loader2, Search, Filter, History, RefreshCw, X, UploadCloud, FileText } from 'lucide-react';
import LeadViewToggle from '../../components/leads/LeadViewToggle';
import LeadCardGrid from '../../components/leads/LeadCardGrid';
const AFL_LS_KEY = 'crm_view_mode_admin_free_leads';
import { cn } from '../../components/ui/Skeleton';

const STATUS_TABS = ['All', 'AVAILABLE', 'ASSIGNED', 'COMPLETED'];
const SOURCE_TABS = ['All', 'Auto 30 Days', 'Bulk Upload'];

export default function FreeLeads() {
  const [activeTab, setActiveTab] = useState('All');
  const [activeSourceTab, setActiveSourceTab] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  
  // Bulk Upload State
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState(localStorage.getItem(AFL_LS_KEY) || "list");
  const handleViewChange = (mode) => { setViewMode(mode); localStorage.setItem(AFL_LS_KEY, mode); };

  const { data: leadsData, isLoading, refetch } = useQuery({
    queryKey: ['adminFreeLeads', activeTab, activeSourceTab],
    queryFn: async () => {
      const res = await api.get(`/api/admin/free-leads`, { params: { status: activeTab, source: activeSourceTab } });
      return res.data;
    }
  });

  const { data: batchesData } = useQuery({
    queryKey: ['adminFreeLeadsBatches'],
    queryFn: async () => {
      const res = await api.get('/api/admin/free-leads/bulk-upload/batches');
      return res.data.batches || [];
    }
  });

  const scanMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/api/admin/free-leads/scan');
      return res.data;
    },
    onSuccess: (data) => {
      alert(`Scan Complete!\n\nScanned: ${data.scanned}\nMoved to Free: ${data.moved}\nSkipped: ${data.skipped}\nInactive Days Rule: ${data.inactive_days} days`);
      queryClient.invalidateQueries(['adminFreeLeads']);
    },
    onError: () => {
      alert('Error scanning leads.');
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async (fileToUpload) => {
      const formData = new FormData();
      formData.append('file', fileToUpload);
      const res = await api.post('/api/admin/free-leads/bulk-upload', formData);
      return res.data;
    },
    onSuccess: (data) => {
      setUploadResult(data.summary);
      alert(data.message);
      queryClient.invalidateQueries(['adminFreeLeads']);
      queryClient.invalidateQueries(['adminFreeLeadsBatches']);
      setFile(null);
      document.getElementById('bulkUploadInput').value = '';
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Error uploading file.');
    },
    onSettled: () => setUploading(false)
  });

  const handleUpload = () => {
    if (!file) return;
    setUploading(true);
    uploadMutation.mutate(file);
  };

  const { data: leadDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['adminFreeLeadDetails', selectedLead?.id],
    queryFn: async () => {
      if (!selectedLead?.id) return null;
      const res = await api.get(`/api/admin/free-leads/${selectedLead.id}`);
      return res.data;
    },
    enabled: !!selectedLead?.id
  });

  const { data: callPulseLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['adminCallPulseLeadLogs', 'FREE', selectedLead?.id],
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400';
      case 'ASSIGNED': return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';
      case 'COMPLETED': return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Free Leads</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage leads that have been released to the free pool.</p>
        </div>
        <button
          onClick={() => scanMutation.mutate()}
          disabled={scanMutation.isPending}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-indigo-500/30 transition-all disabled:opacity-50"
        >
          {scanMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
          Scan & Move Eligible Leads
        </button>
      </div>

      <div className="bg-white dark:bg-[#1a1a24] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
            <UploadCloud size={20} className="text-indigo-500" />
            <h3>Bulk Upload Free Leads</h3>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Upload CSV or Excel files. Required columns: <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-indigo-600 dark:text-indigo-400">lead_name</code> and <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-indigo-600 dark:text-indigo-400">lead_contact</code>.
          </p>
          <div className="flex items-center gap-3">
            <input 
              type="file" 
              id="bulkUploadInput"
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              onChange={(e) => setFile(e.target.files[0])}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 dark:file:bg-indigo-500/20 dark:file:text-indigo-400 dark:text-slate-300"
            />
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-xl font-semibold shadow-sm hover:bg-slate-800 dark:hover:bg-slate-200 transition-all disabled:opacity-50 shrink-0"
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
              Upload
            </button>
          </div>
          {uploadResult && (
            <div className="flex items-center gap-4 text-sm p-3 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-xl border border-emerald-100 dark:border-emerald-500/20">
              <span><strong>Total:</strong> {uploadResult.total}</span>
              <span><strong>Imported:</strong> {uploadResult.imported}</span>
              <span><strong>Duplicates:</strong> {uploadResult.duplicates}</span>
              <span><strong>Skipped:</strong> {uploadResult.skipped}</span>
            </div>
          )}
        </div>
        
        <div className="md:w-[350px] shrink-0">
          <div className="bg-slate-50 dark:bg-[#151521] rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Format Example</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] text-slate-600 dark:text-slate-400">
                <thead className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <tr>
                    <th className="px-2 py-1.5 rounded-l-md font-semibold">lead_name</th>
                    <th className="px-2 py-1.5 rounded-r-md font-semibold">lead_contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  <tr><td className="px-2 py-1.5">Rahul Sharma</td><td className="px-2 py-1.5">9876543210</td></tr>
                  <tr><td className="px-2 py-1.5">Priya Patil</td><td className="px-2 py-1.5">919876543210</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {batchesData?.length > 0 && (
        <div className="bg-white dark:bg-[#1a1a24] rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">Recent Upload Batches</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300">File Name</th>
                  <th className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300">Total</th>
                  <th className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300">Imported</th>
                  <th className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300">Duplicates</th>
                  <th className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300">Skipped</th>
                  <th className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300">Uploaded At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {batchesData.map(batch => (
                  <tr key={batch.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-2 text-slate-700 dark:text-slate-300 font-medium">{batch.file_name}</td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{batch.total_rows}</td>
                    <td className="px-4 py-2 text-emerald-600 font-medium">{batch.imported_count}</td>
                    <td className="px-4 py-2 text-amber-600">{batch.duplicate_count}</td>
                    <td className="px-4 py-2 text-red-600">{batch.skipped_count}</td>
                    <td className="px-4 py-2 text-slate-500 text-xs">{new Date(batch.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto">
            {SOURCE_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveSourceTab(tab)}
                className={cn(
                  "px-4 py-2 text-sm font-semibold rounded-lg whitespace-nowrap transition-all",
                  activeSourceTab === tab 
                    ? "bg-white dark:bg-[#1a1a24] text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto">
            {STATUS_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-2 text-sm font-semibold rounded-lg whitespace-nowrap transition-all",
                  activeTab === tab 
                    ? "bg-white dark:bg-[#1a1a24] text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
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

      {viewMode === "grid" ? (
        <LeadCardGrid leads={filteredLeads} onLeadClick={setSelectedLead} showTelecaller={true} leadCategory="free" emptyMessage="No free leads found." />
      ) : (
      <div className="bg-white dark:bg-[#1a1a24] rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Lead Name</th>
                <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Mobile</th>
                <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Prev Telecaller</th>
                <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Source</th>
                <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Moved/Uploaded At</th>
                <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Current Assigned</th>
                <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Status</th>
                <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr><td colSpan="8" className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500" /></td></tr>
              ) : filteredLeads.length === 0 ? (
                <tr><td colSpan="8" className="p-8 text-center text-slate-500">No free leads found.</td></tr>
              ) : (
                filteredLeads.map(lead => (
                  <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        {lead.lead_name || '-'}
                        {lead.import_source === 'BULK_UPLOAD' ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400 border border-purple-200 dark:border-purple-800/30">BULK</span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-200 dark:border-blue-800/30">AUTO 30 DAYS</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{lead.lead_contact || '-'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{lead.previous_telecaller_name || '-'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-slate-500">
                        {lead.original_table === 'working_sheet' ? (lead.source === 'PERSONAL_META_AD' ? 'Meta' : 'Bot') : lead.original_table === 'bulk_upload' ? 'Bulk Upload' : 'Direct'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{new Date(lead.moved_to_free_at || lead.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{lead.current_telecaller_name || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2.5 py-1 rounded-md text-xs font-bold", getStatusColor(lead.free_status))}>
                        {lead.free_status}
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
          <div className="bg-white dark:bg-[#151521] rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#1a1a24]">
              <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                <History className="text-indigo-500" size={20} />
                Lead History
              </h3>
              <button onClick={() => setSelectedLead(null)} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Name</p>
                  <p className="font-medium text-sm dark:text-white">{selectedLead.lead_name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Mobile</p>
                  <p className="font-medium text-sm dark:text-white">{selectedLead.lead_contact}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Source</p>
                  <p className="font-medium text-sm dark:text-white">{selectedLead.import_source === 'BULK_UPLOAD' ? 'Bulk Upload' : 'Auto 30 Days'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{selectedLead.import_source === 'BULK_UPLOAD' ? 'Uploaded At' : 'Moved At'}</p>
                  <p className="font-medium text-sm dark:text-white">{new Date(selectedLead.moved_to_free_at || selectedLead.created_at).toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {/* CallPulse Logs Column */}
                <div className="bg-white dark:bg-[#1a1a24] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <h4 className="font-bold text-sm text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2 mb-4">CallPulse Logs</h4>
                  {logsLoading ? (
                    <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-indigo-500" /></div>
                  ) : callPulseLogs?.length > 0 ? (
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                      {callPulseLogs.map(log => (
                        <div key={log.id} className="bg-slate-50 dark:bg-[#151521] p-3 rounded-lg border border-slate-100 dark:border-slate-800 text-sm flex justify-between items-center">
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
                            <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(log.call_started_at).toLocaleString()} - Telecaller ID: {log.telecaller_id}</p>
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

                {/* History Column */}
                <div className="bg-white dark:bg-[#1a1a24] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <h4 className="font-bold text-sm text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2 mb-4">Action History</h4>
                  {detailsLoading ? (
                    <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
                  ) : leadDetails?.history?.length > 0 ? (
                    <div className="space-y-4 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent max-h-64 overflow-y-auto pr-2">
                      {leadDetails.history.map((hist, idx) => (
                        <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full border border-white dark:border-[#151521] bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
                          </div>
                          
                          <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl bg-slate-50 dark:bg-[#151521] border border-slate-100 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold px-2 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded">
                                {hist.action_type.replace(/_/g, ' ')}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">{new Date(hist.created_at).toLocaleString()}</span>
                            </div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{hist.telecaller_name || 'System'}</p>
                            
                            {hist.action_type === 'MOVED_TO_FREE' && (
                              <div className="mt-3 space-y-2">
                                {hist.status1 && <div className="text-xs"><span className="text-slate-500">Status 1:</span> <span className="font-medium dark:text-slate-300">{hist.status1}</span> {hist.status1_remark && <span className="text-slate-400 italic">({hist.status1_remark})</span>}</div>}
                                {hist.status2 && <div className="text-xs"><span className="text-slate-500">Status 2:</span> <span className="font-medium dark:text-slate-300">{hist.status2}</span> {hist.status2_remark && <span className="text-slate-400 italic">({hist.status2_remark})</span>}</div>}
                                {hist.status3 && <div className="text-xs"><span className="text-slate-500">Status 3:</span> <span className="font-medium dark:text-slate-300">{hist.status3}</span> {hist.status3_remark && <span className="text-slate-400 italic">({hist.status3_remark})</span>}</div>}
                              </div>
                            )}
                            
                            {hist.action_type === 'STATUS4_UPDATED' && (
                              <div className="mt-3 bg-white dark:bg-slate-800 p-2 rounded text-xs">
                                <p><span className="text-slate-500">Status 4:</span> <span className="font-medium text-slate-800 dark:text-slate-200">{hist.status4}</span></p>
                                {hist.status4_remark && <p className="text-slate-400 italic mt-1">"{hist.status4_remark}"</p>}
                              </div>
                            )}
                            
                            {hist.notes && <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">{hist.notes}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-slate-500 text-sm py-8">No history recorded.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
