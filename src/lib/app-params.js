const isNode = typeof window === 'undefined';

const BASE44_API_URL = 'https://api.base44.app';

const getFromUrl = () => {
	if (isNode) return '';
	const urlParams = new URLSearchParams(window.location.search);
	const fromUrl = urlParams.get('from_url');
	// Only return from_url if it's NOT a login page (prevents redirect loops)
	if (fromUrl && !fromUrl.includes('/login')) {
		return fromUrl;
	}
	return '';
};

const getToken = () => {
	if (isNode) return null;
	const urlParams = new URLSearchParams(window.location.search);
	const tokenFromUrl = urlParams.get('access_token');
	if (tokenFromUrl) {
		// Remove from URL to keep it clean
		urlParams.delete('access_token');
		const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ''}${window.location.hash}`;
		window.history.replaceState({}, document.title, newUrl);
		// Cache it
		localStorage.setItem('base44_access_token', tokenFromUrl);
		return tokenFromUrl;
	}
	return localStorage.getItem('base44_access_token') || null;
};

const getAppId = () => {
	if (isNode) return import.meta.env.VITE_BASE44_APP_ID;
	const urlParams = new URLSearchParams(window.location.search);
	const fromUrl = urlParams.get('app_id');
	if (fromUrl) {
		localStorage.setItem('base44_app_id', fromUrl);
		return fromUrl;
	}
	return localStorage.getItem('base44_app_id') || import.meta.env.VITE_BASE44_APP_ID;
};

const getServerUrl = () => {
	if (isNode) return import.meta.env.VITE_BASE44_BACKEND_URL || BASE44_API_URL;
	const urlParams = new URLSearchParams(window.location.search);
	const fromUrl = urlParams.get('server_url');
	// Ignore if it points to the app's own origin (preview sandbox injects this)
	if (
		fromUrl &&
		fromUrl !== window.location.origin &&
		!fromUrl.startsWith(window.location.origin + '/') &&
		!fromUrl.includes('preview-sandbox')
	) {
		return fromUrl;
	}
	return import.meta.env.VITE_BASE44_BACKEND_URL || BASE44_API_URL;
};

const getFunctionsVersion = () => {
	if (isNode) return import.meta.env.VITE_BASE44_FUNCTIONS_VERSION;
	const urlParams = new URLSearchParams(window.location.search);
	return urlParams.get('functions_version') || import.meta.env.VITE_BASE44_FUNCTIONS_VERSION;
};

// Clean up any stale/poisoned cached values
if (!isNode) {
	localStorage.removeItem('base44_server_url');
	const cachedFromUrl = localStorage.getItem('base44_from_url');
	if (cachedFromUrl && cachedFromUrl.includes('/login')) {
		localStorage.removeItem('base44_from_url');
	}
}

export const appParams = {
	appId: getAppId(),
	serverUrl: getServerUrl(),
	token: getToken(),
	fromUrl: getFromUrl(),
	functionsVersion: getFunctionsVersion(),
};