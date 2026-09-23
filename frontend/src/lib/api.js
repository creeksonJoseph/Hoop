import axios from "axios";

function requireEnv(name) {
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(`Missing required frontend environment variable: ${name}`);
  }
  return value;
}

export const BACKEND_URL = requireEnv("VITE_API_URL");
export const SUPABASE_URL = requireEnv("VITE_SUPABASE_URL");
export const SUPABASE_ANON_KEY = requireEnv("VITE_SUPABASE_ANON_KEY");

const api = axios.create({ baseURL: `${BACKEND_URL}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("hoop_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const activeInstagramAccount = localStorage.getItem("hoop_active_ig");
  if (activeInstagramAccount)
    config.headers["X-Hoop-Instagram-Account"] = activeInstagramAccount;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const url = err.config?.url || "";
      const isAuthRoute =
        url.includes("/auth/login") || url.includes("/auth/signup");
      const isMeRoute = url.includes("/auth/me");
      const detail = err.response?.data?.detail || err.response?.data?.message || "";
      const code = err.response?.data?.code || "";
      const currentPath = window.location.pathname;

      // Only wipe user token on genuine user JWT expiration (/auth/me or explicit UNAUTHORIZED session error)
      const isUserTokenExpired =
        isMeRoute ||
        (code === "UNAUTHORIZED" && detail.toLowerCase().includes("authentication required"));

      if (
        isUserTokenExpired &&
        !isAuthRoute &&
        currentPath !== "/login" &&
        currentPath !== "/signup"
      ) {
        localStorage.removeItem("hoop_token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  },
);

export default api;
