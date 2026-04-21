#!/usr/bin/env bash
# Deploys Azure infrastructure and wires all required GitHub Actions secrets.
# The SQL admin password is auto-generated and stored in Key Vault.
#
# Prerequisites:
#   az login
#   gh auth login
#
# Usage:
#   ./infra/deploy.sh \
#     --resource-group  expense-tracking-dev \
#     --environment     dev \
#     --github-repo     Baysora/Expense-Tracking \
#     [--entra-tenant    baysora] \
#     [--entra-client-id xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx] \
#     [--entra-audience  xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx] \
#     [--entra-api-scope "https://baysora.onmicrosoft.com/expense-api/access_as_user"]

set -euo pipefail

# ── Argument parsing ────────────────────────────────────────────────────────
RESOURCE_GROUP=""
ENVIRONMENT="dev"
GITHUB_REPO=""
ENTRA_TENANT=""
ENTRA_CLIENT_ID=""
ENTRA_AUDIENCE=""
ENTRA_API_SCOPE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --resource-group)   RESOURCE_GROUP="$2";   shift 2 ;;
    --environment)      ENVIRONMENT="$2";      shift 2 ;;
    --github-repo)      GITHUB_REPO="$2";      shift 2 ;;
    --entra-tenant)     ENTRA_TENANT="$2";     shift 2 ;;
    --entra-client-id)  ENTRA_CLIENT_ID="$2";  shift 2 ;;
    --entra-audience)   ENTRA_AUDIENCE="$2";   shift 2 ;;
    --entra-api-scope)  ENTRA_API_SCOPE="$2";  shift 2 ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
done

# ── Validate required args ───────────────────────────────────────────────────
for var in RESOURCE_GROUP GITHUB_REPO; do
  if [[ -z "${!var}" ]]; then
    echo "Error: --$(echo "$var" | tr '[:upper:]' '[:lower:]' | tr '_' '-') is required"
    exit 1
  fi
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Auto-generate a strong SQL password ─────────────────────────────────────
SQL_PASSWORD="$(openssl rand -base64 32 | tr -d '\n')"
echo "▶ Generated SQL admin password (will be stored in Key Vault)"

# ── Get deploying principal's Object ID ─────────────────────────────────────
echo "▶ Fetching deployer Object ID from Azure AD..."
DEPLOYER_OID="$(az ad signed-in-user show --query id -o tsv)"
echo "  Deployer OID: $DEPLOYER_OID"

# ── Create resource group ────────────────────────────────────────────────────
echo "▶ Creating resource group '$RESOURCE_GROUP' if it doesn't exist..."
az group create --name "$RESOURCE_GROUP" --location eastus2 --output none

# ── Deploy Bicep ─────────────────────────────────────────────────────────────
echo "▶ Deploying infrastructure (environment: $ENVIRONMENT)..."
OUTPUTS=$(az deployment group create \
  --resource-group "$RESOURCE_GROUP" \
  --template-file "$SCRIPT_DIR/main.bicep" \
  --parameters "$SCRIPT_DIR/parameters/${ENVIRONMENT}.bicepparam" \
  --parameters sqlAdminPassword="$SQL_PASSWORD" deployerObjectId="$DEPLOYER_OID" \
  --query "properties.outputs" \
  --output json)

# ── Extract outputs ──────────────────────────────────────────────────────────
SWA_NAME=$(echo "$OUTPUTS"     | jq -r '.staticWebAppName.value')
SQL_CONN=$(echo "$OUTPUTS"     | jq -r '.sqlConnectionString.value')
STORAGE_CONN=$(echo "$OUTPUTS" | jq -r '.storageConnectionString.value')
SWA_URL=$(echo "$OUTPUTS"      | jq -r '.staticWebAppUrl.value')
KV_NAME=$(echo "$OUTPUTS"      | jq -r '.keyVaultName.value')
KV_URI=$(echo "$OUTPUTS"       | jq -r '.keyVaultUri.value')

echo "  Static Web App : $SWA_NAME"
echo "  URL            : https://$SWA_URL"
echo "  Key Vault      : $KV_NAME"
echo ""
echo "  SQL password stored in Key Vault — retrieve with:"
echo "    az keyvault secret show --vault-name $KV_NAME --name sql-admin-password --query value -o tsv"

# ── Get SWA deployment token ─────────────────────────────────────────────────
echo "▶ Fetching Static Web App deployment token..."
SWA_TOKEN=$(az staticwebapp secrets list \
  --name "$SWA_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.apiKey" \
  --output tsv)

# ── Set GitHub secrets ────────────────────────────────────────────────────────
echo "▶ Setting GitHub Actions secrets on $GITHUB_REPO..."

gh secret set AZURE_STATIC_WEB_APPS_API_TOKEN --body "$SWA_TOKEN"    --repo "$GITHUB_REPO"
gh secret set DATABASE_URL                    --body "$SQL_CONN"      --repo "$GITHUB_REPO"
gh secret set AZURE_STORAGE_CONNECTION_STRING --body "$STORAGE_CONN" --repo "$GITHUB_REPO"

# Entra External ID secrets — only set if provided
if [[ -n "$ENTRA_TENANT" ]];    then gh secret set ENTRA_TENANT_NAME --body "$ENTRA_TENANT"    --repo "$GITHUB_REPO"; fi
if [[ -n "$ENTRA_CLIENT_ID" ]]; then gh secret set ENTRA_CLIENT_ID   --body "$ENTRA_CLIENT_ID" --repo "$GITHUB_REPO"; fi
if [[ -n "$ENTRA_AUDIENCE" ]];  then gh secret set ENTRA_AUDIENCE    --body "$ENTRA_AUDIENCE"  --repo "$GITHUB_REPO"; fi
if [[ -n "$ENTRA_API_SCOPE" ]]; then gh secret set ENTRA_API_SCOPE   --body "$ENTRA_API_SCOPE" --repo "$GITHUB_REPO"; fi

echo ""
echo "✅ Done! All secrets set. Push to main to trigger a deployment."
echo "   App URL: https://$SWA_URL"
echo "   Key Vault: $KV_URI"
