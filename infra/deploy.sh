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
#     [--b2c-tenant      mytenant.onmicrosoft.com] \
#     [--b2c-policy      B2C_1_signupsignin] \
#     [--b2c-client-id   xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx] \
#     [--b2c-audience    xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx] \
#     [--b2c-api-scope   "https://mytenant.onmicrosoft.com/expense-api/access_as_user"]

set -euo pipefail

# ── Argument parsing ────────────────────────────────────────────────────────
RESOURCE_GROUP=""
ENVIRONMENT="dev"
GITHUB_REPO=""
B2C_TENANT=""
B2C_POLICY="B2C_1_signupsignin"
B2C_CLIENT_ID=""
B2C_AUDIENCE=""
B2C_API_SCOPE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --resource-group)  RESOURCE_GROUP="$2";  shift 2 ;;
    --environment)     ENVIRONMENT="$2";     shift 2 ;;
    --github-repo)     GITHUB_REPO="$2";     shift 2 ;;
    --b2c-tenant)      B2C_TENANT="$2";      shift 2 ;;
    --b2c-policy)      B2C_POLICY="$2";      shift 2 ;;
    --b2c-client-id)   B2C_CLIENT_ID="$2";   shift 2 ;;
    --b2c-audience)    B2C_AUDIENCE="$2";    shift 2 ;;
    --b2c-api-scope)   B2C_API_SCOPE="$2";   shift 2 ;;
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
# 32 chars, base64 gives [A-Za-z0-9+/] — meets SQL Server complexity rules
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
echo "  SQL password stored in Key Vault secret 'sql-admin-password'"
echo "  Retrieve it any time with:"
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

# B2C secrets — only set if provided
if [[ -n "$B2C_TENANT" ]];    then gh secret set B2C_TENANT_NAME  --body "$B2C_TENANT"    --repo "$GITHUB_REPO"; fi
if [[ -n "$B2C_POLICY" ]];    then gh secret set B2C_POLICY_NAME  --body "$B2C_POLICY"    --repo "$GITHUB_REPO"; fi
if [[ -n "$B2C_CLIENT_ID" ]]; then gh secret set B2C_CLIENT_ID    --body "$B2C_CLIENT_ID" --repo "$GITHUB_REPO"; fi
if [[ -n "$B2C_AUDIENCE" ]];  then gh secret set B2C_AUDIENCE     --body "$B2C_AUDIENCE"  --repo "$GITHUB_REPO"; fi
if [[ -n "$B2C_API_SCOPE" ]]; then gh secret set B2C_API_SCOPE    --body "$B2C_API_SCOPE" --repo "$GITHUB_REPO"; fi

echo ""
echo "✅ Done! All secrets set. Push to main to trigger a deployment."
echo "   App URL: https://$SWA_URL"
echo "   Key Vault: $KV_URI"
