import React from "react";
import { ExpenseStatus } from "@expense/shared";
import { statusBadgeClass } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={statusBadgeClass(status as ExpenseStatus)}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
