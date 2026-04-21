import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { categoryApi, opcoApi } from "@/lib/api";
import { ExpenseCategory, OpCo } from "@expense/shared";
import { Plus, Loader2, Tag, Globe, Copy, ToggleLeft, ToggleRight, Paperclip } from "lucide-react";

function CopySchemaModal({
  sourceOpCo,
  categories,
  allOpCos,
  onClose,
}: {
  sourceOpCo: OpCo;
  categories: ExpenseCategory[];
  allOpCos: OpCo[];
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<{ copied: number; skipped: number; targets: number } | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  const targets = allOpCos.filter((o) => o.id !== sourceOpCo.id && !o.isHoldCo && o.isActive);
  const allSelected = selected.size === targets.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(targets.map((o) => o.id)));
  }

  const copy = useMutation({
    mutationFn: () =>
      categoryApi.copy({
        sourceOpCoId: sourceOpCo.id,
        targetOpCoIds: Array.from(selected),
      }),
    onSuccess: (res) => { setResult(res); setCopyError(null); },
    onError: (e: Error) => setCopyError(e.message),
  });

  if (result) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="card w-full max-w-md space-y-4">
          <h2 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>Copy Complete</h2>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Copied <strong>{result.copied}</strong> categories to <strong>{result.targets}</strong> OpCo{result.targets !== 1 ? "s" : ""},
            skipped <strong>{result.skipped}</strong> duplicates.
          </p>
          <button onClick={onClose} className="btn-primary w-full justify-center">Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card w-full max-w-md space-y-4">
        <h2 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>Copy Schema from {sourceOpCo.name}</h2>

        <div>
          <p className="text-xs font-medium mb-2" style={{ color: "var(--color-text-muted)" }}>
            Categories to copy ({categories.length}):
          </p>
          <div className="rounded-lg border p-3 max-h-32 overflow-y-auto space-y-1" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg-subtle)" }}>
            {categories.map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text)" }}>
                <Tag className="h-3 w-3 flex-shrink-0" style={{ color: "var(--color-primary)" }} />
                {c.name}
                {c.isShared && <Globe className="h-3 w-3" style={{ color: "var(--color-text-muted)" }} />}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Target OpCos:</p>
            <button onClick={toggleAll} className="text-xs" style={{ color: "var(--color-primary)" }}>
              {allSelected ? "Deselect all" : "Select all"}
            </button>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {targets.map((o) => (
              <label key={o.id} className="flex cursor-pointer items-center gap-2 text-sm rounded-lg px-2 py-1.5 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selected.has(o.id)}
                  onChange={() => {
                    const next = new Set(selected);
                    if (next.has(o.id)) next.delete(o.id); else next.add(o.id);
                    setSelected(next);
                  }}
                />
                <span style={{ color: "var(--color-text)" }}>{o.name}</span>
              </label>
            ))}
            {targets.length === 0 && (
              <p className="text-sm py-2" style={{ color: "var(--color-text-muted)" }}>No other active OpCos available.</p>
            )}
          </div>
        </div>

        {selected.size > 0 && (
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Will copy {categories.length} categories to {selected.size} OpCo{selected.size !== 1 ? "s" : ""} (skipping duplicates)
          </p>
        )}

        {copyError && <p className="text-sm" style={{ color: "var(--color-danger)" }}>{copyError}</p>}

        <div className="flex gap-2">
          <button
            onClick={() => copy.mutate()}
            disabled={selected.size === 0 || copy.isPending}
            className="btn-primary flex-1 justify-center"
          >
            {copy.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
            Copy Schema
          </button>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function NewCategoryModal({
  opcos,
  defaultOpCoId,
  onClose,
}: {
  opcos: OpCo[];
  defaultOpCoId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [opCoId, setOpCoId] = useState(defaultOpCoId);
  const [isShared, setIsShared] = useState(false);
  const [requiresAttachment, setRequiresAttachment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => categoryApi.create({ name, opCoId, isShared, requiresAttachment }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card w-full max-w-md space-y-4">
        <h2 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>New Category</h2>

        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Travel, Meals, Software"
              required
            />
          </div>

          <div>
            <label className="label">Assign to</label>
            <select
              className="input"
              value={opCoId}
              onChange={(e) => setOpCoId(e.target.value)}
              disabled={isShared}
            >
              {opcos.map((o) => (
                <option key={o.id} value={o.id}>{o.name}{o.isHoldCo ? " (HoldCo)" : ""}</option>
              ))}
            </select>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isShared}
              onChange={(e) => setIsShared(e.target.checked)}
            />
            <Globe className="h-4 w-4" style={{ color: "var(--color-primary)" }} />
            <span style={{ color: "var(--color-text)" }}>Shared (visible to all OpCos)</span>
          </label>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={requiresAttachment}
              onChange={(e) => setRequiresAttachment(e.target.checked)}
            />
            <Paperclip className="h-4 w-4" style={{ color: "var(--color-text-muted)" }} />
            <span style={{ color: "var(--color-text)" }}>Requires attachment</span>
          </label>

          {error && <p className="text-sm" style={{ color: "var(--color-danger)" }}>{error}</p>}

          <div className="flex gap-2">
            <button type="submit" disabled={create.isPending} className="btn-primary flex-1 justify-center">
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function HoldcoCategories() {
  const qc = useQueryClient();
  const [selectedOpCoId, setSelectedOpCoId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);

  const { data: opcos, isLoading: opcosLoading } = useQuery({
    queryKey: ["opcos"],
    queryFn: opcoApi.list,
  });

  const activeOpcos = opcos?.filter((o) => !o.isHoldCo && o.isActive) ?? [];
  const holdCoOpCo = opcos?.find((o) => o.isHoldCo);
  const allSelectableOpCos = opcos ?? [];

  const effectiveOpCoId = selectedOpCoId ?? activeOpcos[0]?.id ?? null;
  const selectedOpCo = allSelectableOpCos.find((o) => o.id === effectiveOpCoId);

  const { data: categories, isLoading: catLoading } = useQuery({
    queryKey: ["categories", effectiveOpCoId],
    queryFn: () => effectiveOpCoId ? categoryApi.list(effectiveOpCoId) : Promise.resolve([]),
    enabled: !!effectiveOpCoId,
  });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      categoryApi.update(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });

  const toggleAttachment = useMutation({
    mutationFn: ({ id, requiresAttachment }: { id: string; requiresAttachment: boolean }) =>
      categoryApi.update(id, { requiresAttachment }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });

  if (opcosLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--color-primary)" }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>Category Management</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
            Create and manage expense categories across all OpCos
          </p>
        </div>
        <div className="flex gap-2">
          {selectedOpCo && (
            <button onClick={() => setShowCopyModal(true)} className="btn-secondary">
              <Copy className="h-4 w-4" />
              Copy Schema
            </button>
          )}
          <button onClick={() => setShowNewModal(true)} className="btn-primary">
            <Plus className="h-4 w-4" />
            New Category
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* OpCo selector panel */}
        <div className="lg:w-52 flex-shrink-0">
          <div className="card p-2 space-y-1">
            <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
              OpCos
            </p>
            {activeOpcos.map((o) => (
              <button
                key={o.id}
                onClick={() => setSelectedOpCoId(o.id)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                  effectiveOpCoId === o.id
                    ? "bg-white/10 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
                style={{
                  backgroundColor: effectiveOpCoId === o.id ? "var(--color-primary)" : undefined,
                  color: effectiveOpCoId === o.id ? "white" : "var(--color-text)",
                }}
              >
                {o.name}
              </button>
            ))}
            {holdCoOpCo && (
              <>
                <div className="my-1 border-t" style={{ borderColor: "var(--color-border)" }} />
                <button
                  onClick={() => setSelectedOpCoId(holdCoOpCo.id)}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: effectiveOpCoId === holdCoOpCo.id ? "var(--color-primary)" : undefined,
                    color: effectiveOpCoId === holdCoOpCo.id ? "white" : "var(--color-text-muted)",
                  }}
                >
                  Shared / HoldCo
                </button>
              </>
            )}
          </div>
        </div>

        {/* Category list */}
        <div className="flex-1">
          {catLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--color-primary)" }} />
            </div>
          ) : !categories || categories.length === 0 ? (
            <div className="card py-12 text-center" style={{ color: "var(--color-text-muted)" }}>
              No categories for this OpCo. Click "New Category" to add one.
            </div>
          ) : (
            <div className="card overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--color-text-muted)" }}>Name</th>
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--color-text-muted)" }}>Flags</th>
                    <th className="px-4 py-3 text-center font-semibold" style={{ color: "var(--color-text-muted)" }}>Attachment</th>
                    <th className="px-4 py-3 text-center font-semibold" style={{ color: "var(--color-text-muted)" }}>Active</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <tr key={cat.id} className="border-b last:border-0" style={{ borderColor: "var(--color-border)", opacity: cat.isActive ? 1 : 0.5 }}>
                      <td className="px-4 py-3 font-medium" style={{ color: "var(--color-text)" }}>
                        {cat.name}
                      </td>
                      <td className="px-4 py-3">
                        {cat.isShared && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                            <Globe className="h-3 w-3" />
                            Shared
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleAttachment.mutate({ id: cat.id, requiresAttachment: !cat.requiresAttachment })}
                          title={cat.requiresAttachment ? "Attachment required — click to disable" : "No attachment required — click to enable"}
                          style={{ color: cat.requiresAttachment ? "var(--color-primary)" : "var(--color-text-muted)" }}
                        >
                          {cat.requiresAttachment ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggle.mutate({ id: cat.id, isActive: !cat.isActive })}
                          title={cat.isActive ? "Active — click to archive" : "Archived — click to restore"}
                          style={{ color: cat.isActive ? "var(--color-success)" : "var(--color-text-muted)" }}
                        >
                          {cat.isActive ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showNewModal && (
        <NewCategoryModal
          opcos={allSelectableOpCos}
          defaultOpCoId={effectiveOpCoId ?? allSelectableOpCos[0]?.id ?? ""}
          onClose={() => { setShowNewModal(false); qc.invalidateQueries({ queryKey: ["categories"] }); }}
        />
      )}

      {showCopyModal && selectedOpCo && categories && (
        <CopySchemaModal
          sourceOpCo={selectedOpCo}
          categories={categories.filter((c) => c.isActive)}
          allOpCos={allSelectableOpCos}
          onClose={() => { setShowCopyModal(false); qc.invalidateQueries({ queryKey: ["categories"] }); }}
        />
      )}
    </div>
  );
}
