import axios from "axios";

const BASE_URL =
  import.meta.env.VITE_API_URL || "https://hoop-4thy.onrender.com";

const api = axios.create({ baseURL: `${BASE_URL}/api` });

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
      const isAuthRoute = url.includes("/auth/login") || url.includes("/auth/signup");
      const detail = err.response?.data?.detail || "";
      const currentPath = window.location.pathname;

      // Do not wipe token or reload if this is a login/signup attempt, or if user is already on auth pages, or for Zernio key errors
      if (!isAuthRoute && currentPath !== "/login" && currentPath !== "/signup" && !detail.toLowerCase().includes("zernio")) {
        localStorage.removeItem("hoop_token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  },
);

export default api;
