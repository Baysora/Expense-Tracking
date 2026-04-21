import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { expenseApi, opcoApi, exportApi } from "@/lib/api";
import { Expense, OpCo } from "@expense/shared";
import { ExpenseTable } from "@/components/expenses/ExpenseTable";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader2, Download, CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";

const STATUS_FILTERS = ["All", "DRAFT", "SUBMITTED", "APPROVED", "REJECTED"];

function ApprovalCard({ expense, onDone }: { expense: Expense; onDone: () => void }) {
  const [comment, setComment] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const review = useMutation({
    mutationFn: ({ action, comment }: { action: "APPROVED" | "REJECTED"; comment?: string }) =>
      expenseApi.review(expense.id, { action, comment }),
    onSuccess: () => { onDone(); setReviewError(null); },
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
            {expense.opCoName} · By {expense.submittedByName} · {expense.categoryName} · {formatDate(expense.createdAt)}
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

function ExportModal({ opcos, onClose }: { opcos: OpCo[]; onClose: () => void }) {
  const [format, setFormat] = useState<"csv" | "zip">("csv");
  const [opCoId, setOpCoId] = useState("");
  const [status, setStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  async function handleExport() {
    setIsExporting(true);
    setExportError(null);
    try {
      await exportApi.download({
        format,
        opCoId: opCoId || undefined,
        status: status || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      onClose();
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card w-full max-w-md space-y-4">
        <h2 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>Export Expenses</h2>

        <div>
          <label className="label">Format</label>
          <div className="flex gap-4">
            {(["csv", "zip"] as const).map((f) => (
              <label key={f} className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="radio" value={f} checked={format === f} onChange={() => setFormat(f)} />
                <span style={{ color: "var(--color-text)" }}>{f.toUpperCase()}</span>
                {f === "zip" && <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>(includes attachments)</span>}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="label">OpCo (optional — leave blank for all)</label>
          <select className="input" value={opCoId} onChange={(e) => setOpCoId(e.target.value)}>
            <option value="">All OpCos</option>
            {opcos.filter((o) => !o.isHoldCo).map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Status (optional)</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"].map((s) => (
              <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Start Date</label>
            <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="label">End Date</label>
            <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>

        {exportError && <p className="text-sm" style={{ color: "var(--color-danger)" }}>{exportError}</p>}

        <div className="flex gap-2 pt-1">
          <button onClick={handleExport} disabled={isExporting} className="btn-primary flex-1 justify-center">
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download
          </button>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  );
}

type ViewMode = "all" | "approvals";

export function HoldcoExpenses() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("All");
  const [opCoFilter, setOpCoFilter] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [showExport, setShowExport] = useState(false);

  const { data: opcos } = useQuery({ queryKey: ["opcos"], queryFn: opcoApi.list });

  const { data: expenses, isLoading } = useQuery({
    queryKey: ["holdco-expenses", statusFilter, opCoFilter, viewMode],
    queryFn: () => expenseApi.list({
      status: viewMode === "approvals" ? "SUBMITTED" : (statusFilter === "All" ? undefined : statusFilter),
      opCoId: opCoFilter || undefined,
    }),
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["holdco-expenses"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>Expenses</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>View and approve expenses across all OpCos</p>
        </div>
        <button onClick={() => setShowExport(true)} className="btn-secondary">
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>

      {/* View mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode("all")}
          className={viewMode === "all" ? "btn-primary px-3 py-1.5 text-xs" : "btn-secondary px-3 py-1.5 text-xs"}
        >
          All Expenses
        </button>
        <button
          onClick={() => setViewMode("approvals")}
          className={viewMode === "approvals" ? "btn-primary px-3 py-1.5 text-xs" : "btn-secondary px-3 py-1.5 text-xs"}
        >
          Pending Approvals
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="input w-auto text-sm py-1.5"
          value={opCoFilter}
          onChange={(e) => setOpCoFilter(e.target.value)}
        >
          <option value="">All OpCos</option>
          {opcos?.filter((o) => !o.isHoldCo).map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>

        {viewMode === "all" && (
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
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--color-primary)" }} />
        </div>
      ) : viewMode === "approvals" ? (
        <div className="space-y-3">
          {!expenses || expenses.length === 0 ? (
            <div className="card py-16 text-center">
              <CheckCircle className="mx-auto mb-3 h-10 w-10" style={{ color: "var(--color-success)" }} />
              <p className="font-medium" style={{ color: "var(--color-text)" }}>All caught up!</p>
              <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>No expenses waiting for review.</p>
            </div>
          ) : (
            expenses.map((e) => <ApprovalCard key={e.id} expense={e} onDone={invalidate} />)
          )}
        </div>
      ) : (
        <ExpenseTable expenses={expenses ?? []} showSubmitter showOpCo />
      )}

      {showExport && opcos && (
        <ExportModal opcos={opcos} onClose={() => setShowExport(false)} />
      )}
    </div>
  );
}
