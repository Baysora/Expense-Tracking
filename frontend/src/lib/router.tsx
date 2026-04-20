import React from "react";
import { Navigate } from "react-router-dom";
import { Role } from "@expense/shared";
import { useAuth } from "./AuthContext";

export function getRoleHome(role: Role): string {
  switch (role) {
    case Role.HOLDCO_ADMIN:
      return "/holdco/dashboard";
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

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" style={{ borderColor: "var(--color-primary)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={getRoleHome(user.role)} replace />;
  }

  return <>{children}</>;
}
