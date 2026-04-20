import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { expenseApi } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { ExpenseStatus, Role } from "@expense/shared";
import { Receipt, CheckSquare, Clock, XCircle, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export function OpcoDashboard() {
  const { user } = useAuth();
  const { data: expenses, isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => expenseApi.list(),
  });

  const submitted = expenses?.filter((e) => e.status === ExpenseStatus.SUBMITTED) ?? [];
  const approved = expenses?.filter((e) => e.status === ExpenseStatus.APPROVED) ?? [];
  const rejected = expenses?.filter((e) => e.status === ExpenseStatus.REJECTED) ?? [];
  const totalApproved = approved.reduce((sum, e) => sum + e.amount, 0);

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--color-primary)" }} /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>OpCo Dashboard</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>Expense overview for your operating company</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card flex items-center gap-3">
          <div className="rounded-xl p-2.5" style={{ backgroundColor: "rgba(217,119,6,0.1)" }}>
            <Clock className="h-5 w-5" style={{ color: "var(--color-warning)" }} />
          </div>
          <div>
            <p className="text-xl font-bold" style={{ color: "var(--color-text)" }}>{submitted.length}</p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Pending Review</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="rounded-xl p-2.5" style={{ backgroundColor: "rgba(22,163,74,0.1)" }}>
            <CheckSquare className="h-5 w-5" style={{ color: "var(--color-success)" }} />
          </div>
          <div>
            <p className="text-xl font-bold" style={{ color: "var(--color-text)" }}>{approved.length}</p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Approved</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="rounded-xl p-2.5" style={{ backgroundColor: "rgba(220,38,38,0.1)" }}>
            <XCircle className="h-5 w-5" style={{ color: "var(--color-danger)" }} />
          </div>
          <div>
            <p className="text-xl font-bold" style={{ color: "var(--color-text)" }}>{rejected.length}</p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Rejected</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="rounded-xl p-2.5" style={{ backgroundColor: "rgba(30,58,95,0.1)" }}>
            <Receipt className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
          </div>
          <div>
            <p className="text-xl font-bold" style={{ color: "var(--color-text)" }}>{formatCurrency(totalApproved)}</p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Total Approved</p>
          </div>
        </div>
      </div>

      {submitted.length > 0 && (user?.role === Role.OPCO_ADMIN || user?.role === Role.OPCO_MANAGER) && (
        <div className="card" style={{ borderLeft: `4px solid var(--color-warning)` }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold" style={{ color: "var(--color-text)" }}>
                {submitted.length} expense{submitted.length !== 1 ? "s" : ""} awaiting approval
              </p>
              <p className="mt-0.5 text-sm" style={{ color: "var(--color-text-muted)" }}>
                Review and approve or reject pending submissions
              </p>
            </div>
            <Link to="/opco/approvals" className="btn-primary ml-4 flex-shrink-0">
              Review Now
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
