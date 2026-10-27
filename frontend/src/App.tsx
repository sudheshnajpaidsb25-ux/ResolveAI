import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoadingSpinner } from './components/common/LoadingSpinner';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { IncidentsList } from './pages/IncidentsList';
import { IncidentDetail } from './pages/IncidentDetail';
import { CreateIncident } from './pages/CreateIncident';
import { Technicians } from './pages/Technicians';
import { SLAMonitoring } from './pages/SLAMonitoring';
import { AIRiskPrediction } from './pages/AIRiskPrediction';
import { Reports } from './pages/Reports';
import { NotificationsPage } from './pages/NotificationsPage';
import { UserManagement } from './pages/UserManagement';
import { SettingsPage } from './pages/SettingsPage';
import { UserRole } from './types';

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: UserRole[] }> = ({
  children,
  allowedRoles
}) => {
  const { user, token, isLoading, hasRole } = useAuth();

  if (isLoading) {
    return <LoadingSpinner size="lg" className="min-h-screen" />;
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !hasRole(allowedRoles)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Route */}
            <Route path="/login" element={<Login />} />

            {/* Protected SaaS Layout */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="incidents" element={<IncidentsList />} />
              <Route path="incidents/create" element={<CreateIncident />} />
              <Route path="incidents/:id" element={<IncidentDetail />} />
              <Route
                path="technicians"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Technician']}>
                    <Technicians />
                  </ProtectedRoute>
                }
              />
              <Route path="sla" element={<SLAMonitoring />} />
              <Route path="ml-prediction" element={<AIRiskPrediction />} />
              <Route path="reports" element={<Reports />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route
                path="users"
                element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <UserManagement />
                  </ProtectedRoute>
                }
              />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
