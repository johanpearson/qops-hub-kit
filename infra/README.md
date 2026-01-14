# Infrastructure Templates

Reusable Bicep templates for deploying Azure Functions with cost-optimized resources.

## Quick Start

### 1. Deploy Common Resources (Once)

Run the pipeline `azure-pipelines-common-resources.yml` to deploy shared Key Vault.

**Variable Groups Required:**
- `qops-common-secrets-dev` with variable: `JWT_SECRET_DEV`
- `qops-common-secrets-test` with variable: `JWT_SECRET_TEST`
- `qops-common-secrets-prod` with variable: `JWT_SECRET_PROD`

### 2. Deploy Your Service

Use `service.bicep` to deploy your Function App:

```bash
az deployment sub create \
  --location swedencentral \
  --template-file infra/service.bicep \
  --parameters environment=dev \
  --parameters serviceName=myservice \
  --parameters jwtSecret="your-secret"
```

## What Gets Deployed

### Common Resources
- Resource Group: `rg-qops-common-{env}`
- Key Vault: `kv-qops-{env}`
- **Tags**: Environment, Project: QOPS, Owner: Johan Pearson, ManagedBy: IaC

### Service Resources
- Resource Group: `rg-qops-{service}-{env}`
- Function App: `func-qops-{service}-{env}`
- Storage Account: `stqops{service}{env}`
- Application Insights: `appi-qops-{service}-{env}`
- **Tags**: Environment, Service, Project: QOPS, Owner: Johan Pearson, ManagedBy: IaC

## Cost

All resources use cheapest SKUs:
- Function App: Y1 Consumption (~$0-10/month)
- Storage: Standard_LRS (~$0-5/month)
- App Insights: Pay-as-you-go (~$0-5/month)

**Total: ~$5-20/month per service**
