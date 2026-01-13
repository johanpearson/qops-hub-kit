// Azure Function App Module
// Creates Azure Function App with App Service Plan and monitoring

@description('Name of the Function App (must be globally unique)')
param functionAppName string

@description('Location for the Function App')
param location string

@description('Environment (dev, test, prod)')
param environment string

@description('Service name')
param serviceName string

@description('Storage account connection string for Function App')
@secure()
param storageAccountConnectionString string

@description('Application Insights connection string')
@secure()
param appInsightsConnectionString string

@description('Key Vault name for secret references')
param keyVaultName string = ''

@description('JWT secret (will be stored as app setting)')
@secure()
param jwtSecret string = ''

@description('App Service Plan SKU')
@allowed([
  'Y1' // Consumption
  'EP1' // Elastic Premium 1
  'EP2' // Elastic Premium 2
  'EP3' // Elastic Premium 3
])
param skuName string = 'Y1'

@description('App Service Plan tier')
@allowed([
  'Dynamic' // Consumption
  'ElasticPremium' // Premium
])
param skuTier string = 'Dynamic'

@description('Additional app settings')
param additionalAppSettings array = []

@description('Additional tags')
param tags object = {}

// Create App Service Plan
resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: '${functionAppName}-plan'
  location: location
  kind: 'functionapp'
  sku: {
    name: skuName
    tier: skuTier
  }
  properties: {
    reserved: true // Linux
  }
  tags: union(
    {
      Environment: environment
      Service: serviceName
      ManagedBy: 'IaC'
      Project: 'QOPS'
      Owner: 'Johan Pearson'
    },
    tags
  )
}

// Create Function App
resource functionApp 'Microsoft.Web/sites@2023-01-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    reserved: true
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|22'
      appSettings: concat(
        [
          {
            name: 'AzureWebJobsStorage'
            value: storageAccountConnectionString
          }
          {
            name: 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING'
            value: storageAccountConnectionString
          }
          {
            name: 'WEBSITE_CONTENTSHARE'
            value: toLower(functionAppName)
          }
          {
            name: 'FUNCTIONS_EXTENSION_VERSION'
            value: '~4'
          }
          {
            name: 'FUNCTIONS_WORKER_RUNTIME'
            value: 'node'
          }
          {
            name: 'WEBSITE_NODE_DEFAULT_VERSION'
            value: '~22'
          }
          {
            name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
            value: appInsightsConnectionString
          }
          {
            name: 'ApplicationInsightsAgent_EXTENSION_VERSION'
            value: '~3'
          }
        ],
        !empty(jwtSecret)
          ? [
              {
                name: 'JWT_SECRET'
                value: jwtSecret
              }
            ]
          : [],
        !empty(keyVaultName)
          ? [
              {
                name: 'KEY_VAULT_NAME'
                value: keyVaultName
              }
            ]
          : [],
        additionalAppSettings
      )
      cors: {
        allowedOrigins: [
          'https://portal.azure.com'
        ]
      }
      use32BitWorkerProcess: false
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
    }
  }
  tags: union(
    {
      Environment: environment
      Service: serviceName
      ManagedBy: 'IaC'
      Project: 'QOPS'
      Owner: 'Johan Pearson'
    },
    tags
  )
}

// Outputs
output functionAppId string = functionApp.id
output functionAppName string = functionApp.name
output functionAppHostName string = functionApp.properties.defaultHostName
output functionAppUrl string = 'https://${functionApp.properties.defaultHostName}'
output principalId string = functionApp.identity.principalId
output appServicePlanId string = appServicePlan.id
