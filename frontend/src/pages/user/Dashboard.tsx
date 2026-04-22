import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { expenseApi } from "@/lib/api";
import { ExpenseStatus } from "@expense/shared";
import { ExpenseTable } from "@/components/expenses/ExpenseTable";
import { Plus, Loader2, Receipt, Clock, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";

export function UserDashboard() {
  const { user } = useAuth();
  const { data: expenses, isLoading } = useQuery({
    queryKey: ["my-expenses"],
    queryFn: () => expenseApi.list({ mine: true }),
  });

  const pending = expenses?.filter((e) => e.status === ExpenseStatus.SUBMITTED || e.status === ExpenseStatus.DRAFT) ?? [];
  const approved = expenses?.filter((e) => e.status === ExpenseStatus.APPROVED) ?? [];
  const totalApproved = approved.reduce((sum, e) => sum + e.amount, 0);

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--color-primary)" }} /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
            Welcome, {user?.name?.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>Your expense submissions</p>
        </div>
        <Link to="/expenses/new" className="btn-primary">
          <Plus className="h-4 w-4" /> Submit Expense
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card flex items-center gap-3">
          <div className="rounded-xl p-2.5" style={{ backgroundColor: "rgba(30,58,95,0.1)" }}>
            <Receipt className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
          </div>
          <div>
            <p className="text-xl font-bold" style={{ color: "var(--color-text)" }}>{expenses?.length ?? 0}</p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Total Submitted</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="rounded-xl p-2.5" style={{ backgroundColor: "rgba(217,119,6,0.1)" }}>
            <Clock className="h-5 w-5" style={{ color: "var(--color-warning)" }} />
          </div>
          <div>
            <p className="text-xl font-bold" style={{ color: "var(--color-text)" }}>{pending.length}</p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Pending Review</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="rounded-xl p-2.5" style={{ backgroundColor: "rgba(22,163,74,0.1)" }}>
            <CheckCircle className="h-5 w-5" style={{ color: "var(--color-success)" }} />
          </div>
          <div>
            <p className="text-xl font-bold" style={{ color: "var(--color-text)" }}>{formatCurrency(totalApproved)}</p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Approved Total</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold" style={{ color: "var(--color-text)" }}>Recent Expenses</h2>
        <ExpenseTable expenses={expenses ?? []} />
      </div>
    </div>
  );
}
