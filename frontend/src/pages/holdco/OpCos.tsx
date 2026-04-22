import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { opcoApi } from "@/lib/api";
import { OpCo, Role } from "@expense/shared";
import { Plus, Loader2, Building2, Power, PowerOff, Save } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";

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

function AttachmentRulesPanel({ opco }: { opco: OpCo }) {
  const qc = useQueryClient();
  const [requireAll, setRequireAll] = useState(opco.requireAttachmentForAll);
  const [aboveAmount, setAboveAmount] = useState<string>(
    opco.requireAttachmentAboveAmount != null ? String(opco.requireAttachmentAboveAmount) : ""
  );
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const update = useMutation({
    mutationFn: () =>
      opcoApi.update(opco.id, {
        requireAttachmentForAll: requireAll,
        requireAttachmentAboveAmount: aboveAmount !== "" ? parseFloat(aboveAmount) : null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["opcos"] });
      setSaved(true);
      setSaveError(null);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (e: Error) => setSaveError(e.message),
  });

  return (
    <div className="mt-3 rounded-lg border p-4 space-y-3" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg-subtle)" }}>
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
        Attachment Rules
      </p>

      <label className="flex items-center gap-2 cursor-pointer text-sm">
        <input
          type="checkbox"
          checked={requireAll}
          onChange={(e) => setRequireAll(e.target.checked)}
        />
        <span style={{ color: "var(--color-text)" }}>Require attachment for all expenses</span>
      </label>

      <div>
        <label className="label text-xs">Require attachment when amount exceeds</label>
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>$</span>
          <input
            type="number"
            className="input w-36 py-1.5 text-sm"
            placeholder="e.g. 100"
            min="0"
            step="0.01"
            value={aboveAmount}
            onChange={(e) => setAboveAmount(e.target.value)}
          />
          {aboveAmount && (
            <button
              type="button"
              onClick={() => setAboveAmount("")}
              className="text-xs"
              style={{ color: "var(--color-text-muted)" }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {saveError && <p className="text-xs" style={{ color: "var(--color-danger)" }}>{saveError}</p>}

      <button
        onClick={() => update.mutate()}
        disabled={update.isPending}
        className="btn-secondary py-1.5 text-xs"
      >
        {update.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
        {saved ? "Saved!" : "Save Rules"}
      </button>
    </div>
  );
}

export function HoldcoOpCos() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === Role.HOLDCO_ADMIN;
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
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

  const displayOpcos = opcos?.filter((o) => !o.isHoldCo) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>Operating Companies</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
            Manage your OpCo environments
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
            <Plus className="h-4 w-4" />
            New OpCo
          </button>
        )}
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
        {displayOpcos.length === 0 ? (
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
                  {displayOpcos.map((o) => (
                    <React.Fragment key={o.id}>
                      <tr className="border-b last:border-0" style={{ borderColor: "var(--color-border)" }}>
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
                          {isAdmin && (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
                                className="btn-secondary px-2 py-1.5 text-xs"
                              >
                                {expandedId === o.id ? "Hide Rules" : "Attachment Rules"}
                              </button>
                              <button
                                onClick={() => toggle.mutate({ id: o.id, isActive: !o.isActive })}
                                className={o.isActive ? "btn-secondary" : "btn-primary"}
                                title={o.isActive ? "Deactivate" : "Activate"}
                              >
                                {o.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                                {o.isActive ? "Deactivate" : "Activate"}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                      {expandedId === o.id && (
                        <tr style={{ borderColor: "var(--color-border)" }}>
                          <td colSpan={5} className="px-4 pb-3">
                            <AttachmentRulesPanel opco={o} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile list */}
            <div className="sm:hidden divide-y" style={{ borderColor: "var(--color-border)" }}>
              {displayOpcos.map((o) => (
                <div key={o.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium" style={{ color: "var(--color-text)" }}>{o.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>/{o.slug}</p>
                      <span className={`${o.isActive ? "badge-success" : "badge-neutral"} mt-2`}>
                        {o.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => toggle.mutate({ id: o.id, isActive: !o.isActive })}
                        className="btn-secondary px-3 py-1.5 text-xs"
                      >
                        {o.isActive ? "Deactivate" : "Activate"}
                      </button>
                    )}
                  </div>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
                        className="text-xs w-full text-left"
                        style={{ color: "var(--color-primary)" }}
                      >
                        {expandedId === o.id ? "Hide attachment rules ▲" : "Show attachment rules ▼"}
                      </button>
                      {expandedId === o.id && <AttachmentRulesPanel opco={o} />}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
