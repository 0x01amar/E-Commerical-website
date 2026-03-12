const rawBackendUrl =
	import.meta.env.BACKEND_URL ||
	import.meta.env.VITE_BACKEND_URL ||
	"https://e-commerical-website.onrender.com";

export const BACKEND_URL = rawBackendUrl.replace(/\/+$/, "");
export const API_BASE_URL = `/api`;

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

	// Normalize path
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;

	// If it's an uploads path, use relative URL (Vite proxy handles it)
	if (normalizedPath.startsWith("/uploads")) {
		return normalizedPath;
	}

	return `${BACKEND_URL}${normalizedPath}`;
};
