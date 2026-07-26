import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/axios";
import toast from "react-hot-toast";
import { UploadCloud, FileText, CheckCircle2, XCircle, AlertCircle, Eye, RefreshCw, X, ShieldCheck, UserCheck, Clock } from "lucide-react";
import { TableSkeleton } from "../../components/ui/Skeleton";

const AdminBulkAdd = () => {
  const queryClient = useQueryClient();
  const [kycFile, setKycFile] = useState(null);
  const [underUsFile, setUnderUsFile] = useState(null);
  const [dhanFile, setDhanFile] = useState(null);
  const [kycSummary, setKycSummary] = useState(null);
  const [underUsSummary, setUnderUsSummary] = useState(null);
  const [dhanSummary, setDhanSummary] = useState(null);
  const [selectedBatchId, setSelectedBatchId] = useState(null);

  // Fetch upload history
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["bulkUploadHistory"],
    queryFn: async () => {
      const res = await api.get("/api/admin/bulk-add/history");
      return res.data;
    }
  });

  // Fetch batch results modal data
  const { data: batchResultsData, isLoading: resultsLoading } = useQuery({
    queryKey: ["batchResults", selectedBatchId],
    queryFn: async () => {
      const res = await api.get(`/api/admin/bulk-add/history/${selectedBatchId}`);
      return res.data;
    },
    enabled: !!selectedBatchId
  });

  // Upload KYC Done mutation
  const uploadKycMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/api/admin/bulk-add/kyc-done", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "KYC Done upload successful");
      setKycSummary(data.data);
      setKycFile(null);
      queryClient.invalidateQueries({ queryKey: ["bulkUploadHistory"] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Upload failed");
    }
  });

  // Upload Under Us mutation
  const uploadUnderUsMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/api/admin/bulk-add/under-us", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Under Us upload successful");
      setUnderUsSummary(data.data);
      setUnderUsFile(null);
      queryClient.invalidateQueries({ queryKey: ["bulkUploadHistory"] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Upload failed");
    }
  });

  const uploadDhanMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/api/admin/bulk-add/dhan-kyc", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Dhan KYC upload successful");
      setDhanSummary(data.data);
      setDhanFile(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Upload failed");
    }
  });

  const handleKycSubmit = (e) => {
    e.preventDefault();
    if (!kycFile) {
      toast.error("Please select a file first");
      return;
    }
    uploadKycMutation.mutate(kycFile);
  };

  const handleUnderUsSubmit = (e) => {
    e.preventDefault();
    if (!underUsFile) {
      toast.error("Please select a file first");
      return;
    }
    uploadUnderUsMutation.mutate(underUsFile);
  };

  const handleDhanSubmit = (e) => {
    e.preventDefault();
    if (!dhanFile) {
      toast.error("Please select a file first");
      return;
    }
    uploadDhanMutation.mutate(dhanFile);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "UPDATED":
      case "MATCHED":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"><CheckCircle2 size={12} /> {status}</span>;
      case "ALREADY_KYC_DONE":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300"><ShieldCheck size={12} /> ALREADY KYC</span>;
      case "NOT_FOUND":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300"><XCircle size={12} /> NOT FOUND</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300">{status}</span>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <UploadCloud className="text-indigo-500" size={28} />
            Bulk Add Leads
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Batch update leads across working sheet and direct leads by uploading mobile numbers (CSV, XLSX, XLS).
          </p>
        </div>
      </div>

      {/* Upload Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Block 1: KYC Done */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
          
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Angel KYC Done Upload</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Permanently locks Status 1, 2 & 3</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mb-6 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700 leading-relaxed">
              Matched leads will be marked as <strong className="text-emerald-600 dark:text-emerald-400">KYC Done</strong>. They will disappear from Telecaller Current Leads and move to their read-only <strong>My Clients</strong> section.
            </p>

            <form onSubmit={handleKycSubmit} className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-4 text-center hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors bg-slate-50/50 dark:bg-slate-800/50">
                <input
                  type="file"
                  id="kyc-file"
                  accept=".csv, .xlsx, .xls"
                  onChange={(e) => setKycFile(e.target.files[0] || null)}
                  className="hidden"
                />
                <label htmlFor="kyc-file" className="cursor-pointer block">
                  <FileText className="mx-auto text-slate-400 mb-2" size={32} />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 block truncate">
                    {kycFile ? kycFile.name : "Click to select file (.csv, .xlsx, .xls)"}
                  </span>
                  <span className="text-xs text-slate-400 mt-1 block">First column must contain Mobile Numbers</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={!kycFile || uploadKycMutation.isPending}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
              >
                {uploadKycMutation.isPending ? (
                  <>
                    <RefreshCw className="animate-spin" size={18} />
                    Processing Upload...
                  </>
                ) : (
                  <>
                    <UploadCloud size={18} />
                    Upload KYC Done
                  </>
                )}
              </button>
            </form>
          </div>

          {/* KYC Summary Card */}
          {kycSummary && (
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 animate-in fade-in">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Latest Upload Summary</h4>
              <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded border border-slate-200/60 dark:border-slate-700">
                  <span className="text-slate-400 block">Total Rows</span>
                  <span className="font-bold text-slate-800 dark:text-white text-sm">{kycSummary.totalRows}</span>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-500/10 p-2 rounded border border-emerald-200/60 dark:border-emerald-500/30">
                  <span className="text-emerald-600 dark:text-emerald-400 block">Updated / Matched</span>
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 text-sm">{kycSummary.updatedCount}</span>
                </div>
                <div className="bg-blue-50 dark:bg-blue-500/10 p-2 rounded border border-blue-200/60 dark:border-blue-500/30">
                  <span className="text-blue-600 dark:text-blue-400 block">Already KYC Done</span>
                  <span className="font-bold text-blue-800 dark:text-blue-300 text-sm">{kycSummary.alreadyKycCount}</span>
                </div>
                <div className="bg-rose-50 dark:bg-rose-500/10 p-2 rounded border border-rose-200/60 dark:border-rose-500/30">
                  <span className="text-rose-600 dark:text-rose-400 block">Not Found</span>
                  <span className="font-bold text-rose-800 dark:text-rose-300 text-sm">{kycSummary.unmatchedCount}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBatchId(kycSummary.batchId)}
                className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Eye size={14} /> View Detailed Row-by-Row Results
              </button>
            </div>
          )}
        </div>

        {/* Block 2: Under Us */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500" />
          
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <UserCheck size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Under Us Upload</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Locks Status 1 only</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mb-6 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700 leading-relaxed">
              Matched leads will have Status 1 set to <strong className="text-indigo-600 dark:text-indigo-400">Under Us</strong> and permanently locked. Telecallers will still be able to edit Status 2 and Status 3 normally.
            </p>

            <form onSubmit={handleUnderUsSubmit} className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-4 text-center hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors bg-slate-50/50 dark:bg-slate-800/50">
                <input
                  type="file"
                  id="underus-file"
                  accept=".csv, .xlsx, .xls"
                  onChange={(e) => setUnderUsFile(e.target.files[0] || null)}
                  className="hidden"
                />
                <label htmlFor="underus-file" className="cursor-pointer block">
                  <FileText className="mx-auto text-slate-400 mb-2" size={32} />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 block truncate">
                    {underUsFile ? underUsFile.name : "Click to select file (.csv, .xlsx, .xls)"}
                  </span>
                  <span className="text-xs text-slate-400 mt-1 block">First column must contain Mobile Numbers</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={!underUsFile || uploadUnderUsMutation.isPending}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
              >
                {uploadUnderUsMutation.isPending ? (
                  <>
                    <RefreshCw className="animate-spin" size={18} />
                    Processing Upload...
                  </>
                ) : (
                  <>
                    <UploadCloud size={18} />
                    Upload Under Us
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Under Us Summary Card */}
          {underUsSummary && (
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 animate-in fade-in">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Latest Upload Summary</h4>
              <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded border border-slate-200/60 dark:border-slate-700">
                  <span className="text-slate-400 block">Total Rows</span>
                  <span className="font-bold text-slate-800 dark:text-white text-sm">{underUsSummary.totalRows}</span>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-500/10 p-2 rounded border border-indigo-200/60 dark:border-indigo-500/30">
                  <span className="text-indigo-600 dark:text-indigo-400 block">Updated / Matched</span>
                  <span className="font-bold text-indigo-800 dark:text-indigo-300 text-sm">{underUsSummary.updatedCount}</span>
                </div>
                <div className="bg-blue-50 dark:bg-blue-500/10 p-2 rounded border border-blue-200/60 dark:border-blue-500/30">
                  <span className="text-blue-600 dark:text-blue-400 block">Already KYC Done</span>
                  <span className="font-bold text-blue-800 dark:text-blue-300 text-sm">{underUsSummary.alreadyKycCount}</span>
                </div>
                <div className="bg-rose-50 dark:bg-rose-500/10 p-2 rounded border border-rose-200/60 dark:border-rose-500/30">
                  <span className="text-rose-600 dark:text-rose-400 block">Not Found</span>
                  <span className="font-bold text-rose-800 dark:text-rose-300 text-sm">{underUsSummary.unmatchedCount}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBatchId(underUsSummary.batchId)}
                className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Eye size={14} /> View Detailed Row-by-Row Results
              </button>
            </div>
          )}
        </div>

        {/* Block 3: Dhan KYC */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 to-cyan-500" />
          
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2.5 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Dhan KYC Upload</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Completely independent workflow</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mb-6 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700 leading-relaxed">
              Matched leads will be added to the independent <strong className="text-blue-600 dark:text-blue-400">Dhan Clients</strong> table. They will <strong className="text-rose-500">NOT</strong> be frozen or removed from the normal lead workflow.
            </p>

            <form onSubmit={handleDhanSubmit} className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-4 text-center hover:border-blue-500 dark:hover:border-blue-500 transition-colors bg-slate-50/50 dark:bg-slate-800/50">
                <input
                  type="file"
                  id="dhan-file"
                  accept=".csv, .xlsx, .xls"
                  onChange={(e) => setDhanFile(e.target.files[0] || null)}
                  className="hidden"
                />
                <label htmlFor="dhan-file" className="cursor-pointer block">
                  <FileText className="mx-auto text-slate-400 mb-2" size={32} />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 block truncate">
                    {dhanFile ? dhanFile.name : "Click to select file (.csv, .xlsx, .xls)"}
                  </span>
                  <span className="text-xs text-slate-400 mt-1 block">First column must contain Mobile Numbers</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={!dhanFile || uploadDhanMutation.isPending}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
              >
                {uploadDhanMutation.isPending ? (
                  <>
                    <RefreshCw className="animate-spin" size={18} />
                    Processing Upload...
                  </>
                ) : (
                  <>
                    <UploadCloud size={18} />
                    Upload Dhan KYC
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Dhan Summary Card */}
          {dhanSummary && (
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 animate-in fade-in">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Latest Dhan Upload Summary</h4>
              <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded border border-slate-200/60 dark:border-slate-700">
                  <span className="text-slate-400 block">Total Rows</span>
                  <span className="font-bold text-slate-800 dark:text-white text-sm">{dhanSummary.totalRows}</span>
                </div>
                <div className="bg-blue-50 dark:bg-blue-500/10 p-2 rounded border border-blue-200/60 dark:border-blue-500/30">
                  <span className="text-blue-600 dark:text-blue-400 block">Matched Leads</span>
                  <span className="font-bold text-blue-800 dark:text-blue-300 text-sm">{dhanSummary.matchedCount}</span>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-500/10 p-2 rounded border border-emerald-200/60 dark:border-emerald-500/30">
                  <span className="text-emerald-600 dark:text-emerald-400 block">New Dhan Added</span>
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 text-sm">{dhanSummary.newDhanCount}</span>
                </div>
                <div className="bg-purple-50 dark:bg-purple-500/10 p-2 rounded border border-purple-200/60 dark:border-purple-500/30">
                  <span className="text-purple-600 dark:text-purple-400 block">Already Dhan</span>
                  <span className="font-bold text-purple-800 dark:text-purple-300 text-sm">{dhanSummary.alreadyDhanCount}</span>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Recent Upload History Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Upload History</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Click "View Results" to see row-by-row matching details</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          {historyLoading ? (
            <div className="p-6">
              <TableSkeleton rows={5} columns={6} />
            </div>
          ) : !historyData?.batches || historyData.batches.length === 0 ? (
            <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-sm">
              No bulk upload history found yet.
            </div>
          ) : (
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-200 font-bold text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3.5 px-4">Upload Type</th>
                  <th className="py-3.5 px-4">File Name</th>
                  <th className="py-3.5 px-4">Total Rows</th>
                  <th className="py-3.5 px-4">Matched</th>
                  <th className="py-3.5 px-4">Not Found</th>
                  <th className="py-3.5 px-4">Uploaded At</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {historyData.batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="py-3 px-4 font-bold">
                      {batch.upload_type === "KYC_DONE" ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                          <ShieldCheck size={16} /> KYC Done
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                          <UserCheck size={16} /> Under Us
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">{batch.file_name}</td>
                    <td className="py-3 px-4 font-bold">{batch.total_rows}</td>
                    <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-bold">{batch.matched_count}</td>
                    <td className="py-3 px-4 text-rose-600 dark:text-rose-400 font-bold">{batch.unmatched_count}</td>
                    <td className="py-3 px-4 text-xs text-slate-400">
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(batch.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedBatchId(batch.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 transition-colors"
                      >
                        <Eye size={14} /> View Results
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Batch Results Modal / Drawer */}
      {selectedBatchId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-5xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="text-indigo-500" size={20} />
                  Batch #{selectedBatchId} - Row by Row Results
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Detailed matching log for uploaded mobile numbers</p>
              </div>
              <button
                onClick={() => setSelectedBatchId(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {resultsLoading ? (
                <TableSkeleton rows={8} columns={5} />
              ) : !batchResultsData?.results || batchResultsData.results.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-sm">No details found for this batch.</div>
              ) : (
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-200 font-bold text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 sticky top-0">
                    <tr>
                      <th className="py-3 px-4">Mobile Number</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Table</th>
                      <th className="py-3 px-4">Telecaller</th>
                      <th className="py-3 px-4">Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {batchResultsData.results.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">{row.uploaded_mobile}</td>
                        <td className="py-2.5 px-4">{getStatusBadge(row.result_status)}</td>
                        <td className="py-2.5 px-4 font-medium text-xs">
                          {row.matched_table === "working_sheet" ? (
                            <span className="text-indigo-600 dark:text-indigo-400">Working Sheet</span>
                          ) : row.matched_table === "direct_leads" ? (
                            <span className="text-purple-600 dark:text-purple-400">Direct Leads</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                          {row.telecaller_name || (row.telecaller_id ? `ID #${row.telecaller_id}` : "Unassigned")}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-slate-500 dark:text-slate-400">{row.message || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end bg-slate-50/50 dark:bg-slate-800 shrink-0">
              <button
                onClick={() => setSelectedBatchId(null)}
                className="px-5 py-2 rounded-xl text-sm font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default AdminBulkAdd;
