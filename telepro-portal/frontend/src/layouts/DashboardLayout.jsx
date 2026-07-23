import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, LayoutDashboard, Users, UserSquare2, FileText, Database, BarChart3, Menu, Settings, Moon, Sun, Bell, Search, ChevronLeft, ChevronRight, Target, PhoneCall, History, TrendingUp, UploadCloud, UserCheck, Activity, Calendar, Archive, ArrowRightLeft, Megaphone, ChevronDown, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../components/ui/Skeleton';
import GlobalSearch from '../components/GlobalSearch';

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  
  const isImpersonated = !!sessionStorage.getItem('impersonationToken');
  
  const rawRole = isImpersonated ? sessionStorage.getItem('impersonationRole') : localStorage.getItem('role');
  const rawUserStr = isImpersonated ? sessionStorage.getItem('impersonationUser') : localStorage.getItem('user');
  
  const role = rawRole || localStorage.getItem('role');
  const userStr = rawUserStr || localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [adminControlsOpen, setAdminControlsOpen] = useState(false);

  // Close sidebar on mobile when route changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('confetti_')) {
        sessionStorage.removeItem(key);
      }
    });

    navigate('/');
  };

  const adminTopLinks = [
    { name: 'Dashboard', path: '/admin', icon: <LayoutDashboard size={20} /> },
    { name: 'New Leads', path: '/admin/new-leads', icon: <Database size={20} /> },
    { name: 'CallPulse Agent', path: '/admin/callpulse', icon: <PhoneCall size={20} /> },
    { name: 'TeleLogin', path: '/admin/tele-login', icon: <UserSquare2 size={20} /> },
    { name: 'Last Activity', path: '/admin/last-activity', icon: <Activity size={20} /> },
  ];

  const adminControlLinks = [
    { name: 'Greetings', path: '/admin/greetings', icon: <Megaphone size={20} /> },
    { name: 'Leads Base', path: '/admin/leads', icon: <FileText size={20} /> },
    { name: 'Bulk Add', path: '/admin/bulk-add', icon: <UploadCloud size={20} /> },
    { name: 'Telecallers', path: '/admin/telecallers', icon: <Users size={20} /> },
    { name: 'Meta Campaigns', path: '/admin/campaigns', icon: <Target size={20} /> },
    { name: 'Attendance', path: '/admin/attendance', icon: <Calendar size={20} /> },
    { name: 'Free Leads', path: '/admin/free-leads', icon: <Database size={20} /> },
    { name: 'Closed Leads', path: '/admin/closed-leads', icon: <Archive size={20} /> },
    { name: 'Transfer Leads', path: '/admin/transfer-leads', icon: <ArrowRightLeft size={20} /> },
    { name: 'Settings', path: '/admin/settings', icon: <Settings size={20} /> },
    { name: 'Reports', path: '/admin/reports', icon: <FileText size={20} /> },
    { name: 'Analytics', path: '/admin/analytics', icon: <BarChart3 size={20} /> },
  ];

  const telecallerLinks = [
    { name: 'Dashboard', path: '/telecaller', icon: <LayoutDashboard size={20} /> },
    { name: 'Untouched Leads', path: '/telecaller/untouched-leads', icon: <Target size={20} /> },
    { name: 'Fetch Bot Lead', path: '/telecaller/bot-pool', icon: <Database size={20} /> },
    { name: 'Fetch Free Lead', path: '/telecaller/fetch-free-lead', icon: <Database size={20} /> },
    { name: 'Current Leads', path: '/telecaller/leads/current', icon: <UserSquare2 size={20} /> },
    { name: 'Past Month Leads', path: '/telecaller/leads/past', icon: <TrendingUp size={20} /> },
    { name: 'Old Leads', path: '/telecaller/leads/old', icon: <History size={20} /> },
    { name: 'Ready to KYC', path: '/telecaller/leads/kyc', icon: <FileText size={20} /> },
    { name: 'Analytics', path: '/telecaller/analytics', icon: <BarChart3 size={20} /> },
    { name: 'Call Stats', path: '/telecaller/callpulse', icon: <PhoneCall size={20} /> },
    { name: 'My Clients', path: '/telecaller/my-clients', icon: <UserCheck size={20} /> },
  ];

  const renderLink = (link, isSubmenu = false) => {
    const isActive = location.pathname === link.path;
    return (
      <li key={link.path}>
        <Link
          to={link.path}
          className={cn(
            "flex items-center gap-3 rounded-lg transition-all duration-200 group relative",
            sidebarCollapsed ? "justify-center p-3" : "px-3 py-2.5",
            isSubmenu && !sidebarCollapsed ? "ml-4 pl-3 border-l border-white/10" : "",
            isActive 
              ? "bg-indigo-600/10 text-indigo-400 font-semibold" 
              : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
          )}
          title={sidebarCollapsed ? link.name : undefined}
        >
          <div className={cn(
            "transition-transform duration-200 shrink-0", 
            isActive ? "scale-110 text-indigo-400" : "group-hover:scale-110"
          )}>
            {link.icon}
          </div>
          {!sidebarCollapsed && (
            <span className={cn("truncate", isSubmenu ? "text-sm font-medium" : "")}>{link.name}</span>
          )}
          
          {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
          )}
        </Link>
      </li>
    );
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 overflow-hidden font-sans selection:bg-indigo-500/30">
      
      {/* Impersonation Banner */}
      {isImpersonated && (
        <div className="absolute top-0 left-0 right-0 z-[100] bg-indigo-600 text-white text-xs font-bold text-center py-1.5 shadow-md flex items-center justify-center gap-2">
          <span>Viewing as Telecaller: {user?.username}</span>
          <span className="opacity-75 font-normal">|</span>
          <span className="opacity-90">Impersonated by {user?.impersonated_by_admin_name || 'Admin'}</span>
          <button 
            onClick={() => {
              sessionStorage.removeItem('impersonationToken');
              sessionStorage.removeItem('impersonationRole');
              sessionStorage.removeItem('impersonationUser');
              window.close(); // Try to close the tab
            }}
            className="ml-4 underline hover:text-indigo-200"
          >
            Close Session
          </button>
        </div>
      )}

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-[#1e1e2f] dark:bg-[#151521] border-r border-white/5 shadow-xl transition-all duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          sidebarCollapsed ? "w-20" : "w-64"
        )}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            {!sidebarCollapsed && (
              <h1 className="text-lg font-bold text-white tracking-wide whitespace-nowrap transition-opacity">
                CRM <span className="text-indigo-400 font-medium">{role === 'ADMIN' ? 'Pro' : 'Agent'}</span>
              </h1>
            )}
          </div>
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-6 custom-scrollbar">
          <ul className="space-y-1.5 px-3">
            {role === 'ADMIN' ? (
              <>
                {adminTopLinks.map(link => renderLink(link))}
                
                <li className="pt-2 mt-2 border-t border-white/5">
                  <button
                    onClick={() => {
                      if (sidebarCollapsed) setSidebarCollapsed(false);
                      setAdminControlsOpen(!adminControlsOpen);
                    }}
                    className={cn(
                      "flex items-center gap-3 w-full rounded-lg transition-all duration-200 group relative text-left",
                      sidebarCollapsed ? "justify-center p-3" : "px-3 py-2.5",
                      "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    )}
                    title={sidebarCollapsed ? "Admin Controls" : undefined}
                  >
                    <div className="transition-transform duration-200 group-hover:scale-110 shrink-0 text-amber-500/80 group-hover:text-amber-400">
                      <Shield size={20} />
                    </div>
                    {!sidebarCollapsed && (
                      <>
                        <span className="truncate flex-1 font-semibold text-sm tracking-wide text-slate-300">Admin Controls</span>
                        <ChevronDown size={16} className={cn("transition-transform duration-200", adminControlsOpen ? "rotate-180" : "")} />
                      </>
                    )}
                  </button>
                </li>
                
                {adminControlsOpen && !sidebarCollapsed && adminControlLinks.map(link => renderLink(link, true))}
                {adminControlsOpen && sidebarCollapsed && adminControlLinks.map(link => renderLink(link, false))}
              </>
            ) : (
              telecallerLinks.map(link => renderLink(link))
            )}
          </ul>
        </nav>

        <div className="p-4 border-t border-white/10 shrink-0">
          <button
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-3 w-full rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200",
              sidebarCollapsed ? "justify-center p-3" : "px-3 py-2.5"
            )}
            title={sidebarCollapsed ? "Logout" : undefined}
          >
            <LogOut size={20} className="shrink-0" />
            {!sidebarCollapsed && <span className="font-medium">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* Top Navigation */}
        <header className="h-16 bg-white/70 dark:bg-[#1e1e2f]/70 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-6 shrink-0 z-20 transition-colors duration-200 sticky top-0">
          
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            
            {/* Global Search Placeholder */}
            <GlobalSearch role={role} />
          </div>
          
          <div className="flex items-center gap-3 sm:gap-5">
            {/* Dark Mode Toggle */}
            <button 
              onClick={toggleTheme}
              className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              aria-label="Toggle Dark Mode"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 hidden sm:block" />

            {/* User Profile */}
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight">
                  {user?.username}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {role === 'ADMIN' ? 'Administrator' : 'Agent'}
                </p>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white font-bold tracking-wider ring-2 ring-white dark:ring-[#1e1e2f] transition-transform group-hover:scale-105">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 relative">
          <Outlet />
        </div>

      </main>
    </div>
  );
};

export default DashboardLayout;
