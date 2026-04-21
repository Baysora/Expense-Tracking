using '../main.bicep'

param environmentName = 'dev'
param sqlAdminLogin = 'sqladmin'
// Set AZURE_SQL_ADMIN_PASSWORD env var before deploying:
// export AZURE_SQL_ADMIN_PASSWORD="YourSecurePass123!"
// az deployment group create ... --parameters sqlAdminPassword=$AZURE_SQL_ADMIN_PASSWORD
param sqlAdminPassword = ''
param deployerObjectId = '' // overridden at deploy time by deploy.sh
