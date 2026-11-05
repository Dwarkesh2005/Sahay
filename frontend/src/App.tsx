import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { MainLayout } from './layouts/MainLayout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { NgoDirectoryPage } from './pages/NgoDirectoryPage';
import { NgoDetailPage } from './pages/NgoDetailPage';
import { CreateRequestPage } from './pages/CreateRequestPage';
import { UserDashboardPage } from './pages/UserDashboardPage';
import { NgoDashboardPage } from './pages/NgoDashboardPage';
import { NgoVerificationPage } from './pages/NgoVerificationPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminVerificationDetailPage } from './pages/AdminVerificationDetailPage';
import { ProfilePage } from './pages/ProfilePage';
import { ReportNgoPage } from './pages/ReportNgoPage';
import { ProtectedRoute } from './components/common/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <MainLayout>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/ngos" element={<NgoDirectoryPage />} />
            <Route path="/ngos/:id" element={<NgoDetailPage />} />

            {/* Protected Routes: Migrant / User */}
            <Route
              path="/report-ngo"
              element={
                <ProtectedRoute allowedRoles={['MIGRANT']}>
                  <ReportNgoPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/request-help"
              element={
                <ProtectedRoute allowedRoles={['MIGRANT', 'VOLUNTEER', 'ADMIN']}>
                  <CreateRequestPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['MIGRANT', 'VOLUNTEER', 'ADMIN']}>
                  <UserDashboardPage />
                </ProtectedRoute>
              }
            />

            {/* Protected Routes: NGO Portal */}
            <Route
              path="/ngo-portal"
              element={
                <ProtectedRoute allowedRoles={['NGO', 'ADMIN']}>
                  <NgoDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ngo-portal/verification"
              element={
                <ProtectedRoute allowedRoles={['NGO', 'ADMIN']}>
                  <NgoVerificationPage />
                </ProtectedRoute>
              }
            />

            {/* Protected Routes: Admin Console */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/verifications/:id"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminVerificationDetailPage />
                </ProtectedRoute>
              }
            />

            {/* Protected Route: User Profile */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </MainLayout>
      </Router>
    </AuthProvider>
  );
}

export default App;
