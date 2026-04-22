import React from "react";
import { ExpenseStatus } from "@expense/shared";
import { statusBadgeClass } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  [ExpenseStatus.APPROVED]: "Approved",
  [ExpenseStatus.REJECTED]: "Rejected",
  [ExpenseStatus.SUBMITTED]: "In Review",
  [ExpenseStatus.DRAFT]: "Draft",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={statusBadgeClass(status as ExpenseStatus)}>
      {STATUS_LABELS[status] ?? (status.charAt(0) + status.slice(1).toLowerCase())}
    </span>
  );
}
