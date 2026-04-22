import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { expenseApi } from "@/lib/api";
import { Expense } from "@expense/shared";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";

function ApprovalCard({ expense }: { expense: Expense }) {
  const qc = useQueryClient();
  const [comment, setComment] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const review = useMutation({
    mutationFn: ({ action, comment }: { action: "APPROVED" | "REJECTED"; comment?: string }) =>
      expenseApi.review(expense.id, { action, comment }),
    onSuccess: () => {
      setReviewError(null);
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (e: Error) => setReviewError(e.message),
  });

  return (
    <div className="card space-y-3">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start justify-between text-left"
      >
        <div className="min-w-0">
          <p className="font-semibold" style={{ color: "var(--color-text)" }}>{expense.title}</p>
          <p className="mt-0.5 text-sm" style={{ color: "var(--color-text-muted)" }}>
            By {expense.submittedByName} · {expense.categoryName} · {formatDate(expense.createdAt)}
          </p>
        </div>
        <div className="ml-4 flex flex-shrink-0 items-center gap-3">
          <span className="text-base font-bold" style={{ color: "var(--color-text)" }}>
            {formatCurrency(expense.amount, expense.currency)}
          </span>
          {expanded ? <ChevronUp className="h-4 w-4" style={{ color: "var(--color-text-muted)" }} /> : <ChevronDown className="h-4 w-4" style={{ color: "var(--color-text-muted)" }} />}
        </div>
      </button>

      {expanded && (
        <div className="space-y-3 border-t pt-3" style={{ borderColor: "var(--color-border)" }}>
          {expense.description && (
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{expense.description}</p>
          )}
          <div>
            <label className="label">Comment (optional)</label>
            <textarea
              className="input resize-none"
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a note to your decision…"
            />
          </div>
          {reviewError && <p className="text-sm" style={{ color: "var(--color-danger)" }}>{reviewError}</p>}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => review.mutate({ action: "APPROVED", comment: comment || undefined })}
              disabled={review.isPending}
              className="btn-primary flex-1 justify-center"
              style={{ backgroundColor: "var(--color-success)" }}
            >
              {review.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Approve
            </button>
            <button
              onClick={() => review.mutate({ action: "REJECTED", comment: comment || undefined })}
              disabled={review.isPending}
              className="btn-danger flex-1 justify-center"
            >
              {review.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function OpcoApprovals() {
  const { data: expenses, isLoading } = useQuery({
    queryKey: ["expenses", "SUBMITTED"],
    queryFn: () => expenseApi.list({ status: "SUBMITTED" }),
  });

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--color-primary)" }} /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>Pending Approvals</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
          {expenses?.length ?? 0} expense{expenses?.length !== 1 ? "s" : ""} awaiting review
        </p>
      </div>

      {!expenses || expenses.length === 0 ? (
        <div className="card py-16 text-center">
          <CheckCircle className="mx-auto mb-3 h-10 w-10" style={{ color: "var(--color-success)" }} />
          <p className="font-medium" style={{ color: "var(--color-text)" }}>All caught up!</p>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>No expenses are waiting for your review.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {expenses.map((e) => <ApprovalCard key={e.id} expense={e} />)}
        </div>
      )}
    </div>
  );
}
