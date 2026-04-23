import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi } from "@/lib/api";
import { Role } from "@expense/shared";
import { Plus, Loader2, UserCheck, UserX } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { formatDate } from "@/lib/utils";

const OPCO_ROLES = [Role.OPCO_ADMIN, Role.OPCO_MANAGER, Role.OPCO_USER];
const ROLE_LABELS: Record<Role, string> = {
  [Role.HOLDCO_ADMIN]: "HoldCo Admin",
  [Role.HOLDCO_MANAGER]: "HoldCo Manager",
  [Role.HOLDCO_USER]: "HoldCo User",
  [Role.OPCO_ADMIN]: "OpCo Admin",
  [Role.OPCO_MANAGER]: "OpCo Manager",
  [Role.OPCO_USER]: "OpCo User",
};

function CreateUserForm({ opCoId, onSuccess }: { opCoId: string; onSuccess: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", email: "", role: Role.OPCO_USER, temporaryPassword: "" });
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: userApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); setError(null); onSuccess(); },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); create.mutate({ ...form, opCoId }); }}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      <div>
        <label className="label">Full Name</label>
        <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required placeholder="Jane Smith" />
      </div>
      <div>
        <label className="label">Email</label>
        <input className="input" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required placeholder="jane@example.com" />
      </div>
      <div>
        <label className="label">Role</label>
        <select className="input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}>
          {OPCO_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Temporary Password</label>
        <input className="input" type="password" value={form.temporaryPassword} onChange={(e) => setForm((f) => ({ ...f, temporaryPassword: e.target.value }))} required minLength={8} placeholder="Min 8 characters" />
      </div>
      {error && <p className="text-sm sm:col-span-2" style={{ color: "var(--color-danger)" }}>{error}</p>}
      <div className="sm:col-span-2">
        <button type="submit" disabled={create.isPending} className="btn-primary">
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Create User
        </button>
      </div>
    </form>
  );
}

export function OpcoUsers() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === Role.OPCO_ADMIN;
  const [showForm, setShowForm] = useState(false);

  const { data: users, isLoading } = useQuery({ queryKey: ["users"], queryFn: userApi.list });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => userApi.update(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });

  if (isLoading || !user?.opCoId) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--color-primary)" }} /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>OpCo Users</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>{users?.length ?? 0} users in your organisation</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
            <Plus className="h-4 w-4" /> New User
          </button>
        )}
      </div>

      {showForm && (
        <div className="card">
          <h2 className="mb-4 text-base font-semibold" style={{ color: "var(--color-text)" }}>Add User</h2>
          <CreateUserForm opCoId={user.opCoId} onSuccess={() => setShowForm(false)} />
        </div>
      )}

      <div className="card overflow-hidden p-0">
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                {["Name", "Email", "Role", "Status", "Created", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: "var(--color-text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users?.map((u) => (
                <tr key={u.id} className="border-b last:border-0" style={{ borderColor: "var(--color-border)" }}>
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--color-text)" }}>{u.name}</td>
                  <td className="px-4 py-3" style={{ color: "var(--color-text-muted)" }}>{u.email}</td>
                  <td className="px-4 py-3"><span className="badge-primary">{ROLE_LABELS[u.role]}</span></td>
                  <td className="px-4 py-3"><span className={u.isActive ? "badge-success" : "badge-neutral"}>{u.isActive ? "Active" : "Inactive"}</span></td>
                  <td className="px-4 py-3" style={{ color: "var(--color-text-muted)" }}>{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {isAdmin && (
                      <button onClick={() => toggle.mutate({ id: u.id, isActive: !u.isActive })} className="btn-secondary px-2 py-1 text-xs">
                        {u.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                        {u.isActive ? "Deactivate" : "Activate"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="sm:hidden divide-y" style={{ borderColor: "var(--color-border)" }}>
          {users?.map((u) => (
            <div key={u.id} className="flex items-start justify-between p-4">
              <div>
                <p className="font-medium" style={{ color: "var(--color-text)" }}>{u.name}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{u.email}</p>
                <div className="mt-2 flex gap-2">
                  <span className="badge-primary">{ROLE_LABELS[u.role]}</span>
                  <span className={u.isActive ? "badge-success" : "badge-neutral"}>{u.isActive ? "Active" : "Inactive"}</span>
                </div>
              </div>
              {isAdmin && (
                <button onClick={() => toggle.mutate({ id: u.id, isActive: !u.isActive })} className="btn-secondary px-2 py-1 text-xs ml-3">
                  {u.isActive ? "Deactivate" : "Activate"}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
