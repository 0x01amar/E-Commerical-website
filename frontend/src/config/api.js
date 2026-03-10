const rawBackendUrl =
	import.meta.env.BACKEND_URL ||
	import.meta.env.VITE_BACKEND_URL ||
	"http://localhost:5000";

export const BACKEND_URL = rawBackendUrl.replace(/\/+$/, "");
export const API_BASE_URL = `${BACKEND_URL}/api`;

export const apiUrl = (path = "") => {
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	return `${API_BASE_URL}${normalizedPath}`;
};

export const mediaUrl = (path = "") => {
	if (!path) {
		return "";
	}

	if (path.startsWith("http://") || path.startsWith("https://")) {
		return path;
	}

	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	return `${BACKEND_URL}${normalizedPath}`;
};
