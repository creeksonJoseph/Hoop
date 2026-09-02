import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import LoginPage from './Pages/LoginPage'
import SignupPage from './Pages/SignupPage'
import OnboardingPage from './Pages/OnboardingPage'
import HomePage from './Pages/HomePage'
import ChatPage from './Pages/ChatPage'
import SessionsPage from './Pages/SessionsPage'
import SettingsPage from './Pages/SettingsPage'
import WingmanPage from './Pages/WingmanPage'

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-[#131313] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#4d4638] border-t-[#ffe19e] rounded-full spin" />
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/wingman/:token" element={<WingmanPage />} />

      <Route path="/onboarding" element={<Protected><OnboardingPage /></Protected>} />
      <Route path="/home" element={<Protected><HomePage /></Protected>} />
      <Route path="/chat/:igUsername" element={<Protected><ChatPage /></Protected>} />
      <Route path="/sessions/:igUsername" element={<Protected><SessionsPage /></Protected>} />
      <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />

      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  )
}
