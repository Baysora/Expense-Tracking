import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { ProtectedRoute, RequireAuth, getRoleHome } from "@/lib/router";
import { AppShell } from "@/components/layout/AppShell";
import { Role } from "@expense/shared";

import { Login } from "@/pages/Login";
import { ChangePassword } from "@/pages/ChangePassword";
import { HoldcoDashboard } from "@/pages/holdco/Dashboard";
import { HoldcoOpCos } from "@/pages/holdco/OpCos";
import { HoldcoUsers } from "@/pages/holdco/Users";
import { HoldcoCategories } from "@/pages/holdco/Categories";
import { HoldcoDepartments } from "@/pages/holdco/Departments";
import { HoldcoAccountMappings } from "@/pages/holdco/AccountMappings";
import { OpcoDashboard } from "@/pages/opco/Dashboard";
import { OpcoUsers } from "@/pages/opco/Users";
import { OpcoCategories } from "@/pages/opco/Categories";
import { OpcoDepartments } from "@/pages/opco/Departments";
import { ExpensesPage } from "@/pages/expenses/ExpensesPage";
import { PendingReviewPage } from "@/pages/expenses/PendingReviewPage";
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
            <Route
              path="/change-password"
              element={
                <RequireAuth>
                  <ChangePassword />
                </RequireAuth>
              }
            />
            <Route path="/" element={<RootRedirect />} />

            {/* HoldCo routes */}
            <Route
              path="/holdco/*"
              element={
                <ProtectedRoute allowedRoles={[Role.HOLDCO_ADMIN, Role.HOLDCO_MANAGER]}>
                  <AppShell>
                    <Routes>
                      <Route path="dashboard" element={<HoldcoDashboard />} />
                      <Route
                        path="opcos"
                        element={
                          <ProtectedRoute allowedRoles={[Role.HOLDCO_ADMIN]}>
                            <HoldcoOpCos />
                          </ProtectedRoute>
                        }
                      />
                      <Route path="users" element={<HoldcoUsers />} />
                      <Route path="expenses" element={<ExpensesPage />} />
                      <Route path="review" element={<PendingReviewPage />} />
                      <Route
                        path="categories"
                        element={
                          <ProtectedRoute allowedRoles={[Role.HOLDCO_ADMIN]}>
                            <HoldcoCategories />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="departments"
                        element={
                          <ProtectedRoute allowedRoles={[Role.HOLDCO_ADMIN]}>
                            <HoldcoDepartments />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="account-mappings"
                        element={
                          <ProtectedRoute allowedRoles={[Role.HOLDCO_ADMIN]}>
                            <HoldcoAccountMappings />
                          </ProtectedRoute>
                        }
                      />
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
                      <Route
                        path="categories"
                        element={
                          <ProtectedRoute allowedRoles={[Role.OPCO_ADMIN]}>
                            <OpcoCategories />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="departments"
                        element={
                          <ProtectedRoute allowedRoles={[Role.OPCO_ADMIN]}>
                            <OpcoDepartments />
                          </ProtectedRoute>
                        }
                      />
                      <Route path="expenses" element={<ExpensesPage />} />
                      <Route path="review" element={<PendingReviewPage />} />
                      <Route path="approvals" element={<Navigate to="/opco/review" replace />} />
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
                <ProtectedRoute allowedRoles={[Role.OPCO_USER, Role.OPCO_ADMIN, Role.OPCO_MANAGER, Role.HOLDCO_USER, Role.HOLDCO_ADMIN, Role.HOLDCO_MANAGER]}>
                  <AppShell>
                    <UserDashboard />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/expenses/new"
              element={
                <ProtectedRoute allowedRoles={[Role.OPCO_USER, Role.OPCO_ADMIN, Role.OPCO_MANAGER, Role.HOLDCO_USER, Role.HOLDCO_ADMIN, Role.HOLDCO_MANAGER]}>
                  <AppShell>
                    <NewExpense />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/expenses/:id"
              element={
                <ProtectedRoute allowedRoles={[Role.OPCO_USER, Role.OPCO_ADMIN, Role.OPCO_MANAGER, Role.HOLDCO_USER, Role.HOLDCO_ADMIN, Role.HOLDCO_MANAGER]}>
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
