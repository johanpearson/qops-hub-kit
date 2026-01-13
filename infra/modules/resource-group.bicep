// Resource Group Module
// Creates an Azure resource group with standard tags

@description('Name of the resource group')
param resourceGroupName string

@description('Location for the resource group')
param location string

@description('Environment (dev, test, prod)')
param environment string

@description('Service name (e.g., profile, document, calendar)')
param serviceName string = 'common'

@description('Additional tags to apply to the resource group')
param additionalTags object = {}

// Target scope for resource group creation
targetScope = 'subscription'

// Create resource group
resource rg 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: resourceGroupName
  location: location
  tags: union(
    {
      Environment: environment
      Service: serviceName
      ManagedBy: 'IaC'
    },
    additionalTags
  )
}

// Outputs
output resourceGroupName string = rg.name
output resourceGroupId string = rg.id
output location string = rg.location
