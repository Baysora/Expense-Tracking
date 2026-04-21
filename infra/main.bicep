@description('Application environment name (dev, staging, prod)')
param environmentName string = 'dev'

@description('Azure region for all resources')
param location string = resourceGroup().location

@description('SQL Server administrator login')
param sqlAdminLogin string = 'sqladmin'

@secure()
@description('SQL Server administrator password')
param sqlAdminPassword string

@description('Object ID of the deploying principal (for Key Vault access policy)')
param deployerObjectId string

@description('Override region for SQL Server if primary region has capacity issues')
param sqlLocation string = location

@description('Override SQL server name (useful when previous name is reserved after failed deploy)')
param sqlServerName string = 'expense-tracking-${environmentName}-sql-${uniqueSuffix}'

@description('Unique suffix for globally unique resource names')
param uniqueSuffix string = substring(uniqueString(resourceGroup().id), 0, 6)

var appName = 'expense-tracking'
var prefix = '${appName}-${environmentName}'

module sql './modules/sql.bicep' = {
  name: 'sql-deployment'
  params: {
    location: sqlLocation
    serverName: sqlServerName
    databaseName: 'ExpenseTracking'
    adminLogin: sqlAdminLogin
    adminPassword: sqlAdminPassword
  }
}

module storage './modules/storage.bicep' = {
  name: 'storage-deployment'
  params: {
    location: location
    storageAccountName: 'expense${uniqueSuffix}${environmentName}'
    containerName: 'expense-attachments'
  }
}

module swa './modules/staticwebapp.bicep' = {
  name: 'swa-deployment'
  params: {
    location: 'eastus2'
    name: '${prefix}-swa'
    sku: environmentName == 'prod' ? 'Standard' : 'Free'
  }
}

module kv './modules/keyvault.bicep' = {
  name: 'keyvault-deployment'
  params: {
    location: location
    vaultName: 'kv-expense-${uniqueSuffix}'
    deployerObjectId: deployerObjectId
    sqlPassword: sqlAdminPassword
  }
}

output staticWebAppUrl string = swa.outputs.defaultHostname
output staticWebAppName string = swa.outputs.swaName
output sqlServerName string = sql.outputs.serverName
output sqlConnectionString string = sql.outputs.connectionString
output storageAccountName string = storage.outputs.accountName
output storageConnectionString string = storage.outputs.connectionString
output keyVaultName string = kv.outputs.vaultName
output keyVaultUri string = kv.outputs.vaultUri
