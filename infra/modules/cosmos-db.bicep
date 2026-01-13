// Cosmos DB Module
// Creates Azure Cosmos DB for document storage (e.g., document service)

@description('Name of the Cosmos DB account (must be globally unique)')
param cosmosDbAccountName string

@description('Location for Cosmos DB')
param location string

@description('Environment (dev, test, prod)')
param environment string

@description('Service name')
param serviceName string

@description('Database name')
param databaseName string

@description('Container name')
param containerName string

@description('Partition key path')
param partitionKeyPath string = '/id'

@description('Enable serverless mode (recommended for dev/test)')
param enableServerless bool = true

@description('Throughput for provisioned mode (if not serverless)')
param throughput int = 400

@description('Additional tags')
param tags object = {}

// Create Cosmos DB Account
resource cosmosDbAccount 'Microsoft.DocumentDB/databaseAccounts@2023-11-15' = {
  name: cosmosDbAccountName
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    capabilities: enableServerless
      ? [
          {
            name: 'EnableServerless'
          }
        ]
      : []
    enableAutomaticFailover: false
    enableMultipleWriteLocations: false
    publicNetworkAccess: 'Enabled'
  }
  tags: union(
    {
      Environment: environment
      Service: serviceName
      ManagedBy: 'IaC'
    },
    tags
  )
}

// Create Database
resource cosmosDbDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-11-15' = {
  parent: cosmosDbAccount
  name: databaseName
  properties: {
    resource: {
      id: databaseName
    }
    options: enableServerless ? {} : {
      throughput: throughput
    }
  }
}

// Create Container
resource cosmosDbContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-11-15' = {
  parent: cosmosDbDatabase
  name: containerName
  properties: {
    resource: {
      id: containerName
      partitionKey: {
        paths: [
          partitionKeyPath
        ]
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [
          {
            path: '/*'
          }
        ]
        excludedPaths: [
          {
            path: '/"_etag"/?'
          }
        ]
      }
    }
  }
}

// Outputs
output cosmosDbAccountId string = cosmosDbAccount.id
output cosmosDbAccountName string = cosmosDbAccount.name
output cosmosDbEndpoint string = cosmosDbAccount.properties.documentEndpoint
output cosmosDbPrimaryKey string = cosmosDbAccount.listKeys().primaryMasterKey
output cosmosDbConnectionString string = 'AccountEndpoint=${cosmosDbAccount.properties.documentEndpoint};AccountKey=${cosmosDbAccount.listKeys().primaryMasterKey};'
output databaseName string = cosmosDbDatabase.name
output containerName string = cosmosDbContainer.name
