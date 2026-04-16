import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, serverUrl, token, functionsVersion } = appParams;

const BASE44_API_URL = 'https://api.base44.app';

// Sanitize serverUrl: if it points to the app's own origin (preview sandbox or live app domain),
// it cannot serve the Base44 API — fall back to the real API server.
const isBadServerUrl = !serverUrl
  || (typeof window !== 'undefined' && (
    serverUrl === window.location.origin
    || serverUrl.startsWith(window.location.origin + '/')
    || serverUrl.includes('preview-sandbox')
  ));

const resolvedServerUrl = isBadServerUrl ? BASE44_API_URL : serverUrl;

//Create a client with authentication required
export const base44 = createClient({
  appId,
  serverUrl: resolvedServerUrl,
  token,
  functionsVersion,
  requiresAuth: false
});