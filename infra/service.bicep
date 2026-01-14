// Service Template
// Deploys a single service with Azure Function App and storage

targetScope = 'subscription'

@description('Service name (use your service name)')
param serviceName string

@description('Environment (dev, test, prod)')
param environment string

@description('Primary location')
param location string = 'swedencentral'

@description('JWT secret for authentication')
@secure()
param jwtSecret string

@description('Key Vault name from common resources')
param keyVaultName string = ''

@description('App Service Plan SKU (Y1=Consumption - cheapest)')
@allowed([
  'Y1' // Consumption plan - pay per execution
])
param functionAppSku string = 'Y1'

@description('Additional app settings for Function App')
param additionalAppSettings array = []

@description('Additional tags')
param tags object = {}

// Variables
var resourceGroupName = 'rg-qops-${serviceName}-${environment}'
var functionAppName = 'func-qops-${serviceName}-${environment}'
// Note: Storage account names must be globally unique across Azure (3-24 chars, lowercase/numbers only).
// If this name is already taken, consider adding a suffix like: 
// 'stqops${serviceName}${environment}${take(uniqueString(subscription().subscriptionId), 6)}'
var storageAccountName = 'stqops${serviceName}${environment}'
var appInsightsName = 'appi-qops-${serviceName}-${environment}'
var skuTier = 'Dynamic' // Consumption plan

// Create service resource group
module serviceResourceGroup 'modules/resource-group.bicep' = {
  name: 'deploy-${serviceName}-rg'
  params: {
    resourceGroupName: resourceGroupName
    location: location
    environment: environment
    serviceName: serviceName
    additionalTags: tags
  }
}

// Create storage account for Function App (includes blob and table storage)
module storageAccount 'modules/storage-account.bicep' = {
  name: 'deploy-${serviceName}-storage'
  scope: resourceGroup(resourceGroupName)
  params: {
    storageAccountName: take(storageAccountName, 24)
    location: location
    environment: environment
    serviceName: serviceName
    skuName: 'Standard_LRS' // Cheapest option - locally redundant storage
    tags: tags
  }
  dependsOn: [
    serviceResourceGroup
  ]
}

// Create Application Insights
module appInsights 'modules/app-insights.bicep' = {
  name: 'deploy-${serviceName}-appinsights'
  scope: resourceGroup(resourceGroupName)
  params: {
    appInsightsName: appInsightsName
    location: location
    environment: environment
    serviceName: serviceName
    tags: tags
  }
  dependsOn: [
    serviceResourceGroup
  ]
}

// Create Function App
module functionApp 'modules/function-app.bicep' = {
  name: 'deploy-${serviceName}-function'
  scope: resourceGroup(resourceGroupName)
  params: {
    functionAppName: take(functionAppName, 60)
    location: location
    environment: environment
    serviceName: serviceName
    storageAccountConnectionString: storageAccount.outputs.connectionString
    appInsightsConnectionString: appInsights.outputs.connectionString
    keyVaultName: keyVaultName
    jwtSecret: jwtSecret
    skuName: functionAppSku
    skuTier: skuTier
    additionalAppSettings: additionalAppSettings
    tags: tags
  }
  dependsOn: [
    serviceResourceGroup
    storageAccount
    appInsights
  ]
}

// Outputs
output resourceGroupName string = serviceResourceGroup.outputs.resourceGroupName
output functionAppName string = functionApp.outputs.functionAppName
output functionAppUrl string = functionApp.outputs.functionAppUrl
output functionAppPrincipalId string = functionApp.outputs.principalId
output storageAccountName string = storageAccount.outputs.storageAccountName
output storageAccountConnectionString string = storageAccount.outputs.connectionString
output appInsightsName string = appInsights.outputs.appInsightsName
