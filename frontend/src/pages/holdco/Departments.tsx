import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { departmentApi, opcoApi } from "@/lib/api";
import { CategoryStatus, OpCo, Role } from "@expense/shared";
import { Plus, Loader2, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

function NewDepartmentModal({
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
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => departmentApi.create({ name, opCoId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments"] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card w-full max-w-md space-y-4">
        <h2 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>New Department</h2>

        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Engineering, Sales, Marketing"
              required
            />
          </div>

          <div>
            <label className="label">Assign to OpCo</label>
            <select
              className="input"
              value={opCoId}
              onChange={(e) => setOpCoId(e.target.value)}
            >
              {opcos.map((o) => (
                <option key={o.id} value={o.id}>{o.name}{o.isHoldCo ? " (HoldCo)" : ""}</option>
              ))}
            </select>
          </div>

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

export function HoldcoDepartments() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === Role.HOLDCO_ADMIN;
  const [selectedOpCoId, setSelectedOpCoId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<CategoryStatus>(CategoryStatus.ACTIVE);
  const [showNewModal, setShowNewModal] = useState(false);

  const { data: opcos, isLoading: opcosLoading } = useQuery({
    queryKey: ["opcos"],
    queryFn: opcoApi.list,
  });

  const activeOpcos = opcos?.filter((o) => !o.isHoldCo && o.isActive) ?? [];
  const holdCoOpCo = opcos?.find((o) => o.isHoldCo);
  const orderedOpcos = [...activeOpcos, ...(holdCoOpCo ? [holdCoOpCo] : [])];

  const effectiveOpCoId = selectedOpCoId ?? orderedOpcos[0]?.id ?? null;

  const { data: departments, isLoading: deptLoading } = useQuery({
    queryKey: ["departments", effectiveOpCoId],
    queryFn: () => effectiveOpCoId ? departmentApi.list(effectiveOpCoId) : Promise.resolve([]),
    enabled: !!effectiveOpCoId,
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CategoryStatus }) =>
      departmentApi.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments"] }),
  });

  function handleDelete(deptId: string, deptName: string) {
    if (!window.confirm(`Permanently delete "${deptName}"? This cannot be undone.`)) return;
    setStatus.mutate({ id: deptId, status: CategoryStatus.DELETED });
  }

  const activeCount = departments?.filter((d) => d.status === CategoryStatus.ACTIVE).length ?? 0;
  const inactiveCount = departments?.filter((d) => d.status === CategoryStatus.INACTIVE).length ?? 0;
  const visibleDepartments = departments?.filter((d) => d.status === statusFilter) ?? [];

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
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>Department Management</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
            Each organization manages its own department list. There are no shared departments.
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button onClick={() => setShowNewModal(true)} className="btn-primary">
              <Plus className="h-4 w-4" />
              New Department
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Sidebar — OpCo picker */}
        <div className="lg:w-52 flex-shrink-0">
          <div className="card p-2 space-y-1">
            <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
              OpCos
            </p>
            {activeOpcos.map((o) => {
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
                  HoldCo Departments
                </button>
              </>
            )}
          </div>
        </div>

        {/* Department list */}
        <div className="flex-1">
          {deptLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--color-primary)" }} />
            </div>
          ) : (
            <>
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

              {visibleDepartments.length === 0 ? (
                <div className="card py-12 text-center" style={{ color: "var(--color-text-muted)" }}>
                  {statusFilter === CategoryStatus.ACTIVE
                    ? 'No active departments. Click "New Department" to add one.'
                    : "No inactive departments."}
                </div>
              ) : (
                <div className="card overflow-hidden p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                        <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--color-text-muted)" }}>Name</th>
                        <th className="px-4 py-3 text-center font-semibold" style={{ color: "var(--color-text-muted)" }}>Status</th>
                        <th className="px-4 py-3 text-center font-semibold" style={{ color: "var(--color-text-muted)" }}>Delete</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleDepartments.map((dept) => (
                        <tr key={dept.id} className="border-b last:border-0" style={{ borderColor: "var(--color-border)" }}>
                          <td className="px-4 py-3 font-medium" style={{ color: "var(--color-text)" }}>
                            {dept.name}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isAdmin ? (
                              <button
                                onClick={() => setStatus.mutate({
                                  id: dept.id,
                                  status: dept.status === CategoryStatus.ACTIVE ? CategoryStatus.INACTIVE : CategoryStatus.ACTIVE,
                                })}
                                title={dept.status === CategoryStatus.ACTIVE ? "Active — click to deactivate" : "Inactive — click to activate"}
                                style={{ color: dept.status === CategoryStatus.ACTIVE ? "var(--color-success)" : "var(--color-text-muted)" }}
                              >
                                {dept.status === CategoryStatus.ACTIVE ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                              </button>
                            ) : (
                              <span style={{ color: dept.status === CategoryStatus.ACTIVE ? "var(--color-success)" : "var(--color-text-muted)" }}>
                                {dept.status === CategoryStatus.ACTIVE ? <ToggleRight className="h-5 w-5 inline" /> : <ToggleLeft className="h-5 w-5 inline" />}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isAdmin && (
                              <button
                                onClick={() => handleDelete(dept.id, dept.name)}
                                title="Permanently delete this department"
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

      {showNewModal && effectiveOpCoId && (
        <NewDepartmentModal
          opcos={orderedOpcos}
          defaultOpCoId={effectiveOpCoId}
          onClose={() => { setShowNewModal(false); qc.invalidateQueries({ queryKey: ["departments"] }); }}
        />
      )}
    </div>
  );
}
