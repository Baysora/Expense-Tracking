using '../main.bicep'

param environmentName = 'prod'
param sqlAdminLogin = 'sqladmin'
param sqlAdminPassword = ''
param deployerObjectId = '' // overridden at deploy time by deploy.sh
