import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { expenseApi } from "@/lib/api";
import { getRoleHome } from "@/lib/router";
import {
  Building2,
  Users,
  Receipt,
  ReceiptText,
  Tag,
  CheckSquare,
  LogOut,
  Menu,
  X,
  Home,
  PlusCircle,
  Network,
  Link2,
} from "lucide-react";
import { Role } from "@expense/shared";
import type { TokenClaims } from "@expense/shared";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: number;
}

interface NavSection {
  label?: string;
  items: NavItem[];
}

function Logo() {
  return (
    <div className="flex items-center px-5 py-5">
      <img src="/logo-white.png" alt="Baysora" style={{ height: 28, width: "auto" }} />
    </div>
  );
}

function NavItemList({ items, onClose }: { items: NavItem[]; onClose?: () => void }) {
  return (
    <>
      {items.map((item) => (
        <NavLink
          key={item.path + item.label}
          to={item.path}
          end={item.path === "/dashboard"}
          onClick={onClose}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-[10px] rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
              isActive
                ? "bg-white/[0.12] text-white"
                : "text-white/75 hover:bg-white/[0.07] hover:text-white"
            )
          }
        >
          {({ isActive }) => (
            <>
              <span style={{ opacity: isActive ? 1 : 0.65, flexShrink: 0 }}>{item.icon}</span>
              <span>{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span
                  style={{
                    marginLeft: "auto",
                    background: "#f3a618",
                    color: "#1c2631",
                    borderRadius: 20,
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "1px 6px",
                    lineHeight: "16px",
                  }}
                >
                  {item.badge}
                </span>
              )}
            </>
          )}
        </NavLink>
      ))}
    </>
  );
}

function NavSections({ sections, onClose }: { sections: NavSection[]; onClose?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5 px-2">
      {sections.map((section, i) => (
        <React.Fragment key={i}>
          {i > 0 && (
            <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "6px 4px" }} />
          )}
          {section.label && (
            <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "4px 12px 2px" }}>
              {section.label}
            </p>
          )}
          <NavItemList items={section.items} onClose={onClose} />
        </React.Fragment>
      ))}
    </nav>
  );
}

function buildNavSections(user: TokenClaims, pendingCount: number): NavSection[] {
  const isHoldCo =
    user.role === Role.HOLDCO_ADMIN ||
    user.role === Role.HOLDCO_MANAGER ||
    user.role === Role.HOLDCO_USER;
  const isAdmin = user.role === Role.HOLDCO_ADMIN || user.role === Role.OPCO_ADMIN;
  const isManager = user.role === Role.HOLDCO_MANAGER || user.role === Role.OPCO_MANAGER;
  const canReview = isAdmin || isManager;
  const isHoldCoAdmin = user.role === Role.HOLDCO_ADMIN;

  const homePath = getRoleHome(user.role);

  const sections: NavSection[] = [];

  sections.push({
    items: [
      { label: "Home", path: homePath, icon: <Home className="h-4 w-4" /> },
      { label: "My Expenses", path: "/dashboard", icon: <Receipt className="h-4 w-4" /> },
      { label: "New Expense", path: "/expenses/new", icon: <PlusCircle className="h-4 w-4" /> },
    ],
  });

  if (canReview) {
    const prefix = isHoldCo ? "/holdco" : "/opco";
    sections.push({
      label: "Review",
      items: [
        { label: "All Expenses", path: `${prefix}/expenses`, icon: <ReceiptText className="h-4 w-4" /> },
        { label: "To Review", path: `${prefix}/review`, icon: <CheckSquare className="h-4 w-4" />, badge: pendingCount },
      ],
    });
  }

  const manageItems: NavItem[] = [];
  if (isHoldCoAdmin) {
    manageItems.push({ label: "Companies", path: "/holdco/opcos", icon: <Building2 className="h-4 w-4" /> });
  }
  if (canReview) {
    const teamPath = isHoldCo ? "/holdco/users" : "/opco/users";
    manageItems.push({ label: "Team", path: teamPath, icon: <Users className="h-4 w-4" /> });
  }
  if (isAdmin) {
    const catPath = isHoldCo ? "/holdco/categories" : "/opco/categories";
    manageItems.push({ label: "Categories", path: catPath, icon: <Tag className="h-4 w-4" /> });
    const deptPath = isHoldCo ? "/holdco/departments" : "/opco/departments";
    manageItems.push({ label: "Departments", path: deptPath, icon: <Network className="h-4 w-4" /> });
  }
  if (isHoldCoAdmin) {
    manageItems.push({ label: "Account Mappings", path: "/holdco/account-mappings", icon: <Link2 className="h-4 w-4" /> });
  }
  if (manageItems.length) {
    sections.push({ label: "Manage", items: manageItems });
  }

  return sections;
}

export function Sidebar() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const canReview =
    user?.role === Role.HOLDCO_ADMIN ||
    user?.role === Role.OPCO_ADMIN ||
    user?.role === Role.HOLDCO_MANAGER ||
    user?.role === Role.OPCO_MANAGER;

  const { data: pendingExpenses } = useQuery({
    queryKey: ["pending-count"],
    queryFn: () => expenseApi.list({ status: "SUBMITTED" }),
    staleTime: 60_000,
    enabled: !!user && canReview,
  });
  const pendingCount = pendingExpenses?.length ?? 0;

  if (!user) return null;

  const navSections = buildNavSections(user, pendingCount);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const sidebarContent = (
    <div className="flex h-full flex-col" style={{ backgroundColor: "var(--color-sidebar)" }}>
      <Logo />
      <div className="flex-1 overflow-y-auto py-1">
        <NavSections sections={navSections} onClose={() => setMobileOpen(false)} />
      </div>
      <div className="p-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-[10px] px-1 mb-3">
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "rgba(243,166,24,0.25)",
              color: "#f3a618",
              fontWeight: 700,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {user.name?.charAt(0).toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p style={{ color: "white", fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.name}
            </p>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            style={{ opacity: 0.4, flexShrink: 0 }}
            className="text-white hover:opacity-70 transition-opacity"
            aria-label="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
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
          <div className="absolute inset-y-0 left-0 w-[220px] shadow-xl">
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
      <div className="hidden w-[220px] flex-shrink-0 lg:block">
        <div className="fixed inset-y-0 w-[220px]">{sidebarContent}</div>
      </div>
    </>
  );
}
