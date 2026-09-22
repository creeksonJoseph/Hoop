import { useState, useCallback } from "react";
import api from "../lib/api";
import { useToast } from "../context/ToastContext";

export function useAdmin() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/admin/dashboard");
      setStats(data);
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to fetch admin dashboard";
      setError(msg);
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/admin/users");
      setUsers(data.users || []);
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to fetch users";
      setError(msg);
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/admin/accounts");
      setAccounts(data.accounts || []);
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to fetch accounts";
      setError(msg);
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/admin/sessions");
      setSessions(data.sessions || []);
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to fetch sessions";
      setError(msg);
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/feedback");
      setFeedback(data.feedback || []);
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to fetch feedback";
      setError(msg);
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const deleteUser = useCallback(async (userId) => {
    try {
      await api.delete(`/admin/users/${userId}`);
      toast("User deleted successfully", "success");
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      return true;
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to delete user";
      toast(msg, "error");
      return false;
    }
  }, [toast]);

  const bulkDeleteUsers = useCallback(async (userIds) => {
    try {
      const { data } = await api.post("/admin/users/bulk-delete", { user_ids: userIds });
      toast(data.message || "Users deleted", "success");
      setUsers((prev) => prev.filter((u) => !userIds.includes(u.id)));
      return true;
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to bulk delete users";
      toast(msg, "error");
      return false;
    }
  }, [toast]);

  const deleteAccount = useCallback(async (accountId) => {
    try {
      await api.delete(`/admin/accounts/${accountId}`);
      toast("Connected account removed", "success");
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
      return true;
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to remove account";
      toast(msg, "error");
      return false;
    }
  }, [toast]);

  const deleteSession = useCallback(async (sessionId) => {
    try {
      await api.delete(`/admin/sessions/${sessionId}`);
      toast("Wingman session token revoked", "success");
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      return true;
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to revoke session token";
      toast(msg, "error");
      return false;
    }
  }, [toast]);

  const replyToFeedback = useCallback(async (feedbackId, replyMessage) => {
    try {
      const { data } = await api.post(`/feedback/${feedbackId}/reply`, { reply_message: replyMessage });
      toast(data.message || "Reply sent to user", "success");
      setFeedback((prev) =>
        prev.map((item) => (item.id === feedbackId ? { ...item, status: "replied" } : item))
      );
      return true;
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to send reply email";
      toast(msg, "error");
      return false;
    }
  }, [toast]);

  return {
    stats,
    users,
    accounts,
    sessions,
    feedback,
    loading,
    error,
    fetchDashboard,
    fetchUsers,
    fetchAccounts,
    fetchSessions,
    fetchFeedback,
    deleteUser,
    bulkDeleteUsers,
    deleteAccount,
    deleteSession,
    replyToFeedback,
  };
}
