import React from "react";
import { Link } from "react-router-dom";
import { Expense } from "@expense/shared";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";
import { ChevronRight, Paperclip } from "lucide-react";

interface ExpenseTableProps {
  expenses: Expense[];
  showSubmitter?: boolean;
}

export function ExpenseTable({ expenses, showSubmitter = false }: ExpenseTableProps) {
  if (expenses.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center py-12 text-center">
        <p className="text-base font-medium" style={{ color: "var(--color-text)" }}>
          No expenses yet
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
          Expenses will appear here once submitted.
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden p-0">
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
              <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--color-text-muted)" }}>
                Title
              </th>
              {showSubmitter && (
                <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--color-text-muted)" }}>
                  Submitted By
                </th>
              )}
              <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--color-text-muted)" }}>
                Category
              </th>
              <th className="px-4 py-3 text-right font-semibold" style={{ color: "var(--color-text-muted)" }}>
                Amount
              </th>
              <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--color-text-muted)" }}>
                Status
              </th>
              <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--color-text-muted)" }}>
                Date
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr
                key={expense.id}
                className="border-b last:border-0 hover:bg-gray-50 transition-colors"
                style={{ borderColor: "var(--color-border)" }}
              >
                <td className="px-4 py-3">
                  <span className="font-medium" style={{ color: "var(--color-text)" }}>
                    {expense.title}
                  </span>
                </td>
                {showSubmitter && (
                  <td className="px-4 py-3" style={{ color: "var(--color-text-muted)" }}>
                    {expense.submittedByName}
                  </td>
                )}
                <td className="px-4 py-3" style={{ color: "var(--color-text-muted)" }}>
                  {expense.categoryName}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatCurrency(expense.amount, expense.currency)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={expense.status} />
                </td>
                <td className="px-4 py-3" style={{ color: "var(--color-text-muted)" }}>
                  {formatDate(expense.createdAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={`/expenses/${expense.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
                    style={{ color: "var(--color-primary)" }}
                  >
                    View <ChevronRight className="h-3 w-3" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="sm:hidden divide-y" style={{ borderColor: "var(--color-border)" }}>
        {expenses.map((expense) => (
          <Link
            key={expense.id}
            to={`/expenses/${expense.id}`}
            className="flex items-start justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate" style={{ color: "var(--color-text)" }}>
                {expense.title}
              </p>
              <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
                {expense.categoryName} · {formatDate(expense.createdAt)}
              </p>
              {showSubmitter && (
                <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
                  By {expense.submittedByName}
                </p>
              )}
              <div className="mt-2">
                <StatusBadge status={expense.status} />
              </div>
            </div>
            <div className="ml-4 flex-shrink-0 text-right">
              <p className="font-semibold" style={{ color: "var(--color-text)" }}>
                {formatCurrency(expense.amount, expense.currency)}
              </p>
              <ChevronRight className="mt-1 h-4 w-4 ml-auto" style={{ color: "var(--color-text-muted)" }} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
