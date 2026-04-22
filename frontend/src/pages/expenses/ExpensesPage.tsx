import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { expenseApi, opcoApi, exportApi } from "@/lib/api";
import { OpCo, Role } from "@expense/shared";
import { ExpenseTable } from "@/components/expenses/ExpenseTable";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, Download } from "lucide-react";
import { formatDate } from "@/lib/utils";

const STATUS_FILTERS = ["All", "DRAFT", "SUBMITTED", "APPROVED", "REJECTED"];

function ExportModal({ opcos, isHoldCoScope, onClose }: { opcos: OpCo[]; isHoldCoScope: boolean; onClose: () => void }) {
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

        {isHoldCoScope && (
          <div>
            <label className="label">Operating Company (optional)</label>
            <select className="input" value={opCoId} onChange={(e) => setOpCoId(e.target.value)}>
              <option value="">All operating companies</option>
              {opcos.filter((o) => !o.isHoldCo).map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
        )}

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

export function ExpensesPage() {
  const { user } = useAuth();
  const role = user?.role;

  const isHoldCoScope = role === Role.HOLDCO_ADMIN || role === Role.HOLDCO_MANAGER;
  const canExport = isHoldCoScope || role === Role.OPCO_ADMIN || role === Role.OPCO_MANAGER;
  const showSubmitter = isHoldCoScope || role === Role.OPCO_ADMIN || role === Role.OPCO_MANAGER;

  const [statusFilter, setStatusFilter] = useState("All");
  const [opCoFilter, setOpCoFilter] = useState("");
  const [showExport, setShowExport] = useState(false);

  const { data: opcos } = useQuery({
    queryKey: ["opcos"],
    queryFn: opcoApi.list,
    enabled: isHoldCoScope,
  });

  const { data: expenses, isLoading } = useQuery({
    queryKey: ["expenses-page", statusFilter, opCoFilter],
    queryFn: () => expenseApi.list({
      status: statusFilter === "All" ? undefined : statusFilter,
      opCoId: opCoFilter || undefined,
    }),
  });

  const subtitle = isHoldCoScope
    ? "All expense submissions across all operating companies"
    : "All expense submissions in your operating company";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>All Expenses</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>{subtitle}</p>
        </div>
        {canExport && (
          <button onClick={() => setShowExport(true)} className="btn-secondary">
            <Download className="h-4 w-4" />
            Export
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {isHoldCoScope && (
          <select
            className="input w-auto text-sm py-1.5"
            value={opCoFilter}
            onChange={(e) => setOpCoFilter(e.target.value)}
          >
            <option value="">All operating companies</option>
            {opcos?.filter((o) => !o.isHoldCo).map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        )}
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
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--color-primary)" }} />
        </div>
      ) : (
        <ExpenseTable expenses={expenses ?? []} showSubmitter={showSubmitter} showOpCo={isHoldCoScope} />
      )}

      {showExport && (
        <ExportModal
          opcos={opcos ?? []}
          isHoldCoScope={isHoldCoScope}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}
