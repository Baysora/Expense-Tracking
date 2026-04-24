import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { expenseApi, categoryApi, departmentApi, projectApi, opcoApi, attachmentApi } from "@/lib/api";
import { Role } from "@expense/shared";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, Paperclip, Info } from "lucide-react";
import { formatFileSize } from "@/lib/utils";

export function NewExpense() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ title: "", description: "", amount: "", currency: "USD", categoryId: "", departmentId: "", project: "" });
  const [projectQuery, setProjectQuery] = useState("");
  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isHoldCoRole = user?.role === Role.HOLDCO_ADMIN || user?.role === Role.HOLDCO_MANAGER || user?.role === Role.HOLDCO_USER;

  const { data: categories, isLoading: catLoading } = useQuery({
    queryKey: ["categories", user?.opCoId],
    queryFn: () => categoryApi.list(),
  });

  const { data: departments, isLoading: deptLoading } = useQuery({
    queryKey: ["departments", user?.opCoId],
    queryFn: () => departmentApi.list(),
  });

  // Debounce the project query so we don't spam the suggestions endpoint
  useEffect(() => {
    const t = setTimeout(() => setProjectQuery(form.project), 200);
    return () => clearTimeout(t);
  }, [form.project]);

  const { data: projectSuggestions } = useQuery({
    queryKey: ["project-suggestions", user?.opCoId, projectQuery],
    queryFn: () => projectApi.suggest(projectQuery),
  });

  const { data: opcos } = useQuery({
    queryKey: ["opcos"],
    queryFn: opcoApi.list,
  });

  const selectedCategory = categories?.find((c) => c.id === form.categoryId);
  const userOpCo = useMemo(() => {
    if (!opcos) return null;
    if (isHoldCoRole) return opcos.find((o) => o.isHoldCo) ?? null;
    return opcos.find((o) => o.id === user?.opCoId) ?? null;
  }, [opcos, isHoldCoRole, user?.opCoId]);

  const attachmentRequired = useMemo(() => {
    if (!form.categoryId || !form.amount) return false;
    const amount = parseFloat(form.amount);
    if (selectedCategory?.requiresAttachment) return true;
    if (userOpCo?.requireAttachmentForAll) return true;
    if (userOpCo?.requireAttachmentAboveAmount != null && amount > userOpCo.requireAttachmentAboveAmount) return true;
    return false;
  }, [selectedCategory, userOpCo, form.amount, form.categoryId]);

  const canSubmit = Boolean(form.title && form.amount && form.categoryId && form.departmentId) &&
    (!attachmentRequired || localFiles.length > 0);

  function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setLocalFiles((prev) => [...prev, ...Array.from(files)]);
  }

  function removeFile(index: number) {
    setLocalFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleAction(asDraft: boolean) {
    if (!form.title || !form.amount || !form.categoryId || !form.departmentId) return;
    setSubmitting(true);
    setError(null);
    try {
      const trimmedProject = form.project.trim();
      const expense = await expenseApi.create({
        title: form.title,
        description: form.description || undefined,
        amount: parseFloat(form.amount),
        currency: form.currency,
        categoryId: form.categoryId,
        departmentId: form.departmentId,
        project: trimmedProject || undefined,
      });
      for (const file of localFiles) {
        await attachmentApi.upload(expense.id, file, "RECEIPT");
      }
      if (!asDraft) await expenseApi.submit(expense.id);
      navigate("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const dropzoneStyle: React.CSSProperties = {
    border: "2px dashed",
    borderRadius: 14,
    padding: "36px 24px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    minHeight: 200,
    justifyContent: "center",
    transition: "all 0.15s",
    borderColor: dragOver ? "#0a4885" : localFiles.length > 0 ? "#16a34a" : "#ddd9d3",
    backgroundColor: dragOver ? "rgba(10,72,133,0.03)" : localFiles.length > 0 ? "rgba(22,163,74,0.03)" : "var(--color-bg)",
    cursor: "default",
  };

  const sectionLabel: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    color: "var(--color-text-placeholder)",
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    marginBottom: 10,
  };

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <button
          onClick={() => navigate(-1)}
          style={{ background: "none", border: "none", color: "var(--color-text-placeholder)", fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: 0, marginBottom: 14, display: "block", letterSpacing: "0.01em" }}
        >
          ← Back
        </button>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, fontWeight: 400, color: "var(--color-text)", margin: "0 0 4px", lineHeight: 1.2 }}>
          New Expense
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-text-muted)", margin: 0 }}>
          Upload your receipt and fill in the details
        </p>
      </div>

      {/* Two-column form */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_1.4fr] items-start">
        {/* Left — Receipt upload */}
        <div>
          <p style={sectionLabel}>Receipt or Invoice</p>

          {/* Drop zone */}
          <div
            style={dropzoneStyle}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
          >
            {localFiles.length === 0 ? (
              <>
                <div style={{ fontSize: 32, marginBottom: 4 }}>📎</div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>Drop your receipt here</p>
                <p style={{ fontSize: 12, color: "var(--color-text-placeholder)" }}>PDF, JPEG, PNG, HEIC · max 10 MB</p>
                <label
                  style={{ marginTop: 12, display: "inline-flex", alignItems: "center", background: "var(--color-primary)", color: "white", borderRadius: 9, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none", fontFamily: "inherit", boxShadow: "0 1px 3px rgba(10,72,133,0.3)" }}
                >
                  Choose file
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.heic,.tiff,.gif"
                    style={{ display: "none" }}
                    onChange={(e) => addFiles(e.target.files)}
                  />
                </label>
              </>
            ) : (
              <>
                <div style={{ fontSize: 28, marginBottom: 4 }}>✅</div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#065f46" }}>
                  {localFiles.length} file{localFiles.length !== 1 ? "s" : ""} attached
                </p>
                <label
                  style={{ marginTop: 10, display: "inline-flex", alignItems: "center", background: "var(--color-bg-subtle)", color: "var(--color-text)", borderRadius: 9, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none", fontFamily: "inherit" }}
                >
                  Add more
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.heic,.tiff,.gif"
                    style={{ display: "none" }}
                    onChange={(e) => addFiles(e.target.files)}
                  />
                </label>
              </>
            )}
          </div>

          {/* File list */}
          {localFiles.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
              {localFiles.map((f, i) => (
                <div
                  key={i}
                  style={{ display: "flex", alignItems: "center", gap: 8, background: "white", borderRadius: 9, padding: "8px 12px", border: "1px solid #ede9e3", boxShadow: "0 1px 2px rgba(26,35,50,0.04)" }}
                >
                  <span style={{ fontSize: 14, flexShrink: 0 }}>📄</span>
                  <span style={{ flex: 1, fontSize: 12, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                  <span style={{ fontSize: 11, color: "var(--color-text-placeholder)", flexShrink: 0 }}>{formatFileSize(f.size)}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    style={{ background: "none", border: "none", color: "var(--color-text-placeholder)", cursor: "pointer", fontSize: 11, padding: "0 2px", lineHeight: 1, flexShrink: 0 }}
                    aria-label="Remove file"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Attachment required warning */}
          {attachmentRequired && localFiles.length === 0 && (
            <div
              className="flex items-start gap-2 rounded-lg border p-3 text-sm mt-3"
              style={{ borderColor: "var(--color-warning)", backgroundColor: "rgba(217,119,6,0.08)" }}
            >
              <Paperclip className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: "#d97706" }} />
              <p style={{ color: "#92400e" }}>
                An attachment is required for this expense. Please upload at least one file.
              </p>
            </div>
          )}
        </div>

        {/* Right — Expense details */}
        <div>
          <p style={sectionLabel}>Expense Details</p>
          <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "var(--shadow-card)", display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Title */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="label" htmlFor="title">What did you spend on?</label>
              <input
                id="title"
                className="input"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Team lunch — Q1 planning"
                required
              />
            </div>

            {/* Amount + Currency */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 90px", gap: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="label" htmlFor="amount">Amount</label>
                <input
                  id="amount"
                  className="input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00"
                  required
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="label" htmlFor="currency">Currency</label>
                <select
                  id="currency"
                  className="input"
                  value={form.currency}
                  onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                >
                  {["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Category */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="label" htmlFor="category">Category</label>
              {catLoading ? (
                <div className="input flex items-center gap-2" style={{ color: "var(--color-text-muted)" }}>
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : (
                <select
                  id="category"
                  className="input"
                  value={form.categoryId}
                  onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                  required
                >
                  <option value="">Choose a category…</option>
                  {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
            </div>

            {/* Department */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="label" htmlFor="department">Department</label>
              {deptLoading ? (
                <div className="input flex items-center gap-2" style={{ color: "var(--color-text-muted)" }}>
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : (
                <select
                  id="department"
                  className="input"
                  value={form.departmentId}
                  onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}
                  required
                >
                  <option value="">Choose a department…</option>
                  {departments?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              )}
            </div>

            {/* Project */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="label" htmlFor="project" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                Project <span style={{ color: "var(--color-text-placeholder)", fontWeight: 400, fontSize: 12 }}>(optional)</span>
                <span
                  title="Use this to tie the expense to a project, customer, or lead — helps track spend against specific initiatives in reports."
                  style={{ display: "inline-flex", color: "var(--color-text-placeholder)", cursor: "help" }}
                  aria-label="Project field help"
                  tabIndex={0}
                >
                  <Info className="h-3.5 w-3.5" />
                </span>
              </label>
              <input
                id="project"
                className="input"
                list="project-suggestions"
                value={form.project}
                onChange={(e) => setForm((f) => ({ ...f, project: e.target.value }))}
                placeholder="e.g. Q1 Sales Conference"
                maxLength={200}
              />
              <datalist id="project-suggestions">
                {projectSuggestions?.map((p) => <option key={p} value={p} />)}
              </datalist>
            </div>

            {/* Notes */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="label" htmlFor="notes">
                Notes <span style={{ color: "var(--color-text-placeholder)", fontWeight: 400, fontSize: 12 }}>(optional)</span>
              </label>
              <textarea
                id="notes"
                className="input resize-none"
                style={{ height: 76, lineHeight: 1.5 }}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Any extra context for your manager…"
              />
            </div>

            {error && (
              <p className="text-sm" style={{ color: "var(--color-danger)" }}>{error}</p>
            )}

            {/* Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => handleAction(false)}
                disabled={!canSubmit || submitting}
                className="btn-primary"
                style={{
                  opacity: canSubmit && !submitting ? 1 : 0.45,
                  cursor: canSubmit && !submitting ? "pointer" : "not-allowed",
                }}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Submit for Approval
              </button>
              <button
                type="button"
                onClick={() => handleAction(true)}
                disabled={!form.title || !form.amount || !form.categoryId || !form.departmentId || submitting}
                style={{ background: "none", color: "var(--color-text-placeholder)", border: "none", padding: "10px 12px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
              >
                Save as Draft
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
