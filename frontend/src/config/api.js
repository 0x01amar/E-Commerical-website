const configuredBackendUrl =
	import.meta.env.VITE_BACKEND_URL ||
	"";

const currentHostname = typeof window !== "undefined" ? window.location.hostname : "";
const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";
const isLikelyLocalHost =
	["localhost", "127.0.0.1", "0.0.0.0"].includes(currentHostname) ||
	/^192\.168\./.test(currentHostname) ||
	/^10\./.test(currentHostname) ||
	/^172\.(1[6-9]|2\d|3[0-1])\./.test(currentHostname);

export const IS_LOCAL_CLIENT = isLikelyLocalHost;

const trimmedConfiguredBackendUrl = String(configuredBackendUrl || "").trim().replace(/\/+$/, "");
const configuredBackendLooksLocal = /^(https?:\/\/)?(localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.)/i
	.test(trimmedConfiguredBackendUrl);

const safeConfiguredBackendUrl = (!isLikelyLocalHost && configuredBackendLooksLocal)
	? ""
	: trimmedConfiguredBackendUrl;

const localBackendHost = isLikelyLocalHost
	? (currentHostname || "localhost")
	: "localhost";

export const LOCAL_BACKEND_URL = `http://${localBackendHost}:5000`;

const fallbackBackendUrl = isLikelyLocalHost
	? LOCAL_BACKEND_URL
	: (safeConfiguredBackendUrl || currentOrigin);

export const BACKEND_URL_SOURCE = safeConfiguredBackendUrl
	? (isLikelyLocalHost ? "local-preferred-over-env" : "env")
	: (trimmedConfiguredBackendUrl && !isLikelyLocalHost && configuredBackendLooksLocal)
		? "ignored-local-env-on-remote"
	: isLikelyLocalHost
		? "local-default"
		: "current-origin-default";

export const BACKEND_URL = String(fallbackBackendUrl || "").replace(/\/+$/, "");

const useProxyApi = Boolean(import.meta.env.DEV) || isLikelyLocalHost;

export const API_BASE_URL = useProxyApi
	? "/api"
	: `${BACKEND_URL}/api`;

const normalizeApiPath = (path = "") => (path.startsWith("/") ? path : `/${path}`);

const buildAbsoluteApiUrl = (baseUrl = "", path = "") => {
	const normalizedBase = String(baseUrl || "").replace(/\/+$/, "");
	const normalizedPath = normalizeApiPath(path);
	return `${normalizedBase}/api${normalizedPath}`;
};

export const apiUrl = (path = "") => {
	const normalizedPath = normalizeApiPath(path);
	return `${API_BASE_URL}${normalizedPath}`;
};

const isAbsoluteUrl = (value = "") => /^(https?:)?\/\//i.test(String(value || ""));

export const isLikelyNetworkError = (error) => {
	if (!error) {
		return false;
	}

	const message = String(error?.message || error).toLowerCase();

	if (error instanceof TypeError && /failed to fetch|networkerror|load failed|fetch failed/i.test(message)) {
		return true;
	}

	return /failed to fetch|networkerror|load failed|fetch failed|network request failed/i.test(message);
};

export const resolveApiErrorMessage = (
	error,
	fallbackMessage = "Request failed",
	networkMessage = "Failed to connect to backend. Please check your internet/backend server. If you use ad-block/privacy extensions, allow API requests and try again."
) => {
	if (isLikelyNetworkError(error)) {
		return networkMessage;
	}

	const explicitMessage = String(error?.message || "").trim();
	return explicitMessage || fallbackMessage;
};

export const parseApiResponseJson = async (response) => {
	const rawText = await response.text();

	if (!rawText) {
		return {};
	}

	try {
		return JSON.parse(rawText);
	} catch {
		return {
			message: rawText
				.replace(/<[^>]*>/g, " ")
				.replace(/\s+/g, " ")
				.trim()
				.slice(0, 300) || "Server returned an invalid response",
		};
	}
};

export const apiFetch = async (path, options = {}) => {
	if (isAbsoluteUrl(path)) {
		return fetch(path, options);
	}

	const fetchOptions = { ...options };
	if (fetchOptions.body && !fetchOptions.headers?.["Content-Type"] && !(fetchOptions.body instanceof FormData)) {
		fetchOptions.headers = {
			...fetchOptions.headers,
			"Content-Type": "application/json",
		};
	}

	const normalizedPath = normalizeApiPath(path);
	const primaryUrl = apiUrl(normalizedPath);
	const backendUrl = buildAbsoluteApiUrl(BACKEND_URL, normalizedPath);
	const localUrl = buildAbsoluteApiUrl(LOCAL_BACKEND_URL, normalizedPath);

	const candidates = Array.from(new Set([
		primaryUrl,
		backendUrl,
		isLikelyLocalHost ? localUrl : "",
	].filter(Boolean)));

	let lastError = null;

	for (const url of candidates) {
		try {
			return await fetch(url, fetchOptions);
		} catch (error) {
			lastError = error;
		}
	}

	throw lastError || new TypeError("Failed to fetch");
};

export const apiFetchJson = async (path, options = {}) => {
	const response = await apiFetch(path, options);
	const data = await parseApiResponseJson(response);

	return {
		response,
		data,
	};
};

const normalizeMediaPath = (value = "") => {
	const trimmedValue = String(value || "").trim();

	if (!trimmedValue) {
		return "";
	}

	if (/^(https?:|data:|blob:)/i.test(trimmedValue)) {
		return trimmedValue;
	}

	const slashNormalizedValue = trimmedValue.replace(/\\+/g, "/");
	const uploadsMatch = slashNormalizedValue.match(/(?:^|\/)(uploads\/.+)$/i);

	if (uploadsMatch?.[1]) {
		return `/${uploadsMatch[1]}`.replace(/\/{2,}/g, "/");
	}

	const withoutLeadingSlashes = slashNormalizedValue.replace(/^\/+/, "");
	const prefixedPath = withoutLeadingSlashes.toLowerCase().startsWith("uploads/")
		? `/${withoutLeadingSlashes}`
		: `/uploads/${withoutLeadingSlashes}`;

	return prefixedPath.replace(/\/{2,}/g, "/");
};

export const mediaUrl = (path = "") => {
	const normalizedPath = normalizeMediaPath(path);

	if (!normalizedPath) {
		return "";
	}

	if (/^(https?:|data:|blob:)/i.test(normalizedPath)) {
		return normalizedPath;
	}

	// In local development, let Vite proxy handle uploaded assets.
	if (useProxyApi && normalizedPath.startsWith("/uploads")) {
		return normalizedPath;
	}

	return `${BACKEND_URL}${normalizedPath}`;
};
