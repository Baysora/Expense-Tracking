import React from "react";
import { Link } from "react-router-dom";
import { Expense } from "@expense/shared";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";
import { ChevronRight } from "lucide-react";

interface ExpenseTableProps {
  expenses: Expense[];
  showSubmitter?: boolean;
  showOpCo?: boolean;
}

const thStyle: React.CSSProperties = {
  padding: "12px 16px",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "var(--color-text-placeholder)",
  backgroundColor: "var(--color-bg)",
  borderBottom: "1px solid var(--color-bg-warm-hover)",
};

export function ExpenseTable({ expenses, showSubmitter = false, showOpCo = false }: ExpenseTableProps) {
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
        <table className="w-full" style={{ borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={thStyle}>Expense</th>
              {showOpCo && <th style={thStyle}>Company</th>}
              {showSubmitter && <th style={thStyle}>Submitted By</th>}
              <th style={thStyle}>Category</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Date</th>
              <th style={{ ...thStyle, width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense, i) => (
              <tr
                key={expense.id}
                style={{
                  borderTop: i > 0 ? "1px solid var(--color-bg-warm-hover)" : "none",
                  transition: "background 0.1s",
                }}
                className="hover:bg-[#f9f8f6]"
              >
                <td style={{ padding: "13px 16px", fontWeight: 500, color: "var(--color-text)" }}>
                  {expense.title}
                </td>
                {showOpCo && (
                  <td style={{ padding: "13px 16px", color: "var(--color-text-muted)" }}>
                    {expense.opCoName}
                  </td>
                )}
                {showSubmitter && (
                  <td style={{ padding: "13px 16px", color: "var(--color-text-muted)" }}>
                    {expense.submittedByName}
                  </td>
                )}
                <td style={{ padding: "13px 16px", color: "var(--color-text-muted)" }}>
                  {expense.categoryName}
                </td>
                <td style={{ padding: "13px 16px", textAlign: "right", fontWeight: 600, color: "var(--color-text)", whiteSpace: "nowrap" }}>
                  {formatCurrency(expense.amount, expense.currency)}
                </td>
                <td style={{ padding: "13px 16px" }}>
                  <StatusBadge status={expense.status} />
                </td>
                <td style={{ padding: "13px 16px", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                  {formatDate(expense.createdAt)}
                </td>
                <td style={{ padding: "13px 16px", textAlign: "right" }}>
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
      <div className="sm:hidden divide-y" style={{ borderColor: "var(--color-bg-warm-hover)" }}>
        {expenses.map((expense) => (
          <Link
            key={expense.id}
            to={`/expenses/${expense.id}`}
            className="flex items-start justify-between p-4 hover:bg-[#f9f8f6] transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate" style={{ color: "var(--color-text)" }}>
                {expense.title}
              </p>
              <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
                {expense.categoryName} · {formatDate(expense.createdAt)}
              </p>
              {showOpCo && (
                <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {expense.opCoName}
                </p>
              )}
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
