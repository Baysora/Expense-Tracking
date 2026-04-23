import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { opcoApi, expenseApi, userApi } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

export function HoldcoDashboard() {
  const { data: opcos, isLoading } = useQuery({
    queryKey: ["opcos"],
    queryFn: opcoApi.list,
  });
  const { data: pending } = useQuery({
    queryKey: ["pending-review", ""],
    queryFn: () => expenseApi.list({ status: "SUBMITTED" }),
    staleTime: 60_000,
  });
  const { data: allUsers } = useQuery({
    queryKey: ["users"],
    queryFn: userApi.list,
  });
  const { data: thisMonthExpenses } = useQuery({
    queryKey: ["expenses-this-month"],
    queryFn: () => {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
      return expenseApi.list({ startDate, endDate });
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--color-primary)" }} />
      </div>
    );
  }

  const displayOpcos = opcos?.filter((o) => !o.isHoldCo) ?? [];
  const activeCount = displayOpcos.filter((o) => o.isActive).length;
  const pendingCount = pending?.length ?? 0;
  const totalEmployees = allUsers?.filter((u) => u.isActive && !u.role.startsWith("HOLDCO_")).length ?? 0;
  const expensesThisMonth = thisMonthExpenses?.length ?? 0;

  const statCard = (icon: string, tint: string, value: string | number, label: string) => (
    <div className="card flex items-center gap-[14px]" style={{ padding: "18px 20px" }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: tint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 18 }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 20, fontWeight: 700, color: "var(--color-text)", lineHeight: 1.1 }}>{value}</p>
        <p style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2, fontWeight: 500 }}>{label}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, fontWeight: 400, color: "var(--color-text)", margin: 0, lineHeight: 1.2 }}>
            Overview
          </h1>
          <p className="mt-1.5 text-sm" style={{ color: "var(--color-text-muted)" }}>
            All operating companies at a glance
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Link to="/holdco/expenses" className="btn-secondary text-sm">
            Export Report
          </Link>
          <Link to="/holdco/opcos" className="btn-primary text-sm">
            + Add Company
          </Link>
        </div>
      </div>

      {/* 4-stat grid */}
      <div className="grid grid-cols-2 gap-[14px] sm:grid-cols-4">
        {statCard("🏢", "rgba(10,72,133,0.15)", activeCount, "Active Companies")}
        {statCard("👥", "rgba(124,58,237,0.15)", totalEmployees, "Total Employees")}
        {statCard("💳", "rgba(243,166,24,0.15)", expensesThisMonth, "Expenses This Month")}
        {statCard("⏳", "rgba(220,38,38,0.15)", pendingCount, "Pending Approval")}
      </div>

      {/* Two-column content */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.5fr_1fr]">
        {/* Companies list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)", margin: 0 }}>Companies</h2>
            <Link to="/holdco/opcos" style={{ background: "none", border: "none", color: "var(--color-primary)", fontSize: 13, fontWeight: 500 }}>
              Manage →
            </Link>
          </div>
          <div className="flex flex-col gap-[10px]">
            {displayOpcos.length === 0 ? (
              <div className="card py-10 text-center">
                <p style={{ color: "var(--color-text-muted)" }}>No companies yet.</p>
                <Link to="/holdco/opcos" className="btn-primary mt-4 inline-flex text-sm">
                  Add First Company
                </Link>
              </div>
            ) : (
              displayOpcos.map((o) => (
                <div
                  key={o.id}
                  className="card"
                  style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, opacity: o.isActive ? 1 : 0.55 }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(10,72,133,0.1)", color: "#0a4885", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {o.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.name}</p>
                    <p style={{ fontSize: 11, color: "var(--color-text-placeholder)" }}>/{o.slug}</p>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      borderRadius: 20,
                      padding: "2px 8px",
                      background: o.isActive ? "#d1fae5" : "#f1f5f9",
                      color: o.isActive ? "#065f46" : "#64748b",
                      flexShrink: 0,
                    }}
                  >
                    {o.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* To Review */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              To Review
              {pendingCount > 0 && (
                <span style={{ background: "#fef3c7", color: "#92400e", fontSize: 10, fontWeight: 700, borderRadius: 20, padding: "1px 7px" }}>
                  {pendingCount}
                </span>
              )}
            </h2>
            <Link to="/holdco/review" style={{ color: "var(--color-primary)", fontSize: 13, fontWeight: 500 }}>
              View all →
            </Link>
          </div>

          {pendingCount === 0 ? (
            <div className="card py-8 text-center">
              <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>All caught up — no pending reviews.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {(pending ?? []).slice(0, 3).map((e) => (
                <div
                  key={e.id}
                  className="card"
                  style={{ padding: "12px 14px", display: "flex", gap: 12, alignItems: "flex-start" }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text)", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</p>
                    <p style={{ fontSize: 11, color: "var(--color-text-placeholder)", marginTop: 3 }}>
                      {e.submittedByName}{e.opCoName ? ` · ${e.opCoName}` : ""}
                    </p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}>
                      {e.currency === "USD" ? "$" : e.currency === "GBP" ? "£" : e.currency === "EUR" ? "€" : ""}{Number(e.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                    <p style={{ fontSize: 11, color: "var(--color-text-placeholder)", marginTop: 2 }}>{formatDate(e.createdAt)}</p>
                  </div>
                </div>
              ))}
              {pendingCount > 3 && (
                <Link
                  to="/holdco/review"
                  className="card"
                  style={{ padding: "8px 14px", textAlign: "center", fontSize: 12, fontWeight: 600, color: "var(--color-text)", border: "1.5px solid var(--color-border)", background: "none", display: "block" }}
                >
                  View all {pendingCount} →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
