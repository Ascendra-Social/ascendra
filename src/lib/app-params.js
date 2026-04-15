const isNode = typeof window === 'undefined';
const windowObj = isNode ? { localStorage: new Map() } : window;
const storage = windowObj.localStorage;

const toSnakeCase = (str) => {
	return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

const getAppParamValue = (paramName, { defaultValue = undefined, removeFromUrl = false } = {}) => {
	if (isNode) {
		return defaultValue;
	}
	const storageKey = `base44_${toSnakeCase(paramName)}`;
	const urlParams = new URLSearchParams(window.location.search);
	const searchParam = urlParams.get(paramName);
	if (removeFromUrl) {
		urlParams.delete(paramName);
		const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ""
			}${window.location.hash}`;
		window.history.replaceState({}, document.title, newUrl);
	}
	if (searchParam) {
		storage.setItem(storageKey, searchParam);
		return searchParam;
	}
	if (defaultValue) {
		storage.setItem(storageKey, defaultValue);
		return defaultValue;
	}
	const storedValue = storage.getItem(storageKey);
	if (storedValue) {
		return storedValue;
	}
	return null;
}

const getServerUrl = () => {
	// Never read server_url from localStorage — it may have been poisoned by a preview session.
	// Only read from URL param or env var. Never cache it.
	if (isNode) return import.meta.env.VITE_BASE44_BACKEND_URL;
	const urlParams = new URLSearchParams(window.location.search);
	const fromUrl = urlParams.get('server_url');
	// Ignore if it's the app's own origin (preview sandbox injects this)
	if (fromUrl && fromUrl !== window.location.origin && !fromUrl.startsWith(window.location.origin + '/')) {
		return fromUrl;
	}
	return import.meta.env.VITE_BASE44_BACKEND_URL || 'https://api.base44.app';
};

const getAppParams = () => {
	if (getAppParamValue("clear_access_token") === 'true') {
		storage.removeItem('base44_access_token');
		storage.removeItem('token');
	}
	// Clear any cached bad server_url or login-looping from_url from localStorage
	storage.removeItem('base44_server_url');
	const cachedFromUrl = storage.getItem('base44_from_url');
	if (cachedFromUrl && cachedFromUrl.includes('/login')) {
		storage.removeItem('base44_from_url');
	}
	return {
		appId: getAppParamValue("app_id", { defaultValue: import.meta.env.VITE_BASE44_APP_ID }),
		serverUrl: getServerUrl(),
		token: getAppParamValue("access_token", { removeFromUrl: true }),
		fromUrl: getAppParamValue("from_url", { defaultValue: isNode ? '' : window.location.href }),
		functionsVersion: getAppParamValue("functions_version", { defaultValue: import.meta.env.VITE_BASE44_FUNCTIONS_VERSION }),
	}
}


export const appParams = {
	...getAppParams()
}