import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';

const BASE44_API_URL = 'https://api.base44.app';

/** Fetch public app settings without relying on internal SDK dist paths. */
async function fetchPublicSettings(appId, serverUrl) {
  // Sanitize serverUrl — preview sandbox or app own origin can't serve the API
  const isBadUrl = !serverUrl
    || serverUrl === window.location.origin
    || serverUrl.startsWith(window.location.origin + '/')
    || serverUrl.includes('preview-sandbox');
  const apiBase = isBadUrl ? BASE44_API_URL : serverUrl;
  const url = `${apiBase}/api/apps/public/prod/public-settings/by-id/${appId}`;
  const res = await fetch(url, {
    headers: { 'X-App-Id': appId },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  const retryTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    checkAppState();

    return () => {
      isMountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const safeSetState = (setter) => {
    if (isMountedRef.current) setter();
  };

  const checkUserAuth = useCallback(async () => {
    try {
      safeSetState(() => {
        setIsLoadingAuth(true);
        setAuthError(null);
      });

      const currentUser = await base44.auth.me();

      safeSetState(() => {
        setUser(currentUser);
        setIsAuthenticated(true);
        setIsLoadingAuth(false);
        setAuthError(null);
      });
    } catch (error) {
      safeSetState(() => {
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
        setUser(null);

        if (error.status === 401) {
          setAuthError({
            type: 'auth_expired',
            message: 'Session expired. Please log in again.',
            retryable: false,
          });
        } else if (error.status === 403) {
          setAuthError({
            type: 'auth_forbidden',
            message: 'Access forbidden',
            retryable: false,
          });
        } else if (!error.status) {
          setAuthError({
            type: 'network',
            message: 'Network error during authentication',
            retryable: true,
          });
        } else {
          setAuthError({
            type: 'auth_unknown',
            message: error.message || 'Authentication failed',
            retryable: false,
          });
        }
      });
    }
  }, []);

  const checkAppState = useCallback(async () => {
    try {
      safeSetState(() => {
        setIsLoadingPublicSettings(true);
        setAuthError(null);
      });

      const publicSettings = await fetchPublicSettings(appParams.appId, appParams.serverUrl);

      safeSetState(() => {
        setAppPublicSettings(publicSettings);
      });

      if (appParams.token) {
        await checkUserAuth();
      } else {
        safeSetState(() => {
          setUser(null);
          setIsAuthenticated(false);
          setIsLoadingAuth(false);
        });
      }

      safeSetState(() => {
        setIsLoadingPublicSettings(false);
        setAuthError(null);
      });
    } catch (appError) {
      safeSetState(() => {
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;

          if (reason === 'auth_required') {
            // Set the error type so App.jsx can decide whether to redirect
            // App.jsx will NOT redirect if already on login page
            setAuthError({ type: 'auth_required', message: 'Authentication required' });
            setIsLoadingPublicSettings(false);
            setIsLoadingAuth(false);
            return;
          } else if (reason === 'user_not_registered') {
            setAuthError({ type: 'user_not_registered', message: 'User not registered for this app' });
          } else {
            setAuthError({ type: reason, message: appError.message });
          }
        } else {
          const isNetworkError =
            !appError.status &&
            (
              appError.message?.includes('network') ||
              appError.message?.includes('fetch') ||
              appError.code === 'ECONNREFUSED' ||
              appError.code === 'ETIMEDOUT'
            );

          if (isNetworkError) {
            setAuthError({
              type: 'network',
              message: 'Network connection failed. Retrying...',
              retryable: true,
            });

            retryTimeoutRef.current = setTimeout(() => {
              if (isMountedRef.current) checkAppState();
            }, 2000);
          } else {
            setAuthError({
              type: 'unknown',
              message: appError.message || 'Failed to load app',
              retryable: false,
            });
          }
        }

        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      });
    }
  }, [checkUserAuth]);

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    
    if (shouldRedirect) {
      // Use the SDK's logout method which handles token cleanup and redirect
      base44.auth.logout(window.location.href);
    } else {
      // Just remove the token without redirect
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    const isLoginPage = window.location.pathname.includes('/login') || window.location.href.includes('/login');
    if (isLoginPage) return; // Safety guard — never redirect if already on login
    // Pass only the clean origin+path as from_url, never any query string that could nest from_url
    const cleanFromUrl = window.location.origin + window.location.pathname;
    base44.auth.redirectToLogin(cleanFromUrl);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};