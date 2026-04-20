import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { opcoApi } from "@/lib/api";
import { OpCo } from "@expense/shared";
import { Plus, Loader2, Building2, Power, PowerOff } from "lucide-react";
import { formatDate } from "@/lib/utils";

function OpCoForm({ onSuccess }: { onSuccess: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: opcoApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["opcos"] });
      setName("");
      setSlug("");
      setError(null);
      onSuccess();
    },
    onError: (e: Error) => setError(e.message),
  });

  function handleNameChange(val: string) {
    setName(val);
    if (!slug || slug === name.toLowerCase().replace(/\s+/g, "-")) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); create.mutate({ name, slug }); }}
      className="space-y-4"
    >
      <div>
        <label className="label" htmlFor="opco-name">Company Name</label>
        <input
          id="opco-name"
          className="input"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Acme Corp"
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="opco-slug">URL Slug</label>
        <input
          id="opco-slug"
          className="input"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="acme-corp"
          pattern="^[a-z0-9-]+$"
          title="Lowercase letters, numbers, and hyphens only"
          required
        />
        <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
          Lowercase letters, numbers, and hyphens only
        </p>
      </div>
      {error && <p className="text-sm" style={{ color: "var(--color-danger)" }}>{error}</p>}
      <button type="submit" disabled={create.isPending} className="btn-primary">
        {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Create OpCo
      </button>
    </form>
  );
}

export function HoldcoOpCos() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const { data: opcos, isLoading } = useQuery({ queryKey: ["opcos"], queryFn: opcoApi.list });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      opcoApi.update(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["opcos"] }),
  });

  if (isLoading) {
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
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>Operating Companies</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
            Manage your OpCo environments
          </p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
          <Plus className="h-4 w-4" />
          New OpCo
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2 className="mb-4 text-base font-semibold" style={{ color: "var(--color-text)" }}>
            Create OpCo
          </h2>
          <OpCoForm onSuccess={() => setShowForm(false)} />
        </div>
      )}

      <div className="card overflow-hidden p-0">
        {!opcos || opcos.length === 0 ? (
          <div className="py-12 text-center" style={{ color: "var(--color-text-muted)" }}>
            No OpCos yet. Click "New OpCo" to get started.
          </div>
        ) : (
          <div>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--color-text-muted)" }}>Name</th>
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--color-text-muted)" }}>Slug</th>
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--color-text-muted)" }}>Status</th>
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--color-text-muted)" }}>Created</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {opcos.map((o) => (
                    <tr key={o.id} className="border-b last:border-0" style={{ borderColor: "var(--color-border)" }}>
                      <td className="px-4 py-3 font-medium" style={{ color: "var(--color-text)" }}>{o.name}</td>
                      <td className="px-4 py-3" style={{ color: "var(--color-text-muted)" }}>/{o.slug}</td>
                      <td className="px-4 py-3">
                        <span className={o.isActive ? "badge-success" : "badge-neutral"}>
                          {o.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--color-text-muted)" }}>
                        {formatDate(o.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => toggle.mutate({ id: o.id, isActive: !o.isActive })}
                          className={o.isActive ? "btn-secondary" : "btn-primary"}
                          title={o.isActive ? "Deactivate" : "Activate"}
                        >
                          {o.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                          {o.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile list */}
            <div className="sm:hidden divide-y" style={{ borderColor: "var(--color-border)" }}>
              {opcos.map((o) => (
                <div key={o.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium" style={{ color: "var(--color-text)" }}>{o.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>/{o.slug}</p>
                    <span className={`${o.isActive ? "badge-success" : "badge-neutral"} mt-2`}>
                      {o.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <button
                    onClick={() => toggle.mutate({ id: o.id, isActive: !o.isActive })}
                    className="btn-secondary px-3 py-1.5 text-xs"
                  >
                    {o.isActive ? "Deactivate" : "Activate"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
