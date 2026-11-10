import { useState } from "react"; 
import { useQuery } from "@tanstack/react-query"; 
import api from "../../api/axios"; 
import { Database, User, Calendar, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { TableSkeleton } from "../../components/ui/Skeleton";

const NewLeads = () => { 
  const [page, setPage] = useState(1); 
  
  const { data, isLoading, isError } = useQuery({ 
    queryKey: ["newLeads", page], 
    queryFn: async () => { 
      const res = await api.get(`/api/new-leads?page=${page}&limit=50`); 
      return res.data; 
    }, 
    keepPreviousData: true 
  }); 
  
  return ( 
    <div className="space-y-6 animate-in fade-in duration-500 h-full flex flex-col"> 
      <div className="flex items-center justify-between shrink-0"> 
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Bot Lead Pool</h1> 
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Unassigned leads waiting in the pool.</p>
        </div>
        <div className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 px-4 py-1.5 rounded-full text-sm font-bold border border-indigo-200 dark:border-indigo-500/30 flex items-center gap-2"> 
          <Database size={16} />
          <span>Total: {data?.totalCount || 0}</span> 
        </div> 
      </div> 

      {isLoading ? (
        <TableSkeleton columns={3} rows={10} />
      ) : isError ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-[#1e1e2f] rounded-2xl border border-slate-200 dark:border-slate-800">
          <AlertCircle size={48} className="text-red-400 mb-4" />
          <p className="text-lg font-medium text-slate-800 dark:text-slate-200">Failed to load lead pool.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1e1e2f] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col flex-1 overflow-hidden"> 
          <div className="overflow-auto flex-1 relative"> 
            <table className="w-full text-left border-collapse whitespace-nowrap"> 
              <thead className="sticky top-0 z-10 bg-slate-50/90 dark:bg-[#151521]/90 backdrop-blur-md shadow-sm"> 
                <tr className="text-slate-600 dark:text-slate-300 text-sm font-semibold"> 
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700">Lead Name</th> 
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700">Contact</th> 
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700">Date Added</th> 
                </tr> 
              </thead> 
              <tbody className="text-sm"> 
                {data?.data.map((lead) => ( 
                  <tr key={lead.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"> 
                    <td className="p-4 font-medium text-slate-900 dark:text-white">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                          <User size={14} />
                        </div>
                        {lead.lead_name}
                      </div>
                    </td> 
                    <td className="p-4 text-slate-600 dark:text-slate-400 font-medium">{lead.lead_contact}</td> 
                    <td className="p-4 text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-slate-400" />
                        {new Date(lead.created_at).toLocaleString('en-IN', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true })}
                      </div>
                    </td> 
                  </tr> 
                ))} 
                {data?.data.length === 0 && ( 
                  <tr> 
                    <td colSpan={3} className="p-12 text-center text-slate-500 dark:text-slate-400">
                      <div className="flex flex-col items-center">
                        <Database size={48} className="text-slate-300 dark:text-slate-600 mb-4" />
                        <p className="text-lg font-medium text-slate-900 dark:text-white">Lead pool is empty</p>
                      </div>
                    </td> 
                  </tr> 
                )} 
              </tbody> 
            </table> 
          </div> 
          
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#151521] shrink-0">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 bg-white dark:bg-[#1e1e2f] border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-[#1e1e2f] px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
              Page {page} of {data?.totalPages || 1}
            </span>
            <button
              disabled={page >= data?.totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 bg-white dark:bg-[#1e1e2f] border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div> 
      )}
    </div> 
  ); 
}; 

export default NewLeads;
