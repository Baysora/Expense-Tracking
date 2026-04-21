@description('Application environment name (dev, staging, prod)')
param environmentName string = 'dev'

@description('Azure region for all resources')
param location string = resourceGroup().location

@description('SQL Server administrator login')
param sqlAdminLogin string = 'sqladmin'

@secure()
@description('SQL Server administrator password')
param sqlAdminPassword string

@description('Unique suffix for globally unique resource names')
param uniqueSuffix string = substring(uniqueString(resourceGroup().id), 0, 6)

var appName = 'expense-tracking'
var prefix = '${appName}-${environmentName}'

module sql './modules/sql.bicep' = {
  name: 'sql-deployment'
  params: {
    location: location
    serverName: '${prefix}-sql-${uniqueSuffix}'
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

module functionApp './modules/functionapp.bicep' = {
  name: 'functionapp-deployment'
  params: {
    location: location
    functionAppName: '${prefix}-api-${uniqueSuffix}'
    storageConnectionString: storage.outputs.connectionString
    sqlConnectionString: sql.outputs.connectionString
    storageContainerName: 'expense-attachments'
  }
}

output staticWebAppUrl string = swa.outputs.defaultHostname
output staticWebAppName string = swa.outputs.swaName
output functionAppUrl string = functionApp.outputs.defaultHostname
output sqlServerName string = sql.outputs.serverName
output sqlConnectionString string = sql.outputs.connectionString
output storageAccountName string = storage.outputs.accountName
output storageConnectionString string = storage.outputs.connectionString
