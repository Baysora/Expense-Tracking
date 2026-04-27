# Future Features

## High Impact / Low Effort

### 1. User Management Improvements
Add sortable columns, search, and filters (by role, OpCo, status) to the user tables.
Backend currently only sorts by createdAt desc — no query params for filtering/sorting.

### 2. QuickBooks Export
CSV/ZIP export already exists. Add QuickBooks Desktop (.qbo) and QuickBooks Online export formats.

### 3. OpCo Export Access
Export button currently only available to HoldCo. Surface it on the OpCo expenses page too.

## Medium Effort

### 4. Email Infrastructure
No email exists today. Building any email feature requires adding a provider first (SendGrid, Resend, etc.).

- Welcome email on user creation
- Password reset via email (current reset is admin-driven in-app only)
- Approval/notification emails (status changes, assignments)

### 5. Custom Category Ordering
Categories sort alphabetically today. Add drag-and-drop reordering or a `displayOrder` field.

### 6. Edit Draft Expenses
Currently only attachments can be added to a DRAFT — core fields are immutable. Allow editing amount, category, date, etc. before submission.

### 7. Multi-Level Approval Chain
Single reviewer only today. Support sequential or parallel approval workflows.

## Higher Effort

### 8. OCR Receipt/Invoice Submission
Auto-populate expense fields from uploaded receipt images.

### 9. Sign-Up Flow
Self-service registration with email verification. Currently all users are created by admins.
