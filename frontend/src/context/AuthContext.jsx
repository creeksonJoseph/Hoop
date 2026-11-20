import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import api from "../lib/api";
import { clearDMsCache } from "../hooks/useDMs";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // Never restore a user without a session token - that would allow a stale
    // localStorage profile to render protected routes after logout.
    if (!localStorage.getItem("hoop_token")) return null;
    try {
      const saved = localStorage.getItem("hoop_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  // When a token exists we must confirm the session via /auth/me before
  // trusting a cached profile, so start in a loading/restoring state.
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem("hoop_token")));
  const [activeIgUsername, setActiveIgUsername] = useState(
    () => localStorage.getItem("hoop_active_ig") || null,
  );
  // Monotonically increasing counter - incremented on every account switch.
  // Hooks that depend on this will refetch when the active account changes.
  const [accountVersion, setAccountVersion] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("hoop_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me")
      .then((r) => {
        setUser(r.data);
        localStorage.setItem("hoop_user", JSON.stringify(r.data));
      })
      .catch(() => {
        localStorage.removeItem("hoop_token");
        localStorage.removeItem("hoop_user");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = (token, userData) => {
    localStorage.setItem("hoop_token", token);
    if (userData) {
      localStorage.setItem("hoop_user", JSON.stringify(userData));
    }
    setUser(userData);
  };

  const refreshUser = useCallback(async () => {
    const { data } = await api.get("/auth/me");
    setUser(data);
    localStorage.setItem("hoop_user", JSON.stringify(data));
    return data;
  }, []);

  // Optimistic local update used right after the backend confirms a key was
  // saved, so route guards do not bounce the user back to onboarding while a
  // /auth/me refresh is in flight (or temporarily unavailable).
  const markOnboarded = useCallback(() => {
    setUser((current) => {
      if (!current) return current;
      const updated = {
        ...current,
        onboarded: true,
        has_api_key: true,
      };
      localStorage.setItem("hoop_user", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const setActiveAccount = useCallback((username) => {
    const normalized = username?.replace(/^@/, "").toLowerCase() || null;
    if (normalized) localStorage.setItem("hoop_active_ig", normalized);
    else localStorage.removeItem("hoop_active_ig");
    setActiveIgUsername(normalized);
    setUser((current) => {
      const updated = current ? { ...current, active_ig_username: normalized } : current;
      if (updated) {
        localStorage.setItem("hoop_user", JSON.stringify(updated));
      }
      return updated;
    });
    // Clear ALL data caches - DMs list, any session caches, etc.
    // accountVersion bump causes every hook that depends on it to re-fetch.
    clearDMsCache();
    setAccountVersion((v) => v + 1);
  }, []);

  const logout = () => {
    localStorage.removeItem("hoop_token");
    localStorage.removeItem("hoop_active_ig");
    localStorage.removeItem("hoop_user");
    clearDMsCache();
    setActiveIgUsername(null);
    setAccountVersion(0);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user: user ? { ...user, active_ig_username: activeIgUsername } : user,
        loading,
        login,
        logout,
        refreshUser,
        markOnboarded,
        setActiveAccount,
        accountVersion,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
