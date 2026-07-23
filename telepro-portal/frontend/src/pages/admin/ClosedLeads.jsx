import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from '../../api/axios';
import { toast } from "react-hot-toast";
import LeadViewToggle from '../../components/leads/LeadViewToggle';
import LeadCardGrid from '../../components/leads/LeadCardGrid';
const CL_LS_KEY = "crm_view_mode_admin_closed_leads";

const ClosedLeads = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem(CL_LS_KEY) || "list");
  const handleViewChange = (mode) => { setViewMode(mode); localStorage.setItem(CL_LS_KEY, mode); };
  
  // Filters
  const [sourceTable, setSourceTable] = useState("All");
  const [closingStatus, setClosingStatus] = useState("All");
  const [search, setSearch] = useState("");
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal State
  const [selectedLead, setSelectedLead] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchClosedLeads = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/admin/closed-leads", {
        params: {
          source_table: sourceTable,
          closing_status: closingStatus,
          search,
          page,
          limit: 50
        }
      });
      if (res.data.success) {
        setLeads(res.data.data);
        setTotalPages(res.data.totalPages);
        setTotalCount(res.data.totalCount);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch closed leads.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClosedLeads();
  }, [sourceTable, closingStatus, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchClosedLeads();
  };

  const handleScan = async () => {
    if (!window.confirm("Are you sure you want to scan and move eligible leads to Closed Leads?")) return;
    setScanning(true);
    try {
      const res = await api.post("/api/admin/closed-leads/scan");
      if (res.data.success) {
        toast.success(`Scanned: ${res.data.scanned} | Moved: ${res.data.moved} | Skipped: ${res.data.skipped}`);
        setPage(1);
        fetchClosedLeads();
      } else {
        toast.error(res.data.message || "Scan failed.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error running scan.");
    } finally {
      setScanning(false);
    }
  };

  const handleViewDetails = async (id) => {
    try {
      const res = await api.get(`/api/admin/closed-leads/${id}`);
      if (res.data.success) {
        setSelectedLead(res.data.data);
        setShowModal(true);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch lead details.");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex-none bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Closed Leads</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage leads that have been closed due to inactivity. Total: {totalCount}
            </p>
          </div>
          <button
            onClick={handleScan}
            disabled={scanning}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {scanning ? "Scanning..." : "Scan & Move Closed Leads"}
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

          <select
            value={sourceTable}
            onChange={(e) => { setSourceTable(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
          >
            <option value="All">All Sources</option>
            <option value="working_sheet">Working Sheet</option>
            <option value="direct_leads">Direct Leads</option>
            <option value="free_leads">Free Leads</option>
          </select>

          <select
            value={closingStatus}
            onChange={(e) => { setClosingStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
          >
            <option value="All">All Statuses</option>
            <option value="Not Int">Not Int</option>
            <option value="Wrong No">Wrong No</option>
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
            <LeadCardGrid leads={leads} onLeadClick={(lead) => { setSelectedLead(lead); setShowModal(true); }} showTelecaller={true} leadCategory="closed" emptyMessage="No closed leads found." />
          ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300">
              <tr>
                <th className="px-4 py-3 font-medium">Lead Details</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Telecaller(s)</th>
                <th className="px-4 py-3 font-medium">Closing Status</th>
                <th className="px-4 py-3 font-medium">Dates</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan="6" className="text-center py-8">Loading...</td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-8">No closed leads found.</td></tr>
              ) : (
                leads.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{l.lead_name || "Unknown"}</div>
                      <div className="text-xs">{l.lead_contact}</div>
                    </td>
                    <td className="px-4 py-3 text-xs uppercase tracking-wider">
                      {l.source_table.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{l.telecaller_name || "None"}</div>
                      {l.source_table === 'free_leads' && l.previous_telecaller_name && (
                        <div className="text-xs text-gray-400">Prev: {l.previous_telecaller_name}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                        {l.closing_status}
                      </span>
                      <div className="text-xs mt-1 text-gray-400">{l.closing_status_level}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div><span className="text-gray-400">Closed:</span> {formatDate(l.closed_at)}</div>
                      <div><span className="text-gray-400">Updated:</span> {formatDate(l.last_status_updated_at)}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleViewDetails(l.id)}
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
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 text-sm dark:text-white"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 text-sm dark:text-white"
              >
                Next
              </button>
            </div>
          </div>
          </div>
          )}
        </div>
      </div>

      {/* View Details Modal */}
      {showModal && selectedLead && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowModal(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Closed Lead Details</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-500">
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Lead Name</label>
                    <div className="mt-1 text-sm text-gray-900 dark:text-white font-medium">{selectedLead.lead_name || "-"}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Contact</label>
                    <div className="mt-1 text-sm text-gray-900 dark:text-white font-medium">{selectedLead.lead_contact || "-"}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Source Table</label>
                    <div className="mt-1 text-sm text-gray-900 dark:text-white capitalize">{selectedLead.source_table.replace('_', ' ')}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Telecaller</label>
                    <div className="mt-1 text-sm text-gray-900 dark:text-white">{selectedLead.telecaller_name || "-"}</div>
                  </div>
                  {selectedLead.source_table === 'free_leads' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500">Previous Telecaller</label>
                      <div className="mt-1 text-sm text-gray-900 dark:text-white">{selectedLead.previous_telecaller_name || "-"}</div>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Closed At</label>
                    <div className="mt-1 text-sm text-gray-900 dark:text-white">{formatDate(selectedLead.closed_at)}</div>
                  </div>
                </div>

                <hr className="border-gray-200 dark:border-gray-700" />
                <h4 className="font-medium text-gray-900 dark:text-white">Status History</h4>
                <div className="space-y-3">
                  {[1, 2, 3, 4].map(num => {
                    const st = selectedLead[`status${num}`];
                    const rm = selectedLead[`status${num}_remark`];
                    const ts = selectedLead[`status${num}_timestamp`];
                    if (!st && !rm && !ts) return null;
                    const isClosing = selectedLead.closing_status_level === `STATUS${num}`;
                    return (
                      <div key={num} className={`p-3 rounded-lg border ${isClosing ? 'border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-900/20' : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Status {num}</span>
                            {isClosing && <span className="ml-2 text-[10px] uppercase font-bold text-red-600 dark:text-red-400">Final Closing Status</span>}
                            <div className="mt-1 font-medium text-gray-900 dark:text-white">{st || "-"}</div>
                            <div className="mt-1 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{rm || "No remark"}</div>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{formatDate(ts)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClosedLeads;
