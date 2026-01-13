// Application Insights Module
// Creates Application Insights for monitoring Azure Functions

@description('Name of the Application Insights instance')
param appInsightsName string

@description('Location for Application Insights')
param location string

@description('Environment (dev, test, prod)')
param environment string

@description('Service name')
param serviceName string

@description('Additional tags')
param tags object = {}

// Create Log Analytics Workspace
resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: '${appInsightsName}-workspace'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
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

// Create Application Insights
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalyticsWorkspace.id
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
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

// Outputs
output appInsightsId string = appInsights.id
output appInsightsName string = appInsights.name
output instrumentationKey string = appInsights.properties.InstrumentationKey
output connectionString string = appInsights.properties.ConnectionString
output workspaceId string = logAnalyticsWorkspace.id
