import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/axios";
import { Loader2, AlertCircle, UploadCloud, Copy, Trash2, Image as ImageIcon, Film } from "lucide-react";
import toast from "react-hot-toast";

export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const MediaLibraryTab = () => {
    const queryClient = useQueryClient();
    const fileInputRef = useRef(null);
    const [isUploading, setIsUploading] = useState(false);

    const { data: media = [], isLoading, isError } = useQuery({
        queryKey: ["whatsapp-media"],
        queryFn: async () => {
            const res = await api.get('/api/whatsapp-center/media');
            return res.data.media;
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            return await api.delete(`/api/whatsapp-center/media/${id}`);
        },
        onSuccess: () => {
            toast.success("Media deleted successfully");
            queryClient.invalidateQueries(["whatsapp-media"]);
        },
        onError: (error) => {
            toast.error(error?.response?.data?.message || "Failed to delete media");
        }
    });

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const isVideo = file.type.startsWith('video/');
        const maxSize = isVideo ? (25 * 1024 * 1024) : (10 * 1024 * 1024);

        if (file.size > maxSize) {
            toast.error(`File too large! Max size is ${isVideo ? '25MB' : '10MB'}`);
            e.target.value = '';
            return;
        }

        const formData = new FormData();
        formData.append('mediaFile', file);

        setIsUploading(true);
        try {
            await api.post('/api/whatsapp-center/media/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success("Media uploaded successfully");
            queryClient.invalidateQueries(["whatsapp-media"]);
        } catch (error) {
            toast.error(error?.response?.data?.message || "Upload failed");
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success("URL copied to clipboard");
    };

    if (isLoading) {
        return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;
    }

    if (isError) {
        return <div className="p-6 text-red-600 flex items-center gap-2"><AlertCircle /> Failed to load media</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white dark:bg-[#1e1e2f] p-6 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Media Library</h3>
                    <p className="text-sm text-slate-500 mt-1">Upload images (max 10MB) and videos (max 25MB) for your templates.</p>
                </div>
                <div>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileSelect}
                        className="hidden" 
                        accept=".jpg,.jpeg,.png,.webp,.mp4"
                    />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
                    >
                        {isUploading ? <Loader2 className="animate-spin" size={18} /> : <UploadCloud size={18} />}
                        Upload Media
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {media.map((item) => (
                    <div key={item.id} className="bg-white dark:bg-[#1e1e2f] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 group relative">
                        <div className="aspect-video bg-slate-100 dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                            {item.media_type === 'IMAGE' ? (
                                <img src={item.public_url} alt={item.media_name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="relative w-full h-full flex items-center justify-center bg-slate-900">
                                    <Film size={32} className="text-slate-400" />
                                    <video src={item.public_url} className="absolute inset-0 w-full h-full object-cover opacity-50" muted />
                                </div>
                            )}
                        </div>
                        
                        <div className="p-4">
                            <h4 className="font-medium text-slate-800 dark:text-white truncate" title={item.original_file_name}>
                                {item.original_file_name}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                                {item.media_type === 'IMAGE' ? <ImageIcon size={14} /> : <Film size={14} />}
                                <span>{formatFileSize(item.file_size)}</span>
                                <span>•</span>
                                <span>{new Date(item.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>

                        {/* Hover Overlay Actions */}
                        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => copyToClipboard(item.public_url)} className="p-2 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg shadow-sm">
                                <Copy size={16} />
                            </button>
                            <button onClick={() => {
                                if (window.confirm("Delete this media? This will fail if a template is using it.")) {
                                    deleteMutation.mutate(item.id);
                                }
                            }} className="p-2 bg-white/90 dark:bg-slate-800/90 hover:bg-red-50 text-red-600 rounded-lg shadow-sm">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
                
                {media.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-500 bg-white dark:bg-[#1e1e2f] border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                        <ImageIcon className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                        <p>No media uploaded yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MediaLibraryTab;
