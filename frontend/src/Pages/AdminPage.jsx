import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  ShieldCheck,
  Users,
  Instagram,
  MessageSquare,
  Key,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  Loader as Loader2,
  Trash2,
  Send,
  Search,
  Activity,
  Mail,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useAdmin } from "../hooks/useAdmin";
import NavRail from "../components/NavRail";

export default function AdminPage() {
  const { user } = useAuth();
  const isAdmin = user?.email?.toLowerCase() === "charanajoseph@gmail.com";

  const {
    stats,
    users,
    accounts,
    sessions,
    feedback,
    loading,
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
  } = useAdmin();

  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [feedbackCategoryFilter, setFeedbackCategoryFilter] = useState("all");

  // Reply modal state
  const [replyModal, setReplyModal] = useState({
    isOpen: false,
    feedbackId: null,
    userEmail: "",
    userMessage: "",
  });
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    fetchDashboard();
  }, [isAdmin, fetchDashboard]);

  useEffect(() => {
    if (!isAdmin) return;
    if (activeTab === "users" && users.length === 0) fetchUsers();
    if (activeTab === "accounts" && accounts.length === 0) {
      fetchAccounts();
      fetchSessions();
    }
    if (activeTab === "feedback" && feedback.length === 0) fetchFeedback();
  }, [activeTab, isAdmin, users.length, accounts.length, feedback.length, fetchUsers, fetchAccounts, fetchSessions, fetchFeedback]);

  if (!user || !isAdmin) {
    return <Navigate to="/home" replace />;
  }

  const filteredUsers = users.filter((u) =>
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFeedback = feedback.filter((item) => {
    if (feedbackCategoryFilter !== "all" && item.category !== feedbackCategoryFilter) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.user_email?.toLowerCase().includes(q) ||
        item.message?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleSelectUser = (id) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllUsers = () => {
    if (selectedUserIds.length === filteredUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredUsers.map((u) => u.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUserIds.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedUserIds.length} users?`)) {
      const ok = await bulkDeleteUsers(selectedUserIds);
      if (ok) setSelectedUserIds([]);
    }
  };

  const handleOpenReplyModal = (item) => {
    setReplyModal({
      isOpen: true,
      feedbackId: item.id,
      userEmail: item.user_email,
      userMessage: item.message,
    });
    setReplyText("");
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !replyModal.feedbackId) return;
    setSendingReply(true);
    const ok = await replyToFeedback(replyModal.feedbackId, replyText.trim());
    if (ok) {
      setReplyModal({ isOpen: false, feedbackId: null, userEmail: "", userMessage: "" });
      setReplyText("");
    }
    setSendingReply(false);
  };

  return (
    <div className="h-screen w-full flex overflow-hidden bg-[#f9f9f8] text-[#191918] font-sans">
      <NavRail activePage="admin" />

      <main className="flex-1 min-w-0 overflow-y-auto custom-scrollbar px-4 py-8 pt-16 pb-24 sm:px-8 md:px-12 md:py-12">
        <div className="w-full max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#dfdcd9] pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck size={24} className="text-[#191918]" />
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#191918]">
                  Hoop Admin Portal
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-[#615d59]">
                System metrics, user directory, connected accounts, and feature suggestions for charanajoseph@gmail.com.
              </p>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-[#eeece8] p-1 rounded-[10px] self-start sm:self-auto text-xs font-medium">
              {[
                { id: "overview", label: "Overview", icon: Activity },
                { id: "feedback", label: "Feature Requests", icon: Lightbulb },
                { id: "users", label: "Users", icon: Users },
                { id: "accounts", label: "Accounts & Sessions", icon: Instagram },
              ].map((t) => {
                const Icon = t.icon;
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] transition-all cursor-pointer ${
                      active
                        ? "bg-white text-[#191918] font-semibold shadow-xs"
                        : "text-[#615d59] hover:text-[#191918]"
                    }`}
                  >
                    <Icon size={14} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6 fade-up">
              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { title: "Total Users", val: stats?.total_users ?? 0, icon: Users, desc: "Registered user accounts" },
                  { title: "Connected IG Accounts", val: stats?.total_accounts ?? 0, icon: Instagram, desc: "Active Zernio connections" },
                  { title: "Active Wingman Sessions", val: stats?.total_sessions ?? 0, icon: Key, desc: "Shareable guest DM links" },
                  { title: "Pending Suggestions", val: stats?.pending_feedback ?? 0, icon: Lightbulb, desc: "Awaiting admin reply" },
                ].map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.title} className="bg-white border border-[#dfdcd9] rounded-[12px] p-5 shadow-xs space-y-2">
                      <div className="flex items-center justify-between text-[#615d59]">
                        <span className="text-xs font-medium">{s.title}</span>
                        <Icon size={18} className="text-[#191918]" />
                      </div>
                      <div className="text-2xl font-bold text-[#191918]">{s.val}</div>
                      <p className="text-[11px] text-[#8c8782]">{s.desc}</p>
                    </div>
                  );
                })}
              </div>

              {/* System Health */}
              <div className="bg-white border border-[#dfdcd9] rounded-[12px] p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-[#191918]">System Infrastructure Status</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { name: "PostgreSQL Database", status: stats?.system_health?.database || "healthy" },
                    { name: "Upstash Redis REST KV", status: stats?.system_health?.redis || "healthy" },
                    { name: "Resend Email Gateway", status: stats?.system_health?.resend_email || "healthy" },
                  ].map((h) => (
                    <div key={h.name} className="p-3.5 rounded-[8px] border border-[#dfdcd9] bg-[#f9f9f8] flex items-center justify-between">
                      <span className="text-xs font-medium text-[#191918]">{h.name}</span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#15803d]">
                        <CheckCircle2 size={13} /> {h.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Users */}
              <div className="bg-white border border-[#dfdcd9] rounded-[12px] p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-[#191918]">Recent User Registrations</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-[#191918]">
                    <thead className="bg-[#f9f9f8] border-b border-[#dfdcd9] text-[11px] font-semibold uppercase text-[#615d59]">
                      <tr>
                        <th className="py-2.5 px-3">User ID</th>
                        <th className="py-2.5 px-3">Email Address</th>
                        <th className="py-2.5 px-3">Joined Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#dfdcd9]">
                      {stats?.recent_users?.map((u) => (
                        <tr key={u.id} className="hover:bg-[#f9f9f8]">
                          <td className="py-3 px-3 font-mono font-bold">#{u.id}</td>
                          <td className="py-3 px-3 font-medium">{u.email}</td>
                          <td className="py-3 px-3 text-[#615d59]">
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FEATURE SUGGESTIONS / FEEDBACK */}
          {activeTab === "feedback" && (
            <div className="space-y-4 fade-up">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Search & Categories */}
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  {["all", "feature_suggestion", "bug_report", "general_feedback"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setFeedbackCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-[8px] text-xs font-medium cursor-pointer transition-colors ${
                        feedbackCategoryFilter === cat
                          ? "bg-[#191918] text-white"
                          : "bg-white border border-[#dfdcd9] text-[#615d59] hover:bg-[#f0eeec]"
                      }`}
                    >
                      {cat === "all"
                        ? "All Categories"
                        : cat.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </button>
                  ))}
                </div>
              </div>

              {/* Feedback List */}
              <div className="bg-white border border-[#dfdcd9] rounded-[12px] p-6 shadow-xs space-y-4">
                {loading ? (
                  <div className="py-8 flex justify-center text-[#615d59] text-xs">
                    <Loader2 size={16} className="animate-spin mr-2" /> Loading suggestions…
                  </div>
                ) : filteredFeedback.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#615d59]">
                    No feature suggestions or feedback submitted yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredFeedback.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 rounded-[10px] border border-[#dfdcd9] bg-[#f9f9f8] space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#dfdcd9] pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-[#191918]">
                              {item.user_email}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#e6f3fe] text-[#0075de]">
                              {item.category.replace("_", " ")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-[#615d59]">
                            <span>{new Date(item.created_at).toLocaleString()}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold ${
                                item.status === "replied"
                                  ? "bg-[#f0fdf4] text-[#15803d]"
                                  : "bg-[#fffbeb] text-[#92400e]"
                              }`}
                            >
                              {item.status}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-[#191918] leading-relaxed whitespace-pre-wrap">
                          "{item.message}"
                        </p>

                        <div className="flex justify-end pt-1">
                          <button
                            onClick={() => handleOpenReplyModal(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#191918] text-white text-xs font-medium hover:bg-[#333] cursor-pointer shadow-xs"
                          >
                            <Mail size={13} />
                            Reply to User
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: USERS DIRECTORY */}
          {activeTab === "users" && (
            <div className="space-y-4 fade-up">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8c8782]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search users by email…"
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#dfdcd9] rounded-[8px] text-xs outline-none focus:border-[#191918]"
                  />
                </div>

                {selectedUserIds.length > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[#e32d14] text-white text-xs font-semibold hover:bg-[#b81d09] cursor-pointer"
                  >
                    <Trash2 size={13} /> Delete Selected ({selectedUserIds.length})
                  </button>
                )}
              </div>

              <div className="bg-white border border-[#dfdcd9] rounded-[12px] p-6 shadow-xs">
                {loading ? (
                  <div className="py-8 flex justify-center text-[#615d59] text-xs">
                    <Loader2 size={16} className="animate-spin mr-2" /> Loading user directory…
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-[#191918]">
                      <thead className="bg-[#f9f9f8] border-b border-[#dfdcd9] text-[11px] font-semibold uppercase text-[#615d59]">
                        <tr>
                          <th className="py-2.5 px-3">
                            <input
                              type="checkbox"
                              checked={
                                filteredUsers.length > 0 &&
                                selectedUserIds.length === filteredUsers.length
                              }
                              onChange={handleSelectAllUsers}
                              className="cursor-pointer"
                            />
                          </th>
                          <th className="py-2.5 px-3">User ID</th>
                          <th className="py-2.5 px-3">Email Address</th>
                          <th className="py-2.5 px-3">Accounts Count</th>
                          <th className="py-2.5 px-3">Joined Date</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#dfdcd9]">
                        {filteredUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-[#f9f9f8]">
                            <td className="py-3 px-3">
                              <input
                                type="checkbox"
                                checked={selectedUserIds.includes(u.id)}
                                onChange={() => handleSelectUser(u.id)}
                                className="cursor-pointer"
                              />
                            </td>
                            <td className="py-3 px-3 font-mono font-bold">#{u.id}</td>
                            <td className="py-3 px-3 font-medium">{u.email}</td>
                            <td className="py-3 px-3">{u.account_count || 0} account(s)</td>
                            <td className="py-3 px-3 text-[#615d59]">
                              {new Date(u.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={() => {
                                  if (window.confirm(`Delete user ${u.email}?`)) deleteUser(u.id);
                                }}
                                className="text-[#e32d14] hover:underline cursor-pointer font-medium"
                              >
                                Delete User
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: ACCOUNTS & SESSIONS */}
          {activeTab === "accounts" && (
            <div className="space-y-6 fade-up">
              {/* Accounts Card */}
              <div className="bg-white border border-[#dfdcd9] rounded-[12px] p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-[#191918]">Connected Instagram Accounts</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-[#191918]">
                    <thead className="bg-[#f9f9f8] border-b border-[#dfdcd9] text-[11px] font-semibold uppercase text-[#615d59]">
                      <tr>
                        <th className="py-2.5 px-3">IG Username</th>
                        <th className="py-2.5 px-3">Owner Email</th>
                        <th className="py-2.5 px-3">Connected Date</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#dfdcd9]">
                      {accounts.map((a) => (
                        <tr key={a.id} className="hover:bg-[#f9f9f8]">
                          <td className="py-3 px-3 font-bold text-[#0075de]">@{a.ig_username}</td>
                          <td className="py-3 px-3">{a.user_email}</td>
                          <td className="py-3 px-3 text-[#615d59]">{new Date(a.created_at).toLocaleDateString()}</td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => {
                                if (window.confirm(`Disconnect account @${a.ig_username}?`)) deleteAccount(a.id);
                              }}
                              className="text-[#e32d14] hover:underline cursor-pointer font-medium"
                            >
                              Disconnect
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sessions Card */}
              <div className="bg-white border border-[#dfdcd9] rounded-[12px] p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-[#191918]">Active Wingman Shareable Tokens</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-[#191918]">
                    <thead className="bg-[#f9f9f8] border-b border-[#dfdcd9] text-[11px] font-semibold uppercase text-[#615d59]">
                      <tr>
                        <th className="py-2.5 px-3">Guest Name</th>
                        <th className="py-2.5 px-3">DM Target</th>
                        <th className="py-2.5 px-3">Token</th>
                        <th className="py-2.5 px-3">Creation Date</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#dfdcd9]">
                      {sessions.map((s) => (
                        <tr key={s.id} className="hover:bg-[#f9f9f8]">
                          <td className="py-3 px-3 font-bold">{s.wingman_name}</td>
                          <td className="py-3 px-3">@{s.ig_username}</td>
                          <td className="py-3 px-3 font-mono text-[11px] text-[#615d59]">{s.token}</td>
                          <td className="py-3 px-3 text-[#615d59]">{new Date(s.created_at).toLocaleDateString()}</td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => {
                                if (window.confirm(`Revoke session for ${s.wingman_name}?`)) deleteSession(s.id);
                              }}
                              className="text-[#e32d14] hover:underline cursor-pointer font-medium"
                            >
                              Revoke Token
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* REPLY MODAL */}
      {replyModal.isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-[#dfdcd9] rounded-[14px] p-6 max-w-lg w-full shadow-xl space-y-4">
            <h3 className="text-base font-bold text-[#191918]">
              Reply to Feature Suggestion
            </h3>
            <div className="p-3 bg-[#f9f9f8] border border-[#dfdcd9] rounded-[8px] text-xs space-y-1">
              <p className="font-semibold text-[#191918]">To: {replyModal.userEmail}</p>
              <p className="text-[#615d59] italic">"{replyModal.userMessage}"</p>
            </div>

            <form onSubmit={handleSendReply} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#191918] mb-1">
                  Reply Message (will be emailed to user)
                </label>
                <textarea
                  rows={4}
                  required
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Thank you for your feedback! We have scheduled this feature for our next update…"
                  className="w-full p-3 bg-white border border-[#dfdcd9] rounded-[8px] text-xs outline-none focus:border-[#191918] resize-none"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReplyModal({ isOpen: false, feedbackId: null, userEmail: "", userMessage: "" })}
                  className="px-4 py-2 rounded-[8px] border border-[#dfdcd9] text-xs font-medium text-[#191918] hover:bg-[#f0eeec] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingReply || !replyText.trim()}
                  className="px-4 py-2 rounded-[8px] bg-[#191918] text-white text-xs font-semibold hover:bg-[#333] cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {sendingReply ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Sending…
                    </>
                  ) : (
                    <>
                      <Send size={14} /> Send Email Reply
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
