import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import PwaInstallPrompt from "./components/common/PwaInstallPrompt";
import LandingPage from "./Pages/LandingPage";
import NotFoundPage from "./Pages/NotFoundPage";
import CallbackPage from "./components/auth/CallbackPage";
import { useSeoManager } from "./hooks/useSeo";
import { lazy, Suspense } from "react";

// Keep the public landing page in the initial bundle. Everything else is
// split by route so the homepage does not download the whole app before it
// can paint (Core Web Vitals).
const LoginPage = lazy(() => import("./Pages/LoginPage"));
const SignupPage = lazy(() => import("./Pages/SignupPage"));
const OnboardingPage = lazy(() => import("./Pages/OnboardingPage"));
const HomePage = lazy(() => import("./Pages/HomePage"));
const ChatPage = lazy(() => import("./Pages/ChatPage"));
const SessionsPage = lazy(() => import("./Pages/SessionsPage"));
const SettingsPage = lazy(() => import("./Pages/SettingsPage"));
const SwitchAccountPage = lazy(() => import("./Pages/SwitchAccountPage"));
const WingmanPage = lazy(() => import("./Pages/WingmanPage"));
const PrivacyPage = lazy(() => import("./Pages/PrivacyPage"));
const SecurityPage = lazy(() => import("./Pages/SecurityPage"));
const ForgotPasswordPage = lazy(() => import("./Pages/ForgotPasswordPage"));
const AdminPage = lazy(() => import("./Pages/AdminPage"));
const SentryTestPage = lazy(() => import("./Pages/SentryTestPage"));

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f9f9f8]">
      <span className="flex size-11 items-center justify-center rounded-[10px] bg-[#191918] text-lg font-bold text-white shadow-sm">
        H
      </span>
    </div>
  );
}

function Protected({ children }) {
  const { user, loading } = useAuth();
  const hasToken =
    typeof window !== "undefined" &&
    Boolean(localStorage.getItem("hoop_token"));

  if (loading) {
    if (hasToken) return children;
    return null;
  }
  return user ? children : <Navigate to="/login" replace />;
}

function AdminProtected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || !user.is_admin) {
    return <Navigate to="/home" replace />;
  }
  return children;
}

export default function App() {
  useSeoManager();

  return (
    <>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/wingman/:token" element={<WingmanPage />} />
          <Route
            path="/admin"
            element={
              <AdminProtected>
                <AdminPage />
              </AdminProtected>
            }
          />
          <Route
            path="/onboarding"
            element={
              <Protected>
                <OnboardingPage />
              </Protected>
            }
          />
          <Route
            path="/home"
            element={
              <Protected>
                <HomePage />
              </Protected>
            }
          />
          <Route
            path="/chat/:igUsername"
            element={
              <Protected>
                <ChatPage />
              </Protected>
            }
          />
          <Route
            path="/wingmen"
            element={
              <Protected>
                <SessionsPage />
              </Protected>
            }
          />
          <Route
            path="/sessions/:igUsername"
            element={
              <Protected>
                <SessionsPage />
              </Protected>
            }
          />
          <Route
            path="/settings"
            element={
              <Protected>
                <SettingsPage />
              </Protected>
            }
          />
          <Route
            path="/settings/security"
            element={
              <Protected>
                <SecurityPage />
              </Protected>
            }
          />
          <Route
            path="/settings/accounts"
            element={
              <Protected>
                <SwitchAccountPage />
              </Protected>
            }
          />
          <Route path="/auth/callback" element={<CallbackPage />} />
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/sentry-test"
            element={
              <Suspense fallback={<div>Loading...</div>}>
                <SentryTestPage />
              </Suspense>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <PwaInstallPrompt />
    </>
  );
}
