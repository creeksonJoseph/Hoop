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

  const fetchDMs = useCallback(async () => {
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
      toastRef.current(
        err.response?.data?.detail ||
          `Failed to load conversations (${err.response?.status})`,
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-fetch whenever the active account changes (accountVersion bump from AuthContext)
  useEffect(() => {
    const key = localStorage.getItem("hoop_active_ig") || "__none__";
    const hit = dmsCacheByAccount[key];
    if (hit) {
      // Serve cache immediately, then still re-fetch in background for freshness
      setDMs(hit.dms);
      setHasRealAccount(hit.hasRealAccount);
      setLoading(false);
    } else {
      setDMs([]);
      setHasRealAccount(false);
      setLoading(true);
    }
    fetchDMs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountVersion, fetchDMs]);

  // Supabase Realtime - refresh list silently when new message is inserted
  useEffect(() => {
    let retryTimer = null;
    let active = true;
    const channelRef = { current: null };

    const subscribe = () => {
      if (!active) return;

      const channelName = `dms_list_realtime_${Date.now()}_${++realtimeSubscriptionId}`;
      const channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          () => {
            fetchDMs();
          },
        )
        .subscribe((status, err) => {
          if (err) console.error("[Supabase DMs Realtime] error:", err);
          if (
            (status === "CHANNEL_ERROR" || status === "CLOSED") &&
            active &&
            !retryTimer
          ) {
            console.warn(
              "[Supabase DMs Realtime] channel lost - retrying in 2s",
            );
            retryTimer = setTimeout(() => {
              retryTimer = null;
              subscribe();
            }, 2000);
          }
        });

      channelRef.current = channel;
    };

    subscribe();

    return () => {
      active = false;
      clearTimeout(retryTimer);
      const channel = channelRef.current;
      channelRef.current = null;
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchDMs]);

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

