# Infrastructure as Code - Bicep Templates

This folder contains reusable Bicep templates for deploying Azure Functions and related resources for services using the `@qops/hub-kit` library.

## Overview

The infrastructure is organized into modular Bicep templates that can be used by individual service repositories to deploy their Azure resources. Each service repository will reference these templates to deploy its own infrastructure independently.

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

- **`common-resources.bicep`**: Deploys common/shared resources (Key Vault, etc.) - Deploy once per environment
- **`service.bicep`**: Deploys a single service with its Azure Function App - Used by each service repository

## Usage

### Prerequisites

1. Install Azure CLI: `az --version`
2. Install Bicep CLI: `az bicep version`
3. Login to Azure: `az login`

### Step 1: Deploy Common Resources (Once per Environment)

Deploy shared resources like Key Vault that will be used by all services:

```bash
# Deploy common resources for dev environment
az deployment sub create \
  --location swedencentral \
  --template-file infra/common-resources.bicep \
  --parameters environment=dev \
  --parameters jwtSecret="your-secret-here"
```

### Step 2: Deploy Your Service (From Each Service Repository)

Each service repository should reference these templates to deploy its own infrastructure:

```bash
# Deploy profile service to dev
az deployment sub create \
  --location swedencentral \
  --template-file infra/service.bicep \
  --parameters environment=dev \
  --parameters serviceName=profile \
  --parameters jwtSecret="your-secret-here" \
  --parameters enableSqlDatabase=true \
  --parameters sqlAdminPassword="your-password-here"

# Deploy document service to dev
az deployment sub create \
  --location swedencentral \
  --template-file infra/service.bicep \
  --parameters environment=dev \
  --parameters serviceName=document \
  --parameters jwtSecret="your-secret-here" \
  --parameters enableCosmosDb=true
```

### Using from Service Repositories

In your service repository's pipeline, reference these templates:

```yaml
resources:
  repositories:
    - repository: templates
      type: git
      name: qops-hub-kit
      ref: refs/heads/main

steps:
  - checkout: templates
  - task: AzureCLI@2
    inputs:
      scriptType: 'bash'
      inlineScript: |
        az deployment sub create \
          --template-file infra/service.bicep \
          --parameters ...
```

## Parameter Files

Example parameter files are located in `infra/parameters/` to help you get started. Copy and modify these for your service:

- `common-dev.json`: Common resources parameters (deploy once)
- `profile-service-dev.json`: Example for profile service
- `document-service-dev.json`: Example for document service with Cosmos DB

### Customizing for Your Service

1. Copy an example parameter file
2. Update the `serviceName` parameter
3. Configure database options (`enableCosmosDb`, `enableSqlDatabase`)
4. Store secrets in Azure Key Vault and reference them

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

These Bicep templates are designed to be used by individual service repositories with the Azure DevOps pipeline templates in the `/pipelines` folder. 

**Typical workflow:**
1. Each service repository references this repo for templates
2. Service pipelines use pipeline templates from `/pipelines`
3. Service pipelines deploy infrastructure using templates from `/infra`
4. Each service deploys independently to its own Function App

See `/pipelines/README.md` and `/pipelines/examples/` for complete examples.
