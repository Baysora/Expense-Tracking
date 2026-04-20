import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { expenseApi } from "@/lib/api";
import { StatusBadge } from "@/components/expenses/StatusBadge";
import { ExpenseStatus } from "@expense/shared";
import { formatCurrency, formatDate, formatFileSize, getFileIcon } from "@/lib/utils";
import { ArrowLeft, Loader2, ExternalLink, CheckCircle, XCircle } from "lucide-react";

export function ExpenseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: expense, isLoading, error } = useQuery({
    queryKey: ["expense", id],
    queryFn: () => expenseApi.getById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--color-primary)" }} /></div>;
  }

  if (error || !expense) {
    return (
      <div className="card py-10 text-center">
        <p style={{ color: "var(--color-danger)" }}>Expense not found.</p>
        <button onClick={() => navigate(-1)} className="btn-secondary mt-4">Go Back</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-secondary px-2 py-2">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>{expense.title}</h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--color-text-muted)" }}>Submitted {formatDate(expense.createdAt)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Main details */}
        <div className="space-y-4 lg:col-span-2">
          <div className="card">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>Details</h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>Amount</dt>
                <dd className="mt-1 text-xl font-bold" style={{ color: "var(--color-text)" }}>
                  {formatCurrency(expense.amount, expense.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>Status</dt>
                <dd className="mt-1"><StatusBadge status={expense.status} /></dd>
              </div>
              <div>
                <dt className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>Category</dt>
                <dd className="mt-1 text-sm" style={{ color: "var(--color-text)" }}>{expense.categoryName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>Submitted By</dt>
                <dd className="mt-1 text-sm" style={{ color: "var(--color-text)" }}>{expense.submittedByName}</dd>
              </div>
              {expense.description && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>Description</dt>
                  <dd className="mt-1 text-sm" style={{ color: "var(--color-text)" }}>{expense.description}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Attachments */}
          {expense.attachments && expense.attachments.length > 0 && (
            <div className="card">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>Attachments</h2>
              <div className="space-y-2">
                {expense.attachments.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-lg px-3 py-2.5"
                    style={{ backgroundColor: "var(--color-bg-subtle)", border: "1px solid var(--color-border)" }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base">{getFileIcon(a.mimeType)}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium" style={{ color: "var(--color-text)" }}>{a.fileName}</p>
                        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                          {a.type} · {formatFileSize(a.sizeBytes)}
                        </p>
                      </div>
                    </div>
                    {a.sasUrl && (
                      <a
                        href={a.sasUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-3 flex-shrink-0 btn-secondary px-2 py-1.5 text-xs"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        View
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Approval history */}
        <div className="card h-fit">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>Approval History</h2>
          {!expense.approvalRecords || expense.approvalRecords.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              {expense.status === ExpenseStatus.DRAFT
                ? "Not yet submitted."
                : expense.status === ExpenseStatus.SUBMITTED
                ? "Awaiting review."
                : "No approval records."}
            </p>
          ) : (
            <div className="space-y-4">
              {expense.approvalRecords.map((record) => (
                <div key={record.id} className="flex gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {record.action === "APPROVED"
                      ? <CheckCircle className="h-5 w-5" style={{ color: "var(--color-success)" }} />
                      : <XCircle className="h-5 w-5" style={{ color: "var(--color-danger)" }} />
                    }
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                      {record.action === "APPROVED" ? "Approved" : "Rejected"} by {record.reviewedByName}
                    </p>
                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{formatDate(record.createdAt)}</p>
                    {record.comment && (
                      <p className="mt-1 rounded p-2 text-sm" style={{ backgroundColor: "var(--color-bg-subtle)", color: "var(--color-text)" }}>
                        "{record.comment}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
