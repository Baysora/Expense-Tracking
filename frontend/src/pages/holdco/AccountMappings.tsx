import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { accountMappingApi, categoryApi, departmentApi, opcoApi } from "@/lib/api";
import {
  AccountMapping,
  CategoryStatus,
  Department,
  ExpenseCategory,
  OpCo,
} from "@expense/shared";
import { Loader2, Plus, Trash2, Check } from "lucide-react";

function NewMappingModal({
  opCoId,
  categories,
  departments,
  existing,
  onClose,
}: {
  opCoId: string;
  categories: ExpenseCategory[];
  departments: Department[];
  existing: AccountMapping[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? "");
  const [accountName, setAccountName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const duplicate = useMemo(
    () =>
      existing.some(
        (m) => m.categoryId === categoryId && m.departmentId === departmentId
      ),
    [existing, categoryId, departmentId]
  );

  const create = useMutation({
    mutationFn: () =>
      accountMappingApi.create({ opCoId, categoryId, departmentId, accountName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accountMappings", opCoId] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  const disabled =
    !categoryId || !departmentId || !accountName.trim() || duplicate || create.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card w-full max-w-md space-y-4">
        <h2 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
          New Account Mapping
        </h2>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (disabled) return;
            create.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label className="label">Category</label>
            <select
              className="input"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.isShared ? " (shared)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Department</label>
            <select
              className="input"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              required
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Account Name</label>
            <input
              className="input"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g. 6100-TRAVEL-ENG"
              maxLength={200}
              required
            />
          </div>

          {duplicate && (
            <p className="text-sm" style={{ color: "var(--color-danger)" }}>
              This Category + Department pair already has a mapping in this OpCo.
            </p>
          )}
          {error && (
            <p className="text-sm" style={{ color: "var(--color-danger)" }}>
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button type="submit" disabled={disabled} className="btn-primary flex-1 justify-center">
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MappingRow({
  mapping,
  categoryName,
  departmentName,
  onSaved,
}: {
  mapping: AccountMapping;
  categoryName: string;
  departmentName: string;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const [value, setValue] = useState(mapping.accountName);
  const [justSaved, setJustSaved] = useState(false);

  const update = useMutation({
    mutationFn: (accountName: string) => accountMappingApi.update(mapping.id, { accountName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accountMappings", mapping.opCoId] });
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1200);
      onSaved();
    },
  });

  const remove = useMutation({
    mutationFn: () => accountMappingApi.delete(mapping.id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["accountMappings", mapping.opCoId] }),
  });

  function handleBlur() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === mapping.accountName) {
      setValue(mapping.accountName);
      return;
    }
    update.mutate(trimmed);
  }

  function handleDelete() {
    if (!window.confirm(`Remove mapping for "${categoryName} × ${departmentName}"?`)) return;
    remove.mutate();
  }

  return (
    <tr className="border-b last:border-0" style={{ borderColor: "var(--color-border)" }}>
      <td className="px-4 py-3 font-medium" style={{ color: "var(--color-text)" }}>
        {categoryName}
      </td>
      <td className="px-4 py-3" style={{ color: "var(--color-text)" }}>
        {departmentName}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            className="input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.currentTarget as HTMLInputElement).blur();
              }
            }}
            maxLength={200}
          />
          {update.isPending && <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--color-text-muted)" }} />}
          {justSaved && <Check className="h-4 w-4" style={{ color: "var(--color-success)" }} />}
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <button
          onClick={handleDelete}
          disabled={remove.isPending}
          title="Remove this mapping"
          className="hover:text-red-500 transition-colors"
          style={{ color: "var(--color-text-muted)" }}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}

export function HoldcoAccountMappings() {
  const [selectedOpCoId, setSelectedOpCoId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const { data: opcos, isLoading: opcosLoading } = useQuery({
    queryKey: ["opcos"],
    queryFn: opcoApi.list,
  });

  const activeOpcos = opcos?.filter((o: OpCo) => !o.isHoldCo && o.isActive) ?? [];
  const holdCoOpCo = opcos?.find((o: OpCo) => o.isHoldCo);
  const orderedOpcos = [...activeOpcos, ...(holdCoOpCo ? [holdCoOpCo] : [])];
  const effectiveOpCoId = selectedOpCoId ?? orderedOpcos[0]?.id ?? null;

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories", effectiveOpCoId],
    queryFn: () => (effectiveOpCoId ? categoryApi.list(effectiveOpCoId) : Promise.resolve([])),
    enabled: !!effectiveOpCoId,
  });

  const { data: departments, isLoading: departmentsLoading } = useQuery({
    queryKey: ["departments", effectiveOpCoId],
    queryFn: () => (effectiveOpCoId ? departmentApi.list(effectiveOpCoId) : Promise.resolve([])),
    enabled: !!effectiveOpCoId,
  });

  const { data: mappings, isLoading: mappingsLoading } = useQuery({
    queryKey: ["accountMappings", effectiveOpCoId],
    queryFn: () =>
      effectiveOpCoId ? accountMappingApi.list(effectiveOpCoId) : Promise.resolve([]),
    enabled: !!effectiveOpCoId,
  });

  const activeCategories = (categories ?? []).filter((c) => c.status === CategoryStatus.ACTIVE);
  const activeDepartments = (departments ?? []).filter((d) => d.status === CategoryStatus.ACTIVE);

  const categoryNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categories ?? []) m.set(c.id, c.name);
    return m;
  }, [categories]);

  const departmentNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of departments ?? []) m.set(d.id, d.name);
    return m;
  }, [departments]);

  if (opcosLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--color-primary)" }} />
      </div>
    );
  }

  const canAdd = activeCategories.length > 0 && activeDepartments.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
            Account Mappings
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
            Assign an account name to each Category + Department combination. The account appears on the expense CSV export.
            Unmapped combinations export as <code>UNMAPPED</code>.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowNewModal(true)}
            className="btn-primary"
            disabled={!canAdd}
            title={!canAdd ? "Add at least one active category and department to this OpCo first" : undefined}
          >
            <Plus className="h-4 w-4" />
            New Mapping
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* OpCo picker */}
        <div className="lg:w-52 flex-shrink-0">
          <div className="card p-2 space-y-1">
            <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
              OpCos
            </p>
            {activeOpcos.map((o: OpCo) => {
              const active = effectiveOpCoId === o.id;
              return (
                <button
                  key={o.id}
                  onClick={() => setSelectedOpCoId(o.id)}
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
                <button
                  onClick={() => setSelectedOpCoId(holdCoOpCo.id)}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: effectiveOpCoId === holdCoOpCo.id ? "var(--color-primary)" : undefined,
                    color: effectiveOpCoId === holdCoOpCo.id ? "white" : "var(--color-text-muted)",
                  }}
                >
                  HoldCo Mappings
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mappings table */}
        <div className="flex-1">
          {mappingsLoading || categoriesLoading || departmentsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--color-primary)" }} />
            </div>
          ) : (mappings ?? []).length === 0 ? (
            <div className="card py-12 text-center" style={{ color: "var(--color-text-muted)" }}>
              {canAdd
                ? 'No mappings yet. Click "New Mapping" to add one.'
                : "This OpCo needs at least one active category and one active department before you can add mappings."}
            </div>
          ) : (
            <div className="card overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--color-text-muted)" }}>
                      Category
                    </th>
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--color-text-muted)" }}>
                      Department
                    </th>
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--color-text-muted)" }}>
                      Account Name
                    </th>
                    <th className="px-4 py-3 text-center font-semibold" style={{ color: "var(--color-text-muted)" }}>
                      Delete
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(mappings ?? []).map((m) => (
                    <MappingRow
                      key={m.id}
                      mapping={m}
                      categoryName={m.categoryName ?? categoryNameById.get(m.categoryId) ?? "(unknown)"}
                      departmentName={m.departmentName ?? departmentNameById.get(m.departmentId) ?? "(unknown)"}
                      onSaved={() => {}}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showNewModal && effectiveOpCoId && (
        <NewMappingModal
          opCoId={effectiveOpCoId}
          categories={activeCategories}
          departments={activeDepartments}
          existing={mappings ?? []}
          onClose={() => setShowNewModal(false)}
        />
      )}
    </div>
  );
}
