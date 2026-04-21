import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { ProtectedRoute, getRoleHome } from "@/lib/router";
import { AppShell } from "@/components/layout/AppShell";
import { Role } from "@expense/shared";

import { Login } from "@/pages/Login";
import { HoldcoDashboard } from "@/pages/holdco/Dashboard";
import { HoldcoOpCos } from "@/pages/holdco/OpCos";
import { HoldcoUsers } from "@/pages/holdco/Users";
import { HoldcoExpenses } from "@/pages/holdco/Expenses";
import { HoldcoCategories } from "@/pages/holdco/Categories";
import { OpcoDashboard } from "@/pages/opco/Dashboard";
import { OpcoUsers } from "@/pages/opco/Users";
import { OpcoCategories } from "@/pages/opco/Categories";
import { OpcoExpenses } from "@/pages/opco/Expenses";
import { OpcoApprovals } from "@/pages/opco/Approvals";
import { UserDashboard } from "@/pages/user/Dashboard";
import { NewExpense } from "@/pages/user/NewExpense";
import { ExpenseDetail } from "@/pages/user/ExpenseDetail";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function RootRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={getRoleHome(user.role)} replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<RootRedirect />} />

            {/* HoldCo routes */}
            <Route
              path="/holdco/*"
              element={
                <ProtectedRoute allowedRoles={[Role.HOLDCO_ADMIN]}>
                  <AppShell>
                    <Routes>
                      <Route path="dashboard" element={<HoldcoDashboard />} />
                      <Route path="opcos" element={<HoldcoOpCos />} />
                      <Route path="users" element={<HoldcoUsers />} />
                      <Route path="expenses" element={<HoldcoExpenses />} />
                      <Route path="categories" element={<HoldcoCategories />} />
                      <Route path="*" element={<Navigate to="dashboard" replace />} />
                    </Routes>
                  </AppShell>
                </ProtectedRoute>
              }
            />

            {/* OpCo routes */}
            <Route
              path="/opco/*"
              element={
                <ProtectedRoute allowedRoles={[Role.OPCO_ADMIN, Role.OPCO_MANAGER]}>
                  <AppShell>
                    <Routes>
                      <Route path="dashboard" element={<OpcoDashboard />} />
                      <Route path="users" element={<OpcoUsers />} />
                      <Route path="categories" element={<OpcoCategories />} />
                      <Route path="expenses" element={<OpcoExpenses />} />
                      <Route path="approvals" element={<OpcoApprovals />} />
                      <Route path="*" element={<Navigate to="dashboard" replace />} />
                    </Routes>
                  </AppShell>
                </ProtectedRoute>
              }
            />

            {/* User routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={[Role.OPCO_USER, Role.OPCO_ADMIN, Role.OPCO_MANAGER, Role.HOLDCO_USER, Role.HOLDCO_ADMIN]}>
                  <AppShell>
                    <UserDashboard />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/expenses/new"
              element={
                <ProtectedRoute allowedRoles={[Role.OPCO_USER, Role.OPCO_ADMIN, Role.OPCO_MANAGER, Role.HOLDCO_USER, Role.HOLDCO_ADMIN]}>
                  <AppShell>
                    <NewExpense />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/expenses/:id"
              element={
                <ProtectedRoute allowedRoles={[Role.OPCO_USER, Role.OPCO_ADMIN, Role.OPCO_MANAGER, Role.HOLDCO_USER, Role.HOLDCO_ADMIN]}>
                  <AppShell>
                    <ExpenseDetail />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
