import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import LoginPage from "./Pages/LoginPage";
import SignupPage from "./Pages/SignupPage";
import OnboardingPage from "./Pages/OnboardingPage";
import HomePage from "./Pages/HomePage";
import ChatPage from "./Pages/ChatPage";
import SessionsPage from "./Pages/SessionsPage";
import SettingsPage from "./Pages/SettingsPage";
import SwitchAccountPage from "./Pages/SwitchAccountPage";
import WingmanPage from "./Pages/WingmanPage";
import PrivacyPage from "./Pages/PrivacyPage";

import SecurityPage from "./Pages/SecurityPage";
import ForgotPasswordPage from "./Pages/ForgotPasswordPage";
import PwaInstallPrompt from "./components/common/PwaInstallPrompt";

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

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/wingman/:token" element={<WingmanPage />} />
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
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
      <PwaInstallPrompt />
    </>
  );
}
