# Infrastructure as Code - Bicep Templates

This folder contains reusable Bicep templates for deploying Azure Functions and related resources for services using the `@qops/hub-kit` library.

## Overview

The infrastructure is organized into modular Bicep templates that can be composed together to deploy complete environments.

## Architecture

### Resource Group Structure

For each environment (dev, test, prod), the following resource groups are created:

- **Common Resource Group** (`rg-qops-common-{env}-{region}`):
  - Shared Key Vault for JWT secrets
  - Shared Application Insights (optional)
  - Shared Storage Account (optional)

- **Service Resource Groups** (`rg-qops-{service}-{env}-{region}`):
  - Azure Function App
  - App Service Plan
  - Application Insights (service-specific)
  - Storage Account (for function storage)
  - Optional: Cosmos DB (for document service)
  - Optional: Azure SQL/PostgreSQL (for other services)

### Regions

Default regions:
- Primary: Sweden Central (`swedencentral`)
- Secondary: West Europe (`westeurope`)

## Modules

### Core Modules

- **`modules/resource-group.bicep`**: Creates a resource group with tags
- **`modules/key-vault.bicep`**: Deploys Azure Key Vault for secrets
- **`modules/function-app.bicep`**: Deploys Azure Function App with App Service Plan and monitoring
- **`modules/cosmos-db.bicep`**: Deploys Cosmos DB for document storage
- **`modules/sql-database.bicep`**: Deploys Azure SQL Database or PostgreSQL
- **`modules/storage-account.bicep`**: Deploys Storage Account for function storage

### Main Templates

- **`main.bicep`**: Main deployment template that orchestrates all resources
- **`common-resources.bicep`**: Deploys common/shared resources (Key Vault, etc.)
- **`service.bicep`**: Deploys a single service with its Azure Function App

## Usage

### Prerequisites

1. Install Azure CLI: `az --version`
2. Install Bicep CLI: `az bicep version`
3. Login to Azure: `az login`

### Deploying Common Resources

```bash
# Deploy common resources (Key Vault, shared resources)
az deployment sub create \
  --location swedencentral \
  --template-file infra/common-resources.bicep \
  --parameters infra/parameters/common-dev.json
```

### Deploying a Service

```bash
# Deploy a specific service (e.g., profile service)
az deployment sub create \
  --location swedencentral \
  --template-file infra/service.bicep \
  --parameters infra/parameters/profile-service-dev.json
```

### Deploying Everything

```bash
# Deploy all resources for an environment
az deployment sub create \
  --location swedencentral \
  --template-file infra/main.bicep \
  --parameters infra/parameters/main-dev.json
```

## Parameter Files

Parameter files are located in `infra/parameters/` and define environment-specific configurations:

- `common-{env}.json`: Common resources parameters
- `{service}-{env}.json`: Service-specific parameters
- `main-{env}.json`: Full environment deployment parameters

### Example Parameter Structure

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "environment": {
      "value": "dev"
    },
    "location": {
      "value": "swedencentral"
    },
    "serviceName": {
      "value": "profile"
    }
  }
}
```

## Environment Variables

After deployment, configure these environment variables in your Function App:

- `JWT_SECRET`: Retrieved from Key Vault
- `FUNCTIONS_WORKER_RUNTIME`: `node`
- `WEBSITE_NODE_DEFAULT_VERSION`: `~22`
- `APPINSIGHTS_INSTRUMENTATIONKEY`: Auto-configured by Bicep

For Azure service integrations (Cosmos DB, SQL, etc.), see the [Azure Integrations Guide](../docs/INTEGRATIONS.md) in the hub-kit library.

## Tags

All resources are tagged with:
- `Environment`: dev/test/prod
- `Service`: service name
- `ManagedBy`: IaC (Infrastructure as Code)

## Best Practices

1. **Never commit secrets**: Use Key Vault references in app settings
2. **Use managed identities**: Enable system-assigned identity for Function Apps
3. **Separate environments**: Use different resource groups per environment
4. **Cost optimization**: Use consumption plan for dev/test, premium for prod
5. **Monitoring**: Always enable Application Insights

## Cost Considerations

- **Consumption Plan**: Pay per execution (best for dev/test)
- **Premium Plan**: Always-on, better performance (recommended for production)
- **Cosmos DB**: Can be expensive, use serverless for small workloads
- **Azure SQL**: Use serverless tier for dev/test environments

## CI/CD Integration

These Bicep templates are designed to work with the Azure DevOps pipeline templates in the `/pipelines` folder. See `/pipelines/README.md` for integration details.
