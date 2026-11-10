import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/axios";
import { Loader2, AlertCircle, Save, CheckCircle, MailWarning, Clock } from "lucide-react";
import toast from "react-hot-toast";

const InteraktAgentsTab = () => {
    const queryClient = useQueryClient();
    const [editingRows, setEditingRows] = useState({});

    const { data: agents = [], isLoading, isError } = useQuery({
        queryKey: ["whatsapp-interakt-agents"],
        queryFn: async () => {
            const res = await api.get('/api/whatsapp-center/interakt-agents');
            return res.data.agents;
        }
    });

    const updateAgentMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            return await api.put(`/api/whatsapp-center/interakt-agents/${id}`, data);
        },
        onSuccess: (data, variables) => {
            toast.success("Agent updated successfully");
            queryClient.invalidateQueries(["whatsapp-interakt-agents"]);
            
            // Remove from editing state
            const newEditing = { ...editingRows };
            delete newEditing[variables.id];
            setEditingRows(newEditing);
        },
        onError: (error) => {
            toast.error(error?.response?.data?.message || "Failed to update agent");
        }
    });

    const handleEditChange = (id, field, value) => {
        const agent = agents.find(a => a.id === id);
        const currentEdit = editingRows[id] || { 
            interakt_agent_email: agent.interakt_agent_email || "", 
            interakt_agent_status: agent.interakt_agent_status || "NOT_REGISTERED" 
        };
        
        setEditingRows({
            ...editingRows,
            [id]: { ...currentEdit, [field]: value }
        });
    };

    const handleSave = (id) => {
        const data = editingRows[id];
        if (!data) return;
        updateAgentMutation.mutate({ id, data });
    };

    const activeCount = agents.filter(a => a.interakt_agent_status === 'ACTIVE').length;
    const pendingCount = agents.filter(a => a.interakt_agent_status === 'PENDING').length;
    const missingEmailCount = agents.filter(a => a.is_active && (!a.interakt_agent_email || a.interakt_agent_status === 'NOT_REGISTERED')).length;

    if (isLoading) {
        return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;
    }

    if (isError) {
        return <div className="p-6 text-red-600 flex items-center gap-2"><AlertCircle /> Failed to load Interakt Agents data</div>;
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-[#1e1e2f] p-6 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                        <CheckCircle size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Active Agents</p>
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{activeCount}</h3>
                    </div>
                </div>
                <div className="bg-white dark:bg-[#1e1e2f] p-6 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                    <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Pending Setup</p>
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{pendingCount}</h3>
                    </div>
                </div>
                <div className="bg-white dark:bg-[#1e1e2f] p-6 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                    <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
                        <MailWarning size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Missing Email (Active TCs)</p>
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{missingEmailCount}</h3>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-[#1e1e2f] rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="font-semibold text-slate-800 dark:text-white">Bulk Agent Setup</h3>
                    <p className="text-sm text-slate-500">Easily map telecallers to their Interakt Emails.</p>
                </div>
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        <tr>
                            <th className="px-6 py-4 font-medium">Telecaller Name</th>
                            <th className="px-6 py-4 font-medium">CRM Mobile</th>
                            <th className="px-6 py-4 font-medium">Interakt Email</th>
                            <th className="px-6 py-4 font-medium">Status</th>
                            <th className="px-6 py-4 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {agents.map(a => {
                            const isEditing = !!editingRows[a.id];
                            const currentData = isEditing ? editingRows[a.id] : { 
                                interakt_agent_email: a.interakt_agent_email || "", 
                                interakt_agent_status: a.interakt_agent_status || "NOT_REGISTERED" 
                            };

                            const hasChanges = isEditing && (
                                currentData.interakt_agent_email !== (a.interakt_agent_email || "") ||
                                currentData.interakt_agent_status !== (a.interakt_agent_status || "NOT_REGISTERED")
                            );

                            return (
                                <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">
                                        {a.telecaller_name}
                                        {!a.is_active && <span className="ml-2 text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded">INACTIVE</span>}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{a.tele_mobile}</td>
                                    <td className="px-6 py-4">
                                        <input 
                                            type="email" 
                                            value={currentData.interakt_agent_email} 
                                            onChange={(e) => handleEditChange(a.id, 'interakt_agent_email', e.target.value)}
                                            placeholder="agent@example.com"
                                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <select 
                                            value={currentData.interakt_agent_status}
                                            onChange={(e) => handleEditChange(a.id, 'interakt_agent_status', e.target.value)}
                                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                                        >
                                            <option value="NOT_REGISTERED">NOT REGISTERED</option>
                                            <option value="PENDING">PENDING</option>
                                            <option value="ACTIVE">ACTIVE</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4">
                                        {hasChanges ? (
                                            <div className="flex gap-2">
                                                <button onClick={() => handleSave(a.id)} disabled={updateAgentMutation.isPending} className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-medium bg-emerald-50 px-2 py-1 rounded">
                                                    <Save size={16} /> Save
                                                </button>
                                                <button onClick={() => {
                                                    const newEditing = { ...editingRows };
                                                    delete newEditing[a.id];
                                                    setEditingRows(newEditing);
                                                }} className="text-slate-500 hover:text-slate-700 px-2 py-1">Cancel</button>
                                            </div>
                                        ) : (
                                            <span className="text-slate-400 text-xs flex items-center gap-1">
                                                <CheckCircle size={14} /> Saved
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default InteraktAgentsTab;
