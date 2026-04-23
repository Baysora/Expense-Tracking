export enum Role {
  HOLDCO_ADMIN = "HOLDCO_ADMIN",
  HOLDCO_MANAGER = "HOLDCO_MANAGER",
  HOLDCO_USER = "HOLDCO_USER",
  OPCO_ADMIN = "OPCO_ADMIN",
  OPCO_MANAGER = "OPCO_MANAGER",
  OPCO_USER = "OPCO_USER",
}

export enum ExpenseStatus {
  DRAFT = "DRAFT",
  SUBMITTED = "SUBMITTED",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum CategoryStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  DELETED = "DELETED",
}

export enum AttachmentType {
  RECEIPT = "RECEIPT",
  INVOICE = "INVOICE",
}

export interface OpCo {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  isHoldCo: boolean;
  requireAttachmentForAll: boolean;
  requireAttachmentAboveAmount: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  opCoId: string | null;
  opCoName?: string;
  isActive: boolean;
  createdAt: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  opCoId: string;
  status: CategoryStatus;
  isShared: boolean;
  requiresAttachment: boolean;
}

export interface Expense {
  id: string;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  status: ExpenseStatus;
  opCoId: string;
  opCoName?: string;
  categoryId: string;
  categoryName?: string;
  submittedById: string;
  submittedByName?: string;
  createdAt: string;
  updatedAt: string;
  attachments?: ExpenseAttachment[];
  approvalRecords?: ApprovalRecord[];
}

export interface ExpenseAttachment {
  id: string;
  type: AttachmentType;
  fileName: string;
  blobName: string;
  sasUrl?: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface ApprovalRecord {
  id: string;
  action: "APPROVED" | "REJECTED";
  comment?: string;
  reviewedById: string;
  reviewedByName?: string;
  createdAt: string;
}

// API request/response shapes
export interface CreateOpCoRequest {
  name: string;
  slug: string;
}

export interface CreateUserRequest {
  email: string;
  name: string;
  role: Role;
  opCoId?: string;
  temporaryPassword: string;
}

export interface CreateExpenseRequest {
  title: string;
  description?: string;
  amount: number;
  currency: string;
  categoryId: string;
}

export interface ReviewExpenseRequest {
  action: "APPROVED" | "REJECTED";
  comment?: string;
}

export interface CreateCategoryRequest {
  name: string;
  opCoId: string;
  isShared?: boolean;
  requiresAttachment?: boolean;
}

export interface CopyCategoriesRequest {
  sourceOpCoId: string;
  targetOpCoIds: string[] | "all";
}

export interface ExportExpensesParams {
  opCoId?: string;
  userId?: string;
  status?: string;
  format?: "csv" | "zip";
  startDate?: string;
  endDate?: string;
}

export interface ApiError {
  error: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Auth token claims (what we embed in JWT / extract from B2C token)
export interface TokenClaims {
  userId: string;
  email: string;
  name: string;
  role: Role;
  opCoId: string | null;
  mustChangePassword: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
