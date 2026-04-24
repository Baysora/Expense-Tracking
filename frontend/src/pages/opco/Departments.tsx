import React from "react";
import { useQuery } from "@tanstack/react-query";
import { departmentApi } from "@/lib/api";
import { CategoryStatus } from "@expense/shared";
import { Loader2, Network, Info } from "lucide-react";

export function OpcoDepartments() {
  const { data: departments, isLoading } = useQuery({
    queryKey: ["departments"],
    queryFn: () => departmentApi.list(),
  });

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--color-primary)" }} /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>Departments</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>Departments available for expense submissions</p>
      </div>

      <div className="flex items-start gap-2 rounded-lg border p-3 text-sm" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg-subtle)" }}>
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: "var(--color-primary)" }} />
        <p style={{ color: "var(--color-text-muted)" }}>
          Departments are managed by the HoldCo Administrator. Contact your HoldCo admin to add, modify, or archive departments.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {departments?.map((dept) => (
          <div
            key={dept.id}
            className="card flex items-center gap-3"
            style={{ opacity: dept.status === CategoryStatus.ACTIVE ? 1 : 0.5 }}
          >
            <div className="rounded-lg p-2 flex-shrink-0" style={{ backgroundColor: "rgba(30,58,95,0.08)" }}>
              <Network className="h-4 w-4" style={{ color: "var(--color-primary)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate" style={{ color: "var(--color-text)" }}>{dept.name}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {dept.status === CategoryStatus.ACTIVE ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
        ))}

        {!departments || departments.length === 0 ? (
          <div className="card py-10 text-center sm:col-span-2 lg:col-span-3" style={{ color: "var(--color-text-muted)" }}>
            No departments yet. Your HoldCo admin will add departments for your OpCo.
          </div>
        ) : null}
      </div>
    </div>
  );
}
