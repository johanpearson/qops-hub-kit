// Key Vault Module
// Creates Azure Key Vault for storing secrets (JWT secret, connection strings)

@description('Name of the Key Vault (must be globally unique)')
param keyVaultName string

@description('Location for the Key Vault')
param location string

@description('Environment (dev, test, prod)')
param environment string

@description('Azure AD Tenant ID')
param tenantId string = subscription().tenantId

@description('Object IDs that should have access to the Key Vault')
param accessPolicies array = []

@description('Enable soft delete')
param enableSoftDelete bool = true

@description('Soft delete retention in days')
param softDeleteRetentionInDays int = 7

@description('Additional tags')
param tags object = {}

// Create Key Vault
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  properties: {
    tenantId: tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enableSoftDelete: enableSoftDelete
    softDeleteRetentionInDays: softDeleteRetentionInDays
    enableRbacAuthorization: false
    accessPolicies: [
      for policy in accessPolicies: {
        tenantId: tenantId
        objectId: policy.objectId
        permissions: {
          secrets: policy.secretPermissions
          keys: contains(policy, 'keyPermissions') ? policy.keyPermissions : []
          certificates: contains(policy, 'certificatePermissions') ? policy.certificatePermissions : []
        }
      }
    ]
    publicNetworkAccess: 'Enabled'
    enabledForDeployment: false
    enabledForTemplateDeployment: true
    enabledForDiskEncryption: false
  }
  tags: union(
    {
      Environment: environment
      Service: 'common'
      ManagedBy: 'IaC'
      Project: 'QOPS'
      Owner: 'Johan Pearson'
    },
    tags
  )
}

// Outputs
output keyVaultId string = keyVault.id
output keyVaultName string = keyVault.name
output keyVaultUri string = keyVault.properties.vaultUri
