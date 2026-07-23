import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/auth/Login';
import DashboardLayout from './layouts/DashboardLayout';

import AdminDashboard from './pages/admin/Dashboard';
import TelecallerList from './pages/admin/Telecallers';
import NewLeads from './pages/admin/NewLeads';
import BotAutoAssignment from './pages/admin/BotAutoAssignment';
import AdminLeadsHome from './pages/admin/AdminLeadsHome';
import AdminLeadsDashboard from './pages/admin/AdminLeadsDashboard';
import WorkingSheet from './pages/admin/WorkingSheet';
import Campaigns from './pages/admin/Campaigns';
import Reports from './pages/admin/Reports';
import Settings from './pages/admin/Settings';
import CallPulseDashboard from './pages/admin/CallPulseDashboard';
import TeleLogin from './pages/admin/TeleLogin';
import WhatsAppCenter from './pages/admin/WhatsAppCenter';

import TelecallerDashboard from './pages/telecaller/Dashboard';
import MyLeadsDashboard from './pages/telecaller/MyLeadsDashboard';
import LeadList from './pages/telecaller/LeadList';
import CallPulseStats from './pages/telecaller/CallPulseStats';
import TelecallerAnalytics from './pages/telecaller/Analytics';
import Impersonate from './pages/telecaller/Impersonate';
import BotPool from './pages/telecaller/BotPool';
import AdminBulkAdd from './pages/admin/AdminBulkAdd';
import MyClients from './pages/telecaller/MyClients';
import UntouchedLeads from './pages/telecaller/UntouchedLeads';
import UntouchedBotLeads from './pages/telecaller/UntouchedBotLeads';
import LastActivity from './pages/admin/LastActivity';
import Attendance from './pages/admin/Attendance';
import AdminFreeLeads from './pages/admin/FreeLeads';
import AdminClosedLeads from './pages/admin/ClosedLeads';
import AdminTransferLeads from './pages/admin/TransferLeads';
import AdminAnalytics from './pages/admin/Analytics';
import AdminGreetings from './pages/admin/Greetings';

import TelecallerFetchFreeLead from './pages/telecaller/FetchFreeLead';
import TelecallerTransferredLeads from './pages/telecaller/TransferredLeads';
import TelecallerFreeLeads from './pages/telecaller/FreeLeads';
const queryClient = new QueryClient();

const ProtectedRoute = ({ children, allowedRoles }) => {
  const isImpersonated = !!sessionStorage.getItem('impersonationToken');
  const rawToken = isImpersonated ? sessionStorage.getItem('impersonationToken') : localStorage.getItem('token');
  const rawRole = isImpersonated ? sessionStorage.getItem('impersonationRole') : localStorage.getItem('role');

  const token = rawToken || localStorage.getItem('token');
  const role = rawRole || localStorage.getItem('role');

  if (!token) return <Navigate to="/" replace />;
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />; // Or to a 403 page
  }
  return children;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/telecaller/impersonate" element={<Impersonate />} />
            
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'SUPERADMIN']}>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="telecallers" element={<TelecallerList />} />
              <Route path="bot-auto-assign" element={<BotAutoAssignment />} />
              <Route path="new-leads" element={<NewLeads />} />
              <Route path="leads" element={<AdminLeadsHome />} />
              <Route path="leads/:period" element={<AdminLeadsDashboard />} />
              <Route path="leads/working-sheet/:period/:type" element={<WorkingSheet />} />
              <Route path="leads/working-sheet/old/:year/:month/:type" element={<WorkingSheet />} />
              <Route path="campaigns" element={<Campaigns />} />
              <Route path="bulk-add" element={<AdminBulkAdd />} />
              <Route path="reports" element={<Reports />} />
              <Route path="attendance" element={<Attendance />} />
              <Route path="last-activity" element={<LastActivity />} />
              <Route path="settings" element={<Settings />} />
              <Route path="callpulse" element={<CallPulseDashboard />} />
              <Route path="tele-login" element={<TeleLogin />} />
              <Route path="free-leads" element={<AdminFreeLeads />} />
              <Route path="closed-leads" element={<AdminClosedLeads />} />
              <Route path="transfer-leads" element={<AdminTransferLeads />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="greetings" element={<AdminGreetings />} />
              <Route path="whatsapp-center" element={<WhatsAppCenter />} />
            </Route>

            <Route path="/telecaller" element={
              <ProtectedRoute allowedRoles={['TELECALLER']}>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<TelecallerDashboard />} />
              <Route path="bot-pool" element={<BotPool />} />
              <Route path="my-clients" element={<MyClients />} />
              <Route path="untouched-leads" element={<UntouchedLeads />} />
              <Route path="untouched-bot-leads" element={<UntouchedBotLeads />} />
              <Route path="leads" element={<Navigate to="current" replace />} />
              <Route path="leads/:period" element={<MyLeadsDashboard />} />
              <Route path="leads/list/:period/:type" element={<LeadList />} />
              <Route path="leads/list/old/:year/:month/:type" element={<LeadList />} />
              <Route path="analytics" element={<TelecallerAnalytics />} />
              <Route path="callpulse" element={<CallPulseStats />} />
              <Route path="fetch-free-lead" element={<TelecallerFetchFreeLead />} />
              <Route path="free-leads" element={<TelecallerFreeLeads />} />
              <Route path="transferred-leads" element={<TelecallerTransferredLeads />} />
            </Route>

          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
