import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { expenseApi, categoryApi, opcoApi } from "@/lib/api";
import { AttachmentUpload } from "@/components/expenses/AttachmentUpload";
import { ExpenseAttachment, Role } from "@expense/shared";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, ArrowLeft, Send, Save, Paperclip } from "lucide-react";

type Step = "details" | "attachments" | "review";

export function NewExpense() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("details");
  const [expenseId, setExpenseId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<(ExpenseAttachment & { sasUrl?: string })[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    amount: "",
    currency: "USD",
    categoryId: "",
  });

  const isHoldCoRole = user?.role === Role.HOLDCO_ADMIN || user?.role === Role.HOLDCO_MANAGER || user?.role === Role.HOLDCO_USER;

  const { data: categories, isLoading: catLoading } = useQuery({
    queryKey: ["categories", user?.opCoId],
    queryFn: () => categoryApi.list(),
  });

  const { data: opcos } = useQuery({
    queryKey: ["opcos"],
    queryFn: opcoApi.list,
  });

  // Determine if attachment is required based on selected category and OpCo rules
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

  const create = useMutation({
    mutationFn: expenseApi.create,
    onSuccess: (expense) => {
      setExpenseId(expense.id);
      setStep("attachments");
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const submit = useMutation({
    mutationFn: (id: string) => expenseApi.submit(id),
    onSuccess: () => navigate("/dashboard"),
    onError: (e: Error) => setError(e.message),
  });

  function handleDetailsSubmit(e: React.FormEvent) {
    e.preventDefault();
    create.mutate({
      title: form.title,
      description: form.description || undefined,
      amount: parseFloat(form.amount),
      currency: form.currency,
      categoryId: form.categoryId,
    });
  }

  const canSubmit = !attachmentRequired || attachments.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-secondary px-2 py-2">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>Submit Expense</h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--color-text-muted)" }}>Fill in the details and attach your receipts</p>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {(["details", "attachments", "review"] as Step[]).map((s, i) => (
          <React.Fragment key={s}>
            <div className="flex items-center gap-2">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{
                  backgroundColor: step === s ? "var(--color-primary)" : (
                    (step === "attachments" && s === "details") || step === "review"
                      ? "var(--color-success)"
                      : "var(--color-border)"
                  ),
                  color: step === s || (step === "attachments" && s === "details") || step === "review" ? "white" : "var(--color-text-muted)",
                }}
              >
                {i + 1}
              </div>
              <span className="hidden text-sm font-medium sm:block" style={{ color: step === s ? "var(--color-primary)" : "var(--color-text-muted)" }}>
                {s === "details" ? "Details" : s === "attachments" ? "Attachments" : "Submit"}
              </span>
            </div>
            {i < 2 && <div className="h-px flex-1" style={{ backgroundColor: "var(--color-border)" }} />}
          </React.Fragment>
        ))}
      </div>

      {/* Step: Details */}
      {step === "details" && (
        <div className="card">
          <form onSubmit={handleDetailsSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="title">Title</label>
              <input
                id="title"
                className="input"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Team Lunch — Q1 Planning"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
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
              <div>
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
            <div>
              <label className="label" htmlFor="category">Category</label>
              {catLoading ? (
                <div className="input flex items-center gap-2" style={{ color: "var(--color-text-muted)" }}>
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading categories…
                </div>
              ) : (
                <select
                  id="category"
                  className="input"
                  value={form.categoryId}
                  onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                  required
                >
                  <option value="">Select a category…</option>
                  {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
            </div>
            <div>
              <label className="label" htmlFor="description">Description (optional)</label>
              <textarea
                id="description"
                className="input resize-none"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Add any additional context…"
              />
            </div>
            {error && <p className="text-sm" style={{ color: "var(--color-danger)" }}>{error}</p>}
            <button type="submit" disabled={create.isPending} className="btn-primary w-full sm:w-auto">
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save & Continue
            </button>
          </form>
        </div>
      )}

      {/* Step: Attachments */}
      {step === "attachments" && expenseId && (
        <div className="card space-y-4">
          <div>
            <h2 className="text-base font-semibold" style={{ color: "var(--color-text)" }}>Attach Receipts & Invoices</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
              Upload your supporting documents. Accepted: PDF, JPEG, PNG, HEIC, TIFF, and other common formats (max 10 MB each).
            </p>
          </div>

          {attachmentRequired && attachments.length === 0 && (
            <div className="flex items-start gap-2 rounded-lg border p-3 text-sm" style={{ borderColor: "var(--color-warning, #d97706)", backgroundColor: "rgba(217,119,6,0.08)" }}>
              <Paperclip className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: "#d97706" }} />
              <p style={{ color: "#92400e" }}>
                An attachment (receipt or invoice) is required for this expense. Please upload at least one file before submitting.
              </p>
            </div>
          )}

          <AttachmentUpload
            expenseId={expenseId}
            attachments={attachments}
            onChange={setAttachments}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <button onClick={() => setStep("review")} className="btn-primary">
              <Send className="h-4 w-4" />
              Continue to Submit
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="btn-secondary"
            >
              Save as Draft
            </button>
          </div>
        </div>
      )}

      {/* Step: Review & Submit */}
      {step === "review" && expenseId && (
        <div className="card space-y-4">
          <h2 className="text-base font-semibold" style={{ color: "var(--color-text)" }}>Review & Submit</h2>
          <div className="rounded-lg p-4" style={{ backgroundColor: "var(--color-bg-subtle)", border: "1px solid var(--color-border)" }}>
            <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-medium" style={{ color: "var(--color-text-muted)" }}>Title</dt>
                <dd style={{ color: "var(--color-text)" }}>{form.title}</dd>
              </div>
              <div>
                <dt className="font-medium" style={{ color: "var(--color-text-muted)" }}>Amount</dt>
                <dd style={{ color: "var(--color-text)" }}>{form.amount} {form.currency}</dd>
              </div>
              <div>
                <dt className="font-medium" style={{ color: "var(--color-text-muted)" }}>Attachments</dt>
                <dd style={{ color: attachmentRequired && attachments.length === 0 ? "var(--color-danger)" : "var(--color-text)" }}>
                  {attachments.length} file{attachments.length !== 1 ? "s" : ""}
                  {attachmentRequired && attachments.length === 0 && " — required!"}
                </dd>
              </div>
            </dl>
          </div>

          {attachmentRequired && attachments.length === 0 && (
            <div className="flex items-start gap-2 rounded-lg border p-3 text-sm" style={{ borderColor: "var(--color-warning, #d97706)", backgroundColor: "rgba(217,119,6,0.08)" }}>
              <Paperclip className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: "#d97706" }} />
              <p style={{ color: "#92400e" }}>
                This expense requires an attachment. Go back to the Attachments step and upload at least one file.
              </p>
            </div>
          )}

          {error && <p className="text-sm" style={{ color: "var(--color-danger)" }}>{error}</p>}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => submit.mutate(expenseId)}
              disabled={submit.isPending || !canSubmit}
              className="btn-primary"
            >
              {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit for Approval
            </button>
            <button onClick={() => setStep("attachments")} className="btn-secondary">
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
