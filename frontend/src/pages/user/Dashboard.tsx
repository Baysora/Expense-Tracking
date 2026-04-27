import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { expenseApi } from "@/lib/api";
import { ExpenseStatus } from "@expense/shared";
import { ExpenseTable } from "@/components/expenses/ExpenseTable";
import { Plus, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function UserDashboard() {
  const { user } = useAuth();
  const { data: expenses, isLoading } = useQuery({
    queryKey: ["my-expenses"],
    queryFn: () => expenseApi.list({ mine: true }),
  });

  const now = new Date();
  const pending = expenses?.filter((e) => e.status === ExpenseStatus.SUBMITTED || e.status === ExpenseStatus.DRAFT) ?? [];
  const approvedThisMonth = expenses?.filter((e) => {
    if (e.status !== ExpenseStatus.APPROVED) return false;
    const d = new Date(e.createdAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }) ?? [];
  const totalApprovedThisMonth = approvedThisMonth.reduce((sum, e) => sum + e.amount, 0);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--color-primary)" }} />
      </div>
    );
  }

  const firstName = user?.name?.split(" ")[0] ?? "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, fontWeight: 400, color: "var(--color-text)", margin: 0, lineHeight: 1.2 }}>
            {getGreeting()}, {firstName} 👋
          </h1>
          <p className="mt-1.5 text-sm" style={{ color: "var(--color-text-muted)" }}>
            Here's a summary of your expenses
          </p>
        </div>
        <Link to="/expenses/new" className="btn-primary flex-shrink-0">
          <Plus className="h-4 w-4" /> New Expense
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Total Submitted */}
        <div className="card flex items-center gap-4">
          <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(10,72,133,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 20 }}>
            📋
          </div>
          <div>
            <p style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text)", lineHeight: 1.1 }}>{expenses?.length ?? 0}</p>
            <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 3 }}>Total Submitted</p>
          </div>
        </div>

        {/* In Review */}
        <div className="card flex items-center gap-4">
          <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(243,166,24,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 20 }}>
            ⏳
          </div>
          <div>
            <p style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text)", lineHeight: 1.1 }}>{pending.length}</p>
            <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 3 }}>In Review</p>
          </div>
        </div>

        {/* Approved This Month */}
        <div className="card flex items-center gap-4">
          <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(22,163,74,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 20 }}>
            ✓
          </div>
          <div>
            <p style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text)", lineHeight: 1.1 }}>{formatCurrency(totalApprovedThisMonth)}</p>
            <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 3 }}>Approved This Month</p>
            <p style={{ fontSize: 11, color: "var(--color-text-placeholder)", marginTop: 1 }}>{approvedThisMonth.length} expense{approvedThisMonth.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </div>

      {/* Recent Expenses */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text)", margin: 0 }}>Recent Expenses</h2>
          <Link to="/dashboard" style={{ color: "var(--color-primary)", fontSize: 13, fontWeight: 500 }}>
            View all →
          </Link>
        </div>
        <ExpenseTable expenses={expenses ?? []} editableDrafts />
      </div>
    </div>
  );
}
