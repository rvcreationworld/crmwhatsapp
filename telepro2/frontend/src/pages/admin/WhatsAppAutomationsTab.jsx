import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/axios";
import { Plus, Edit, Trash2, Save, XCircle, PlayCircle, Loader2, Image as ImageIcon, Video, File, List as ListIcon } from "lucide-react";
import toast from "react-hot-toast";
import { TableSkeleton, cn } from "../../components/ui/Skeleton";

// A small component to select media from the existing media library
const MediaSelectorModal = ({ isOpen, onClose, onSelect, selectedId, allowedType }) => {
  const { data: media = [], isLoading } = useQuery({
    queryKey: ["whatsapp-media"],
    queryFn: async () => {
      const res = await api.get('/api/whatsapp-center/media');
      return res.data.media;
    },
    enabled: isOpen
  });

  if (!isOpen) return null;

  const filtered = media.filter(m => allowedType === 'DOCUMENT' ? m.media_type === 'DOCUMENT' : m.media_type === allowedType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-[#1e1e2f] w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h3 className="font-semibold text-slate-900 dark:text-white">Select {allowedType} Media</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700"><XCircle size={24} /></button>
        </div>
        <div className="p-4 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {isLoading && <Loader2 className="animate-spin text-indigo-500 mx-auto col-span-full my-8" />}
          {filtered.length === 0 && !isLoading && <p className="col-span-full text-center py-8 text-slate-500">No media found for this type. Please upload via Media Library first.</p>}
          {filtered.map(item => (
            <div 
              key={item.id} 
              onClick={() => { onSelect(item); onClose(); }}
              className={cn(
                "border rounded-xl cursor-pointer overflow-hidden transition-all hover:border-indigo-500",
                selectedId === item.id ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-slate-200 dark:border-slate-800"
              )}
            >
              <div className="aspect-video bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                 {item.media_type === 'IMAGE' && <img src={item.public_url} className="w-full h-full object-cover" />}
                 {item.media_type === 'VIDEO' && <video src={item.public_url} className="w-full h-full object-cover opacity-80" />}
                 {item.media_type === 'DOCUMENT' && <File size={32} className="text-slate-400" />}
              </div>
              <div className="p-2 text-xs truncate" title={item.original_file_name}>{item.original_file_name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const WhatsAppAutomationsTab = () => {
  const queryClient = useQueryClient();
  const { data: automations, isLoading, refetch } = useQuery({
    queryKey: ["whatsapp-automations"],
    queryFn: async () => {
      const res = await api.get('/api/whatsapp-center/automations');
      return res.data.data;
    }
  });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const initialForm = {
    automation_name: '', trigger_type: 'INTERESTED_CLICK',
    delay_days: 0, delay_hours: 0, delay_minutes: 0,
    message_type: 'TEXT', text_message: '', media_library_id: null,
    button_payload_json: { type: "button", header: { type: "text", text: "" }, body: { text: "" }, action: { buttons: [] } },
    list_payload_json: { type: "list", header: { type: "text", text: "" }, body: { text: "" }, action: { button: "Select Option", sections: [] } },
    display_order: 1, is_enabled: 1
  };
  
  const [formData, setFormData] = useState(initialForm);
  const [selectedMediaUrl, setSelectedMediaUrl] = useState(null);
  const [showMediaModal, setShowMediaModal] = useState(false);
  
  const [testModal, setTestModal] = useState({ show: false, id: null, phone: '' });

  const resetForm = () => {
    setFormData(initialForm);
    setSelectedMediaUrl(null);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (auto) => {
    setFormData({
      ...initialForm,
      ...auto,
      delay_days: auto.delay_days || 0,
      delay_hours: auto.delay_hours || 0,
      delay_minutes: auto.delay_minutes || 0,
      button_payload_json: typeof auto.button_payload_json === 'string' ? JSON.parse(auto.button_payload_json) : (auto.button_payload_json || initialForm.button_payload_json),
      list_payload_json: typeof auto.list_payload_json === 'string' ? JSON.parse(auto.list_payload_json) : (auto.list_payload_json || initialForm.list_payload_json)
    });
    setEditingId(auto.id);
    setShowForm(true);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.delete(`/api/whatsapp-center/automations/${id}`),
    onSuccess: () => { toast.success("Deleted successfully"); refetch(); }
  });

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingId) return api.put(`/api/whatsapp-center/automations/${editingId}`, payload);
      return api.post('/api/whatsapp-center/automations', payload);
    },
    onSuccess: () => {
      toast.success(editingId ? "Updated successfully" : "Created successfully");
      refetch();
      resetForm();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to save");
    }
  });

  const handleSave = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const sendTest = async () => {
    if (!testModal.phone) return toast.error("Enter phone number");
    try {
      await api.post(`/api/whatsapp-center/automations/${testModal.id}/test`, { phone_number: testModal.phone });
      toast.success("Test message sent successfully");
      setTestModal({ show: false, id: null, phone: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send test");
    }
  };

  const insertVariable = (variable) => {
    setFormData(prev => ({ ...prev, text_message: (prev.text_message || '') + variable }));
  };

  if (isLoading) return <TableSkeleton />;

  if (showForm) {
    return (
      <div className="bg-white dark:bg-[#1e1e2f] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm pb-8">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <h3 className="font-semibold text-slate-900 dark:text-white">{editingId ? 'Edit Automation' : 'New Automation'}</h3>
          <button onClick={resetForm} className="text-slate-500 hover:text-slate-700"><XCircle size={20}/></button>
        </div>
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <form onSubmit={handleSave} className="lg:col-span-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Automation Name</label>
                <input required type="text" className="w-full bg-slate-50 dark:bg-[#151521] border rounded-lg px-3 py-2 text-sm" value={formData.automation_name} onChange={e => setFormData({...formData, automation_name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Trigger Type</label>
                <select className="w-full bg-slate-50 dark:bg-[#151521] border rounded-lg px-3 py-2 text-sm" value={formData.trigger_type} onChange={e => setFormData({...formData, trigger_type: e.target.value})}>
                  <option value="INTERESTED_CLICK">Interested Click (24h Window Start)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
               <div>
                  <label className="block text-sm font-medium mb-1">Delay (Days)</label>
                  <input type="number" min="0" className="w-full bg-slate-50 dark:bg-[#151521] border rounded-lg px-3 py-2 text-sm" value={formData.delay_days} onChange={e => setFormData({...formData, delay_days: parseInt(e.target.value) || 0})} />
               </div>
               <div>
                  <label className="block text-sm font-medium mb-1">Delay (Hours)</label>
                  <input type="number" min="0" max="23" className="w-full bg-slate-50 dark:bg-[#151521] border rounded-lg px-3 py-2 text-sm" value={formData.delay_hours} onChange={e => setFormData({...formData, delay_hours: parseInt(e.target.value) || 0})} />
               </div>
               <div>
                  <label className="block text-sm font-medium mb-1">Delay (Minutes)</label>
                  <input type="number" min="0" max="59" className="w-full bg-slate-50 dark:bg-[#151521] border rounded-lg px-3 py-2 text-sm" value={formData.delay_minutes} onChange={e => setFormData({...formData, delay_minutes: parseInt(e.target.value) || 0})} />
               </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
               <div>
                  <label className="block text-sm font-medium mb-1">Message Type</label>
                  <select className="w-full bg-slate-50 dark:bg-[#151521] border rounded-lg px-3 py-2 text-sm" value={formData.message_type} onChange={e => setFormData({...formData, message_type: e.target.value, media_library_id: null})}>
                    <option value="TEXT">Text</option>
                    <option value="IMAGE">Image</option>
                    <option value="VIDEO">Video</option>
                    <option value="DOCUMENT">Document</option>
                    <option value="AUDIO">Audio</option>
                    <option value="BUTTON">Interactive Button</option>
                    <option value="LIST">Interactive List</option>
                  </select>
               </div>
               <div>
                  <label className="block text-sm font-medium mb-1">Execution Priority (Order)</label>
                  <input type="number" min="1" className="w-full bg-slate-50 dark:bg-[#151521] border rounded-lg px-3 py-2 text-sm" value={formData.display_order} onChange={e => setFormData({...formData, display_order: parseInt(e.target.value) || 1})} />
               </div>
               <div>
                  <label className="block text-sm font-medium mb-1">Engine Status</label>
                  <select className="w-full bg-slate-50 dark:bg-[#151521] border rounded-lg px-3 py-2 text-sm" value={formData.is_enabled} onChange={e => setFormData({...formData, is_enabled: parseInt(e.target.value)})}>
                    <option value={1}>Enabled</option>
                    <option value={0}>Paused</option>
                  </select>
               </div>
            </div>

            {['IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO'].includes(formData.message_type) && (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-[#151521]">
                 <label className="block text-sm font-medium mb-3">Media Selection</label>
                 <div className="flex items-center gap-4">
                   <button type="button" onClick={() => setShowMediaModal(true)} className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-4 py-2 rounded-lg text-sm font-medium">Select from Library</button>
                   {formData.media_library_id && <span className="text-sm text-emerald-600 font-medium">Media Selected ✓</span>}
                 </div>
                 <MediaSelectorModal 
                   isOpen={showMediaModal} 
                   onClose={() => setShowMediaModal(false)} 
                   allowedType={formData.message_type}
                   selectedId={formData.media_library_id}
                   onSelect={(item) => {
                     setFormData({...formData, media_library_id: item.id});
                     setSelectedMediaUrl(item.public_url);
                   }}
                 />
              </div>
            )}

            {formData.message_type === 'BUTTON' && (
               <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-[#151521] space-y-4">
                  <h4 className="font-medium text-sm text-indigo-600">Interactive Button Configurator</h4>
                  <div>
                    <label className="block text-xs font-medium mb-1">Header (Optional Text)</label>
                    <input type="text" className="w-full bg-white dark:bg-[#1e1e2f] border rounded px-3 py-1.5 text-sm" 
                      value={formData.button_payload_json.header?.text || ''} 
                      onChange={e => {
                        const newPayload = {...formData.button_payload_json};
                        if (!newPayload.header) newPayload.header = { type: 'text', text: '' };
                        newPayload.header.text = e.target.value;
                        setFormData({...formData, button_payload_json: newPayload});
                      }} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Body Text (Required)</label>
                    <textarea rows={3} className="w-full bg-white dark:bg-[#1e1e2f] border rounded px-3 py-1.5 text-sm" 
                      value={formData.button_payload_json.body?.text || ''} 
                      onChange={e => {
                        const newPayload = {...formData.button_payload_json};
                        if (!newPayload.body) newPayload.body = { text: '' };
                        newPayload.body.text = e.target.value;
                        setFormData({...formData, button_payload_json: newPayload});
                      }} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-2">Buttons (Max 3)</label>
                    {formData.button_payload_json.action?.buttons?.map((btn, i) => (
                      <div key={i} className="flex gap-2 mb-2">
                         <input type="text" placeholder="Button ID (e.g. btn_1)" className="flex-1 bg-white dark:bg-[#1e1e2f] border rounded px-2 py-1 text-xs" 
                           value={btn.reply.id} 
                           onChange={e => {
                             const newPayload = {...formData.button_payload_json};
                             newPayload.action.buttons[i].reply.id = e.target.value;
                             setFormData({...formData, button_payload_json: newPayload});
                           }} 
                         />
                         <input type="text" placeholder="Button Title" className="flex-1 bg-white dark:bg-[#1e1e2f] border rounded px-2 py-1 text-xs" 
                           value={btn.reply.title} 
                           onChange={e => {
                             const newPayload = {...formData.button_payload_json};
                             newPayload.action.buttons[i].reply.title = e.target.value;
                             setFormData({...formData, button_payload_json: newPayload});
                           }} 
                         />
                         <button type="button" onClick={() => {
                           const newPayload = {...formData.button_payload_json};
                           newPayload.action.buttons.splice(i, 1);
                           setFormData({...formData, button_payload_json: newPayload});
                         }} className="text-red-500"><Trash2 size={16}/></button>
                      </div>
                    ))}
                    {(formData.button_payload_json.action?.buttons?.length || 0) < 3 && (
                      <button type="button" className="text-xs text-indigo-500 font-medium mt-1" onClick={() => {
                         const newPayload = {...formData.button_payload_json};
                         if (!newPayload.action) newPayload.action = { buttons: [] };
                         if (!newPayload.action.buttons) newPayload.action.buttons = [];
                         newPayload.action.buttons.push({ type: 'reply', reply: { id: `btn_${Date.now()}`, title: 'New Button' } });
                         setFormData({...formData, button_payload_json: newPayload});
                      }}>+ Add Button</button>
                    )}
                  </div>
               </div>
            )}

            {formData.message_type === 'LIST' && (
               <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-[#151521] space-y-4">
                  <h4 className="font-medium text-sm text-indigo-600">Interactive List Configurator</h4>
                  <div>
                    <label className="block text-xs font-medium mb-1">Body Text (Required)</label>
                    <textarea rows={2} className="w-full bg-white dark:bg-[#1e1e2f] border rounded px-3 py-1.5 text-sm" 
                      value={formData.list_payload_json.body?.text || ''} 
                      onChange={e => {
                        const newPayload = {...formData.list_payload_json};
                        if (!newPayload.body) newPayload.body = { text: '' };
                        newPayload.body.text = e.target.value;
                        setFormData({...formData, list_payload_json: newPayload});
                      }} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Main Menu Button Text</label>
                    <input type="text" className="w-full bg-white dark:bg-[#1e1e2f] border rounded px-3 py-1.5 text-sm" 
                      value={formData.list_payload_json.action?.button || ''} 
                      onChange={e => {
                        const newPayload = {...formData.list_payload_json};
                        if (!newPayload.action) newPayload.action = { button: '', sections: [] };
                        newPayload.action.button = e.target.value;
                        setFormData({...formData, list_payload_json: newPayload});
                      }} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-2">Sections & Rows (Max 10 rows total)</label>
                    {formData.list_payload_json.action?.sections?.map((sec, i) => (
                      <div key={i} className="border p-2 rounded mb-2 bg-white dark:bg-[#1e1e2f]">
                         <div className="flex gap-2 mb-2">
                            <input type="text" placeholder="Section Title" className="flex-1 border rounded px-2 py-1 text-xs" 
                              value={sec.title} 
                              onChange={e => {
                                const newPayload = {...formData.list_payload_json};
                                newPayload.action.sections[i].title = e.target.value;
                                setFormData({...formData, list_payload_json: newPayload});
                              }} 
                            />
                         </div>
                         <div className="pl-4 space-y-1">
                            {sec.rows?.map((row, j) => (
                               <div key={j} className="flex gap-2">
                                  <input type="text" placeholder="ID" className="w-1/4 border rounded px-2 py-1 text-xs" value={row.id} onChange={e => { const n={...formData.list_payload_json}; n.action.sections[i].rows[j].id = e.target.value; setFormData({...formData, list_payload_json: n}); }} />
                                  <input type="text" placeholder="Title" className="w-2/4 border rounded px-2 py-1 text-xs" value={row.title} onChange={e => { const n={...formData.list_payload_json}; n.action.sections[i].rows[j].title = e.target.value; setFormData({...formData, list_payload_json: n}); }} />
                                  <button type="button" onClick={() => { const n={...formData.list_payload_json}; n.action.sections[i].rows.splice(j,1); setFormData({...formData, list_payload_json: n}); }} className="text-red-500"><Trash2 size={14}/></button>
                               </div>
                            ))}
                            <button type="button" className="text-[10px] text-indigo-500" onClick={() => {
                               const n={...formData.list_payload_json}; 
                               if (!n.action.sections[i].rows) n.action.sections[i].rows = [];
                               n.action.sections[i].rows.push({ id: `row_${Date.now()}`, title: 'New Row' });
                               setFormData({...formData, list_payload_json: n});
                            }}>+ Row</button>
                         </div>
                      </div>
                    ))}
                    <button type="button" className="text-xs text-indigo-500 font-medium mt-1" onClick={() => {
                       const newPayload = {...formData.list_payload_json};
                       if (!newPayload.action) newPayload.action = { sections: [] };
                       if (!newPayload.action.sections) newPayload.action.sections = [];
                       newPayload.action.sections.push({ title: 'New Section', rows: [] });
                       setFormData({...formData, list_payload_json: newPayload});
                    }}>+ Add Section</button>
                  </div>
               </div>
            )}

            {['TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT'].includes(formData.message_type) && (
              <div>
                 <label className="block text-sm font-medium mb-1">Message Text / Caption</label>
                 <textarea rows={4} className="w-full bg-slate-50 dark:bg-[#151521] border rounded-lg px-3 py-2 text-sm resize-none" value={formData.text_message || ''} onChange={e => setFormData({...formData, text_message: e.target.value})}></textarea>
              </div>
            )}

            <button type="submit" disabled={saveMutation.isPending} className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">
              {saveMutation.isPending ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Save Automation
            </button>
          </form>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
               <h4 className="text-sm font-medium mb-3 text-slate-800 dark:text-slate-200">Variables (Click to insert)</h4>
               <div className="flex flex-col gap-2">
                 {[
                   {k: '{{customer_name}}', d: 'Customer Name'},
                   {k: '{{rm_name}}', d: 'RM Name'},
                   {k: '{{rm_mobile}}', d: 'RM Mobile'},
                   {k: '{{campaign_name}}', d: 'Campaign Name'}
                 ].map(v => (
                   <button key={v.k} type="button" onClick={() => insertVariable(v.k)} className="text-left text-xs bg-white dark:bg-[#151521] p-2 rounded border border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition-colors">
                      <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold block">{v.k}</span>
                      <span className="text-slate-500">{v.d}</span>
                   </button>
                 ))}
               </div>
            </div>
            
            <div className="bg-[#e5ddd5] dark:bg-[#111b21] p-4 rounded-xl shadow-inner min-h-[300px] flex flex-col items-center pt-8 border-4 border-slate-800 rounded-[30px] relative">
               <div className="absolute top-2 w-16 h-1 bg-slate-300 rounded-full"></div>
               <div className="bg-white dark:bg-[#202c33] rounded-lg p-2 shadow-sm text-sm text-slate-800 dark:text-slate-100 relative max-w-[95%] w-full">
                 
                 {['IMAGE','VIDEO','DOCUMENT'].includes(formData.message_type) && selectedMediaUrl && (
                   <div className="bg-slate-200 dark:bg-slate-700 h-32 rounded-md mb-2 flex items-center justify-center overflow-hidden relative">
                     {formData.message_type === 'IMAGE' && <img src={selectedMediaUrl} className="w-full h-full object-cover" />}
                     {formData.message_type === 'VIDEO' && <><Video size={24} className="absolute z-10 text-white" /><video src={selectedMediaUrl} className="w-full h-full object-cover opacity-75" /></>}
                     {formData.message_type === 'DOCUMENT' && <div className="text-indigo-500 flex flex-col items-center"><File size={24}/></div>}
                   </div>
                 )}

                 {formData.message_type === 'BUTTON' && (
                   <div>
                     {formData.button_payload_json.header?.text && <div className="font-bold mb-1">{formData.button_payload_json.header.text}</div>}
                     <div className="whitespace-pre-wrap text-sm">{formData.button_payload_json.body?.text || 'Body text...'}</div>
                     <div className="flex flex-col gap-1 mt-3">
                       {formData.button_payload_json.action?.buttons?.map((b, i) => (
                         <div key={i} className="text-center text-[#00a884] bg-slate-50 dark:bg-[#2a3942] py-2 rounded font-medium border border-slate-100 dark:border-slate-700">{b.reply?.title || 'Button'}</div>
                       ))}
                     </div>
                   </div>
                 )}

                 {formData.message_type === 'LIST' && (
                   <div>
                     <div className="whitespace-pre-wrap text-sm mb-3">{formData.list_payload_json.body?.text || 'Body text...'}</div>
                     <div className="text-center text-[#00a884] bg-slate-50 dark:bg-[#2a3942] py-2 rounded font-medium border border-slate-100 dark:border-slate-700 flex items-center justify-center gap-2">
                       <ListIcon size={16}/> {formData.list_payload_json.action?.button || 'Menu'}
                     </div>
                   </div>
                 )}

                 {['TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT'].includes(formData.message_type) && (
                   <div className="whitespace-pre-wrap break-words">{formData.text_message || 'Type message here...'}</div>
                 )}
                 <div className="text-[10px] text-right text-slate-500 mt-1">10:42 AM</div>
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1e1e2f] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">WhatsApp Automations</h3>
          <p className="text-xs text-slate-500 mt-1">Configure sequence of messages triggered after a lead shows interest.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-indigo-700 transition-colors">
          <Plus size={16}/> New Automation
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase text-[11px] font-bold tracking-wider">
            <tr>
              <th className="px-6 py-4">Priority</th>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Trigger</th>
              <th className="px-6 py-4">Delay</th>
              <th className="px-6 py-4">Message Type</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {automations?.length === 0 && <tr><td colSpan="7" className="text-center py-12 text-slate-500">No automations configured.</td></tr>}
            {automations?.map(auto => (
              <tr key={auto.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-medium text-xs">
                    {auto.display_order}
                  </div>
                </td>
                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{auto.automation_name}</td>
                <td className="px-6 py-4">
                  <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-2 py-1 rounded text-xs font-medium border border-indigo-100 dark:border-indigo-800">
                    {auto.trigger_type}
                  </span>
                </td>
                <td className="px-6 py-4 font-mono text-xs text-slate-500">
                  {auto.delay_days}d {auto.delay_hours}h {auto.delay_minutes}m
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                    {auto.message_type}
                  </div>
                </td>
                <td className="px-6 py-4 text-xs">
                   <span className={cn(
                     "px-2 py-1 rounded font-medium",
                     auto.is_enabled ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                   )}>
                     {auto.is_enabled ? 'Enabled' : 'Paused'}
                   </span>
                </td>
                <td className="px-6 py-4 text-right flex justify-end gap-2">
                  <button onClick={() => setTestModal({ show: true, id: auto.id, phone: '' })} className="p-1.5 text-slate-400 hover:text-emerald-500 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors" title="Send Test">
                    <PlayCircle size={16}/>
                  </button>
                  <button onClick={() => handleEdit(auto)} className="p-1.5 text-slate-400 hover:text-indigo-500 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors" title="Edit">
                    <Edit size={16}/>
                  </button>
                  <button onClick={() => { if(window.confirm("Delete automation?")) deleteMutation.mutate(auto.id); }} className="p-1.5 text-slate-400 hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors" title="Delete">
                    <Trash2 size={16}/>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Test Modal */}
      {testModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-[#1e1e2f] w-full max-w-sm rounded-xl shadow-2xl p-6">
            <h3 className="font-semibold mb-4 text-slate-900 dark:text-white">Send Test Message</h3>
            <input 
              type="text" placeholder="10-digit Phone Number" 
              className="w-full border p-2 rounded mb-4 bg-slate-50 dark:bg-[#151521]"
              value={testModal.phone} onChange={e => setTestModal({...testModal, phone: e.target.value})}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setTestModal({ show: false, id: null, phone: '' })} className="px-4 py-2 text-slate-600">Cancel</button>
              <button onClick={sendTest} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700">Send Test</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppAutomationsTab;
