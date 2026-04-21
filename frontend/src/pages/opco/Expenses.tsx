import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { expenseApi } from "@/lib/api";
import { ExpenseTable } from "@/components/expenses/ExpenseTable";
import { Loader2 } from "lucide-react";

const STATUS_FILTERS = ["All", "DRAFT", "SUBMITTED", "APPROVED", "REJECTED"];

export function OpcoExpenses() {
  const [statusFilter, setStatusFilter] = useState("All");

  const { data: expenses, isLoading } = useQuery({
    queryKey: ["expenses", statusFilter],
    queryFn: () => expenseApi.list(statusFilter === "All" ? undefined : { status: statusFilter }),
  });

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--color-primary)" }} /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>All Expenses</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>View all expense submissions in your OpCo</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={s === statusFilter ? "btn-primary px-3 py-1.5 text-xs" : "btn-secondary px-3 py-1.5 text-xs"}
          >
            {s === "All" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <ExpenseTable expenses={expenses ?? []} showSubmitter />
    </div>
  );
}
