import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import WalletProvider from '@/components/wallet/WalletProvider';
import AuditLogs from '@/pages/AuditLogs';
import { useEffect } from 'react';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const {
    isLoadingAuth,
    isLoadingPublicSettings,
    authError,
    navigateToLogin,
  } = useAuth();

  useEffect(() => {
    if (!authError) return;

    const isLoginPage = window.location.pathname.includes('/login') || window.location.href.includes('/login');
    if (isLoginPage) return; // Never redirect if already on login — breaks the loop

    // auth_required is handled by the platform itself (it shows the login page).
    // Only redirect for expired/forbidden sessions where the user was previously logged in.
    if (
      authError.type === 'auth_expired' ||
      authError.type === 'auth_forbidden'
    ) {
      navigateToLogin();
    }
  }, [authError, navigateToLogin]);

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  if (
    authError?.type === 'network' ||
    authError?.type === 'auth_unknown' ||
    authError?.type === 'unknown'
  ) {
    return (
      <div className="fixed inset-0 flex items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border bg-white p-6 text-center shadow">
          <h2 className="text-lg font-semibold mb-2">Unable to load the app</h2>
          <p className="text-sm text-slate-600 mb-4">
            {authError.message || 'Something went wrong while checking authentication.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-slate-900 px-4 py-2 text-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        }
      />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route
        path="/AuditLogs"
        element={
          <LayoutWrapper currentPageName="AuditLogs">
            <AuditLogs />
          </LayoutWrapper>
        }
      />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <WalletProvider>
          <Router>
            <NavigationTracker />
            <AuthenticatedApp />
          </Router>
          <Toaster />
          <VisualEditAgent />
        </WalletProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App