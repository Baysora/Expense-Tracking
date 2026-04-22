import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import {
  LayoutDashboard,
  Building2,
  Users,
  Receipt,
  Tag,
  CheckSquare,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { Role } from "@expense/shared";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

function Logo() {
  return (
    <div className="flex items-center px-5 py-5">
      <img src="/logo-white.png" alt="Baysora" className="h-7 w-auto" />
    </div>
  );
}

function NavItems({ items, onClose }: { items: NavItem[]; onClose?: () => void }) {
  return (
    <nav className="flex flex-col gap-1 px-3">
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          onClick={onClose}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-white/20 text-white"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            )
          }
        >
          {item.icon}
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function Sidebar({ navItems }: { navItems: NavItem[] }) {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const sidebarContent = (
    <div className="flex h-full flex-col" style={{ backgroundColor: "var(--color-sidebar)" }}>
      <Logo />
      <div className="flex-1 overflow-y-auto py-2">
        <NavItems items={navItems} onClose={() => setMobileOpen(false)} />
      </div>
      <div className="border-t border-white/20 p-4">
        <div className="mb-3 flex items-center gap-3 px-1">
          <div
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
          >
            {user?.name?.charAt(0).toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user?.name}</p>
            <p className="truncate text-xs text-white/60">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div
        className="flex items-center justify-between px-4 py-3 lg:hidden"
        style={{ backgroundColor: "var(--color-sidebar)" }}
      >
        <Logo />
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 text-white/80 hover:bg-white/10"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64 shadow-xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-white/80 hover:bg-white/10"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden w-64 flex-shrink-0 lg:block">
        <div className="fixed inset-y-0 w-64">{sidebarContent}</div>
      </div>
    </>
  );
}

export function HoldcoSidebar() {
  const { user } = useAuth();
  const isAdmin = user?.role === Role.HOLDCO_ADMIN;

  const navItems: NavItem[] = [
    { label: "Dashboard", path: "/holdco/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    ...(isAdmin ? [
      { label: "OpCos", path: "/holdco/opcos", icon: <Building2 className="h-4 w-4" /> },
      { label: "Users", path: "/holdco/users", icon: <Users className="h-4 w-4" /> },
    ] : []),
    { label: "All Expenses", path: "/holdco/expenses", icon: <Receipt className="h-4 w-4" /> },
    { label: "Pending Review", path: "/holdco/review", icon: <CheckSquare className="h-4 w-4" /> },
    ...(isAdmin ? [
      { label: "Categories", path: "/holdco/categories", icon: <Tag className="h-4 w-4" /> },
    ] : []),
    { label: "My Expenses", path: "/dashboard", icon: <ChevronRight className="h-4 w-4" /> },
    { label: "Submit Expense", path: "/expenses/new", icon: <ChevronRight className="h-4 w-4" /> },
  ];
  return <Sidebar navItems={navItems} />;
}

export function OpcoSidebar() {
  const { user } = useAuth();
  const isAdmin = user?.role === Role.OPCO_ADMIN;
  const canApprove = user?.role === Role.OPCO_ADMIN || user?.role === Role.OPCO_MANAGER;

  const navItems: NavItem[] = [
    { label: "Dashboard", path: "/opco/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    ...(isAdmin ? [{ label: "Users", path: "/opco/users", icon: <Users className="h-4 w-4" /> }] : []),
    { label: "OpCo Expenses", path: "/opco/expenses", icon: <Receipt className="h-4 w-4" /> },
    { label: "Categories", path: "/opco/categories", icon: <Tag className="h-4 w-4" /> },
    ...(canApprove ? [{ label: "Pending Review", path: "/opco/review", icon: <CheckSquare className="h-4 w-4" /> }] : []),
    { label: "My Expenses", path: "/dashboard", icon: <ChevronRight className="h-4 w-4" /> },
    { label: "Submit Expense", path: "/expenses/new", icon: <ChevronRight className="h-4 w-4" /> },
  ];
  return <Sidebar navItems={navItems} />;
}

export function UserSidebar() {
  const navItems: NavItem[] = [
    { label: "My Expenses", path: "/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: "Submit Expense", path: "/expenses/new", icon: <Receipt className="h-4 w-4" /> },
  ];
  return <Sidebar navItems={navItems} />;
}
