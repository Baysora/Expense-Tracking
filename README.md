# Baysora Expense Tracking

Multi-tenant expense tracking platform for HoldCo/OpCo organisations. Built on Azure.

## Architecture

| Component | Technology |
|---|---|
| Frontend | React + TypeScript + Vite (hosted on Azure Static Web Apps) |
| API | Azure Functions v4 (TypeScript/Node.js 20) |
| Database | Azure SQL Database via Prisma ORM |
| File Storage | Azure Blob Storage (private, SAS URLs) |
| Auth | Azure AD B2C (email + password) |
| IaC | Azure Bicep |
| CI/CD | GitHub Actions |

## User Roles

| Role | Access |
|---|---|
| `HOLDCO_ADMIN` | Manage all OpCos and users |
| `OPCO_ADMIN` | Manage users, categories, and expenses within their OpCo |
| `OPCO_MANAGER` | Approve or reject submitted expenses |
| `OPCO_USER` | Submit expenses with receipts and invoices |

## Supported File Types

Receipts and invoices: **PDF, JPEG, PNG, WEBP, HEIC, HEIF, TIFF, GIF, BMP** (max 10 MB each)

## Local Development

### Prerequisites

- Node.js 20+
- [Azure Functions Core Tools v4](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local)
- Docker (for local SQL Server)
- [Azurite](https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azurite) (local Blob Storage emulator)

### Setup

```bash
# 1. Install dependencies
npm ci

# 2. Build shared types
npm run build --workspace=packages/shared

# 3. Start local SQL Server
docker run -e ACCEPT_EULA=Y -e SA_PASSWORD=YourPass123! \
  -p 1433:1433 --name sql-local \
  mcr.microsoft.com/mssql/server:2022-latest

# 4. Copy and configure API settings
cp api/local.settings.json.example api/local.settings.json
# Edit api/local.settings.json with your DATABASE_URL and storage connection

# 5. Run Prisma migrations
cd api && npx prisma migrate dev && npx prisma db seed && cd ..

# 6. Copy and configure frontend env
cp frontend/.env.example frontend/.env.local
# Set VITE_DEV_MODE=true for local development (email/password auth against local DB)

# 7. Start Azurite (local blob storage)
npx azurite --location .azurite --debug .azurite/debug.log &

# 8. Start API (Terminal 1)
npm run dev:api

# 9. Start frontend (Terminal 2)
npm run dev:frontend
```

Visit http://localhost:5173 and sign in with:
- **Email:** admin@holdco.com
- **Password:** Admin@123!

### Default Seed Data

The seed script creates a single HoldCo Admin:
- Email: `admin@holdco.com`
- Password: `Admin@123!`  
- **Change this password immediately after first login**

## Azure Deployment

### 1. Provision Azure Resources

```bash
# Create resource group
az group create --name rg-expense-tracking-dev --location eastus

# Deploy all resources
az deployment group create \
  --resource-group rg-expense-tracking-dev \
  --template-file infra/main.bicep \
  --parameters infra/parameters/dev.bicepparam \
  --parameters sqlAdminPassword="YourSecurePassword123!"
```

### 2. Configure Azure AD B2C

1. Create an Azure AD B2C tenant
2. Register two app registrations: `expense-tracking-api` and `expense-tracking-spa`
3. Create a Sign up / Sign in user flow
4. Add custom attributes: `extension_role` (String) and `extension_opCoId` (String)
5. Include these attributes in token claims

### 3. Set GitHub Secrets

In your repository settings → Secrets and variables → Actions:

```
AZURE_STATIC_WEB_APPS_API_TOKEN   # From Azure Portal → Static Web App → Manage token
DATABASE_URL                       # From Bicep outputs
AZURE_STORAGE_CONNECTION_STRING    # From Bicep outputs
B2C_TENANT_NAME                    # Your B2C tenant name
B2C_POLICY_NAME                    # B2C_1_signupsignin
B2C_CLIENT_ID                      # SPA app registration client ID
B2C_AUDIENCE                       # API app registration client ID
B2C_API_SCOPE                      # https://{tenant}.onmicrosoft.com/expense-api/access_as_user
```

### 4. Run Database Migrations

```bash
# Point DATABASE_URL at your Azure SQL instance
DATABASE_URL="sqlserver://..." npx prisma migrate deploy
DATABASE_URL="sqlserver://..." npx prisma db seed
```

### 5. Push to main

```bash
git push origin main
```

GitHub Actions will build and deploy automatically.

## Branding

Brand colors are defined in `frontend/src/styles/tokens.css` as CSS custom properties. Update the `--color-primary`, `--color-accent`, etc. values once Baysora brand colors are confirmed. All UI components reference these tokens, so a single file update applies the brand globally.

## Project Structure

```
/
├── packages/shared/       # Shared TypeScript types (enums, interfaces)
├── api/                   # Azure Functions (TypeScript)
│   ├── prisma/           # Database schema and migrations
│   └── src/
│       ├── functions/    # HTTP trigger functions (grouped by domain)
│       └── lib/          # Auth, Prisma client, Blob Storage, error helpers
├── frontend/              # React SPA (Vite + TypeScript)
│   └── src/
│       ├── pages/        # Route components per role
│       ├── components/   # Shared UI components
│       └── lib/          # Auth context, API client, utilities
├── infra/                 # Azure Bicep IaC templates
│   └── modules/          # SQL, Storage, SWA, Function App modules
└── .github/workflows/    # GitHub Actions CI/CD
```
