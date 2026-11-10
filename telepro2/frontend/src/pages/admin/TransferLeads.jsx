import React, { useState, useEffect } from "react";
import api from "../../api/axios";
import { toast } from "react-hot-toast";
import LeadViewToggle from '../../components/leads/LeadViewToggle';
import LeadCardGrid from '../../components/leads/LeadCardGrid';
const ATAL_LS_KEY = 'crm_view_mode_admin_transfer_leads';

const TransferLeads = () => {
  const [leads, setLeads] = useState([]);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem(ATAL_LS_KEY) || "list");
  const handleViewChange = (mode) => { setViewMode(mode); localStorage.setItem(ATAL_LS_KEY, mode); };
  const [loading, setLoading] = useState(false);
  const [telecallers, setTelecallers] = useState([]);
  
  // Tabs and Filters
  const [tab, setTab] = useState("current_month");
  const [sourceTable, setSourceTable] = useState("all");
  const [telecallerId, setTelecallerId] = useState("all");
  const [search, setSearch] = useState("");
  const [filterUntouched, setFilterUntouched] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selection
  const [selectedLeads, setSelectedLeads] = useState([]);

  // Transfer Modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [targetTelecallerId, setTargetTelecallerId] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [transferring, setTransferring] = useState(false);

  // Details Modal
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLeadDetails, setSelectedLeadDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    fetchTelecallers();
  }, []);

  const fetchTelecallers = async () => {
    try {
      const res = await api.get('/api/telecallers?limit=500');
      if (res.data.data) {
        setTelecallers(res.data.data.filter(t => t.is_active));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/admin/transfer-leads", {
        params: { tab, source_table: sourceTable, telecaller_id: telecallerId, search, page, limit: 50, filter_untouched: filterUntouched }
      });
      if (res.data.success) {
        setLeads(res.data.data);
        setTotalPages(res.data.totalPages);
        setTotalCount(res.data.totalCount);
        setSelectedLeads([]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch transfer leads.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [tab, sourceTable, telecallerId, search, page, filterUntouched]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLeads();
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedLeads(leads.map(l => ({ source_table: l.source_table, lead_id: l.lead_id })));
    } else {
      setSelectedLeads([]);
    }
  };

  const handleSelectOne = (e, source_table, lead_id) => {
    if (e.target.checked) {
      setSelectedLeads(prev => [...prev, { source_table, lead_id }]);
    } else {
      setSelectedLeads(prev => prev.filter(l => !(l.source_table === source_table && l.lead_id === lead_id)));
    }
  };

  const isSelected = (source_table, lead_id) => {
    return selectedLeads.some(l => l.source_table === source_table && l.lead_id === lead_id);
  };

  const handleTransferSubmit = async () => {
    if (!targetTelecallerId) {
      toast.error("Please select a target telecaller.");
      return;
    }
    setTransferring(true);
    try {
      const res = await api.post("/api/admin/transfer-leads/transfer", {
        target_telecaller_id: targetTelecallerId,
        transfer_reason: transferReason,
        leads: selectedLeads
      });
      if (res.data.success) {
        toast.success(`Successfully transferred ${res.data.transferred} leads. Skipped: ${res.data.skipped}`);
        setShowTransferModal(false);
        setTargetTelecallerId("");
        setTransferReason("");
        setPage(1);
        fetchLeads();
      } else {
        toast.error(res.data.message || "Transfer failed.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error running transfer.");
    } finally {
      setTransferring(false);
    }
  };

  const handleViewDetails = async (sourceTable, leadId) => {
    setDetailsLoading(true);
    setShowDetailsModal(true);
    setSelectedLeadDetails(null);
    try {
      const res = await api.get(`/api/admin/transfer-leads/${sourceTable}/${leadId}`);
      if (res.data.success) {
        setSelectedLeadDetails(res.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch lead details.");
      setShowDetailsModal(false);
    } finally {
      setDetailsLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-gray-50 dark:bg-gray-900">
      <div className="flex-none bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transfer Leads</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Select active leads and transfer them between telecallers. Total: {totalCount}
            </p>
          </div>
          <button
            onClick={() => setShowTransferModal(true)}
            disabled={selectedLeads.length === 0}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            Transfer Selected ({selectedLeads.length})
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-none bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 pt-2">
        <div className="max-w-7xl mx-auto flex gap-4">
          <button 
            className={`pb-2 px-1 border-b-2 font-medium text-sm ${tab === 'current_month' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
            onClick={() => { setTab('current_month'); setPage(1); }}
          >
            Current Month
          </button>
          <button 
            className={`pb-2 px-1 border-b-2 font-medium text-sm ${tab === 'old_month' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
            onClick={() => { setTab('old_month'); setPage(1); }}
          >
            Old Month
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex-none bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-4">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="Search Name or Mobile"
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Search</button>
          </form>

          <button
            onClick={() => { setFilterUntouched(!filterUntouched); setPage(1); }}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${
              filterUntouched 
                ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800/50 dark:text-red-400 font-semibold' 
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
            title="Show Untouched Leads Only"
          >
            <span className={`w-2.5 h-2.5 rounded-full ${filterUntouched ? 'bg-red-500 animate-pulse' : 'bg-gray-300 dark:bg-gray-600'}`}></span>
            Untouched Only
          </button>

          <select
            value={sourceTable}
            onChange={(e) => { setSourceTable(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
          >
            <option value="all">All Sources</option>
            <option value="working_sheet">Working Sheet</option>
            <option value="direct_leads">Direct Leads</option>
            <option value="free_leads">Free Leads</option>
          </select>

          <select
            value={telecallerId}
            onChange={(e) => { setTelecallerId(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
          >
            <option value="all">All Telecallers</option>
            {telecallers.map(t => (
              <option key={t.id} value={t.id}>{t.telecaller_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-end mb-3">
            <LeadViewToggle viewMode={viewMode} onChange={handleViewChange} />
          </div>
          {viewMode === "grid" ? (
            <LeadCardGrid leads={leads || []} onLeadClick={() => {}} showTelecaller={true} leadCategory="normal" emptyMessage="No transfer leads found." />
          ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300">
              <tr>
                <th className="px-4 py-3">
                  <input 
                    type="checkbox" 
                    onChange={handleSelectAll} 
                    checked={leads.length > 0 && selectedLeads.length === leads.length}
                  />
                </th>
                <th className="px-4 py-3 font-medium">Lead Name</th>
                <th className="px-4 py-3 font-medium">Mobile</th>
                <th className="px-4 py-3 font-medium">Current Telecaller</th>
                <th className="px-4 py-3 font-medium">Source / Status</th>
                <th className="px-4 py-3 font-medium">Call Summary</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan="7" className="text-center py-8">Loading...</td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-8">No transferable leads found.</td></tr>
              ) : (
                leads.map((l, i) => (
                  <tr key={`${l.source_table}_${l.lead_id}_${i}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <input 
                        type="checkbox" 
                        checked={isSelected(l.source_table, l.lead_id)}
                        onChange={(e) => handleSelectOne(e, l.source_table, l.lead_id)}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {l.lead_name || "Unknown"}
                    </td>
                    <td className="px-4 py-3 text-xs">{l.lead_contact}</td>
                    <td className="px-4 py-3">{l.telecaller_name || "None"}</td>
                    <td className="px-4 py-3 text-xs">
                      <div className="uppercase tracking-wider font-semibold">{l.source_table.replace('_', ' ')}</div>
                      <div className="text-gray-400 mt-1">Created: {new Date(l.created_at).toLocaleDateString("en-IN")}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {l.status1 && <span className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-[10px]">{l.status1}</span>}
                        {l.status2 && <span className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-[10px]">{l.status2}</span>}
                        {l.status3 && <span className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-[10px]">{l.status3}</span>}
                        {l.status4 && <span className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-[10px]">{l.status4}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div>Calls: <span className="font-medium">{l.call_count}</span></div>
                      <div>Duration: <span className="font-medium">{l.total_duration_seconds}s</span></div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleViewDetails(l.source_table, l.lead_id)}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          {/* Pagination */}
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800 rounded-b-xl">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Page {page} of {totalPages || 1}
            </span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 text-sm dark:text-white">Previous</button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 text-sm dark:text-white">Next</button>
            </div>
          </div>
          </div>
          )}
        </div>
      </div>

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Transfer {selectedLeads.length} Leads</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Telecaller</label>
              <select
                value={targetTelecallerId}
                onChange={(e) => setTargetTelecallerId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select Telecaller</option>
                {telecallers.map(t => (
                  <option key={t.id} value={t.id}>{t.telecaller_name}</option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Transfer Reason (Optional)</label>
              <input
                type="text"
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                placeholder="E.g., Telecaller absent, Reallocation..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowTransferModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 dark:text-gray-300">Cancel</button>
              <button onClick={handleTransferSubmit} disabled={transferring} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
                {transferring ? "Transferring..." : "Confirm Transfer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Lead Details & Call Logs</h3>
              <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-500">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="px-6 py-4 overflow-y-auto flex-1">
              {detailsLoading || !selectedLeadDetails ? (
                <div className="text-center py-8">Loading details...</div>
              ) : (
                <div className="space-y-6">
                  {/* Lead Info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                    <div><span className="block text-xs text-gray-500">Name</span><span className="font-medium dark:text-white">{selectedLeadDetails.lead_name || "-"}</span></div>
                    <div><span className="block text-xs text-gray-500">Contact</span><span className="font-medium dark:text-white">{selectedLeadDetails.lead_contact || "-"}</span></div>
                    <div><span className="block text-xs text-gray-500">Source</span><span className="font-medium dark:text-white uppercase">{selectedLeadDetails.source || "UNKNOWN"}</span></div>
                    <div><span className="block text-xs text-gray-500">Telecaller</span><span className="font-medium dark:text-white">{selectedLeadDetails.telecaller_name || "-"}</span></div>
                  </div>

                  {/* Statuses */}
                  <div>
                    <h4 className="font-medium mb-3 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">Status History</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[1, 2, 3, 4].map(num => {
                        const st = selectedLeadDetails[`status${num}`];
                        if (!st && num === 4) return null; // Only show status4 if it exists
                        return (
                          <div key={num} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                            <div className="flex justify-between">
                              <span className="font-medium text-sm text-indigo-600 dark:text-indigo-400">Status {num}: {st || "Pending"}</span>
                              <span className="text-xs text-gray-500">{formatDate(selectedLeadDetails[`status${num}_timestamp`])}</span>
                            </div>
                            <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">{selectedLeadDetails[`status${num}_remark`] || "-"}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Call Logs */}
                  <div>
                    <h4 className="font-medium mb-3 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">Call Logs</h4>
                    {selectedLeadDetails.callLogs && selectedLeadDetails.callLogs.length > 0 ? (
                      <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                          <tr>
                            <th className="px-3 py-2 font-medium">Time</th>
                            <th className="px-3 py-2 font-medium">Type</th>
                            <th className="px-3 py-2 font-medium">Duration</th>
                            <th className="px-3 py-2 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {selectedLeadDetails.callLogs.map((log, idx) => (
                            <tr key={idx}>
                              <td className="px-3 py-2 whitespace-nowrap text-xs">{formatDate(log.call_started_at)}</td>
                              <td className="px-3 py-2">{log.call_type}</td>
                              <td className="px-3 py-2">{log.duration_seconds}s</td>
                              <td className="px-3 py-2">
                                {log.status === 'SUCCESS' ? (
                                  <span className="text-green-600">Success</span>
                                ) : (
                                  <span className="text-red-600" title={log.error_reason}>Failed</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="text-sm text-gray-500 italic">No call logs found for this lead with the current telecaller.</div>
                    )}
                  </div>

                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TransferLeads;
