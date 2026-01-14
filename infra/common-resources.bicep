// Common Resources Template
// Deploys shared resources across all services (Key Vault, shared storage, etc.)

targetScope = 'subscription'

@description('Environment (dev, test, prod)')
param environment string

@description('Primary location (Sweden Central)')
param location string = 'swedencentral'

@description('JWT secret for authentication')
@secure()
param jwtSecret string

@description('Additional tags')
param tags object = {}

// Variables
var resourceGroupName = 'rg-qops-common-${environment}'
var keyVaultName = 'kv-qops-${environment}'

// Create common resource group
module commonResourceGroup 'modules/resource-group.bicep' = {
  name: 'deploy-common-rg'
  params: {
    resourceGroupName: resourceGroupName
    location: location
    environment: environment
    serviceName: 'common'
    additionalTags: tags
  }
}

// Create Key Vault
module keyVault 'modules/key-vault.bicep' = {
  name: 'deploy-key-vault'
  scope: resourceGroup(resourceGroupName)
  params: {
    keyVaultName: keyVaultName
    location: location
    environment: environment
    enableSoftDelete: true
    softDeleteRetentionInDays: environment == 'prod' ? 90 : 7
    tags: tags
  }
  dependsOn: [
    commonResourceGroup
  ]
}

// Store JWT secret in Key Vault
module jwtSecretResource 'modules/key-vault-secret.bicep' = {
  name: 'deploy-jwt-secret'
  scope: resourceGroup(resourceGroupName)
  params: {
    keyVaultName: keyVaultName
    secretName: 'jwt-secret'
    secretValue: jwtSecret
    contentType: 'text/plain'
  }
  dependsOn: [
    keyVault
  ]
}

// Outputs
output resourceGroupName string = commonResourceGroup.outputs.resourceGroupName
output keyVaultName string = keyVault.outputs.keyVaultName
output keyVaultUri string = keyVault.outputs.keyVaultUri
output keyVaultId string = keyVault.outputs.keyVaultId
