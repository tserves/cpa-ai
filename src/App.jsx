import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Clients from '@/pages/Clients';
import TaxFilings from '@/pages/TaxFilings';
import Tasks from '@/pages/Tasks';
import Documents from '@/pages/Documents';
import AIAdvisor from '@/pages/AIAdvisor';
import Appointments from '@/pages/Appointments';
import QuickBooksImport from '@/pages/QuickBooksImport';
import StaffManagement from '@/pages/StaffManagement';
import TimeTracker from '@/pages/TimeTracker';
import ClientNotes from '@/pages/ClientNotes';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/filings" element={<TaxFilings />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/ai-advisor" element={<AIAdvisor />} />
        <Route path="/quickbooks-import" element={<QuickBooksImport />} />
        <Route path="/staff" element={<StaffManagement />} />
        <Route path="/time-tracker" element={<TimeTracker />} />
        <Route path="/client-notes" element={<ClientNotes />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App