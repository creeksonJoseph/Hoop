import { useCallback, useEffect, useRef, useState } from "react";
import api from "../lib/api";
import { supabase } from "../lib/supabase";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

// Module-level cache keyed by active account username.
// Prevents cross-account data bleed when switching accounts.
const dmsCacheByAccount = {};   // { [igUsername]: { dms, hasRealAccount } }
let globalInitialFetchDone = false;
let realtimeSubscriptionId = 0;

export function clearDMsCache() {
  Object.keys(dmsCacheByAccount).forEach((k) => delete dmsCacheByAccount[k]);
  globalInitialFetchDone = false;
}

export function useDMs() {
  const { accountVersion } = useAuth();
  const activeAccount = localStorage.getItem("hoop_active_ig") || "__none__";

  const cached = dmsCacheByAccount[activeAccount];
  const [dms, setDMs] = useState(cached?.dms || []);
  const [hasRealAccount, setHasRealAccount] = useState(cached?.hasRealAccount ?? false);
  const [loading, setLoading] = useState(!cached);
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  // Guard: prevents concurrent overlapping fetches from piling up.
  const fetchingRef = useRef(false);
  // Cooldown: prevents Realtime bursts from hammering the API.
  const lastRealtimeFetchRef = useRef(0);

  const fetchDMs = useCallback(async () => {
    if (fetchingRef.current) return;   // already in-flight, drop this call
    fetchingRef.current = true;
    const key = localStorage.getItem("hoop_active_ig") || "__none__";
    if (!dmsCacheByAccount[key]) {
      setLoading(true);
    }
    try {
      const { data } = await api.get("/dms");
      dmsCacheByAccount[key] = { dms: data.dms, hasRealAccount: data.has_real_account };
      globalInitialFetchDone = true;
      setDMs(data.dms);
      setHasRealAccount(data.has_real_account);
    } catch (err) {
      // Avoid spamming toasts if offline or unauthenticated
      if (err.response?.status && err.response.status !== 401) {
        toastRef.current(
          err.response?.data?.detail || err.response?.data?.message || `Failed to load conversations (${err.response?.status})`,
          "error",
        );
      }
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  const fetchDMsRef = useRef(fetchDMs);
  fetchDMsRef.current = fetchDMs;

  // Re-fetch whenever the active account changes (accountVersion bump from AuthContext)
  useEffect(() => {
    const key = localStorage.getItem("hoop_active_ig") || "__none__";
    const hit = dmsCacheByAccount[key];
    if (hit) {
      setDMs(hit.dms);
      setHasRealAccount(hit.hasRealAccount);
      setLoading(false);
    } else {
      setDMs([]);
      setHasRealAccount(false);
      setLoading(true);
    }
    fetchDMs();
  }, [accountVersion, fetchDMs]);

  // Supabase Realtime - refresh list silently when new message is inserted.
  // Use a unique channel name per mount so stale channels from unmounted instances
  // cannot fire into this component after it has been cleaned up.
  useEffect(() => {
    const channelName = `dms_list_realtime_${++realtimeSubscriptionId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          // Throttle: at most one refetch every 2 seconds from Realtime events.
          const now = Date.now();
          if (now - lastRealtimeFetchRef.current < 2000) return;
          lastRealtimeFetchRef.current = now;
          fetchDMsRef.current();
        },
      )
      .subscribe((status, err) => {
        if (err) console.error("[Supabase DMs Realtime] error:", err);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const addDM = async (igUsername) => {
    try {
      const { data } = await api.post("/dms", { ig_username: igUsername });
      const key = localStorage.getItem("hoop_active_ig") || "__none__";
      dmsCacheByAccount[key] = { dms: data.dms, hasRealAccount: true };
      setDMs(data.dms);
      return { success: true };
    } catch (err) {
      const errMsg = err.response?.data?.detail || "Failed to add conversation";
      toastRef.current(errMsg, "error");
      return { success: false, error: errMsg };
    }
  };

  const deleteDM = async (igUsername) => {
    try {
      const { data } = await api.delete(`/dms/${igUsername}`);
      const key = localStorage.getItem("hoop_active_ig") || "__none__";
      dmsCacheByAccount[key] = { dms: data.dms, hasRealAccount: true };
      setDMs(data.dms);
    } catch (err) {
      toastRef.current(
        err.response?.data?.detail || "Failed to delete conversation",
        "error",
      );
    }
  };

  return { dms, hasRealAccount, loading, fetchDMs, addDM, deleteDM };
}

