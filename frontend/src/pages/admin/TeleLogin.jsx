import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from "../../api/axios";
import { Search, Loader2, LogIn, History, Shield, CheckCircle2, XCircle } from "lucide-react";
import toast from "react-hot-toast";

const TeleLogin = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [logPage, setLogPage] = useState(1);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(handler);
  }, [search]);

  const { data: telecallers, isLoading: loadingTelecallers } = useQuery({
    queryKey: ["telelogin-telecallers", debouncedSearch],
    queryFn: async () => {
      const res = await api.get('/api/admin/tele-login/telecallers', {
        params: { search: debouncedSearch }
      });
      return res.data;
    }
  });

  const { data: logsData, isLoading: loadingLogs, refetch: refetchLogs } = useQuery({
    queryKey: ["telelogin-logs", logPage],
    queryFn: async () => {
      const res = await api.get('/api/admin/tele-login/logs', {
        params: { page: logPage, limit: 10 }
      });
      return res.data;
    }
  });

  const impersonateMutation = useMutation({
    mutationFn: async (telecallerId) => {
      const res = await api.post(`/api/admin/tele-login/${telecallerId}`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success("Impersonation session created!");
      refetchLogs();
      // Open new window/tab safely
      window.open(data.impersonationUrl, "_blank", "noopener,noreferrer");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to impersonate");
    }
  });

  return (
    <div className="space-y-8 animate-fade-in-up h-full overflow-y-auto custom-scrollbar pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
            <Shield className="text-indigo-500" size={32} />
            TeleLogin
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Securely access and view any telecaller's dashboard exactly as they see it.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Telecallers List (Left Side) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-[#1e1e2f] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151521] flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search by name or mobile..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#1a1a24] border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white transition-all shadow-sm outline-none text-sm"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-[#151521] text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="p-4 border-b border-slate-200 dark:border-slate-700">Telecaller Info</th>
                    <th className="p-4 border-b border-slate-200 dark:border-slate-700">Status</th>
                    <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {loadingTelecallers ? (
                    <tr>
                      <td colSpan="3" className="p-8 text-center">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mx-auto" />
                      </td>
                    </tr>
                  ) : telecallers?.length > 0 ? (
                    telecallers.map(tc => (
                      <tr key={tc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                        <td className="p-4">
                          <div className="font-bold text-slate-900 dark:text-white">{tc.telecaller_name}</div>
                          <div className="text-xs text-slate-500">{tc.tele_mobile}</div>
                        </td>
                        <td className="p-4 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs">
                            {tc.is_active ? <CheckCircle2 size={14} className="text-emerald-500"/> : <XCircle size={14} className="text-rose-500"/>}
                            <span className={tc.is_active ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-rose-600 dark:text-rose-400"}>
                              {tc.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          {tc.own_campaign_enabled === 1 && (
                            <div className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300">
                              Campaign Enabled
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => impersonateMutation.mutate(tc.id)}
                            disabled={impersonateMutation.isLoading}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm disabled:opacity-70"
                          >
                            {impersonateMutation.isLoading && impersonateMutation.variables === tc.id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <LogIn size={16} />
                            )}
                            Login
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="p-8 text-center text-slate-500">No telecallers found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Audit Logs (Right Side) */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#1e1e2f] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-full max-h-[800px]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151521] flex items-center gap-2">
              <History className="text-slate-500" size={18} />
              <h2 className="font-bold text-slate-800 dark:text-slate-200">Recent TeleLogins</h2>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-4">
              {loadingLogs ? (
                <div className="flex justify-center p-4"><Loader2 className="animate-spin text-slate-400" /></div>
              ) : logsData?.logs?.length > 0 ? (
                logsData.logs.map(log => (
                  <div key={log.id} className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 text-sm">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-slate-900 dark:text-white">{log.admin_username}</span>
                      <span className="text-xs text-slate-400">{new Date(log.login_at).toLocaleString()}</span>
                    </div>
                    <div className="text-slate-600 dark:text-slate-400">
                      Logged in as <span className="font-medium text-indigo-600 dark:text-indigo-400">{log.telecaller_name}</span> ({log.tele_mobile})
                    </div>
                    <div className="text-xs text-slate-400 mt-1 mt-2 font-mono">
                      IP: {log.ip_address}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-slate-500 py-8">No recent logins</div>
              )}
            </div>

            {/* Pagination for logs */}
            {logsData && logsData.totalPages > 1 && (
              <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-[#151521]">
                <button 
                  disabled={logPage === 1}
                  onClick={() => setLogPage(p => p - 1)}
                  className="px-3 py-1 text-xs font-semibold text-slate-600 bg-white border rounded disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                >
                  Prev
                </button>
                <span className="text-xs text-slate-500">Page {logPage} of {logsData.totalPages}</span>
                <button 
                  disabled={logPage === logsData.totalPages}
                  onClick={() => setLogPage(p => p + 1)}
                  className="px-3 py-1 text-xs font-semibold text-slate-600 bg-white border rounded disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeleLogin;
