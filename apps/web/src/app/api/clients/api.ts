import { tokenStorage } from "@/app/utils/tokenStorage";
import axios from "axios";

export const apiUrl: string | undefined = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

if (!apiUrl) {
	throw new Error("VITE_API_URL is not configured.");
}

export const api = axios.create({
	baseURL: apiUrl,
	withCredentials: true,
	timeout: 30000,
	headers: {
		"ngrok-skip-browser-warning": "true",
	},
});

api.interceptors.request.use(async (config) => {
	const token = await tokenStorage.get();
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

api.interceptors.response.use(
	(response) => response,
	async (error) => {
		return Promise.reject(error);
	},
);
