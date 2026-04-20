import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ExpenseStatus } from "@expense/shared";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(dateStr));
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function statusBadgeClass(status: ExpenseStatus | string): string {
  switch (status) {
    case ExpenseStatus.APPROVED: return "badge-success";
    case ExpenseStatus.REJECTED: return "badge-danger";
    case ExpenseStatus.SUBMITTED: return "badge-warning";
    case ExpenseStatus.DRAFT: return "badge-neutral";
    default: return "badge-neutral";
  }
}

export function getFileIcon(mimeType: string): string {
  if (mimeType === "application/pdf") return "📄";
  if (mimeType.startsWith("image/")) return "🖼️";
  return "📎";
}

export const ACCEPTED_FILE_TYPES =
  "image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,image/tiff,image/gif,image/bmp,application/pdf";
