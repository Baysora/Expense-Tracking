import React from "react";
import { HoldcoSidebar, OpcoSidebar, UserSidebar } from "./Sidebar";
import { Role } from "@expense/shared";
import { useAuth } from "@/lib/AuthContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  function getSidebar() {
    if (!user) return null;
    if (user.role === Role.HOLDCO_ADMIN) return <HoldcoSidebar />;
    if (user.role === Role.OPCO_ADMIN || user.role === Role.OPCO_MANAGER) return <OpcoSidebar />;
    return <UserSidebar />;
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {getSidebar()}
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
