import React, { useState, useEffect } from "react";
import LeadViewToggle from "../../components/leads/LeadViewToggle";
import LeadCardGrid from "../../components/leads/LeadCardGrid";
const TRANS_LS_KEY = "crm_view_mode_transferred_leads";
import { useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import { toast } from "react-hot-toast";

const STAGE_4_OPTIONS = ["Ringing", "Call Back", "Info Given", "Wrong No", "Int Angel", "Think&LMK", "Not Int", "RdyKYC"];

const TransferredLeads = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const period = searchParams.get("period");

  // Status Modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [status4, setStatus4] = useState("");
  const [status4Remark, setStatus4Remark] = useState("");
  const [updating, setUpdating] = useState(false);
  const [apiError, setApiError] = useState("");
  const [viewMode, setViewMode] = useState(() => localStorage.getItem(TRANS_LS_KEY) || "list");
  const handleViewChange = (mode) => { setViewMode(mode); localStorage.setItem(TRANS_LS_KEY, mode); };

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/telecaller/transferred-leads${period ? "?period=" + period : ""}`);
      if (res.data.success) {
        setLeads(res.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch transferred leads.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [period]);

  const openStatusModal = (lead) => {
    setSelectedLead(lead);
    setStatus4("");
    setStatus4Remark("");
    setApiError("");
    setShowStatusModal(true);
  };

  const handleStatusUpdate = async () => {
    if (!status4) {
      setApiError("Please select a status.");
      return;
    }
    setUpdating(true);
    setApiError("");
    try {
      const res = await api.post(`/api/telecaller/transferred-leads/${selectedLead.id}/status4`, {
        status4,
        status4_remark: status4Remark
      });
      if (res.data.success) {
        toast.success("Status updated successfully.");
        setShowStatusModal(false);
        fetchLeads();
      } else {
        setApiError(res.data.message || "Failed to update status.");
      }
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.message) {
        setApiError(err.response.data.message);
      } else {
        setApiError("An unexpected error occurred.");
      }
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  };

  return (
    <div className="flex-1 p-4 md:p-8 bg-gray-50 dark:bg-gray-900 overflow-auto">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transferred Leads</h1>
            <LeadViewToggle viewMode={viewMode} onChange={handleViewChange} />
          </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Leads transferred to you from other telecallers. Review history and update Status 4.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : leads.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center text-gray-500 dark:text-gray-400">
            You don't have any transferred leads assigned to you.
          </div>
        ) : viewMode === "list" ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700"><tr><th className="px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300">Lead Name</th><th className="px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300">Contact</th><th className="px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300">From</th><th className="px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300">Status 4</th><th className="px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300">State</th><th className="px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300">Action</th></tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">{leads.map(lead => (
                  <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{lead.lead_name}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono">{lead.lead_contact}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{lead.previous_telecaller_name || "-"}</td>
                    <td className="px-4 py-3">{lead.status4 || <span className="text-gray-400 italic">Not Updated</span>}</td>
                    <td className="px-4 py-3">{lead.transfer_status === "COMPLETED" ? <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">Completed</span> : <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium">Pending</span>}</td>
                    <td className="px-4 py-3"><button onClick={() => openStatusModal(lead)} className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">Update</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {leads.map(lead => (
              <div key={lead.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{lead.lead_name || "Unknown"}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 font-medium">{lead.lead_contact}</p>
                    </div>
                    {lead.transfer_status === 'COMPLETED' ? (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">Completed</span>
                    ) : (
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium">Pending Update</span>
                    )}
                  </div>
                  <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 flex justify-between">
                    <span>From: <span className="font-medium text-gray-700 dark:text-gray-300">{lead.previous_telecaller_name || "Unknown"}</span></span>
                    <span>Transferred: {new Date(lead.transferred_at).toLocaleDateString()}</span>
                  </div>
                  {lead.transfer_reason && (
                    <div className="mt-2 text-xs italic text-gray-500 bg-gray-100 dark:bg-gray-700 p-2 rounded">
                      "{lead.transfer_reason}"
                    </div>
                  )}
                </div>
                
                <div className="p-4 flex-1">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Previous Status History</h4>
                  <div className="space-y-3">
                    {[1, 2, 3].map(num => {
                      const st = lead[`status${num}`];
                      if (!st) return null;
                      return (
                        <div key={num} className="bg-gray-50 dark:bg-gray-700/30 p-2 rounded text-sm">
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-800 dark:text-gray-200">S{num}: {st}</span>
                            <span className="text-xs text-gray-500">{new Date(lead[`status${num}_timestamp`]).toLocaleDateString()}</span>
                          </div>
                          {lead[`status${num}_remark`] && (
                            <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">{lead[`status${num}_remark`]}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {lead.transfer_status === 'COMPLETED' && lead.status4 && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Your Update</h4>
                      <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded border border-indigo-100 dark:border-indigo-800 text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium text-indigo-700 dark:text-indigo-400">S4: {lead.status4}</span>
                          <span className="text-xs text-indigo-500">{new Date(lead.status4_timestamp).toLocaleDateString()}</span>
                        </div>
                        {lead.status4_remark && (
                          <div className="text-indigo-600 dark:text-indigo-300 text-xs mt-1">{lead.status4_remark}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {lead.transfer_status === 'ASSIGNED' && (
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => openStatusModal(lead)}
                      className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                    >
                      Update Status 4
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status Modal */}
      {showStatusModal && selectedLead && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Update Status</h3>
            <p className="text-sm text-gray-500 mb-4">Lead: {selectedLead.lead_name}</p>

            {apiError && (
              <div className="mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm border border-red-100 dark:border-red-800">
                {apiError}
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Status 4</label>
              <select
                value={status4}
                onChange={(e) => { setStatus4(e.target.value); setApiError(""); }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              >
                <option value="">-- Select Status --</option>
                {STAGE_4_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Remark (Optional)</label>
              <textarea
                value={status4Remark}
                onChange={(e) => setStatus4Remark(e.target.value)}
                placeholder="Enter any additional details..."
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              ></textarea>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowStatusModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 dark:text-gray-300">Cancel</button>
              <button onClick={handleStatusUpdate} disabled={updating} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center">
                {updating ? (
                  <><span className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Saving...</>
                ) : (
                  "Save Status"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TransferredLeads;
