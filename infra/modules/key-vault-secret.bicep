// Key Vault Secret Module
// Creates a secret in an existing Key Vault

@description('Name of the Key Vault')
param keyVaultName string

@description('Name of the secret')
param secretName string

@description('Value of the secret')
@secure()
param secretValue string

@description('Content type of the secret')
param contentType string = 'text/plain'

// Reference to existing Key Vault
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

// Create secret in Key Vault
resource secret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: secretName
  properties: {
    value: secretValue
    contentType: contentType
    attributes: {
      enabled: true
    }
  }
}

// Outputs
output secretName string = secret.name
output secretUri string = secret.properties.secretUri
