param location string
param functionAppName string
param storageConnectionString string
param sqlConnectionString string
param storageContainerName string

var hostingPlanName = '${functionAppName}-plan'
var appInsightsName = '${functionAppName}-insights'

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    RetentionInDays: 30
  }
}

resource hostingPlan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: hostingPlanName
  location: location
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
  properties: {
    reserved: false
  }
}

resource functionApp 'Microsoft.Web/sites@2022-09-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp'
  properties: {
    serverFarmId: hostingPlan.id
    siteConfig: {
      appSettings: [
        { name: 'AzureWebJobsStorage', value: storageConnectionString }
        { name: 'FUNCTIONS_EXTENSION_VERSION', value: '~4' }
        { name: 'FUNCTIONS_WORKER_RUNTIME', value: 'node' }
        { name: 'WEBSITE_NODE_DEFAULT_VERSION', value: '~20' }
        { name: 'APPINSIGHTS_INSTRUMENTATIONKEY', value: appInsights.properties.InstrumentationKey }
        { name: 'DATABASE_URL', value: sqlConnectionString }
        { name: 'AZURE_STORAGE_CONNECTION_STRING', value: storageConnectionString }
        { name: 'AZURE_STORAGE_CONTAINER_NAME', value: storageContainerName }
        { name: 'NODE_ENV', value: 'production' }
      ]
      nodeVersion: '~20'
      cors: {
        allowedOrigins: ['*']
        supportCredentials: false
      }
    }
    httpsOnly: true
  }
}

output defaultHostname string = functionApp.properties.defaultHostName
