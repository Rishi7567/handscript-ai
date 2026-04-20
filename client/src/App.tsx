import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Header from './components/layout/Header';
import ToastContainer from './components/ui/Toast';
import Landing from './pages/Landing';
import AuthCallback from './pages/AuthCallback';
import Onboarding from './pages/Onboarding';
import Generator from './pages/Generator';
import Library from './pages/Library';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-paper font-sans">
        <Header />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth-callback" element={<AuthCallback />} />
          {/* Generator accessible without auth for testing ML service */}
          <Route path="/generator" element={<Generator />} />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/library"
            element={
              <ProtectedRoute>
                <Library />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastContainer />
      </div>
    </BrowserRouter>
  );
}

export default App;
