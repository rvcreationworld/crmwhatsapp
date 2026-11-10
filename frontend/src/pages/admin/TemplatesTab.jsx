import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/axios";
import { Loader2, AlertCircle, Save, Edit, Plus, XCircle, LayoutTemplate, Image as ImageIcon, Film, X, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

const VARIABLE_OPTIONS = [
  { value: "customer_name", label: "Customer Name" },
  { value: "campaign_name", label: "Campaign Name" },
  { value: "rm_name", label: "RM Name" },
  { value: "rm_mobile", label: "RM Mobile" },
  { value: "lead_phone", label: "Lead Phone" },
  { value: "website_url", label: "Website URL" },
  { value: "lead_type", label: "Lead Type" },
  { value: "company_name", label: "Company Name" },
  { value: "custom", label: "Custom Text" }
];

const MediaSelectorModal = ({ isOpen, onClose, onSelect, mediaType }) => {
    const { data: mediaList = [], isLoading } = useQuery({
        queryKey: ["whatsapp-media"],
        queryFn: async () => {
            const res = await api.get('/api/whatsapp-center/media');
            return res.data.media;
        },
        enabled: isOpen
    });

    if (!isOpen) return null;

    const filteredMedia = mediaList.filter(m => m.media_type === mediaType);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white dark:bg-[#1e1e2f] w-full max-w-4xl rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
                <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="text-xl font-semibold text-slate-800 dark:text-white">Select {mediaType === 'IMAGE' ? 'Image' : 'Video'} Media</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={24} /></button>
                </div>
                <div className="p-6 overflow-y-auto flex-1 bg-slate-50 dark:bg-[#1a1a24]">
                    {isLoading ? (
                        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>
                    ) : filteredMedia.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            No {mediaType.toLowerCase()} media found. Please upload it first from the Media Library.
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {filteredMedia.map(item => (
                                <div key={item.id} onClick={() => onSelect(item.public_url)} className="bg-white dark:bg-[#1e1e2f] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 hover:border-indigo-500 cursor-pointer transition-colors group">
                                    <div className="aspect-video bg-slate-100 dark:bg-slate-900 flex items-center justify-center overflow-hidden relative">
                                        {item.media_type === 'IMAGE' ? (
                                            <img src={item.public_url} alt={item.media_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                        ) : (
                                            <div className="relative w-full h-full flex items-center justify-center bg-slate-900">
                                                <Film size={32} className="text-slate-400" />
                                                <video src={item.public_url} className="absolute inset-0 w-full h-full object-cover opacity-50" muted />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/10 transition-colors" />
                                    </div>
                                    <div className="p-3 truncate text-sm font-medium text-slate-700 dark:text-slate-300">
                                        {item.original_file_name}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e1e2f] rounded-b-xl flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Cancel</button>
                </div>
            </div>
        </div>
    );
};

const TemplatesTab = () => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  
  const [directAssignment, setDirectAssignment] = useState("");
  const [botAssignment, setBotAssignment] = useState("");

  const { data: templates = [], isLoading, isError } = useQuery({
    queryKey: ["whatsapp-templates"],
    queryFn: async () => {
      const res = await api.get('/api/whatsapp-center/templates');
      return res.data.templates;
    }
  });

  React.useEffect(() => {
    if (templates.length > 0) {
      const direct = templates.find(t => t.assignment_key === 'DIRECT_LEAD_WELCOME');
      const bot = templates.find(t => t.assignment_key === 'BOT_LEAD_WELCOME');
      if (direct) setDirectAssignment(direct.id);
      if (bot) setBotAssignment(bot.id);
    }
  }, [templates]);

  const updateAssignmentMutation = useMutation({
    mutationFn: async ({ key, templateId }) => {
      return await api.put(`/api/whatsapp-center/template-assignments/${key}`, { templateId });
    },
    onSuccess: (data, variables) => {
      toast.success(`Successfully assigned template to ${variables.key}`);
      queryClient.invalidateQueries(["whatsapp-templates"]);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Failed to update assignment");
    }
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async (payload) => {
      if (payload.id) {
        return await api.put(`/api/whatsapp-center/templates/${payload.id}`, payload);
      }
      return await api.post('/api/whatsapp-center/templates', payload);
    },
    onSuccess: () => {
      toast.success("Template saved successfully");
      setIsEditing(false);
      setEditingTemplate(null);
      queryClient.invalidateQueries(["whatsapp-templates"]);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Failed to save template");
    }
  });

  const handleSaveAssignment = (key, templateId) => {
    if (!templateId) return toast.error("Please select a template");
    updateAssignmentMutation.mutate({ key, templateId });
  };

  const openForm = (template = null) => {
    let initialMapping = [];
    if (template && template.body_variable_mapping) {
        try {
            initialMapping = typeof template.body_variable_mapping === 'string' 
                ? JSON.parse(template.body_variable_mapping) 
                : template.body_variable_mapping;
        } catch(e) {
            initialMapping = [];
        }
    }

    setEditingTemplate(template ? {
        ...template,
        body_variable_mapping: initialMapping
    } : {
      display_name: "",
      template_name: "",
      interakt_template_id: "",
      language_code: "en",
      description: "",
      header_type: "NONE",
      header_media_url: "",
      body_variable_count: 0,
      header_variable_count: 0,
      body_variable_mapping: [],
      is_active: 1
    });
    setIsEditing(true);
  };

  const handleMappingChange = (index, valueObj) => {
      const newMapping = [...editingTemplate.body_variable_mapping];
      newMapping[index] = valueObj;
      setEditingTemplate({ ...editingTemplate, body_variable_mapping: newMapping });
  };

  const handleCountChange = (count) => {
      const currentMapping = editingTemplate.body_variable_mapping || [];
      const newMapping = [...currentMapping];
      if (count > currentMapping.length) {
          for (let i = currentMapping.length; i < count; i++) {
              newMapping.push("customer_name");
          }
      } else {
          newMapping.length = count;
      }
      setEditingTemplate({ ...editingTemplate, body_variable_count: count, body_variable_mapping: newMapping });
  };

  const generatePreview = () => {
      if (!editingTemplate) return "";
      let previewText = "Hello {{1}}\n\nThank you for submitting the form regarding {{2}}";
      
      const mapping = editingTemplate.body_variable_mapping || [];
      let renderedText = "";
      
      if (mapping.length === 0) {
          renderedText = "No variables configured. Text will render exactly as defined in Interakt without placeholders.";
      } else {
          renderedText = "Example Template Body:\n";
          for (let i = 0; i < mapping.length; i++) {
              let val = mapping[i];
              let displayVal = `[Unknown]`;
              if (typeof val === 'object' && val.type === 'custom') {
                  displayVal = `[Custom: ${val.value}]`;
              } else if (typeof val === 'string') {
                  const opt = VARIABLE_OPTIONS.find(o => o.value === val);
                  displayVal = opt ? `[${opt.label}]` : `[${val}]`;
              }
              renderedText += `{{${i + 1}}} -> ${displayVal}\n`;
          }
      }
      return renderedText;
  };

  if (isLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;
  }

  if (isError) {
    return <div className="p-6 text-red-600 flex items-center gap-2"><AlertCircle /> Failed to load templates</div>;
  }

  return (
    <div className="space-y-8">
      {/* Assignments Section */}
      <section>
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Template Assignments</h3>
        <div className="p-4 bg-amber-50 dark:bg-amber-900/10 text-amber-800 dark:text-amber-400 text-sm rounded-lg border border-amber-200 dark:border-amber-800/30 mb-6">
          <strong>Note:</strong> Changing a template affects only newly created queue messages. Already queued messages retain their existing template snapshot.
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-[#1e1e2f] p-6 rounded-xl border border-slate-200 dark:border-slate-800">
            <h4 className="font-medium text-slate-800 dark:text-white mb-4">Direct Lead Welcome</h4>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Select Active Template</label>
                <select
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2"
                  value={directAssignment}
                  onChange={(e) => setDirectAssignment(e.target.value)}
                >
                  <option value="">-- Select Template --</option>
                  {templates.filter(t => t.is_active).map(t => (
                    <option key={t.id} value={t.id}>{t.display_name} ({t.template_name})</option>
                  ))}
                </select>
              </div>
              <button onClick={() => handleSaveAssignment('DIRECT_LEAD_WELCOME', directAssignment)} disabled={updateAssignmentMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2">
                <Save size={18} /> Save
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1e1e2f] p-6 rounded-xl border border-slate-200 dark:border-slate-800">
            <h4 className="font-medium text-slate-800 dark:text-white mb-4">Bot Lead Welcome</h4>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Select Active Template</label>
                <select
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2"
                  value={botAssignment}
                  onChange={(e) => setBotAssignment(e.target.value)}
                >
                  <option value="">-- Select Template --</option>
                  {templates.filter(t => t.is_active).map(t => (
                    <option key={t.id} value={t.id}>{t.display_name} ({t.template_name})</option>
                  ))}
                </select>
              </div>
              <button onClick={() => handleSaveAssignment('BOT_LEAD_WELCOME', botAssignment)} disabled={updateAssignmentMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2">
                <Save size={18} /> Save
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Data Table */}
      {!isEditing && (
        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Saved Templates</h3>
            <button onClick={() => openForm()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
              <Plus size={16} /> Add Template
            </button>
          </div>
          
          <div className="bg-white dark:bg-[#1e1e2f] rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="px-6 py-4 font-medium">Display Name</th>
                  <th className="px-6 py-4 font-medium">Interakt Code</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">Variables</th>
                  <th className="px-6 py-4 font-medium">Active</th>
                  <th className="px-6 py-4 font-medium">Used For</th>
                  <th className="px-6 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {templates.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">{t.display_name}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400"><code>{t.template_name}</code></td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{t.header_type}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{t.body_variable_count}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${t.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'}`}>
                        {t.is_active ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-xs">
                      {t.assignment_key ? t.assignment_key.replace(/_/g, ' ') : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => openForm(t)} className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300">
                        <Edit size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Form */}
      {isEditing && editingTemplate && (
        <section className="bg-white dark:bg-[#1e1e2f] p-6 rounded-xl border border-slate-200 dark:border-slate-800 relative">
          
          <MediaSelectorModal 
              isOpen={isMediaModalOpen}
              mediaType={editingTemplate.header_type === 'VIDEO' ? 'VIDEO' : 'IMAGE'}
              onClose={() => setIsMediaModalOpen(false)}
              onSelect={(url) => {
                  setEditingTemplate({ ...editingTemplate, header_media_url: url });
                  setIsMediaModalOpen(false);
              }}
          />

          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
              {editingTemplate.id ? "Edit Template" : "Add Template"}
            </h3>
            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600"><XCircle size={24} /></button>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            
            // Validations
            if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(editingTemplate.header_type)) {
                if (!editingTemplate.header_media_url || !editingTemplate.header_media_url.startsWith('https://')) {
                    toast.error("Media header templates require a valid public HTTPS URL. Please select media from the library.");
                    return;
                }
            }

            const mapping = editingTemplate.body_variable_mapping || [];
            if (mapping.length !== editingTemplate.body_variable_count) {
                toast.error("Variable mapping length mismatch!");
                return;
            }

            for (let i = 0; i < mapping.length; i++) {
                if (typeof mapping[i] === 'object' && mapping[i].type === 'custom') {
                    if (!mapping[i].value || mapping[i].value.trim() === '') {
                        toast.error(`Custom text for Variable {{${i+1}}} cannot be empty`);
                        return;
                    }
                    if (mapping[i].value.length > 500) {
                        toast.error(`Custom text for Variable {{${i+1}}} exceeds 500 characters`);
                        return;
                    }
                }
            }

            saveTemplateMutation.mutate(editingTemplate);
          }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Display Name</label>
                <input required type="text" value={editingTemplate.display_name} onChange={e => setEditingTemplate({...editingTemplate, display_name: e.target.value})} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg" placeholder="e.g. Bot Welcome" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Interakt Code Name</label>
                <input required type="text" value={editingTemplate.template_name} onChange={e => setEditingTemplate({...editingTemplate, template_name: e.target.value})} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg" placeholder="e.g. thanksform" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Language Code</label>
                <input required type="text" value={editingTemplate.language_code} onChange={e => setEditingTemplate({...editingTemplate, language_code: e.target.value})} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg" placeholder="e.g. en" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Header Type</label>
                <select value={editingTemplate.header_type} onChange={e => setEditingTemplate({...editingTemplate, header_type: e.target.value, header_media_url: ''})} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg">
                  <option value="NONE">NONE</option>
                  <option value="TEXT">TEXT</option>
                  <option value="IMAGE">IMAGE</option>
                  <option value="VIDEO">VIDEO</option>
                  <option value="DOCUMENT">DOCUMENT</option>
                </select>
              </div>

              {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(editingTemplate.header_type) && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Selected Media (Must be HTTPS)</label>
                  
                  {['IMAGE', 'VIDEO'].includes(editingTemplate.header_type) ? (
                      <div className="flex gap-4 items-start">
                          <button type="button" onClick={() => setIsMediaModalOpen(true)} className="flex items-center gap-2 bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800/30 px-6 py-3 rounded-xl font-medium hover:bg-indigo-100 transition-colors">
                              {editingTemplate.header_type === 'IMAGE' ? <ImageIcon size={20} /> : <Film size={20} />}
                              Select Media from Library
                          </button>
                          
                          {editingTemplate.header_media_url && (
                              <div className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden flex items-center p-2 gap-4">
                                  <div className="h-16 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg overflow-hidden shrink-0">
                                      {editingTemplate.header_type === 'IMAGE' ? (
                                          <img src={editingTemplate.header_media_url} className="w-full h-full object-cover" alt="Preview" />
                                      ) : (
                                          <video src={editingTemplate.header_media_url} className="w-full h-full object-cover" muted />
                                      )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <p className="text-xs text-slate-500 font-medium mb-1">Assigned URL</p>
                                      <p className="text-sm text-slate-700 dark:text-slate-300 truncate font-mono">{editingTemplate.header_media_url}</p>
                                  </div>
                                  <button type="button" onClick={() => setEditingTemplate({...editingTemplate, header_media_url: ''})} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                                      <Trash2 size={18} />
                                  </button>
                              </div>
                          )}
                      </div>
                  ) : (
                      <input type="url" required value={editingTemplate.header_media_url || ''} onChange={e => setEditingTemplate({...editingTemplate, header_media_url: e.target.value})} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg" placeholder="https://..." />
                  )}
                </div>
              )}

              {/* Dynamic Variable Mapping */}
              <div className="md:col-span-2 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">Body Variable Count</label>
                    <p className="text-xs text-slate-500 mb-3">Number of placeholders (e.g. {"{{1}}, {{2}}"}) inside your Interakt template body.</p>
                    <input type="number" min="0" required value={editingTemplate.body_variable_count} onChange={e => handleCountChange(parseInt(e.target.value) || 0)} className="w-32 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg" />
                </div>

                {editingTemplate.body_variable_count > 0 && (
                    <div className="space-y-4">
                        <h4 className="font-medium text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2">Placeholder Mapping</h4>
                        {Array.from({ length: editingTemplate.body_variable_count }).map((_, i) => {
                            const currentVal = editingTemplate.body_variable_mapping[i];
                            const isCustom = typeof currentVal === 'object' && currentVal?.type === 'custom';
                            const selectValue = isCustom ? 'custom' : (currentVal || 'customer_name');
                            
                            return (
                                <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <div className="w-24 font-medium text-indigo-600 dark:text-indigo-400">Variable {"{{" + (i+1) + "}}"}</div>
                                    <select 
                                        value={selectValue}
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            if (v === 'custom') {
                                                handleMappingChange(i, { type: 'custom', value: '' });
                                            } else {
                                                handleMappingChange(i, v);
                                            }
                                        }}
                                        className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    >
                                        {VARIABLE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </select>
                                    
                                    {isCustom && (
                                        <input 
                                            type="text" 
                                            placeholder="Enter custom text..."
                                            required
                                            maxLength="500"
                                            value={currentVal.value || ''}
                                            onChange={(e) => handleMappingChange(i, { type: 'custom', value: e.target.value })}
                                            className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-indigo-300 dark:border-indigo-600 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
                
                {/* Live Preview */}
                <div className="mt-6 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30 p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-green-800 dark:text-green-400 mb-2 flex items-center gap-2"><LayoutTemplate size={16} /> Data Payload Preview</h4>
                    <pre className="text-xs text-green-900 dark:text-green-300 whitespace-pre-wrap font-mono">
                        {generatePreview()}
                    </pre>
                </div>
              </div>

              <div className="flex items-center gap-2 md:col-span-2">
                <input type="checkbox" id="isActiveToggle" checked={editingTemplate.is_active === 1} onChange={e => setEditingTemplate({...editingTemplate, is_active: e.target.checked ? 1 : 0})} className="w-4 h-4 text-indigo-600 rounded" />
                <label htmlFor="isActiveToggle" className="font-medium text-slate-700 dark:text-slate-300">Active (Available for Assignment)</label>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
              <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-lg">Cancel</button>
              <button type="submit" disabled={saveTemplateMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2">
                {saveTemplateMutation.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Save
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
};

export default TemplatesTab;
