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
        url.includes("/auth/login") ||
        url.includes("/auth/signup") ||
        url.includes("/auth/google");
      const isMeRoute = url.includes("/auth/me");
      const detail =
        err.response?.data?.detail || err.response?.data?.message || "";
      const code = err.response?.data?.code || "";
      const currentPath = window.location.pathname;
      const currentSearch = window.location.search || "";
      const hasSessionToken = Boolean(localStorage.getItem("hoop_token"));

      const loginMessage = detail.toLowerCase();
      const hasSessionExpiry =
        isMeRoute ||
        code === "TOKEN_EXPIRED" ||
        code === "INVALID_TOKEN" ||
        code === "SESSION_EXPIRED" ||
        (hasSessionToken &&
          loginMessage.includes("authentication required") &&
          loginMessage.includes("token"));

      if (
        hasSessionExpiry &&
        !isAuthRoute &&
        currentPath !== "/login" &&
        currentPath !== "/signup" &&
        currentPath !== "/forgot-password"
      ) {
        localStorage.removeItem("hoop_token");
        sessionStorage.setItem(
          "hoop_redirect_after_login",
          `${currentPath}${currentSearch}`,
        );
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  },
);

export default api;
