import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { opcoApi } from "@/lib/api";
import { Building2, Users, Receipt, ChevronRight, Loader2 } from "lucide-react";

export function HoldcoDashboard() {
  const { data: opcos, isLoading, error } = useQuery({
    queryKey: ["opcos"],
    queryFn: opcoApi.list,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--color-primary)" }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6 text-center" style={{ color: "var(--color-danger)" }}>
        Failed to load data. Please refresh.
      </div>
    );
  }

  const active = opcos?.filter((o) => o.isActive) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
          HoldCo Dashboard
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
          Overview of all operating companies
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="card flex items-center gap-4">
          <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(30,58,95,0.1)" }}>
            <Building2 className="h-6 w-6" style={{ color: "var(--color-primary)" }} />
          </div>
          <div>
            <p className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
              {active.length}
            </p>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              Active OpCos
            </p>
          </div>
        </div>
      </div>

      {/* OpCo list */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
            Operating Companies
          </h2>
          <Link to="/holdco/opcos" className="btn-secondary text-sm px-3 py-1.5">
            Manage All
          </Link>
        </div>

        {opcos && opcos.length === 0 ? (
          <div className="card py-10 text-center">
            <p style={{ color: "var(--color-text-muted)" }}>No OpCos created yet.</p>
            <Link to="/holdco/opcos" className="btn-primary mt-4 inline-flex">
              Create First OpCo
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {opcos?.map((opco) => (
              <Link
                key={opco.id}
                to={`/holdco/opcos`}
                className="card flex items-center justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  <p className="font-semibold" style={{ color: "var(--color-text)" }}>
                    {opco.name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                    /{opco.slug}
                  </p>
                  <span className={opco.isActive ? "badge-success mt-2" : "badge-neutral mt-2"}>
                    {opco.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: "var(--color-text-muted)" }} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
