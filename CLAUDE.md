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

# 2. Start Azurite (Azure Storage emulator — required for attachment upload/download)
# local.settings.json uses AZURE_STORAGE_CONNECTION_STRING="UseDevelopmentStorage=true",
# which points at Azurite on ports 10000 (blob), 10001 (queue), 10002 (table).
# --skipApiVersionCheck is required: @azure/storage-blob ships a newer API version
# than Azurite's image recognizes, so uploads will 500 with "The API version ... is
# not supported by Azurite" if the flag is omitted.
docker run -d --name azurite -p 10000:10000 -p 10001:10001 -p 10002:10002 \
  mcr.microsoft.com/azure-storage/azurite \
  azurite --skipApiVersionCheck --blobHost 0.0.0.0 --queueHost 0.0.0.0 --tableHost 0.0.0.0

# 3. Configure API
cp api/local.settings.json.example api/local.settings.json
# Edit DATABASE_URL to: sqlserver://localhost:1433;database=ExpenseDB;user=sa;password=YourPass123!;trustServerCertificate=true

# 4. No frontend env vars needed — JWT auth requires no client-side config

# 5. Initialize DB and seed
cd api && npx prisma db push && npx prisma db seed && cd ..

# 6. Start both servers in separate terminals
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
- **Auth**: JWT verification (`lib/auth.ts`); `POST /api/auth/login` issues HS256 JWTs signed with `JWT_SECRET`
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
- **Auth state**: `src/lib/AuthContext.tsx` — React context; reads JWT from sessionStorage, validates via `/api/me` on load
- **API client**: `src/lib/api.ts` — fetch wrapper that attaches auth headers
- **Styling**: Tailwind CSS with custom tokens in `src/styles/`
- **Data fetching**: TanStack React Query v5


### Data Model (Prisma)

Key models: `OpCo`, `User` (with `passwordHash`), `ExpenseCategory`, `Expense`, `ExpenseAttachment`, `ApprovalRecord`.

User roles (from `@expense/shared`): `HOLDCO_ADMIN`, `OPCO_ADMIN`, `OPCO_APPROVER`, `EMPLOYEE`.

Expense lifecycle: `DRAFT → SUBMITTED → APPROVED | REJECTED`.

### Auth Flow

`POST /api/auth/login` accepts `{ email, password }`, verifies bcrypt hash, and returns a signed HS256 JWT (8h expiry). The frontend stores the token in `sessionStorage` and sends it as `Authorization: Bearer <token>` on every request. `verifyToken()` in `api/src/lib/auth.ts` validates the signature using `JWT_SECRET`. No external identity provider.

Role-based access is enforced server-side via `verifyToken()` + `requireRoles()`. Frontend routing uses the same role values from `AuthContext` to gate page access.

### Deployment

- **Frontend**: Azure Static Web Apps (auto-deployed from `main` via `.github/workflows/azure-swa.yml`)
- **API**: Azure Functions (deployed as part of SWA API)
- **IaC**: Azure Bicep templates in `infra/`
- **Routing config**: `staticwebapp.config.json` at root handles SPA fallback and security headers
- **Required secret**: `JWT_SECRET` in GitHub Secrets (generate: `openssl rand -base64 32`)

## Branching Strategy

**Two tiers only — keep it simple.**

```
main          ← production; every merge here triggers a deploy to Azure SWA
  └── feat/*  ← feature branches
  └── fix/*   ← bug fix branches
```

Rules:
- Always branch off `main`
- Open PRs back to `main`
- Delete the branch after merging
- No long-lived branches other than `main`

Azure SWA automatically creates a preview environment for each open PR — use that for staging review before merging.
