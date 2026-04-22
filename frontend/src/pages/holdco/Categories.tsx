import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { categoryApi, opcoApi } from "@/lib/api";
import { CategoryStatus, ExpenseCategory, OpCo, Role } from "@expense/shared";
import { Plus, Loader2, Tag, Globe, Copy, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

type SidebarSelection =
  | { kind: "opco"; id: string }
  | { kind: "holdco" }
  | { kind: "shared" };

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
  defaultIsShared,
  onClose,
}: {
  opcos: OpCo[];
  defaultOpCoId: string;
  defaultIsShared: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [opCoId, setOpCoId] = useState(defaultOpCoId);
  const [isShared, setIsShared] = useState(defaultIsShared);
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

          {!isShared && (
            <div>
              <label className="label">Assign to OpCo</label>
              <select
                className="input"
                value={opCoId}
                onChange={(e) => setOpCoId(e.target.value)}
              >
                {opcos.filter((o) => !o.isHoldCo).map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="rounded-lg border p-3 space-y-2" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg-subtle)" }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>Category Type</p>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="type"
                checked={!isShared}
                onChange={() => setIsShared(false)}
                disabled={defaultIsShared}
              />
              <span style={{ color: "var(--color-text)" }}>
                <span className="font-medium">OpCo Category</span>
                <span className="ml-1" style={{ color: "var(--color-text-muted)" }}>— only visible to the assigned OpCo</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="type"
                checked={isShared}
                onChange={() => setIsShared(true)}
                disabled={defaultIsShared === false && opcos.every((o) => !o.isHoldCo)}
              />
              <Globe className="h-4 w-4 flex-shrink-0" style={{ color: "var(--color-primary)" }} />
              <span style={{ color: "var(--color-text)" }}>
                <span className="font-medium">Shared Category</span>
                <span className="ml-1" style={{ color: "var(--color-text-muted)" }}>— visible to all OpCos</span>
              </span>
            </label>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={requiresAttachment}
              onChange={(e) => setRequiresAttachment(e.target.checked)}
            />
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
  const { user } = useAuth();
  const isAdmin = user?.role === Role.HOLDCO_ADMIN;
  const [selection, setSelection] = useState<SidebarSelection | null>(null);
  const [statusFilter, setStatusFilter] = useState<CategoryStatus>(CategoryStatus.ACTIVE);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);

  const { data: opcos, isLoading: opcosLoading } = useQuery({
    queryKey: ["opcos"],
    queryFn: opcoApi.list,
  });

  const activeOpcos = opcos?.filter((o) => !o.isHoldCo && o.isActive) ?? [];
  const holdCoOpCo = opcos?.find((o) => o.isHoldCo);

  const effectiveSelection: SidebarSelection =
    selection ?? (activeOpcos[0] ? { kind: "opco", id: activeOpcos[0].id } : { kind: "shared" });

  const effectiveOpCoId =
    effectiveSelection.kind === "opco" ? effectiveSelection.id : holdCoOpCo?.id ?? null;

  const selectedOpCo =
    effectiveSelection.kind === "opco"
      ? opcos?.find((o) => o.id === effectiveSelection.id)
      : undefined;

  const { data: allCategories, isLoading: catLoading } = useQuery({
    queryKey: ["categories", effectiveOpCoId],
    queryFn: () => effectiveOpCoId ? categoryApi.list(effectiveOpCoId) : Promise.resolve([]),
    enabled: !!effectiveOpCoId,
  });

  // Filter by section: HoldCo = non-shared under holdCo opco; Shared = isShared=true; OpCo = all
  const sectionCategories =
    effectiveSelection.kind === "shared" ? allCategories?.filter((c) => c.isShared) :
    allCategories;

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CategoryStatus }) =>
      categoryApi.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });

  const toggleAttachment = useMutation({
    mutationFn: ({ id, requiresAttachment }: { id: string; requiresAttachment: boolean }) =>
      categoryApi.update(id, { requiresAttachment }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });

  function handleDelete(cat: ExpenseCategory) {
    if (!window.confirm(`Permanently delete "${cat.name}"? This cannot be undone.`)) return;
    setStatus.mutate({ id: cat.id, status: CategoryStatus.DELETED });
  }

  const activeCount = sectionCategories?.filter((c) => c.status === CategoryStatus.ACTIVE).length ?? 0;
  const inactiveCount = sectionCategories?.filter((c) => c.status === CategoryStatus.INACTIVE).length ?? 0;
  const visibleCategories = sectionCategories?.filter((c) => c.status === statusFilter) ?? [];

  const newModalDefaults = {
    defaultOpCoId:
      effectiveSelection.kind === "opco" ? effectiveSelection.id :
      holdCoOpCo?.id ?? opcos?.[0]?.id ?? "",
    defaultIsShared: effectiveSelection.kind === "shared",
  };

  function isSidebarSelected(s: SidebarSelection): boolean {
    if (s.kind !== effectiveSelection.kind) return false;
    if (s.kind === "opco" && effectiveSelection.kind === "opco") return s.id === effectiveSelection.id;
    return true;
  }

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
        {isAdmin && (
          <div className="flex gap-2">
            {effectiveSelection.kind === "opco" && selectedOpCo && (
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
        )}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Sidebar */}
        <div className="lg:w-52 flex-shrink-0">
          <div className="card p-2 space-y-1">
            <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
              OpCos
            </p>
            {activeOpcos.map((o) => {
              const active = isSidebarSelected({ kind: "opco", id: o.id });
              return (
                <button
                  key={o.id}
                  onClick={() => setSelection({ kind: "opco", id: o.id })}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: active ? "var(--color-primary)" : undefined,
                    color: active ? "white" : "var(--color-text)",
                  }}
                >
                  {o.name}
                </button>
              );
            })}

            {holdCoOpCo && (
              <>
                <div className="my-1 border-t" style={{ borderColor: "var(--color-border)" }} />
                <p className="px-2 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
                  HoldCo
                </p>
                {(["holdco", "shared"] as const).map((kind) => {
                  const active = isSidebarSelected({ kind });
                  return (
                    <button
                      key={kind}
                      onClick={() => setSelection({ kind })}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors flex items-center gap-2"
                      style={{
                        backgroundColor: active ? "var(--color-primary)" : undefined,
                        color: active ? "white" : "var(--color-text-muted)",
                      }}
                    >
                      {kind === "shared" && <Globe className="h-3.5 w-3.5 flex-shrink-0" />}
                      {kind === "holdco" ? "HoldCo Categories" : "Shared Categories"}
                    </button>
                  );
                })}
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
          ) : (
            <>
              {/* Status filter tabs */}
              <div className="mb-3 flex gap-1 rounded-lg border p-1" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg-subtle)", width: "fit-content" }}>
                <button
                  onClick={() => setStatusFilter(CategoryStatus.ACTIVE)}
                  className="rounded-md px-3 py-1 text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: statusFilter === CategoryStatus.ACTIVE ? "var(--color-success)" : "transparent",
                    color: statusFilter === CategoryStatus.ACTIVE ? "white" : "var(--color-text-muted)",
                  }}
                >
                  Active ({activeCount})
                </button>
                <button
                  onClick={() => setStatusFilter(CategoryStatus.INACTIVE)}
                  className="rounded-md px-3 py-1 text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: statusFilter === CategoryStatus.INACTIVE ? "var(--color-text-muted)" : "transparent",
                    color: statusFilter === CategoryStatus.INACTIVE ? "white" : "var(--color-text-muted)",
                  }}
                >
                  Inactive ({inactiveCount})
                </button>
              </div>

              {visibleCategories.length === 0 ? (
                <div className="card py-12 text-center" style={{ color: "var(--color-text-muted)" }}>
                  {statusFilter === CategoryStatus.ACTIVE
                    ? 'No active categories. Click "New Category" to add one.'
                    : "No inactive categories."}
                </div>
              ) : (
                <div className="card overflow-hidden p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                        <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--color-text-muted)" }}>Name</th>
                        <th className="px-4 py-3 text-center font-semibold" style={{ color: "var(--color-text-muted)" }}>Attachment</th>
                        <th className="px-4 py-3 text-center font-semibold" style={{ color: "var(--color-text-muted)" }}>Status</th>
                        <th className="px-4 py-3 text-center font-semibold" style={{ color: "var(--color-text-muted)" }}>Delete</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleCategories.map((cat) => (
                        <tr key={cat.id} className="border-b last:border-0" style={{ borderColor: "var(--color-border)" }}>
                          <td className="px-4 py-3 font-medium" style={{ color: "var(--color-text)" }}>
                            {cat.name}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isAdmin ? (
                              <button
                                onClick={() => toggleAttachment.mutate({ id: cat.id, requiresAttachment: !cat.requiresAttachment })}
                                title={cat.requiresAttachment ? "Attachment required — click to disable" : "No attachment required — click to enable"}
                                style={{ color: cat.requiresAttachment ? "var(--color-success)" : "var(--color-text-muted)" }}
                              >
                                {cat.requiresAttachment ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                              </button>
                            ) : (
                              <span style={{ color: cat.requiresAttachment ? "var(--color-success)" : "var(--color-text-muted)" }}>
                                {cat.requiresAttachment ? <ToggleRight className="h-5 w-5 inline" /> : <ToggleLeft className="h-5 w-5 inline" />}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isAdmin ? (
                              <button
                                onClick={() => setStatus.mutate({
                                  id: cat.id,
                                  status: cat.status === CategoryStatus.ACTIVE ? CategoryStatus.INACTIVE : CategoryStatus.ACTIVE,
                                })}
                                title={cat.status === CategoryStatus.ACTIVE ? "Active — click to deactivate" : "Inactive — click to activate"}
                                style={{ color: cat.status === CategoryStatus.ACTIVE ? "var(--color-success)" : "var(--color-text-muted)" }}
                              >
                                {cat.status === CategoryStatus.ACTIVE ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                              </button>
                            ) : (
                              <span style={{ color: cat.status === CategoryStatus.ACTIVE ? "var(--color-success)" : "var(--color-text-muted)" }}>
                                {cat.status === CategoryStatus.ACTIVE ? <ToggleRight className="h-5 w-5 inline" /> : <ToggleLeft className="h-5 w-5 inline" />}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isAdmin && (
                              <button
                                onClick={() => handleDelete(cat)}
                                title="Permanently delete this category"
                                className="hover:text-red-500 transition-colors"
                                style={{ color: "var(--color-text-muted)" }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showNewModal && (
        <NewCategoryModal
          opcos={opcos ?? []}
          defaultOpCoId={newModalDefaults.defaultOpCoId}
          defaultIsShared={newModalDefaults.defaultIsShared}
          onClose={() => { setShowNewModal(false); qc.invalidateQueries({ queryKey: ["categories"] }); }}
        />
      )}

      {showCopyModal && selectedOpCo && sectionCategories && (
        <CopySchemaModal
          sourceOpCo={selectedOpCo}
          categories={sectionCategories.filter((c) => c.status === CategoryStatus.ACTIVE)}
          allOpCos={opcos ?? []}
          onClose={() => { setShowCopyModal(false); qc.invalidateQueries({ queryKey: ["categories"] }); }}
        />
      )}
    </div>
  );
}
