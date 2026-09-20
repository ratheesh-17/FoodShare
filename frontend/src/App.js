import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";

import LoginPageNew       from "./pages/LoginPageNew";
import AdminLoginPageNew  from "./pages/AdminLoginPageNew";
import LeaderboardPageNew from "./pages/LeaderboardPageNew";
import TelegramPage       from "./pages/TelegramPage";
import ProfilePage        from "./pages/ProfilePage";

import DonorPageNew     from "./pages/DonorPageNew";
import NGOPageNew       from "./pages/NGOPageNew";
import VolunteerPageNew from "./pages/VolunteerPageNew";
import DashboardPageNew from "./pages/DashboardPageNew";

import GeminiChatNew          from "./components/GeminiChatNew";
import WhatsAppNotifContainer from "./components/ToastNotif";
import "./index.css";

function ProtectedRoute({ children, roles }) {
  const { user, authLoading } = useAuth();
  if (authLoading) return null;
  if (!user) return <Navigate to="/" />;
  // Normalize role — handle both plain string and enum-style object
  const userRole = typeof user.role === 'object' ? user.role?.value : user.role;
  if (roles && !roles.includes(userRole)) return <Navigate to="/" />;
  return children;
}

function AppRoutes() {
  const { user, authLoading } = useAuth();
  if (authLoading) return null;
  return (
    <>
      <Routes>
        <Route path="/"            element={<LoginPageNew />} />
        <Route path="/admin-login" element={<AdminLoginPageNew />} />
        <Route path="/leaderboard" element={<LeaderboardPageNew />} />

        <Route path="/telegram" element={
          <ProtectedRoute roles={["donor","ngo","volunteer","admin"]}>
            <TelegramPage />
          </ProtectedRoute>
        } />

        <Route path="/profile" element={
          <ProtectedRoute roles={["donor","ngo","volunteer","admin"]}>
            <ProfilePage />
          </ProtectedRoute>
        } />

        {/* /donor  /donor/map  /donor/history */}
        <Route path="/donor/*" element={
          <ProtectedRoute roles={["donor"]}><DonorPageNew /></ProtectedRoute>
        } />

        {/* /ngo  /ngo/claimed  /ngo/ai  /ngo/route  /ngo/map */}
        <Route path="/ngo/*" element={
          <ProtectedRoute roles={["ngo"]}><NGOPageNew /></ProtectedRoute>
        } />

        {/* /volunteer  /volunteer/map */}
        <Route path="/volunteer/*" element={
          <ProtectedRoute roles={["volunteer"]}><VolunteerPageNew /></ProtectedRoute>
        } />

        {/* /dashboard  /dashboard/users  /dashboard/food  /dashboard/map */}
        <Route path="/dashboard/*" element={
          <ProtectedRoute roles={["admin"]}><DashboardPageNew /></ProtectedRoute>
        } />
        <Route path="/admin/*" element={
          <ProtectedRoute roles={["admin"]}><DashboardPageNew /></ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      {user && <GeminiChatNew />}
      {user && <WhatsAppNotifContainer />}
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
