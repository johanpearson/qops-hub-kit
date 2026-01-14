# Variable Groups Setup Guide

This guide explains how to create and configure Azure DevOps Variable Groups for the common resources pipeline.

## Overview

The common resources pipeline (`azure-pipelines-common-resources.yml`) requires three variable groups to store JWT secrets for different environments. These secrets are used to create and populate the Key Vault.

## Why Variable Groups?

Variable groups in Azure DevOps allow you to:

- Store sensitive values securely
- Share variables across multiple pipelines
- Manage secrets separately from code
- Control access with permissions

**Regarding secrets in pipelines:** It's recommended to use variable groups rather than storing secrets directly in the pipeline or parameter files. This keeps secrets out of source control and allows for easier rotation and management.

## Required Variable Groups

You need to create **three variable groups**, one for each environment:

### 1. qops-common-secrets-dev

**Purpose:** Stores secrets for the DEV environment

**Variables:**

- `JWT_SECRET_DEV` (secret) - JWT secret for dev environment
  - Example value: A randomly generated string (min 32 characters)
  - Generate with: `openssl rand -base64 32`

### 2. qops-common-secrets-test

**Purpose:** Stores secrets for the TEST environment

**Variables:**

- `JWT_SECRET_TEST` (secret) - JWT secret for test environment
  - Use a different secret than dev
  - Generate with: `openssl rand -base64 32`

### 3. qops-common-secrets-prod

**Purpose:** Stores secrets for the PROD environment

**Variables:**

- `JWT_SECRET_PROD` (secret) - JWT secret for prod environment
  - Use a different secret than dev and test
  - Generate with: `openssl rand -base64 32`

## How to Create Variable Groups

### Step 1: Navigate to Library

1. Go to your Azure DevOps project
2. Click **Pipelines** → **Library**
3. Click **+ Variable group**

### Step 2: Create DEV Variable Group

1. **Variable group name:** `qops-common-secrets-dev`
2. **Description:** "JWT secrets for DEV environment"
3. Click **+ Add** to add a variable:
   - **Name:** `JWT_SECRET_DEV`
   - **Value:** Generate a secure random string (e.g., `openssl rand -base64 32`)
   - Click the **lock icon** to mark it as secret
4. Click **Save**

### Step 3: Create TEST Variable Group

Repeat step 2 with:

- **Variable group name:** `qops-common-secrets-test`
- **Variable name:** `JWT_SECRET_TEST`
- **Value:** Different secret than dev

### Step 4: Create PROD Variable Group

Repeat step 2 with:

- **Variable group name:** `qops-common-secrets-prod`
- **Variable name:** `JWT_SECRET_PROD`
- **Value:** Different secret than dev and test

### Step 5: Set Permissions (Optional)

For each variable group:

1. Click the variable group name
2. Click **Security**
3. Add appropriate users/groups with permissions
4. For PROD, consider restricting to administrators only

## Link Variable Groups to Pipeline

The variable groups are already linked in `azure-pipelines-common-resources.yml`:

```yaml
variables:
  - group: qops-common-secrets-dev
  - group: qops-common-secrets-test
  - group: qops-common-secrets-prod
```

## Generate Secure Secrets

To generate secure random secrets, use one of these methods:

### Using OpenSSL (Linux/Mac/WSL)

```bash
openssl rand -base64 32
```

### Using PowerShell (Windows)

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### Using Node.js

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Security Best Practices

1. **Never commit secrets to source control**
2. **Use different secrets for each environment**
3. **Rotate secrets periodically** (every 90 days recommended)
4. **Limit access** to variable groups (especially PROD)
5. **Use Azure Key Vault** for additional security (secrets are stored in KV after deployment)
6. **Enable audit logging** in Azure DevOps

## After Creating Variable Groups

Once variable groups are created:

1. Run the `azure-pipelines-common-resources.yml` pipeline
2. Select which environments to deploy to (dev, test, prod)
3. The pipeline will:
   - Create resource groups
   - Deploy Key Vault
   - Store the JWT secret from the variable group into Key Vault
4. Services can then reference the Key Vault for the JWT secret

## Troubleshooting

### "Variable group not found"

- Ensure variable group names match exactly (case-sensitive)
- Check that variable groups are created in the same Azure DevOps project

### "Variable not found in group"

- Ensure variable names match exactly: `JWT_SECRET_DEV`, `JWT_SECRET_TEST`, `JWT_SECRET_PROD`
- Check that variables are added to the correct groups

### "Permission denied"

- Ensure the pipeline has permission to access the variable groups
- Go to Variable Group → Security → Add pipeline access

## Reference

- [Azure DevOps Variable Groups Documentation](https://docs.microsoft.com/en-us/azure/devops/pipelines/library/variable-groups)
- [Securing Azure Pipelines](https://docs.microsoft.com/en-us/azure/devops/pipelines/security/overview)
