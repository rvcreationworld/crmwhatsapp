import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Loader2, X, User, Phone } from 'lucide-react';
import api from '../api/axios';
import LeadDetailsModal from './LeadDetailsModal';

const GlobalSearch = ({ role }) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  
  const searchRef = useRef(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);
    return () => clearTimeout(handler);
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data: results, isLoading } = useQuery({
    queryKey: ['globalSearch', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return [];
      const res = await api.get(`/api/search?q=${debouncedQuery}`);
      return res.data;
    },
    enabled: !!debouncedQuery && debouncedQuery.length >= 2,
  });

  const handleLeadClick = (lead) => {
    setSelectedLead(lead);
    setIsOpen(false);
    setQuery('');
    setDebouncedQuery('');
  };

  return (
    <div className="hidden md:flex items-center relative" ref={searchRef}>
      <Search className="absolute left-3 text-slate-400 transition-colors z-10" size={18} />
      <input 
        type="text" 
        placeholder="Search leads..." 
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (e.target.value.length >= 2) setIsOpen(true);
          else setIsOpen(false);
        }}
        onFocus={() => {
          if (query.length >= 2) setIsOpen(true);
        }}
        className="pl-10 pr-10 py-2 bg-slate-100 dark:bg-slate-800/50 border-none rounded-full text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:text-slate-200 transition-all"
      />
      {query && (
        <button 
          onClick={() => { setQuery(''); setIsOpen(false); }}
          className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 z-10"
        >
          <X size={16} />
        </button>
      )}

      {isOpen && debouncedQuery.length >= 2 && (
        <div className="absolute top-full left-0 mt-2 w-[400px] bg-white dark:bg-[#1e1e2f] border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col max-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : results && results.length > 0 ? (
            <div className="overflow-y-auto custom-scrollbar">
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {results.map(lead => (
                  <li 
                    key={`${lead.type}-${lead.id}`}
                    onClick={() => handleLeadClick(lead)}
                    className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-slate-900 dark:text-white truncate">{lead.lead_name}</h4>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${lead.type === 'bot' ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'}`}>
                            {lead.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                          <Phone size={12} />
                          <span>{lead.lead_contact}</span>
                        </div>
                        {role === 'ADMIN' && (
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                            <User size={12} />
                            <span className="truncate">{lead.telecaller_name}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-xs font-medium px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">{lead.status1 || 'None'}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
              No results found for "{debouncedQuery}"
            </div>
          )}
        </div>
      )}

      {selectedLead && (
        <LeadDetailsModal
          isOpen={!!selectedLead}
          onClose={() => setSelectedLead(null)}
          lead={selectedLead}
          type={selectedLead.type}
          userRole={role}
        />
      )}
    </div>
  );
};

export default GlobalSearch;
