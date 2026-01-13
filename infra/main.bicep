// Main Infrastructure Template
// Deploys all resources for a complete environment (common + all services)

targetScope = 'subscription'

@description('Environment (dev, test, prod)')
param environment string

@description('Primary location')
param location string = 'swedencentral'

@description('JWT secret for authentication')
@secure()
param jwtSecret string

@description('SQL Administrator password for databases')
@secure()
param sqlAdminPassword string

@description('Services to deploy')
param services array = [
  {
    name: 'profile'
    enableCosmosDb: false
    enableSqlDatabase: true
    databaseType: 'postgresql'
  }
  {
    name: 'document'
    enableCosmosDb: true
    enableSqlDatabase: false
    databaseType: 'postgresql'
  }
  {
    name: 'calendar'
    enableCosmosDb: false
    enableSqlDatabase: true
    databaseType: 'postgresql'
  }
]

@description('Additional tags')
param tags object = {}

// Deploy common resources
module commonResources 'common-resources.bicep' = {
  name: 'deploy-common-resources'
  params: {
    environment: environment
    location: location
    jwtSecret: jwtSecret
    tags: tags
  }
}

// Deploy each service
module serviceDeployments 'service.bicep' = [
  for service in services: {
    name: 'deploy-${service.name}-service'
    params: {
      serviceName: service.name
      environment: environment
      location: location
      jwtSecret: jwtSecret
      keyVaultName: commonResources.outputs.keyVaultName
      enableCosmosDb: service.enableCosmosDb
      enableSqlDatabase: service.enableSqlDatabase
      databaseType: service.databaseType
      sqlAdminPassword: sqlAdminPassword
      functionAppSku: environment == 'prod' ? 'EP1' : 'Y1'
      tags: tags
    }
    dependsOn: [
      commonResources
    ]
  }
]

// Outputs
output commonResourceGroup string = commonResources.outputs.resourceGroupName
output keyVaultName string = commonResources.outputs.keyVaultName
output serviceDeployments array = [
  for (service, i) in services: {
    serviceName: service.name
    resourceGroupName: serviceDeployments[i].outputs.resourceGroupName
    functionAppName: serviceDeployments[i].outputs.functionAppName
    functionAppUrl: serviceDeployments[i].outputs.functionAppUrl
  }
]
