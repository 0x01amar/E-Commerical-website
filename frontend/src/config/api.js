const rawBackendUrl =
	import.meta.env.BACKEND_URL ||
	import.meta.env.VITE_BACKEND_URL ||
	"https://e-commerical-website.onrender.com";

export const BACKEND_URL = rawBackendUrl.replace(/\/+$/, "");

const isLocalDevelopment =
	typeof window !== "undefined" &&
	["localhost", "127.0.0.1"].includes(window.location.hostname);

export const API_BASE_URL = isLocalDevelopment
	? "/api"
	: `${BACKEND_URL}/api`;

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

	// In local development, let Vite proxy handle uploaded assets.
	if (isLocalDevelopment && normalizedPath.startsWith("/uploads")) {
		return normalizedPath;
	}

	return `${BACKEND_URL}${normalizedPath}`;
};
