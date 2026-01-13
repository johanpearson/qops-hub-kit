// Azure SQL Database Module
// Creates Azure SQL Database or PostgreSQL for lightweight data storage

@description('Type of database')
@allowed([
  'sqlserver'
  'postgresql'
])
param databaseType string = 'postgresql'

@description('Name of the database server (must be globally unique)')
param serverName string

@description('Location for the database')
param location string

@description('Environment (dev, test, prod)')
param environment string

@description('Service name')
param serviceName string

@description('Administrator login username')
param administratorLogin string

@description('Administrator login password')
@secure()
param administratorLoginPassword string

@description('Database name')
param databaseName string

@description('Database SKU name')
param skuName string = 'Basic'

@description('Database tier')
param skuTier string = 'Basic'

@description('Enable serverless (SQL Server only)')
param enableServerless bool = true

@description('Additional tags')
param tags object = {}

// Create SQL Server (if selected)
resource sqlServer 'Microsoft.Sql/servers@2023-05-01-preview' = if (databaseType == 'sqlserver') {
  name: serverName
  location: location
  properties: {
    administratorLogin: administratorLogin
    administratorLoginPassword: administratorLoginPassword
    version: '12.0'
    minimalTlsVersion: '1.2'
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

// Create SQL Database
resource sqlDatabase 'Microsoft.Sql/servers/databases@2023-05-01-preview' = if (databaseType == 'sqlserver') {
  parent: sqlServer
  name: databaseName
  location: location
  sku: enableServerless
    ? {
        name: 'GP_S_Gen5'
        tier: 'GeneralPurpose'
        family: 'Gen5'
        capacity: 1
      }
    : {
        name: skuName
        tier: skuTier
      }
  properties: {
    collation: 'SQL_Latin1_General_CP1_CI_AS'
    maxSizeBytes: 2147483648 // 2GB
    autoPauseDelay: enableServerless ? 60 : -1
    minCapacity: enableServerless ? json('0.5') : json('null')
  }
}

// Firewall rule to allow Azure services
resource sqlFirewallRule 'Microsoft.Sql/servers/firewallRules@2023-05-01-preview' = if (databaseType == 'sqlserver') {
  parent: sqlServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// Create PostgreSQL Server (if selected)
resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-03-01-preview' = if (databaseType == 'postgresql') {
  name: serverName
  location: location
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    administratorLogin: administratorLogin
    administratorLoginPassword: administratorLoginPassword
    version: '15'
    storage: {
      storageSizeGB: 32
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
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

// Create PostgreSQL Database
resource postgresDatabase 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-03-01-preview' = if (databaseType == 'postgresql') {
  parent: postgresServer
  name: databaseName
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

// PostgreSQL Firewall rule to allow Azure services
resource postgresFirewallRule 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-03-01-preview' = if (databaseType == 'postgresql') {
  parent: postgresServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// Outputs
output serverId string = databaseType == 'sqlserver' ? sqlServer.id : postgresServer.id
output serverName string = databaseType == 'sqlserver' ? sqlServer.name : postgresServer.name
output serverFqdn string = databaseType == 'sqlserver' ? sqlServer.properties.fullyQualifiedDomainName : postgresServer.properties.fullyQualifiedDomainName
output databaseName string = databaseName
output connectionString string = databaseType == 'sqlserver'
  ? 'Server=tcp:${sqlServer.properties.fullyQualifiedDomainName},1433;Database=${databaseName};User ID=${administratorLogin};Password=${administratorLoginPassword};Encrypt=true;TrustServerCertificate=false;Connection Timeout=30;'
  : 'Host=${postgresServer.properties.fullyQualifiedDomainName};Database=${databaseName};Username=${administratorLogin};Password=${administratorLoginPassword};SSL Mode=Require;'
