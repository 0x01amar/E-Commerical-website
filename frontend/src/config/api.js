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

const localBackendHost = isLikelyLocalHost
	? (currentHostname || "localhost")
	: "localhost";

export const LOCAL_BACKEND_URL = `http://${localBackendHost}:5000`;

const fallbackBackendUrl = isLikelyLocalHost
	? LOCAL_BACKEND_URL
	: (configuredBackendUrl || currentOrigin);

export const BACKEND_URL_SOURCE = configuredBackendUrl
	? (isLikelyLocalHost ? "local-preferred-over-env" : "env")
	: isLikelyLocalHost
		? "local-default"
		: "current-origin-default";

export const BACKEND_URL = String(fallbackBackendUrl || "").replace(/\/+$/, "");

const useProxyApi = Boolean(import.meta.env.DEV) || isLikelyLocalHost;

export const API_BASE_URL = useProxyApi
	? "/api"
	: `${BACKEND_URL}/api`;

export const apiUrl = (path = "") => {
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	return `${API_BASE_URL}${normalizedPath}`;
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
