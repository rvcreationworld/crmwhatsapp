import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { Loader2, Calendar, Search, ChevronLeft, ChevronRight, X, Info, Save } from 'lucide-react';
import toast from 'react-hot-toast';

const Attendance = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTelecaller, setSelectedTelecaller] = useState(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['telecallersForAttendance'],
    queryFn: async () => {
      const res = await api.get('/api/admin/attendance/telecallers');
      return res.data;
    }
  });

  const telecallers = data?.telecallers || [];
  const filteredTelecallers = telecallers.filter(t =>
    (t.telecaller_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.tele_mobile || '').includes(searchTerm)
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto relative animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="text-emerald-600" />
            Manual Attendance
          </h1>
          <p className="text-slate-500 mt-1">Select a telecaller to mark their attendance</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by name or mobile..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2.5 bg-white dark:bg-[#1e1e2f] border border-slate-200 dark:border-slate-800 rounded-xl text-sm w-64 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64 bg-white dark:bg-[#1e1e2f] border border-slate-200 dark:border-slate-800 rounded-2xl">
          <Loader2 className="animate-spin text-emerald-600" size={32} />
        </div>
      ) : isError ? (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-xl border border-red-200 dark:border-red-800 text-center">
          Failed to load telecallers.
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1e1e2f] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr className="text-slate-600 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider">
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700">Telecaller Name</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700">Mobile Number</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredTelecallers.map(t => (
                  <tr key={t.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 font-semibold text-slate-900 dark:text-white">{t.telecaller_name}</td>
                    <td className="p-4 font-mono text-slate-700 dark:text-slate-300">{t.tele_mobile}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedTelecaller(t)}
                        className="px-4 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-900/50 rounded-lg text-sm font-semibold transition-colors"
                      >
                        View Attendance
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredTelecallers.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-slate-500">No telecallers found matching your search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedTelecaller && (
        <AttendanceModal telecaller={selectedTelecaller} onClose={() => setSelectedTelecaller(null)} />
      )}
    </div>
  );
};

const AttendanceModal = ({ telecaller, onClose }) => {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [editingDay, setEditingDay] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['adminManualAttendance', telecaller.id, selectedMonth],
    queryFn: async () => {
      const res = await api.get(`/api/admin/attendance/manual/${telecaller.id}?month=${selectedMonth}`);
      return res.data;
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/api/admin/attendance/daily', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Attendance updated');
      queryClient.invalidateQueries(['adminManualAttendance', telecaller.id, selectedMonth]);
      setEditingDay(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update attendance');
    }
  });

  const handleDayClick = (dayRecord) => {
    if (dayRecord.status === 'FUTURE') return;
    setEditingDay({ ...dayRecord });
  };

  const handleSaveEdit = () => {
    if (!editingDay.status || editingDay.status === 'UNMARKED' || editingDay.status === 'FUTURE') {
      toast.error('Please select a valid status');
      return;
    }
    
    saveMutation.mutate({
      date: editingDay.date,
      records: [{
        telecaller_id: telecaller.id,
        attendance_status: editingDay.status,
        remark: editingDay.remark || ''
      }]
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1e1e2f] rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Attendance: {telecaller.telecaller_name}</h2>
            <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
              <span className="font-mono">{telecaller.tele_mobile}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Select Month:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            
            {data?.summary && (
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> <span className="font-semibold">{data.summary.full_days}</span> Full</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-500"></div> <span className="font-semibold">{data.summary.half_days}</span> Half</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-rose-500"></div> <span className="font-semibold">{data.summary.not_working_days}</span> NW</div>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="animate-spin text-emerald-600" size={32} />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
              {data?.days?.map((d) => {
                let bgClass = "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600";
                let textClass = "text-slate-700 dark:text-slate-300";
                
                if (d.status === 'FUTURE') {
                  bgClass = "bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 opacity-60";
                  textClass = "text-slate-400 dark:text-slate-500";
                } else if (d.status === 'FULL_DAY') {
                  bgClass = "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 hover:border-emerald-300";
                  textClass = "text-emerald-700 dark:text-emerald-400";
                } else if (d.status === 'HALF_DAY') {
                  bgClass = "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:border-blue-300";
                  textClass = "text-blue-700 dark:text-blue-400";
                } else if (d.status === 'NOT_WORKING') {
                  bgClass = "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 hover:border-rose-300";
                  textClass = "text-rose-700 dark:text-rose-400";
                }

                return (
                  <button
                    key={d.date}
                    onClick={() => handleDayClick(d)}
                    disabled={d.status === 'FUTURE'}
                    className={`flex flex-col p-3 rounded-xl border text-left transition-all ${bgClass} ${d.status !== 'FUTURE' ? 'cursor-pointer hover:shadow-md' : 'cursor-not-allowed'}`}
                  >
                    <div className={`font-bold text-lg mb-1 ${textClass}`}>{d.day}</div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80 mt-auto">
                      {d.status === 'UNMARKED' ? 'Not Marked' : d.status.replace('_', ' ')}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* Mini Edit Popover/Modal */}
      {editingDay && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="font-bold text-slate-800 dark:text-white">Edit: {editingDay.date}</h3>
              <button onClick={() => setEditingDay(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={20}/></button>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase">Status</label>
              <div className="grid grid-cols-3 gap-2">
                {['FULL_DAY', 'HALF_DAY', 'NOT_WORKING'].map(status => (
                  <button
                    key={status}
                    onClick={() => setEditingDay({ ...editingDay, status })}
                    className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all ${
                      editingDay.status === status
                        ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-700'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700'
                    }`}
                  >
                    {status.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase">Remark (Optional)</label>
              <input
                type="text"
                value={editingDay.remark || ''}
                onChange={(e) => setEditingDay({ ...editingDay, remark: e.target.value })}
                placeholder="Add note..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handleSaveEdit}
              disabled={saveMutation.isLoading}
              className="w-full flex justify-center items-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all disabled:opacity-50"
            >
              {saveMutation.isLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Save Attendance
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
