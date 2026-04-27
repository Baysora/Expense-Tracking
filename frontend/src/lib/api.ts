import { getToken } from "./auth";
import type {
  OpCo,
  User,
  Expense,
  ExpenseCategory,
  Department,
  ExpenseAttachment,
  TokenClaims,
  ChangePasswordRequest,
  CreateOpCoRequest,
  CreateUserRequest,
  CreateExpenseRequest,
  UpdateExpenseRequest,
  ReviewExpenseRequest,
  CreateCategoryRequest,
  CopyCategoriesRequest,
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
  AccountMapping,
  CreateAccountMappingRequest,
  UpdateAccountMappingRequest,
  ExportExpensesParams,
} from "@expense/shared";

const BASE_URL = "/api";

async function getAuthHeader(): Promise<string | null> {
  const token = getToken();
  return token ? `Bearer ${token}` : null;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const authHeader = await getAuthHeader();
  const headers: Record<string, string> = {
    ...(options.body && !(options.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : {}),
    ...(authHeader ? { "x-authorization": authHeader } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// Auth
export const authApi = {
  me: () => request<TokenClaims>("/me"),
  changePassword: (data: ChangePasswordRequest) =>
    request<{ ok: true }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// OpCos
export const opcoApi = {
  list: () => request<OpCo[]>("/opcos"),
  create: (data: CreateOpCoRequest) =>
    request<OpCo>("/opcos", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<OpCo>) =>
    request<OpCo>(`/opcos/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
};

// Users
export const userApi = {
  list: () => request<User[]>("/users"),
  create: (data: CreateUserRequest) =>
    request<User>("/users", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<User> & { newPassword?: string }) =>
    request<User>(`/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
};

// Expenses
export const expenseApi = {
  list: (params?: { status?: string; opCoId?: string; mine?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.opCoId) qs.set("opCoId", params.opCoId);
    if (params?.mine) qs.set("mine", "true");
    const query = qs.toString();
    return request<Expense[]>(`/expenses${query ? `?${query}` : ""}`);
  },
  getById: (id: string) => request<Expense>(`/expenses/${id}`),
  create: (data: CreateExpenseRequest) =>
    request<Expense>("/expenses", { method: "POST", body: JSON.stringify(data) }),
  submit: (id: string) =>
    request<Expense>(`/expenses/${id}/submit`, { method: "PATCH" }),
  update: (id: string, data: UpdateExpenseRequest) =>
    request<Expense>(`/expenses/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  review: (id: string, data: ReviewExpenseRequest) =>
    request<{ expense: Expense }>(`/expenses/${id}/review`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// Categories
export const categoryApi = {
  list: (opCoId?: string) => {
    const qs = opCoId ? `?opCoId=${encodeURIComponent(opCoId)}` : "";
    return request<ExpenseCategory[]>(`/categories${qs}`);
  },
  create: (data: CreateCategoryRequest) =>
    request<ExpenseCategory>("/categories", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<ExpenseCategory> & { isShared?: boolean }) =>
    request<ExpenseCategory>(`/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  copy: (data: CopyCategoriesRequest) =>
    request<{ copied: number; skipped: number; targets: number }>("/categories/copy", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// Departments
export const departmentApi = {
  list: (opCoId?: string) => {
    const qs = opCoId ? `?opCoId=${encodeURIComponent(opCoId)}` : "";
    return request<Department[]>(`/departments${qs}`);
  },
  create: (data: CreateDepartmentRequest) =>
    request<Department>("/departments", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: UpdateDepartmentRequest) =>
    request<Department>(`/departments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

// Account Mappings — (OpCo × Category × Department) → account name
export const accountMappingApi = {
  list: (opCoId?: string) => {
    const qs = opCoId ? `?opCoId=${encodeURIComponent(opCoId)}` : "";
    return request<AccountMapping[]>(`/account-mappings${qs}`);
  },
  create: (data: CreateAccountMappingRequest) =>
    request<AccountMapping>("/account-mappings", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: UpdateAccountMappingRequest) =>
    request<AccountMapping>(`/account-mappings/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<void>(`/account-mappings/${id}`, { method: "DELETE" }),
};

// Projects (free-text; autocomplete from prior values)
export const projectApi = {
  suggest: (q: string) => {
    const qs = q ? `?q=${encodeURIComponent(q)}` : "";
    return request<string[]>(`/projects/suggestions${qs}`);
  },
};

// Exports
export const exportApi = {
  download: async (params: ExportExpensesParams): Promise<void> => {
    const authHeader = await getAuthHeader();
    const qs = new URLSearchParams();
    if (params.format) qs.set("format", params.format);
    if (params.opCoId) qs.set("opCoId", params.opCoId);
    if (params.userId) qs.set("userId", params.userId);
    if (params.status) qs.set("status", params.status);
    if (params.startDate) qs.set("startDate", params.startDate);
    if (params.endDate) qs.set("endDate", params.endDate);

    const headers: Record<string, string> = {};
    if (authHeader) headers["x-authorization"] = authHeader;

    const res = await fetch(`${BASE_URL}/exports/expenses?${qs.toString()}`, { headers });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((body as { error: string }).error ?? `HTTP ${res.status}`);
    }

    const blob = await res.blob();
    const contentDisposition = res.headers.get("Content-Disposition") ?? "";
    const match = contentDisposition.match(/filename="([^"]+)"/);
    const filename = match ? match[1] : `expenses.${params.format ?? "csv"}`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};

// Attachments
export const attachmentApi = {
  upload: async (
    expenseId: string,
    file: File,
    type: "RECEIPT" | "INVOICE"
  ): Promise<ExpenseAttachment & { sasUrl: string }> => {
    const authHeader = await getAuthHeader();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);

    const headers: Record<string, string> = {};
    if (authHeader) headers["x-authorization"] = authHeader;

    const res = await fetch(`${BASE_URL}/expenses/${expenseId}/attachments`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(body.error ?? `Upload failed: HTTP ${res.status}`);
    }

    return res.json();
  },
  remove: (expenseId: string, attachmentId: string) =>
    request<{ success: boolean }>(`/expenses/${expenseId}/attachments/${attachmentId}`, {
      method: "DELETE",
    }),
};
