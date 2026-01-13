// Service Template
// Deploys a single service with Azure Function App and optional databases

targetScope = 'subscription'

@description('Service name (e.g., profile, document, calendar)')
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

@description('Enable Cosmos DB for this service')
param enableCosmosDb bool = false

@description('Cosmos DB database name')
param cosmosDbDatabaseName string = '${serviceName}db'

@description('Cosmos DB container name')
param cosmosDbContainerName string = 'items'

@description('Enable SQL Database for this service')
param enableSqlDatabase bool = false

@description('Database type (sqlserver or postgresql)')
@allowed([
  'sqlserver'
  'postgresql'
])
param databaseType string = 'postgresql'

@description('SQL Database name')
param sqlDatabaseName string = '${serviceName}db'

@description('SQL Administrator username')
param sqlAdminUsername string = 'sqladmin'

@description('SQL Administrator password')
@secure()
param sqlAdminPassword string = ''

@description('App Service Plan SKU (Y1=Consumption, EP1=Premium)')
@allowed([
  'Y1'
  'EP1'
  'EP2'
  'EP3'
])
param functionAppSku string = 'Y1'

@description('Additional app settings for Function App')
param additionalAppSettings array = []

@description('Additional tags')
param tags object = {}

// Variables
var resourceGroupName = 'rg-qops-${serviceName}-${environment}-${location}'
var functionAppName = 'func-qops-${serviceName}-${environment}-${uniqueString(subscription().subscriptionId, serviceName, environment)}'
var storageAccountName = 'stqops${serviceName}${environment}${uniqueString(subscription().subscriptionId, serviceName, environment)}'
var appInsightsName = 'appi-qops-${serviceName}-${environment}'
var cosmosDbAccountName = 'cosmos-qops-${serviceName}-${environment}-${uniqueString(subscription().subscriptionId, serviceName, environment)}'
var sqlServerName = 'sql-qops-${serviceName}-${environment}-${uniqueString(subscription().subscriptionId, serviceName, environment)}'
var skuTier = functionAppSku == 'Y1' ? 'Dynamic' : 'ElasticPremium'

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

// Create storage account for Function App
module storageAccount 'modules/storage-account.bicep' = {
  name: 'deploy-${serviceName}-storage'
  scope: resourceGroup(resourceGroupName)
  params: {
    storageAccountName: take(storageAccountName, 24)
    location: location
    environment: environment
    serviceName: serviceName
    skuName: 'Standard_LRS'
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

// Create Cosmos DB (optional)
module cosmosDb 'modules/cosmos-db.bicep' = if (enableCosmosDb) {
  name: 'deploy-${serviceName}-cosmosdb'
  scope: resourceGroup(resourceGroupName)
  params: {
    cosmosDbAccountName: take(cosmosDbAccountName, 44)
    location: location
    environment: environment
    serviceName: serviceName
    databaseName: cosmosDbDatabaseName
    containerName: cosmosDbContainerName
    enableServerless: environment != 'prod'
    tags: tags
  }
  dependsOn: [
    serviceResourceGroup
  ]
}

// Create SQL Database (optional)
module sqlDatabase 'modules/sql-database.bicep' = if (enableSqlDatabase) {
  name: 'deploy-${serviceName}-sqldb'
  scope: resourceGroup(resourceGroupName)
  params: {
    databaseType: databaseType
    serverName: take(sqlServerName, 63)
    location: location
    environment: environment
    serviceName: serviceName
    administratorLogin: sqlAdminUsername
    administratorLoginPassword: sqlAdminPassword
    databaseName: sqlDatabaseName
    enableServerless: environment != 'prod'
    tags: tags
  }
  dependsOn: [
    serviceResourceGroup
  ]
}

// Outputs
output resourceGroupName string = serviceResourceGroup.outputs.resourceGroupName
output functionAppName string = functionApp.outputs.functionAppName
output functionAppUrl string = functionApp.outputs.functionAppUrl
output functionAppPrincipalId string = functionApp.outputs.principalId
output storageAccountName string = storageAccount.outputs.storageAccountName
output appInsightsName string = appInsights.outputs.appInsightsName
output cosmosDbEndpoint string = enableCosmosDb ? cosmosDb.outputs.cosmosDbEndpoint : ''
output sqlServerFqdn string = enableSqlDatabase ? sqlDatabase.outputs.serverFqdn : ''
