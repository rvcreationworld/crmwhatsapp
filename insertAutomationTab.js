const fs = require('fs');
const file = 'frontend/src/pages/admin/WhatsAppCenter.jsx';
let content = fs.readFileSync(file, 'utf8');

const importReplacement = `import { 
  MessageCircle, BarChart3, ListTodo, Inbox, Settings as SettingsIcon, 
  Search, Loader2, RefreshCw, AlertCircle, CheckCircle2, Clock, XCircle, FileText, Edit, Save, Plus, Trash2, Image as ImageIcon, Video, File
} from "lucide-react";`;

content = content.replace(/import \{[\s\S]*?\} from "lucide-react";/, importReplacement);

const newTabCode = `
// --- Automation Messages Component ---
const AutomationMessagesTab = () => {
  const { data: automations, isLoading, refetch } = useQuery({
    queryKey: ["whatsapp-automations"],
    queryFn: async () => {
      const res = await api.get('/api/whatsapp-center/automations');
      return res.data.data;
    }
  });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    automation_name: '', description: '', lead_type: 'DIRECT', trigger_event: 'DIRECT_INTERESTED',
    message_type: 'TEXT', media_url: '', caption: '', delay_value: 0, delay_unit: 'SECONDS',
    execution_order: 1, send_once: true, status: 'Draft', audience_filter: ''
  });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const resetForm = () => {
    setFormData({
      automation_name: '', description: '', lead_type: 'DIRECT', trigger_event: 'DIRECT_INTERESTED',
      message_type: 'TEXT', media_url: '', caption: '', delay_value: 0, delay_unit: 'SECONDS',
      execution_order: 1, send_once: true, status: 'Draft', audience_filter: ''
    });
    setFile(null);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (auto) => {
    setFormData({ ...auto, send_once: auto.send_once === 1 });
    setEditingId(auto.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if(!window.confirm("Delete this automation?")) return;
    try {
      await api.delete(\`/api/whatsapp-center/automations/\${id}\`);
      toast.success("Deleted successfully");
      refetch();
    } catch(err) {
      toast.error("Failed to delete");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setUploading(true);
      let finalMediaUrl = formData.media_url;

      if (file && formData.message_type !== 'TEXT') {
        const data = new FormData();
        data.append('media_file', file);
        data.append('message_type', formData.message_type);
        const uploadRes = await api.post('/api/whatsapp-center/automations/upload', data);
        finalMediaUrl = uploadRes.data.media_url;
      }

      const payload = { ...formData, media_url: finalMediaUrl };

      if (editingId) {
        await api.put(\`/api/whatsapp-center/automations/\${editingId}\`, payload);
        toast.success("Updated successfully");
      } else {
        await api.post('/api/whatsapp-center/automations', payload);
        toast.success("Created successfully");
      }
      refetch();
      resetForm();
    } catch(err) {
      toast.error(err.response?.data?.message || "Failed to save");
    } finally {
      setUploading(false);
    }
  };

  const insertVariable = (variable) => {
    setFormData(prev => ({ ...prev, caption: prev.caption + variable }));
  };

  const renderPreview = () => {
    let text = formData.caption || '';
    text = text.replace(/\\{\\{customer_name\\}\\}/g, "Raj");
    text = text.replace(/\\{\\{rm_name\\}\\}/g, "Avinash Jain");
    text = text.replace(/\\{\\{rm_mobile\\}\\}/g, "9876543210");
    text = text.replace(/\\{\\{website_url\\}\\}/g, "https://www.shareshaala.com");

    return (
      <div className="bg-[#e5ddd5] dark:bg-[#1e1e2f] p-4 rounded-xl shadow-inner max-w-sm mx-auto flex flex-col gap-2">
        <div className="bg-white dark:bg-[#202c33] rounded-lg p-2 shadow-sm text-sm text-slate-800 dark:text-slate-100 relative max-w-[90%]">
          {formData.message_type === 'IMAGE' && (file || formData.media_url) && (
            <div className="bg-slate-200 dark:bg-slate-700 h-32 rounded-md mb-2 flex items-center justify-center text-slate-500 overflow-hidden">
               {file ? <img src={URL.createObjectURL(file)} className="object-cover w-full h-full" /> : <img src={formData.media_url} className="object-cover w-full h-full" />}
            </div>
          )}
          {formData.message_type === 'VIDEO' && (file || formData.media_url) && (
             <div className="bg-slate-200 dark:bg-slate-700 h-32 rounded-md mb-2 flex items-center justify-center text-slate-500 overflow-hidden relative">
               <Video size={24} className="absolute z-10 text-white" />
               {file ? <video src={URL.createObjectURL(file)} className="object-cover w-full h-full opacity-75" /> : <video src={formData.media_url} className="object-cover w-full h-full opacity-75" />}
             </div>
          )}
          {formData.message_type === 'DOCUMENT' && (file || formData.media_url) && (
             <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-md mb-2 flex items-center gap-3">
               <File size={24} className="text-indigo-500" />
               <span className="text-xs truncate">{file ? file.name : "Document"}</span>
             </div>
          )}
          <div className="whitespace-pre-wrap">{text}</div>
          <div className="text-[10px] text-right text-slate-500 dark:text-slate-400 mt-1">10:42 AM</div>
        </div>
      </div>
    );
  };

  if (isLoading) return <TableSkeleton />;

  if (showForm) {
    return (
      <div className="bg-white dark:bg-[#1e1e2f] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <h3 className="font-semibold text-slate-900 dark:text-white">{editingId ? 'Edit Automation' : 'New Automation'}</h3>
          <button onClick={resetForm} className="text-slate-500 hover:text-slate-700"><XCircle size={20}/></button>
        </div>
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <form onSubmit={handleSave} className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Automation Name</label>
                <input required type="text" className="w-full bg-slate-50 dark:bg-[#151521] border rounded-lg px-3 py-2 text-sm" value={formData.automation_name} onChange={e => setFormData({...formData, automation_name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select className="w-full bg-slate-50 dark:bg-[#151521] border rounded-lg px-3 py-2 text-sm" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                  <option value="Draft">Draft</option><option value="Active">Active</option><option value="Paused">Paused</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-medium mb-1">Lead Type</label>
                  <select className="w-full bg-slate-50 dark:bg-[#151521] border rounded-lg px-3 py-2 text-sm" value={formData.lead_type} onChange={e => setFormData({...formData, lead_type: e.target.value})}>
                    <option value="DIRECT">DIRECT</option><option value="BOT">BOT</option><option value="BOTH">BOTH</option>
                  </select>
               </div>
               <div>
                  <label className="block text-sm font-medium mb-1">Trigger Event</label>
                  <select className="w-full bg-slate-50 dark:bg-[#151521] border rounded-lg px-3 py-2 text-sm" value={formData.trigger_event} onChange={e => setFormData({...formData, trigger_event: e.target.value})}>
                    <option value="DIRECT_INTERESTED">DIRECT_INTERESTED</option>
                    <option value="BOT_INTERESTED">BOT_INTERESTED</option>
                    <option value="DIRECT_RM_ASSIGNED">DIRECT_RM_ASSIGNED</option>
                    <option value="BOT_RM_ASSIGNED">BOT_RM_ASSIGNED</option>
                  </select>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-medium mb-1">Delay Value</label>
                  <input type="number" min="0" className="w-full bg-slate-50 dark:bg-[#151521] border rounded-lg px-3 py-2 text-sm" value={formData.delay_value} onChange={e => setFormData({...formData, delay_value: e.target.value})} />
               </div>
               <div>
                  <label className="block text-sm font-medium mb-1">Delay Unit</label>
                  <select className="w-full bg-slate-50 dark:bg-[#151521] border rounded-lg px-3 py-2 text-sm" value={formData.delay_unit} onChange={e => setFormData({...formData, delay_unit: e.target.value})}>
                    <option value="SECONDS">Seconds</option><option value="MINUTES">Minutes</option><option value="HOURS">Hours</option><option value="DAYS">Days</option>
                  </select>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-medium mb-1">Message Type</label>
                  <select className="w-full bg-slate-50 dark:bg-[#151521] border rounded-lg px-3 py-2 text-sm" value={formData.message_type} onChange={e => setFormData({...formData, message_type: e.target.value})}>
                    <option value="TEXT">TEXT</option><option value="IMAGE">IMAGE (10MB)</option><option value="VIDEO">VIDEO (25MB)</option><option value="DOCUMENT">DOCUMENT (20MB)</option>
                  </select>
               </div>
               <div>
                  <label className="block text-sm font-medium mb-1">Execution Order</label>
                  <input type="number" min="1" className="w-full bg-slate-50 dark:bg-[#151521] border rounded-lg px-3 py-2 text-sm" value={formData.execution_order} onChange={e => setFormData({...formData, execution_order: e.target.value})} />
               </div>
            </div>

            {formData.message_type !== 'TEXT' && (
              <div>
                 <label className="block text-sm font-medium mb-1">Media File</label>
                 <input type="file" onChange={e => setFile(e.target.files[0])} className="text-sm" />
                 {formData.media_url && !file && <p className="text-xs text-indigo-500 mt-1">Current file uploaded: {formData.media_url}</p>}
              </div>
            )}

            <div>
               <label className="block text-sm font-medium mb-1">Message/Caption</label>
               <textarea rows={5} className="w-full bg-slate-50 dark:bg-[#151521] border rounded-lg px-3 py-2 text-sm resize-none" value={formData.caption} onChange={e => setFormData({...formData, caption: e.target.value})}></textarea>
            </div>

            <button type="submit" disabled={uploading} className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">
              {uploading ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Save Automation
            </button>
          </form>

          <div className="space-y-6">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
               <h4 className="text-sm font-medium mb-3 text-slate-800 dark:text-slate-200">Variables (Click to copy)</h4>
               <div className="flex flex-col gap-2">
                 {[
                   {k: '{{customer_name}}', d: 'Customer Name'},
                   {k: '{{rm_name}}', d: 'RM Name'},
                   {k: '{{rm_mobile}}', d: 'RM Mobile'},
                   {k: '{{website_url}}', d: 'Website URL'}
                 ].map(v => (
                   <button key={v.k} type="button" onClick={() => insertVariable(v.k)} className="text-left text-xs bg-white dark:bg-[#151521] p-2 rounded border border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition-colors">
                      <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold block">{v.k}</span>
                      <span className="text-slate-500">{v.d}</span>
                   </button>
                 ))}
               </div>
            </div>
            
            <div>
               <h4 className="text-sm font-medium mb-3 text-slate-800 dark:text-slate-200">Live Preview</h4>
               {renderPreview()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1e1e2f] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
        <h3 className="font-semibold text-slate-900 dark:text-white">Automation Messages (Phase 1)</h3>
        <button onClick={() => setShowForm(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-indigo-700">
          <Plus size={16}/> New Automation
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase text-xs">
            <tr>
              <th className="px-6 py-3 font-medium">Order</th>
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Trigger</th>
              <th className="px-6 py-3 font-medium">Delay</th>
              <th className="px-6 py-3 font-medium">Type</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {automations?.length === 0 && <tr><td colSpan="7" className="text-center py-6 text-slate-500">No automations configured.</td></tr>}
            {automations?.map(auto => (
              <tr key={auto.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4">{auto.execution_order}</td>
                <td className="px-6 py-4 font-medium">{auto.automation_name}</td>
                <td className="px-6 py-4 text-xs"><span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded">{auto.trigger_event}</span></td>
                <td className="px-6 py-4 text-xs">{auto.delay_value} {auto.delay_unit}</td>
                <td className="px-6 py-4 text-xs">{auto.message_type}</td>
                <td className="px-6 py-4 text-xs">
                   <span className={\`px-2 py-1 rounded \${auto.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}\`}>{auto.status}</span>
                </td>
                <td className="px-6 py-4 text-right flex justify-end gap-2">
                  <button onClick={() => handleEdit(auto)} className="p-1.5 text-slate-400 hover:text-indigo-500 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"><Edit size={16}/></button>
                  <button onClick={() => handleDelete(auto.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
// --- Main Page Component ---
`;

content = content.replace('// --- Main Page Component ---', newTabCode);

content = content.replace(
  '{ id: "service-messages", label: "Service Messages", icon: <Edit size={18} /> },',
  '{ id: "service-messages", label: "Service Messages", icon: <Edit size={18} /> },\n    { id: "automations", label: "Automations", icon: <ListTodo size={18} /> },'
);

content = content.replace(
  '{activeTab === "service-messages" && <ServiceMessagesTab />}',
  '{activeTab === "service-messages" && <ServiceMessagesTab />}\n        {activeTab === "automations" && <AutomationMessagesTab />}'
);

fs.writeFileSync(file, content);
console.log("Injected Successfully!");
