import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/axios";
import { 
  MessageCircle, BarChart3, ListTodo, Inbox, Settings as SettingsIcon, 
  Search, Loader2, RefreshCw, AlertCircle, CheckCircle2, Clock, XCircle, FileText, Edit, Save, Plus, Trash2, Image as ImageIcon, Video, File, LayoutTemplate, Repeat
} from "lucide-react";
import { TableSkeleton, cn } from "../../components/ui/Skeleton";
import toast from "react-hot-toast";
import TemplatesTab from "./TemplatesTab";
import MediaLibraryTab from "./MediaLibraryTab";
import InteraktAgentsTab from "./InteraktAgentsTab";
import WhatsAppRecurringBroadcastsTab from "./tabs/WhatsAppRecurringBroadcastsTab";

// --- Tab Components ---

const OverviewTab = () => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["whatsapp-overview"],
    queryFn: async () => {
      const res = await api.get('/api/whatsapp-center/overview');
      return res.data.data;
    },
    refetchInterval: 30000
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-[#1e1e2f] p-6 rounded-xl border border-slate-200 dark:border-slate-800 animate-pulse">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-xl border border-red-200 dark:border-red-800/30 flex items-center gap-3">
        <AlertCircle size={24} />
        <div>
          <h3 className="font-semibold">Failed to load overview data</h3>
          <button onClick={() => refetch()} className="text-sm underline mt-1">Try again</button>
        </div>
      </div>
    );
  }

  const statCards = [
    { title: "Messages Sent Today", value: data?.messages_sent_today || 0, color: "text-blue-600 dark:text-blue-400" },
    { title: "Direct Welcome Sent", value: data?.direct_welcome_sent || 0, color: "text-indigo-600 dark:text-indigo-400" },
    { title: "Bot Welcome Sent", value: data?.bot_welcome_sent || 0, color: "text-purple-600 dark:text-purple-400" },
    { title: "Interested Replies", value: data?.interested_replies || 0, color: "text-emerald-600 dark:text-emerald-400" },
    { title: "RM Messages Sent", value: data?.rm_messages_sent || 0, color: "text-amber-600 dark:text-amber-400" },
    { title: "Failed Messages", value: data?.failed_messages || 0, color: "text-red-600 dark:text-red-400" },
    { title: "Pending Queue", value: data?.pending_queue || 0, color: "text-orange-600 dark:text-orange-400" },
    { title: "Active 24h Windows", value: data?.active_24h_windows || 0, color: "text-teal-600 dark:text-teal-400" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button 
          onClick={() => {
            toast.loading("Refreshing...", { id: "refresh" });
            refetch().then(() => toast.success("Refreshed", { id: "refresh" }));
          }}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 dark:bg-[#1e1e2f] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
        >
          <RefreshCw size={16} /> Refresh Stats
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white dark:bg-[#1e1e2f] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">{stat.title}</h3>
            <p className={cn("text-3xl font-bold", stat.color)}>{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const ConversationsTab = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [leadType, setLeadType] = useState("");
  const [customerResponse, setCustomerResponse] = useState("");
  const [rmStatus, setRmStatus] = useState("");

  // Debounce search
  import("react").then((React) => {
    React.useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedSearch(search);
        setPage(1);
      }, 500);
      return () => clearTimeout(handler);
    }, [search]);
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["whatsapp-conversations", page, debouncedSearch, leadType, customerResponse, rmStatus],
    queryFn: async () => {
      const res = await api.get('/api/whatsapp-center/conversations', {
        params: { page, limit: 15, search: debouncedSearch, leadType, customerResponse, rmStatus }
      });
      return res.data;
    },
    keepPreviousData: true,
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SENT': return <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium">Sent</span>;
      case 'PENDING': return <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium">Pending</span>;
      case 'FAILED': return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-medium">Failed</span>;
      case 'INTERESTED': return <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium">Interested</span>;
      case 'WAITING': return <span className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 font-medium">Waiting</span>;
      case 'WINDOW_EXPIRED': return <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 font-medium">Expired</span>;
      default: return <span className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 font-medium">{status || 'N/A'}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-[#1e1e2f] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-[#151521] border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select value={leadType} onChange={(e) => { setLeadType(e.target.value); setPage(1); }} className="px-3 py-2 bg-slate-50 dark:bg-[#151521] border border-slate-200 dark:border-slate-700 rounded-lg text-sm">
          <option value="">All Types</option>
          <option value="DIRECT">Direct</option>
          <option value="BOT">Bot</option>
        </select>
        <select value={customerResponse} onChange={(e) => { setCustomerResponse(e.target.value); setPage(1); }} className="px-3 py-2 bg-slate-50 dark:bg-[#151521] border border-slate-200 dark:border-slate-700 rounded-lg text-sm">
          <option value="">All Responses</option>
          <option value="INTERESTED">Interested</option>
          <option value="WAITING">Waiting</option>
        </select>
        <select value={rmStatus} onChange={(e) => { setRmStatus(e.target.value); setPage(1); }} className="px-3 py-2 bg-slate-50 dark:bg-[#151521] border border-slate-200 dark:border-slate-700 rounded-lg text-sm">
          <option value="">All RM Status</option>
          <option value="SENT">Sent</option>
          <option value="PENDING">Pending</option>
          <option value="FAILED">Failed</option>
          <option value="WINDOW_EXPIRED">Expired</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#1e1e2f] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-[#151521] text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Type / Table</th>
                <th className="px-4 py-3">Response</th>
                <th className="px-4 py-3">Welcome</th>
                <th className="px-4 py-3">Bot Ack</th>
                <th className="px-4 py-3">RM Message</th>
                <th className="px-4 py-3">Last Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {isLoading ? (
                <tr><td colSpan="8" className="p-4"><TableSkeleton rows={5} columns={8} /></td></tr>
              ) : isError ? (
                <tr><td colSpan="8" className="p-8 text-center text-red-500">Failed to load conversations</td></tr>
              ) : data?.data?.length === 0 ? (
                <tr><td colSpan="8" className="p-8 text-center text-slate-500">No conversations found</td></tr>
              ) : (
                data?.data?.map((conv) => (
                  <tr key={conv.id} className="hover:bg-slate-50 dark:hover:bg-[#151521] transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                      {conv.customer_name || 'Unknown'}
                      {conv.rm_name && <span className="block text-xs font-normal text-slate-500">RM: {conv.rm_name}</span>}
                    </td>
                    <td className="px-4 py-3">{conv.phone_number}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-indigo-600 dark:text-indigo-400">{conv.lead_type}</span>
                        <span className="text-xs text-slate-400">{conv.lead_table}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(conv.customer_response)}</td>
                    <td className="px-4 py-3">{getStatusBadge(conv.initial_template_status)}</td>
                    <td className="px-4 py-3">{getStatusBadge(conv.bot_interest_ack_status)}</td>
                    <td className="px-4 py-3">{getStatusBadge(conv.rm_session_message_status)}</td>
                    <td className="px-4 py-3 text-xs">
                      {new Date(conv.last_activity_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-sm text-slate-500">
              Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} total)
            </span>
            <div className="flex gap-2">
              <button 
                disabled={page === 1} 
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 text-sm bg-slate-100 dark:bg-slate-800 rounded disabled:opacity-50"
              >
                Prev
              </button>
              <button 
                disabled={page === data.pagination.totalPages} 
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 text-sm bg-slate-100 dark:bg-slate-800 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const MessageLogsTab = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  import("react").then((React) => {
    React.useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedSearch(search);
        setPage(1);
      }, 500);
      return () => clearTimeout(handler);
    }, [search]);
  });

  const { data, isLoading } = useQuery({
    queryKey: ["whatsapp-logs", page, debouncedSearch],
    queryFn: async () => {
      const res = await api.get('/api/whatsapp-center/logs', {
        params: { page, limit: 15, search: debouncedSearch }
      });
      return res.data;
    },
    keepPreviousData: true,
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-4 bg-white dark:bg-[#1e1e2f] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search phone number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-[#151521] border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-[#1e1e2f] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-[#151521] text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Msg Type</th>
                <th className="px-4 py-3">Template</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Sent At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {isLoading ? (
                <tr><td colSpan="6" className="p-4"><TableSkeleton rows={5} columns={6} /></td></tr>
              ) : data?.data?.length === 0 ? (
                <tr><td colSpan="6" className="p-8 text-center text-slate-500">No logs found</td></tr>
              ) : (
                data?.data?.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-[#151521]">
                    <td className="px-4 py-3">{log.phone_number}</td>
                    <td className="px-4 py-3 font-medium">{log.lead_type}</td>
                    <td className="px-4 py-3">{log.message_type}</td>
                    <td className="px-4 py-3">{log.template_name || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "px-2 py-1 text-xs rounded-full font-medium",
                        log.status === 'SENT' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                        log.status === 'FAILED' ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                      )}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">{new Date(log.sent_at).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-sm text-slate-500">Page {data.pagination.page} of {data.pagination.totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-sm bg-slate-100 dark:bg-slate-800 rounded disabled:opacity-50">Prev</button>
              <button disabled={page === data.pagination.totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-sm bg-slate-100 dark:bg-slate-800 rounded disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const QueueTab = () => {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ["whatsapp-queue", page],
    queryFn: async () => {
      const res = await api.get('/api/whatsapp-center/queue', { params: { page, limit: 15 } });
      return res.data;
    },
    refetchInterval: 10000,
    keepPreviousData: true,
  });

  return (
    <div className="bg-white dark:bg-[#1e1e2f] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
          <thead className="bg-slate-50 dark:bg-[#151521] text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Trigger</th>
              <th className="px-4 py-3">Template</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Retries</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {isLoading ? (
              <tr><td colSpan="6" className="p-4"><TableSkeleton rows={5} columns={6} /></td></tr>
            ) : data?.data?.length === 0 ? (
              <tr><td colSpan="6" className="p-8 text-center text-slate-500">Queue is empty</td></tr>
            ) : (
              data?.data?.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-[#151521]">
                  <td className="px-4 py-3">{item.phone_number}</td>
                  <td className="px-4 py-3 text-xs font-mono">{item.trigger_type}</td>
                  <td className="px-4 py-3">{item.template_name || '-'}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs rounded-full font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{item.retry_count}</td>
                  <td className="px-4 py-3 text-xs">{new Date(item.created_at).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-sm text-slate-500">Page {data.pagination.page} of {data.pagination.totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-sm bg-slate-100 dark:bg-slate-800 rounded disabled:opacity-50">Prev</button>
            <button disabled={page === data.pagination.totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-sm bg-slate-100 dark:bg-slate-800 rounded disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
};

const InboundTab = () => {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ["whatsapp-inbound", page],
    queryFn: async () => {
      const res = await api.get('/api/whatsapp-center/inbound', { params: { page, limit: 15 } });
      return res.data;
    },
    keepPreviousData: true,
  });

  return (
    <div className="bg-white dark:bg-[#1e1e2f] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
          <thead className="bg-slate-50 dark:bg-[#151521] text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Event Type</th>
              <th className="px-4 py-3">Message/Button</th>
              <th className="px-4 py-3">Interest Detected</th>
              <th className="px-4 py-3">Received At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {isLoading ? (
              <tr><td colSpan="5" className="p-4"><TableSkeleton rows={5} columns={5} /></td></tr>
            ) : data?.data?.length === 0 ? (
              <tr><td colSpan="5" className="p-8 text-center text-slate-500">No inbound messages</td></tr>
            ) : (
              data?.data?.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-[#151521]">
                  <td className="px-4 py-3">{item.from_phone}</td>
                  <td className="px-4 py-3">{item.event_type}</td>
                  <td className="px-4 py-3 text-slate-900 dark:text-slate-200 max-w-[200px] truncate" title={item.message_text || item.button_text}>
                    {item.message_text || item.button_text || '-'}
                  </td>
                  <td className="px-4 py-3">
                    {item.interest_detected === 1 ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium">Yes</span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 font-medium">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">{new Date(item.received_at).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-sm text-slate-500">Page {data.pagination.page} of {data.pagination.totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-sm bg-slate-100 dark:bg-slate-800 rounded disabled:opacity-50">Prev</button>
            <button disabled={page === data.pagination.totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-sm bg-slate-100 dark:bg-slate-800 rounded disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
};

const SettingsTab = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["whatsapp-settings"],
    queryFn: async () => {
      const res = await api.get('/api/whatsapp-center/settings');
      return res.data.data;
    }
  });

  if (isLoading) return <div className="p-8"><Loader2 className="animate-spin mx-auto text-indigo-500" /></div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-white dark:bg-[#1e1e2f] p-6 rounded-xl border border-slate-200 dark:border-slate-800">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <SettingsIcon size={20} className="text-indigo-500" /> System Configuration
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-[#151521] rounded-lg">
            <p className="text-sm text-slate-500 dark:text-slate-400">Provider</p>
            <p className="font-medium text-slate-900 dark:text-slate-200">{data?.settings?.provider || 'INTERAKT'}</p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-[#151521] rounded-lg">
            <p className="text-sm text-slate-500 dark:text-slate-400">WhatsApp Engine</p>
            <p className="font-medium text-slate-900 dark:text-slate-200">
              {data?.settings?.is_enabled ? <span className="text-emerald-500">Enabled</span> : <span className="text-red-500">Disabled</span>}
            </p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-[#151521] rounded-lg">
            <p className="text-sm text-slate-500 dark:text-slate-400">Direct Leads Routing</p>
            <p className="font-medium text-slate-900 dark:text-slate-200">
              {data?.settings?.enable_direct_leads ? 'Enabled' : 'Disabled'}
            </p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-[#151521] rounded-lg">
            <p className="text-sm text-slate-500 dark:text-slate-400">Bot Leads Routing</p>
            <p className="font-medium text-slate-900 dark:text-slate-200">
              {data?.settings?.enable_bot_leads ? 'Enabled' : 'Disabled'}
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-4 italic flex items-center gap-1">
          <AlertCircle size={14} /> Security keys and tokens are hidden.
        </p>
      </div>

      <div className="bg-white dark:bg-[#1e1e2f] p-6 rounded-xl border border-slate-200 dark:border-slate-800">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <FileText size={20} className="text-indigo-500" /> Active Templates
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-50 dark:bg-[#151521]">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Language</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.templates?.map(t => (
                <tr key={t.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-2 font-medium text-slate-900 dark:text-slate-200">{t.template_name}</td>
                  <td className="px-4 py-2">{t.language}</td>
                  <td className="px-4 py-2">
                    <span className={cn("px-2 py-1 text-xs rounded-full", t.status === 'APPROVED' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-slate-100 text-slate-700")}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
              {(!data?.templates || data.templates.length === 0) && (
                <tr><td colSpan="3" className="px-4 py-4 text-center">No templates found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- Service Messages Component ---

const ServiceMessagesTab = () => {
  const { data: messages, isLoading, refetch } = useQuery({
    queryKey: ["whatsapp-service-messages"],
    queryFn: async () => {
      const res = await api.get('/api/whatsapp-center/service-messages');
      return res.data.data;
    }
  });

  const [savingKey, setSavingKey] = useState(null);
  const [edits, setEdits] = useState({});

  useEffect(() => {
    if (messages) {
      const initialEdits = {};
      messages.forEach(m => {
        initialEdits[m.message_key] = {
          message_title: m.message_title,
          message_body: m.message_body,
          is_active: m.is_active === 1
        };
      });
      setEdits(initialEdits);
    }
  }, [messages]);

  const handleUpdate = (key, field, value) => {
    setEdits(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const handleSave = async (messageKey) => {
    setSavingKey(messageKey);
    try {
      await api.put(`/api/whatsapp-center/service-messages/${messageKey}`, edits[messageKey]);
      toast.success("Service message saved successfully");
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save message");
    } finally {
      setSavingKey(null);
    }
  };

  const renderPreview = (template) => {
    if (!template) return "";
    let res = template;
    res = res.replace(/\{\{customer_name\}\}/g, "Raj");
    res = res.replace(/\{\{rm_name\}\}/g, "Avinash Jain");
    res = res.replace(/\{\{rm_mobile\}\}/g, "9876543210");
    res = res.replace(/\{\{website_url\}\}/g, "https://www.shareshaala.com");
    return res;
  };

  if (isLoading) return <TableSkeleton />;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {messages?.map(msg => {
        const editState = edits[msg.message_key] || {};
        return (
          <div key={msg.id} className="bg-white dark:bg-[#1e1e2f] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Edit size={16} className="text-indigo-500" /> {msg.message_key}
                </h3>
                <p className="text-xs text-slate-500 mt-1">Lead Type: {msg.lead_type}</p>
              </div>
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={editState.is_active || false} onChange={(e) => handleUpdate(msg.message_key, 'is_active', e.target.checked)} />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${editState.is_active ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${editState.is_active ? 'transform translate-x-4' : ''}`}></div>
                </div>
              </label>
            </div>
            
            <div className="p-4 flex-1 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title</label>
                <input 
                  type="text" 
                  value={editState.message_title || ''} 
                  onChange={(e) => handleUpdate(msg.message_key, 'message_title', e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#151521] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Message Body</label>
                  <span className="text-xs text-slate-500">{editState.message_body?.length || 0}/2000</span>
                </div>
                <textarea 
                  rows={6}
                  value={editState.message_body || ''}
                  onChange={(e) => handleUpdate(msg.message_key, 'message_body', e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#151521] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
                <div className="mt-2 text-xs text-slate-500">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Supported Variables:</span><br/>
                  {"{{customer_name}}, {{rm_name}}, {{rm_mobile}}, {{website_url}}"}
                </div>
              </div>

              <div className="mt-2 bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/20 rounded-lg p-3">
                <h4 className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-2 uppercase tracking-wider">Live Preview</h4>
                <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words font-sans bg-white dark:bg-[#1e1e2f] p-3 rounded shadow-sm border border-slate-100 dark:border-slate-800">
                  {renderPreview(editState.message_body)}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
              <div className="text-xs text-slate-500">
                Last updated by {msg.updated_by_name || 'System'}
              </div>
              <button 
                onClick={() => handleSave(msg.message_key)}
                disabled={savingKey === msg.message_key}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {savingKey === msg.message_key ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};


import WhatsAppAutomationsTab from "./WhatsAppAutomationsTab";

// --- Main Page Component ---

const WhatsAppCenter = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: <BarChart3 size={18} /> },
    { id: "conversations", label: "Conversations", icon: <MessageCircle size={18} /> },
    { id: "logs", label: "Message Logs", icon: <ListTodo size={18} /> },
    { id: "queue", label: "Queue", icon: <Clock size={18} /> },
    { id: "inbound", label: "Inbound", icon: <Inbox size={18} /> },
    { id: "service-messages", label: "Service Messages", icon: <FileText size={18} /> },
    { id: "automations", label: "Automation Messages", icon: <SettingsIcon size={18} /> },
    { id: "recurring-broadcasts", label: "Recurring Broadcasts", icon: <Repeat size={18} /> },
    { id: "templates", label: "Templates", icon: <LayoutTemplate size={18} /> },
    { id: "media-library", label: "Media Library", icon: <ImageIcon size={18} /> },
    { id: "interakt-agents", label: "Interakt Agents", icon: <MessageCircle size={18} /> },
    { id: "settings", label: "Settings", icon: <SettingsIcon size={18} /> },
  ];

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <MessageCircle className="text-indigo-500" size={32} />
          WhatsApp Center
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Monitor automated messaging, view conversation states, and check queue health.
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto custom-scrollbar mb-6 bg-white dark:bg-[#1e1e2f] p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap",
              activeTab === tab.id
                ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "conversations" && <ConversationsTab />}
        {activeTab === "logs" && <MessageLogsTab />}
        {activeTab === "queue" && <QueueTab />}
        {activeTab === "inbound" && <InboundTab />}
        {activeTab === "service-messages" && <ServiceMessagesTab />}
        {activeTab === "automations" && <WhatsAppAutomationsTab />}
        {activeTab === "recurring-broadcasts" && <WhatsAppRecurringBroadcastsTab />}
        {activeTab === "templates" && <TemplatesTab />}
        {activeTab === "media-library" && <MediaLibraryTab />}
        {activeTab === "interakt-agents" && <InteraktAgentsTab />}
        {activeTab === "settings" && <SettingsTab />}
      </div>
    </div>
  );
};

export default WhatsAppCenter;
