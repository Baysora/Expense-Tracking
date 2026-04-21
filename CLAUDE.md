# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
# Install all dependencies (run from root)
npm ci

# Build shared types first (required before API/frontend builds)
npm run build --workspace=packages/shared

# Start API dev server (http://localhost:7071)
npm run dev:api

# Start frontend dev server (http://localhost:5173)
npm run dev:frontend

# Build all workspaces
npm run build
```

### Database
```bash
cd api

# Apply schema changes to DB
npx prisma db push

# Seed sample data (HoldCo + 2 OpCos + 9 users, all password: Admin@123!)
npx prisma db seed

# Regenerate Prisma client after schema changes
npx prisma generate

# Run migrations (production path)
npx prisma migrate deploy
```

### Linting
```bash
# Lint frontend TypeScript/TSX files
cd frontend && npm run lint
```

### Per-package builds
```bash
npm run build --workspace=packages/shared   # shared types only
npm run build --workspace=api               # API only
npm run build --workspace=frontend          # frontend only
```

## Local Dev Setup

Prerequisites: Node.js ≥ 20, Docker.

```bash
# 1. Start SQL Server
docker run -d --name sql-local -e ACCEPT_EULA=Y -e SA_PASSWORD=YourPass123! -p 1433:1433 mcr.microsoft.com/mssql/server:2022-latest

# 2. Configure API
cp api/local.settings.json.example api/local.settings.json
# Edit DATABASE_URL to: sqlserver://localhost:1433;database=ExpenseDB;user=sa;password=YourPass123!;trustServerCertificate=true

# 3. Configure frontend
cp frontend/.env.example frontend/.env
# VITE_DEV_MODE=true is already set — skips Entra, uses dev bearer tokens

# 4. Initialize DB and seed
cd api && npx prisma db push && npx prisma db seed && cd ..

# 5. Start both servers in separate terminals
npm run dev:api
npm run dev:frontend
```

## Architecture

### Monorepo Structure

This is an **npm workspaces monorepo** for a multi-tenant expense tracking platform hosted on Azure:

| Workspace | Path | Purpose |
|---|---|---|
| `@expense/shared` | `packages/shared/` | Shared TypeScript types, enums, interfaces |
| `@expense/api` | `api/` | Azure Functions v4 backend (Express for local dev) |
| `@expense/frontend` | `frontend/` | React 18 SPA (Vite, Tailwind CSS) |

Both `api` and `frontend` import from `@expense/shared` — **always build shared first**.

### Backend (`api/`)

- **Runtime**: Azure Functions v4 (HTTP triggers) in production; Express server (`localServer.ts`) for local dev
- **ORM**: Prisma with SQL Server — schema at `api/prisma/schema.prisma`
- **Auth**: JWT verification (`lib/auth.ts`); `DEV_MODE=true` bypasses Entra External ID and accepts `Bearer dev:<base64(email:password)>` tokens
- **Validation**: Zod schemas on all function inputs
- **File storage**: Azure Blob Storage with SAS URL access (`lib/blob.ts`)
- **Function registration**: All HTTP handlers registered in `api/src/index.ts`

Functions are organized by domain under `api/src/functions/`:
- `opcos/` — OpCo CRUD
- `users/` — user management and login
- `categories/` — category CRUD and copy between OpCos
- `expenses/` — expense CRUD, submit, approve/reject
- `uploads/` — attachment upload
- `exports/` — CSV/ZIP export

### Frontend (`frontend/`)

- **Framework**: React 18 + Vite + TypeScript
- **Routing**: React Router v6; pages organized under `src/pages/` by role: `holdco/`, `opco/`, `user/`
- **Auth state**: `src/lib/AuthContext.tsx` — React context wrapping MSAL (prod) or dev token logic
- **API client**: `src/lib/api.ts` — fetch wrapper that attaches auth headers
- **Styling**: Tailwind CSS with custom tokens in `src/styles/`
- **Data fetching**: TanStack React Query v5

In `VITE_DEV_MODE=true`, the Login page generates dev bearer tokens — no Entra needed.

### Data Model (Prisma)

Key models: `OpCo`, `User` (with `passwordHash`), `ExpenseCategory`, `Expense`, `ExpenseAttachment`, `ApprovalRecord`.

User roles (from `@expense/shared`): `HOLDCO_ADMIN`, `OPCO_ADMIN`, `OPCO_APPROVER`, `EMPLOYEE`.

Expense lifecycle: `DRAFT → SUBMITTED → APPROVED | REJECTED`.

### Auth Flow

**Production**: Microsoft Entra External ID (CIAM). Frontend uses MSAL (`@azure/msal-browser`) with authority `https://<tenant>.ciamlogin.com/<tenant>.onmicrosoft.com/`. API verifies RS256 JWTs against the CIAM JWKS endpoint. Custom token claims `extension_role` and `extension_opCoId` must be configured in the Entra External ID tenant and added to the token via a custom claims policy.

**Local dev** (`DEV_MODE=true`): Bypasses Entra entirely. Frontend sends `Bearer dev:<base64(email:password)>`, API looks up the user in the DB and verifies bcrypt password hash.

Role-based access is enforced server-side via `verifyToken()` + `requireRoles()` in `api/src/lib/auth.ts`. Frontend routing uses the same role values from `AuthContext` to gate page access.

### Entra External ID Setup (production)

When setting up the Entra External ID tenant:
1. Register two app registrations: one for the SPA (frontend), one for the API
2. Expose an API scope on the API registration (e.g. `access_as_user`)
3. Add `access_as_user` as a delegated permission on the SPA registration
4. Create custom user attributes: `role` (String) and `opCoId` (String)
5. Add both attributes to the sign-in user flow and include them in the token
6. Set env vars: `ENTRA_TENANT_NAME`, `ENTRA_AUDIENCE` (API client ID) on the API; `VITE_ENTRA_TENANT_NAME`, `VITE_ENTRA_CLIENT_ID`, `VITE_API_SCOPE` on the frontend

### Deployment

- **Frontend**: Azure Static Web Apps (auto-deployed from `main` via `.github/workflows/azure-swa.yml`)
- **API**: Azure Functions (deployed as part of SWA API)
- **IaC**: Azure Bicep templates in `infra/`
- **Routing config**: `staticwebapp.config.json` at root handles SPA fallback and security headers
