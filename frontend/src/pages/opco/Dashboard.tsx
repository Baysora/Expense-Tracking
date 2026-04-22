import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { expenseApi } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { ExpenseStatus, Role } from "@expense/shared";
import { ExpenseTable } from "@/components/expenses/ExpenseTable";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export function OpcoDashboard() {
  const { user } = useAuth();
  const canApprove = user?.role === Role.OPCO_ADMIN || user?.role === Role.OPCO_MANAGER;

  const { data: expenses, isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => expenseApi.list(),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--color-primary)" }} />
      </div>
    );
  }

  const submitted = expenses?.filter((e) => e.status === ExpenseStatus.SUBMITTED) ?? [];
  const approved = expenses?.filter((e) => e.status === ExpenseStatus.APPROVED) ?? [];
  const rejected = expenses?.filter((e) => e.status === ExpenseStatus.REJECTED) ?? [];
  const totalApproved = approved.reduce((sum, e) => sum + e.amount, 0);
  const pendingCount = submitted.length;

  const statCard = (icon: string, tint: string, value: string | number, label: string) => (
    <div className="card flex items-center gap-4" style={{ padding: "20px 22px" }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: tint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 20 }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text)", lineHeight: 1.1 }}>{value}</p>
        <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 3, fontWeight: 500 }}>{label}</p>
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
            Expense overview for your operating company
          </p>
        </div>
        {canApprove && pendingCount > 0 && (
          <Link to="/opco/review" className="btn-primary flex-shrink-0 text-sm">
            To Review
            <span style={{ background: "rgba(255,255,255,0.25)", borderRadius: 20, fontSize: 11, fontWeight: 700, padding: "1px 7px", marginLeft: 4 }}>
              {pendingCount}
            </span>
          </Link>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {statCard("⏳", "rgba(243,166,24,0.1)", pendingCount, "In Review")}
        {statCard("✓", "rgba(22,163,74,0.1)", approved.length, "Approved")}
        {statCard("💳", "rgba(10,72,133,0.1)", formatCurrency(totalApproved), "Total Approved")}
      </div>

      {/* Recent expenses */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text)", margin: 0 }}>
            Recent Expenses
          </h2>
          <Link to="/opco/expenses" style={{ color: "var(--color-primary)", fontSize: 13, fontWeight: 500 }}>
            View all →
          </Link>
        </div>
        <ExpenseTable
          expenses={(expenses ?? []).slice(0, 10)}
          showSubmitter={canApprove}
        />
      </div>
    </div>
  );
}
