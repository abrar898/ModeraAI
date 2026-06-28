import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { NotificationProvider } from './context/NotificationContext';
import { ProtectedRoute, PublicOnlyRoute } from './components/shared/ProtectedRoute';
import AppLayout from './components/shared/AppLayout';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Submit from './pages/Submit';
import Submissions from './pages/Submissions';
import SubmissionDetail from './pages/SubmissionDetail';
import MyAppeals from './pages/MyAppeals';

import AdminOverview from './pages/admin/AdminOverview';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminSubmissions from './pages/admin/AdminSubmissions';
import AdminSubmissionDetail from './pages/admin/AdminSubmissionDetail';
import AdminAppeals from './pages/admin/AdminAppeals';
import AdminPolicy from './pages/admin/AdminPolicy';
import AdminUsers from './pages/admin/AdminUsers';
import AdminPolicyHistory from './pages/admin/AdminPolicyHistory';
import AdminAuditLog from './pages/admin/AdminAuditLog';
import AdminLiveFeed from './pages/admin/AdminLiveFeed';

function withLayout(Component, adminOnly = false) {
  return (
    <ProtectedRoute adminOnly={adminOnly}>
      <AppLayout>
        <Component />
      </AppLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <NotificationProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
            <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />

            {/* User */}
            <Route path="/dashboard" element={withLayout(Dashboard)} />
            <Route path="/submit" element={withLayout(Submit)} />
            <Route path="/submissions" element={withLayout(Submissions)} />
            <Route path="/submissions/:id" element={withLayout(SubmissionDetail)} />
            <Route path="/appeals" element={withLayout(MyAppeals)} />

            {/* Admin */}
            <Route path="/admin/dashboard" element={withLayout(AdminOverview, true)} />
            <Route path="/admin/analytics" element={withLayout(AdminDashboard, true)} />
            <Route path="/admin/submissions" element={withLayout(AdminSubmissions, true)} />
            <Route path="/admin/submissions/:id" element={withLayout(AdminSubmissionDetail, true)} />
            <Route path="/admin/appeals" element={withLayout(AdminAppeals, true)} />
            <Route path="/admin/policy" element={withLayout(AdminPolicy, true)} />
            <Route path="/admin/policy/history" element={withLayout(AdminPolicyHistory, true)} />
            <Route path="/admin/users" element={withLayout(AdminUsers, true)} />
            <Route path="/admin/audit-log" element={withLayout(AdminAuditLog, true)} />
            <Route path="/admin/live-feed" element={withLayout(AdminLiveFeed, true)} />

            {/* Default */}
            <Route path="*" element={<Home />} />
          </Routes>
        </BrowserRouter>
        </NotificationProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
