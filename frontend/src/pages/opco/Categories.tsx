import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { categoryApi } from "@/lib/api";
import { Plus, Loader2, Tag, ToggleLeft, ToggleRight } from "lucide-react";

export function OpcoCategories() {
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: categories, isLoading } = useQuery({ queryKey: ["categories"], queryFn: categoryApi.list });

  const create = useMutation({
    mutationFn: categoryApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      setNewName("");
      setShowForm(false);
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      categoryApi.update(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--color-primary)" }} /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>Expense Categories</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>Manage categories for expense submissions</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
          <Plus className="h-4 w-4" /> New Category
        </button>
      </div>

      {showForm && (
        <div className="card">
          <form
            onSubmit={(e) => { e.preventDefault(); create.mutate({ name: newName }); }}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="flex-1">
              <label className="label">Category Name</label>
              <input
                className="input"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Travel, Meals, Software"
                required
              />
            </div>
            {error && <p className="text-sm" style={{ color: "var(--color-danger)" }}>{error}</p>}
            <button type="submit" disabled={create.isPending} className="btn-primary sm:mb-0">
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories?.map((cat) => (
          <div key={cat.id} className="card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2" style={{ backgroundColor: "rgba(30,58,95,0.08)" }}>
                <Tag className="h-4 w-4" style={{ color: "var(--color-primary)" }} />
              </div>
              <div>
                <p className="font-medium" style={{ color: "var(--color-text)", opacity: cat.isActive ? 1 : 0.5 }}>
                  {cat.name}
                </p>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {cat.isActive ? "Active" : "Inactive"}
                </p>
              </div>
            </div>
            <button
              onClick={() => toggle.mutate({ id: cat.id, isActive: !cat.isActive })}
              className="ml-2 text-sm"
              title={cat.isActive ? "Deactivate" : "Activate"}
              style={{ color: cat.isActive ? "var(--color-success)" : "var(--color-text-muted)" }}
            >
              {cat.isActive ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
            </button>
          </div>
        ))}

        {!categories || categories.length === 0 ? (
          <div className="card py-10 text-center sm:col-span-2 lg:col-span-3" style={{ color: "var(--color-text-muted)" }}>
            No categories yet. Add your first category above.
          </div>
        ) : null}
      </div>
    </div>
  );
}
