# Complete Usage Guide

This guide shows you how to use `@qops/hub-kit` library along with the infrastructure and pipeline templates to create and deploy a complete Azure Functions service.

## Overview

The `qops-hub-kit` repository provides three main components:

1. **npm Library** - TypeScript utilities for building Azure Functions APIs
2. **Infrastructure Templates** - Bicep templates for deploying Azure resources
3. **Pipeline Templates** - Azure DevOps CI/CD templates

## Getting Started: Create a New Service

### Step 1: Create Your Service Repository

```bash
mkdir my-service
cd my-service
git init
```

### Step 2: Initialize Node.js Project

```bash
npm init -y
npm install @qops/hub-kit zod jsonwebtoken @azure/functions
npm install -D @types/jsonwebtoken @types/node typescript @azure/functions-core-tools
```

### Step 3: Create Project Structure

```
my-service/
├── src/
│   ├── functions/
│   │   ├── create-item.ts
│   │   ├── get-item.ts
│   │   └── openapi.ts
│   ├── schemas/
│   │   └── item.schemas.ts
│   └── services/
│       └── item.service.ts
├── package.json
├── tsconfig.json
├── host.json
└── azure-pipelines.yml
```

### Step 4: Implement Your Functions

**schemas/item.schemas.ts:**
```typescript
import { z } from '@qops/hub-kit';

export const createItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export const itemResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  createdAt: z.string(),
});
```

**functions/create-item.ts:**
```typescript
import { app } from '@azure/functions';
import { createHandler, UserRole } from '@qops/hub-kit';
import { createItemSchema } from '../schemas/item.schemas.js';
import { createItem } from '../services/item.service.js';

const handler = createHandler(
  async (request, context, { body }) => {
    const item = await createItem(body);
    return { status: 201, jsonBody: item };
  },
  {
    bodySchema: createItemSchema,
    jwtConfig: { secret: process.env.JWT_SECRET! },
    requiredRoles: [UserRole.MEMBER],
    enableLogging: true,
  }
);

app.http('createItem', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'items',
  handler,
});
```

## Step 5: Deploy Infrastructure

### Option A: Use Azure CLI Directly

```bash
# Reference the hub-kit repo templates
git clone https://github.com/yourorg/qops-hub-kit.git ../qops-hub-kit

# Deploy your service infrastructure
az deployment sub create \
  --location swedencentral \
  --template-file ../qops-hub-kit/infra/service.bicep \
  --parameters environment=dev \
  --parameters serviceName=myservice \
  --parameters jwtSecret="your-secret"
```

### Option B: Use Pipeline

Create `azure-pipelines.yml` in your service repository:

```yaml
name: CI/CD

trigger:
  - main

resources:
  repositories:
    - repository: hubkit
      type: git
      name: qops-hub-kit
      ref: refs/heads/main

variables:
  serviceName: 'myservice'
  nodeVersion: '22.x'

stages:
  # Build and test
  - stage: Build
    jobs:
      - job: BuildAndTest
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          - template: pipelines/steps/prepare-node.yml@hubkit
            parameters:
              nodeVersion: $(nodeVersion)

          - template: pipelines/steps/build.yml@hubkit

          - template: pipelines/steps/unit-test.yml@hubkit

          - task: ArchiveFiles@2
            inputs:
              rootFolderOrFile: '$(Build.SourcesDirectory)'
              archiveType: 'zip'
              archiveFile: '$(Build.ArtifactStagingDirectory)/app.zip'

          - publish: '$(Build.ArtifactStagingDirectory)/app.zip'
            artifact: package

  # Deploy to Dev
  - stage: DeployDev
    dependsOn: Build
    jobs:
      # Deploy infrastructure
      - job: DeployInfra
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          - checkout: hubkit
          
          - task: AzureCLI@2
            inputs:
              azureSubscription: 'Azure-Connection'
              scriptType: 'bash'
              inlineScript: |
                az deployment sub create \
                  --location swedencentral \
                  --template-file infra/service.bicep \
                  --parameters environment=dev \
                  --parameters serviceName=$(serviceName) \
                  --parameters jwtSecret="$(JWT_SECRET)"

      # Deploy application
      - deployment: DeployApp
        dependsOn: DeployInfra
        environment: dev
        pool:
          vmImage: 'ubuntu-latest'
        strategy:
          runOnce:
            deploy:
              steps:
                - template: pipelines/steps/deploy-function-app.yml@hubkit
                  parameters:
                    azureSubscription: 'Azure-Connection'
                    functionAppName: 'func-qops-myservice-dev-xyz'
                    package: '$(Pipeline.Workspace)/package/app.zip'
```

## Step 6: Configure Secrets

### In Azure DevOps

1. Create a Variable Group named `qops-secrets-dev`
2. Add variables:
   - `JWT_SECRET`: Your JWT secret
3. Link the variable group to your pipeline

### In Azure Key Vault (Recommended)

1. Deploy common resources first:
```bash
az deployment sub create \
  --template-file infra/common-resources.bicep \
  --parameters environment=dev \
  --parameters jwtSecret="your-secret"
```

2. Reference Key Vault in your pipeline variables

## Step 7: Run Your Pipeline

1. Push code to your repository
2. Pipeline automatically triggers
3. Infrastructure is deployed
4. Application is deployed
5. Function App is ready!

## Testing Your Service

```bash
# Get the Function App URL from Azure Portal or pipeline output
FUNCTION_URL="https://func-qops-myservice-dev-xyz.azurewebsites.net"

# Test health endpoint
curl $FUNCTION_URL/api/health

# Test OpenAPI docs
curl $FUNCTION_URL/api/openapi.json

# Test your endpoint (with JWT token)
curl -X POST $FUNCTION_URL/api/items \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Item","description":"Testing"}'
```

## Storage Access

Your Function App includes storage with:
- **Blob Storage**: For file uploads and storage
- **Table Storage**: For structured NoSQL data

Access via the connection string from your Function App settings.

## Monitoring

Your Function App includes Application Insights:

1. Go to Azure Portal
2. Navigate to your Function App
3. Click "Application Insights"
4. View logs, metrics, and traces

## Cost Optimization

All templates use the cheapest SKUs:

- **Azure Functions**: Consumption plan (pay per execution)
- **Storage**: Standard_LRS (locally redundant, cheapest)
- **Application Insights**: Pay-as-you-go

Typical costs for dev environment:
- Azure Functions: $0-10/month
- Storage: $0-5/month
- Application Insights: $0-5/month

**Total: ~$5-20/month for a dev environment**

## Multiple Environments

Deploy to test and prod:

```yaml
# In your pipeline, add stages for test and prod
- stage: DeployTest
  dependsOn: DeployDev
  # ... similar to DeployDev but with environment=test

- stage: DeployProd
  dependsOn: DeployTest
  # ... similar to DeployDev but with environment=prod
```

Configure environment approvals in Azure DevOps for test and prod.

## Next Steps

- Add more endpoints to your service
- Configure custom domains
- Set up monitoring alerts
- Implement API versioning
- Add automated E2E tests

## Troubleshooting

### Pipeline fails during infrastructure deployment
- Check Azure subscription permissions
- Verify service connection in Azure DevOps
- Check parameter values in pipeline

### Function App deployment succeeds but functions don't work
- Check Application Insights logs
- Verify JWT_SECRET is configured
- Check Node.js version matches (should be 22.x)
- Verify npm dependencies are installed

### Storage connection issues
- Check connection string in app settings
- Verify storage account is created
- Check managed identity permissions if using

## Support

- Infrastructure issues: See `/infra/README.md`
- Pipeline issues: See `/pipelines/README.md`
- Library issues: See main README.md
