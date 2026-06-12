import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router";
import { Dashboard } from "./components/Dashboard";
import { LandingPage } from "./LandingPage";
import { AuthPage } from "./AuthPage";
import { fetchMe, logout, type PublicUser } from "./lib/api";

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <span className="text-muted-foreground text-sm">Đang tải...</span>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMe()
      .then((u) => setUser(u))
      .catch(() => {})
      .finally(() => setAuthLoading(false));
  }, []);

  const handleAuthenticated = (nextUser: PublicUser) => {
    setUser(nextUser);
    navigate("/dashboard", { replace: true });
  };

  const handleLogout = () => {
    logout().finally(() => {
      setUser(null);
      navigate("/", { replace: true });
    });
  };

  if (authLoading) return <LoadingScreen />;

  return (
    <Routes>
      <Route
        path="/"
        element={
          user ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <LandingPage />
          )
        }
      />
      <Route
        path="/login"
        element={<AuthPage defaultTab="login" onAuthenticated={handleAuthenticated} isLoggedIn={!!user} />}
      />
      <Route
        path="/register"
        element={<AuthPage defaultTab="register" onAuthenticated={handleAuthenticated} isLoggedIn={!!user} />}
      />
      <Route
        path="/dashboard/*"
        element={
          user ? (
            <Dashboard userName={user.name} onLogout={handleLogout} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} replace />} />
    </Routes>
  );
}
