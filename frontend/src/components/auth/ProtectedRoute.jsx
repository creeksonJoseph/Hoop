import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { hasSavedApiKey } from "../../lib/authRouting";

function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f9f9f8]">
      <span className="flex size-11 items-center justify-center rounded-[10px] bg-[#191918] text-lg font-bold text-white shadow-sm">
        H
      </span>
    </div>
  );
}

/**
 * Route guard for authenticated app screens.
 *
 * By default it also requires a saved Zernio API key. The onboarding screen
 * itself opts out with `requireOnboarding={false}` so users without a key can
 * reach it (and so the "already has a key" redirect there keeps working).
 */
export default function Protected({ children, requireOnboarding = true }) {
  const { user, loading } = useAuth();

  // Wait for /auth/me before deciding. Rendering protected content while the
  // session is being restored could briefly expose a dashboard to a user
  // whose API key was removed on another device.
  if (loading) return <AuthLoading />;

  if (!user) return <Navigate to="/login" replace />;

  if (requireOnboarding && !hasSavedApiKey(user)) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}
