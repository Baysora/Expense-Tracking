import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Role } from "@expense/shared";
import { useAuth } from "./AuthContext";

export function getRoleHome(role: Role): string {
  switch (role) {
    case Role.HOLDCO_ADMIN:
    case Role.HOLDCO_MANAGER:
      return "/holdco/dashboard";
    case Role.HOLDCO_USER:
      return "/dashboard";
    case Role.OPCO_ADMIN:
    case Role.OPCO_MANAGER:
      return "/opco/dashboard";
    default:
      return "/dashboard";
  }
}

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: Role[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" style={{ borderColor: "var(--color-primary)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (user.mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={getRoleHome(user.role)} replace />;
  }

  return <>{children}</>;
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" style={{ borderColor: "var(--color-primary)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
