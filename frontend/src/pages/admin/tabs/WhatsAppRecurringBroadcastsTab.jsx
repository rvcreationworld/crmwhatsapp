import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../../api/axios";
import {
  Plus, Edit, Trash2, Power, PowerOff, X, Image as ImageIcon, CheckCircle2, AlertCircle, Copy, FileText, Video, File, Music, List, Clock,
  Calendar, Check, Search, XCircle, Loader2
} from "lucide-react";
import { TableSkeleton, cn } from "../../../components/ui/Skeleton";
import toast from "react-hot-toast";

// [Note: Reusing Media Library modal and selection logic would require importing those components.
// --- Media Selector Component ---
const MediaSelectorModal = ({ isOpen, onClose, onSelect, selectedId, allowedType }) => {
  const { data: media = [], isLoading } = useQuery({
    queryKey: ["whatsapp-media"],
    queryFn: async () => {
      const res = await api.get('/api/whatsapp-center/media');
      return res.data.media || res.data;
    },
    enabled: isOpen
  });

  if (!isOpen) return null;

  const filtered = Array.isArray(media) ? media.filter(m => allowedType === 'DOCUMENT' ? m.media_type === 'DOCUMENT' : m.media_type === allowedType) : [];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1e1e2f] w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
             <ImageIcon size={18} className="text-indigo-500" /> Select {allowedType} Media
          </h3>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-700"><XCircle size={24} /></button>
        </div>
        <div className="p-4 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {isLoading && <Loader2 className="animate-spin text-indigo-500 mx-auto col-span-full my-8" />}
          {filtered.length === 0 && !isLoading && <p className="col-span-full text-center py-8 text-slate-500">No media found for this type. Please upload via Media Library first.</p>}
          {filtered.map(item => (
            <div 
              key={item.id} 
              onClick={() => { onSelect(item); onClose(); }}
              className={cn(
                "border rounded-xl cursor-pointer overflow-hidden transition-all hover:border-indigo-500 bg-white dark:bg-slate-800",
                selectedId === item.id ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-slate-200 dark:border-slate-700"
              )}
            >
              <div className="aspect-video bg-slate-100 dark:bg-slate-900 flex items-center justify-center relative">
                 {item.media_type === 'IMAGE' && <img src={item.public_url} className="w-full h-full object-cover" />}
                 {item.media_type === 'VIDEO' && <video src={item.public_url} className="w-full h-full object-cover opacity-80" />}
                 {item.media_type === 'DOCUMENT' && <File size={32} className="text-slate-400" />}
                 {selectedId === item.id && (
                    <div className="absolute top-2 right-2 bg-indigo-500 text-white rounded-full p-1 shadow-md">
                        <Check size={14} strokeWidth={3} />
                    </div>
                 )}
              </div>
              <div className="p-3 text-sm truncate font-medium text-slate-700 dark:text-slate-300" title={item.original_file_name}>{item.original_file_name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const initialFormState = {
  broadcast_name: "",
  schedule_type: "DAILY",
  daily_time: "09:00",
  week_day: "Monday",
  month_day: 1,
  message_type: "TEXT",
  text_message: "",
  media_library_id: "",
  button_payload_json: {
    type: "button",
    header: { type: "text", text: "" },
    body: { text: "" },
    action: { buttons: [] }
  },
  list_payload_json: {
    type: "list",
    header: { type: "text", text: "" },
    body: { text: "" },
    action: { button: "Select Option", sections: [] }
  },
  is_enabled: true,
};

const WhatsAppRecurringBroadcastsTab = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMediaSelectorOpen, setIsMediaSelectorOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState(initialFormState);

  // Fetch Broadcasts
  const { data: broadcastsResponse, isLoading } = useQuery({
    queryKey: ["recurring-broadcasts"],
    queryFn: async () => {
      const res = await api.get("/api/whatsapp-center/recurring-broadcasts");
      return res.data;
    },
  });

  const broadcasts = broadcastsResponse?.data || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => api.post("/api/whatsapp-center/recurring-broadcasts", data),
    onSuccess: () => {
      queryClient.invalidateQueries(["recurring-broadcasts"]);
      toast.success("Broadcast created successfully");
      setIsModalOpen(false);
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to create"),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => api.put(`/api/whatsapp-center/recurring-broadcasts/${editId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["recurring-broadcasts"]);
      toast.success("Broadcast updated successfully");
      setIsModalOpen(false);
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to update"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/api/whatsapp-center/recurring-broadcasts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(["recurring-broadcasts"]);
      toast.success("Broadcast deleted successfully");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (data) => api.put(`/api/whatsapp-center/recurring-broadcasts/${data.id}`, { ...data, is_enabled: !data.is_enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries(["recurring-broadcasts"]);
      toast.success("Status updated");
    },
  });

  const handleOpenModal = (broadcast = null) => {
    if (broadcast) {
      setEditId(broadcast.id);
      setFormData({
        broadcast_name: broadcast.broadcast_name,
        schedule_type: broadcast.schedule_type,
        daily_time: broadcast.daily_time.substring(0, 5), // 'HH:mm'
        week_day: broadcast.week_day || "Monday",
        month_day: broadcast.month_day || 1,
        message_type: broadcast.message_type,
        text_message: broadcast.text_message || "",
        media_library_id: broadcast.media_library_id || "",
        button_payload_json: broadcast.button_payload_json || initialFormState.button_payload_json,
        list_payload_json: broadcast.list_payload_json || initialFormState.list_payload_json,
        is_enabled: broadcast.is_enabled,
      });
    } else {
      setEditId(null);
      setFormData(initialFormState);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editId) updateMutation.mutate(formData);
    else createMutation.mutate(formData);
  };

  return (
    <div className="bg-white dark:bg-[#1e1e2f] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="text-indigo-500" size={24} />
            Recurring Broadcasts
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Schedule daily, weekly, or monthly messages for active sessions.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm"
        >
          <Plus size={18} />
          Create Broadcast
        </button>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm text-left text-slate-600 dark:text-slate-300">
            <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4 font-semibold">Broadcast Name</th>
                <th className="px-6 py-4 font-semibold">Schedule</th>
                <th className="px-6 py-4 font-semibold">Message Type</th>
                <th className="px-6 py-4 font-semibold">Stats</th>
                <th className="px-6 py-4 font-semibold">Last Execution</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {broadcasts.map((b) => (
                <tr key={b.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/20">
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                    {b.broadcast_name}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">{b.schedule_type}</span>
                      <span className="text-xs text-slate-500">
                        {b.schedule_type === "WEEKLY" && `${b.week_day}s at `}
                        {b.schedule_type === "MONTHLY" && `Day ${b.month_day} at `}
                        {b.daily_time.substring(0, 5)} (IST)
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-xs font-medium">
                      {b.message_type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                     <div className="text-xs">
                        <span className="text-emerald-500">Q: {b.stats?.queued || 0}</span>
                        <span className="text-red-500 ml-2">F: {b.stats?.failed || 0}</span>
                     </div>
                  </td>
                  <td className="px-6 py-4 text-xs">
                    {b.last_execution_datetime ? new Date(b.last_execution_datetime).toLocaleString() : "Never"}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => toggleStatusMutation.mutate(b)}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1.5 transition-colors",
                        b.is_enabled
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      )}
                    >
                      {b.is_enabled ? <Power size={14} /> : <PowerOff size={14} />}
                      {b.is_enabled ? "Enabled" : "Disabled"}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleOpenModal(b)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => deleteMutation.mutate(b.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {broadcasts.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                    No recurring broadcasts found. Create one to get started!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1e1e2f] rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {editId ? <Edit size={20} className="text-indigo-500" /> : <Plus size={20} className="text-indigo-500" />}
                {editId ? "Edit Broadcast" : "Create Broadcast"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <form id="broadcast-form" onSubmit={handleSubmit} className="space-y-6">
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Broadcast Name</label>
                  <input
                    type="text" required
                    value={formData.broadcast_name}
                    onChange={e => setFormData({...formData, broadcast_name: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-[#151521] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5"
                    placeholder="e.g. Morning Motivation"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Schedule Type</label>
                    <select
                      value={formData.schedule_type}
                      onChange={e => setFormData({...formData, schedule_type: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-[#151521] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5"
                    >
                      <option value="DAILY">Daily</option>
                      <option value="WEEKLY">Weekly</option>
                      <option value="MONTHLY">Monthly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Time (Asia/Kolkata)</label>
                    <input
                      type="time" required
                      value={formData.daily_time}
                      onChange={e => setFormData({...formData, daily_time: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-[#151521] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5"
                    />
                  </div>
                </div>

                {formData.schedule_type === "WEEKLY" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Day of Week</label>
                    <select
                      value={formData.week_day}
                      onChange={e => setFormData({...formData, week_day: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-[#151521] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5"
                    >
                      {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.schedule_type === "MONTHLY" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Day of Month (1-31)</label>
                    <input
                      type="number" min="1" max="31" required
                      value={formData.month_day}
                      onChange={e => setFormData({...formData, month_day: parseInt(e.target.value)})}
                      className="w-full bg-slate-50 dark:bg-[#151521] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5"
                    />
                    <p className="text-xs text-slate-500 mt-1">Months with fewer days will snap to the last day of the month.</p>
                  </div>
                )}

                <hr className="border-slate-200 dark:border-slate-700" />

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Message Type</label>
                    <select
                      value={formData.message_type}
                      onChange={e => setFormData({...formData, message_type: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-[#151521] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5"
                    >
                      <option value="TEXT">Text</option>
                      <option value="IMAGE">Image</option>
                      <option value="VIDEO">Video</option>
                      <option value="DOCUMENT">Document</option>
                      <option value="AUDIO">Audio</option>
                    </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Message Text (Variables supported)</label>
                  <textarea
                    value={formData.text_message}
                    onChange={e => setFormData({...formData, text_message: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-[#151521] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 min-h-[100px]"
                    placeholder="Hello {{customer_name}}, this is your daily update..."
                  />
                </div>

                {formData.message_type !== "TEXT" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Media Library File</label>
                    
                    <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setIsMediaSelectorOpen(true)}
                          className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg shadow-sm transition-colors text-sm font-medium"
                        >
                          <ImageIcon size={16} />
                          Select from Media Library
                        </button>
                        
                        {formData.media_library_id && (
                           <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-500/20">
                              <CheckCircle2 size={16} />
                              Media Selected (ID: {formData.media_library_id})
                           </div>
                        )}
                        {!formData.media_library_id && (
                           <span className="text-sm text-red-500">* Required</span>
                        )}
                    </div>
                  </div>
                )}

              </form>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="broadcast-form"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors font-medium flex items-center gap-2"
              >
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 size={16} className="animate-spin" />}
                {editId ? "Update Broadcast" : "Create Broadcast"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Media Selector Modal */}
      <MediaSelectorModal 
        isOpen={isMediaSelectorOpen}
        onClose={() => setIsMediaSelectorOpen(false)}
        allowedType={formData.message_type}
        selectedId={formData.media_library_id}
        onSelect={(media) => {
            setFormData({ ...formData, media_library_id: media.id });
        }}
      />
    </div>
  );
};

export default WhatsAppRecurringBroadcastsTab;
