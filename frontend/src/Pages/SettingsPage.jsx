import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Link2, Loader as Loader2, ChevronRight } from "lucide-react";
import { useSettings } from "../hooks/useSettings";
import NavRail from "../components/NavRail";
import { SettingsSkeleton } from "../components/skeletons/Skeletons";
import ConfirmModal from "../components/common/ConfirmModal";
import { useAuth } from "../context/AuthContext";

export default function SettingsPage() {
  const { settings, loading, updateApiKey, deleteApiKey } = useSettings();
  const [newKey, setNewKey] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const { logout, user } = useAuth();

  const navigate = useNavigate();
  // Use the live active account from AuthContext so it updates immediately after a switch.
  // Fallback to what the settings API returned if AuthContext hasn't set one yet.
  const activeIgUsername = user?.active_ig_username || settings?.ig_username;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!newKey.trim()) return;
    setSaving(true);
    const ok = await updateApiKey(newKey);
    if (ok) {
      setNewKey("");
      setShowKeyInput(false);
    }
    setSaving(false);
  };

  const handleDisconnect = async () => {
    if (
      !confirm(
        "This will remove your API key and delete all your DMs, messages, and wingman sessions. This cannot be undone.",
      )
    )
      return;
    setDisconnecting(true);
    const ok = await deleteApiKey();
    if (ok) {
      logout();
      navigate("/onboarding");
    }
    setDisconnecting(false);
  };

  return (
    <div className="h-screen w-full flex overflow-hidden bg-[#f9f9f8] text-[#191918] font-sans">
      <NavRail activePage="settings" />

      <main className="flex-1 min-w-0 overflow-y-auto custom-scrollbar px-4 py-8 pt-16 pb-24 sm:px-8 md:px-12 md:py-12">
        <div className="w-full">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-xl font-semibold tracking-tight text-[#191918]">
              Settings
            </h1>
          </div>

          {loading ? (
            <SettingsSkeleton />
          ) : (
            <>
              {/* SECTION 1: ACCOUNT */}
              <section className="mb-10">
                <h2 className="mb-2 text-[11px] font-semibold tracking-wider uppercase text-[#8c8782]">
                  Account
                </h2>

                <div className="border-t border-[#e5e3df]">
                  {/* Row: Hoop profile */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-3.5 border-b border-[#e5e3df]">
                    <div>
                      <p className="text-[13px] font-medium text-[#191918]">
                        Hoop profile
                      </p>
                      <p className="text-[12px] text-[#615d59]">
                        Primary account email address
                      </p>
                    </div>
                    <div className="sm:text-right mt-1 sm:mt-0">
                      <span className="text-[13px] text-[#191918] font-normal">
                        {settings?.profile?.email || "Signed-in account"}
                      </span>
                    </div>
                  </div>

                  {/* Row: Instagram account */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 border-b border-[#e5e3df]">
                    <div>
                      <p className="text-[13px] font-medium text-[#191918]">
                        Instagram account
                      </p>
                      {activeIgUsername ? (
                        <p className="text-[12px] text-[#615d59] flex items-center gap-1.5 mt-0.5">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#0f6220]"></span>
                          Active account:{" "}
                          <span className="font-medium text-[#191918]">
                            @{activeIgUsername}
                          </span>
                        </p>
                      ) : (
                        <p className="text-[12px] text-[#615d59] mt-0.5">
                          No account connected
                        </p>
                      )}
                    </div>
                    <div className="sm:shrink-0">
                      <button
                        type="button"
                        onClick={() => navigate("/settings/accounts")}
                        className="inline-flex items-center gap-1 rounded-[6px] border border-[#d3d0cb] bg-white px-3 py-1.5 text-[12px] font-medium text-[#191918] hover:bg-[#f0eeec] hover:border-[#bcbab5] active:bg-[#e8e6e2] transition-colors cursor-pointer"
                      >
                        Switch
                        <ChevronRight size={14} className="text-[#615d59]" />
                      </button>
                    </div>
                  </div>

                  {/* Row: Zernio API Key */}
                  <div className="py-3.5 border-b border-[#e5e3df]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <p className="text-[13px] font-medium text-[#191918]">
                          Zernio API Key
                        </p>
                        <p className="text-[12px] text-[#615d59] mt-0.5">
                          {settings?.masked_key ? (
                            <>
                              Current key:{" "}
                              <span className="font-mono text-[11.5px] text-[#191918]">
                                {settings.masked_key}
                              </span>
                            </>
                          ) : (
                            "No API key connected"
                          )}
                        </p>
                        {settings?.oauth_url && (
                          <div className="mt-1.5">
                            <a
                              href={settings.oauth_url}
                              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#0075de] hover:underline"
                            >
                              <Link2 size={14} />
                              Connect Instagram via OAuth
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="sm:shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowKeyInput(!showKeyInput)}
                          className="inline-flex items-center justify-center rounded-[6px] border border-[#d3d0cb] bg-white px-3 py-1.5 text-[12px] font-medium text-[#191918] hover:bg-[#f0eeec] hover:border-[#bcbab5] active:bg-[#e8e6e2] transition-colors cursor-pointer"
                        >
                          {showKeyInput ? "Cancel" : "Change key"}
                        </button>
                      </div>
                    </div>

                    {showKeyInput && (
                      <form
                        onSubmit={handleSave}
                        className="flex gap-2 mt-3 pt-3 border-t border-[#e5e3df]/60"
                      >
                        <input
                          type="text"
                          value={newKey}
                          onChange={(e) => setNewKey(e.target.value)}
                          placeholder={
                            settings?.masked_key
                              ? "Enter new key to update…"
                              : "sk_live_..."
                          }
                          className="flex-1 min-w-0 bg-white border border-[#d3d0cb] rounded-[6px] px-3 py-1.5 text-[12.5px] text-[#191918] placeholder:text-[#8c8782] focus:outline-none focus:border-[#0075de] focus:ring-1 focus:ring-[#0075de] font-mono"
                          autoFocus
                        />
                        <button
                          type="submit"
                          disabled={saving || !newKey.trim()}
                          className="shrink-0 bg-[#0075de] hover:bg-[#005bab] text-white font-medium px-3.5 py-1.5 rounded-[6px] text-[12px] transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                        >
                          {saving ? (
                            <>
                              <Loader2 size={13} className="animate-spin" />{" "}
                              Saving…
                            </>
                          ) : (
                            "Save key"
                          )}
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </section>

              {/* SECTION 2: DANGER ZONE */}
              <section className="mt-14 pt-4">
                <h2 className="mb-2 text-[11px] font-semibold tracking-wider uppercase text-[#e32d14]">
                  Danger Zone
                </h2>

                <div className="border-t border-[#e5e3df]">
                  {settings?.has_connected_account && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 border-b border-[#e5e3df]">
                      <div>
                        <p className="text-[13px] font-medium text-[#191918]">
                          Disconnect account
                        </p>
                        <p className="text-[12px] text-[#6f0d00]">
                          Removes your API key and revokes all wingman sessions.
                        </p>
                      </div>
                      <div className="sm:shrink-0">
                        <button
                          type="button"
                          onClick={handleDisconnect}
                          disabled={disconnecting}
                          className="inline-flex items-center justify-center rounded-[6px] border border-[#e32d14] bg-transparent px-3 py-1.5 text-[12px] font-medium text-[#e32d14] hover:bg-[#e32d14] hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {disconnecting ? (
                            <>
                              <Loader2 size={13} className="animate-spin" />{" "}
                              Disconnecting…
                            </>
                          ) : (
                            "Disconnect"
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 border-b border-[#e5e3df]">
                    <div>
                      <p className="text-[13px] font-medium text-[#191918]">
                        Session
                      </p>
                      <p className="text-[12px] text-[#615d59]">
                        Sign out of this device
                      </p>
                    </div>
                    <div className="sm:shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowSignOutModal(true)}
                        className="inline-flex items-center justify-center rounded-[6px] border border-[#d3d0cb] bg-white px-3 py-1.5 text-[12px] font-medium text-[#191918] hover:bg-[#f0eeec] hover:border-[#bcbab5] active:bg-[#e8e6e2] transition-colors cursor-pointer"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          <footer className="mt-12 border-t border-[#e5e3df] pt-5 text-[12px] text-[#8c8782]">
            <Link to="/privacy" className="text-[#0075de] hover:underline">
              Privacy Policy
            </Link>
          </footer>
        </div>
      </main>

      <ConfirmModal
        isOpen={showSignOutModal}
        title="Sign out?"
        description="Are you sure you want to sign out of your session on this device?"
        confirmText="Sign out"
        isDestructive
        onConfirm={() => {
          logout();
          navigate("/login");
        }}
        onClose={() => setShowSignOutModal(false)}
      />
    </div>
  );
}
