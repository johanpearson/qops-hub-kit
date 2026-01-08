# Azure Integrations

This guide covers integration patterns for using @qops/hub-kit with various Azure services.

## Azure Cosmos DB

### Setup

```bash
npm install @azure/cosmos
```

### Configuration

```typescript
// services/database.service.ts
import { CosmosClient } from '@azure/cosmos';
import { AppError, ErrorCode } from '@qops/hub-kit';

const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  key: process.env.COSMOS_KEY!,
});

const database = client.database(process.env.COSMOS_DATABASE || 'mydb');
const usersContainer = database.container('users');

export { usersContainer };
```

### CRUD Operations

```typescript
// services/user.service.ts
import { AppError, ErrorCode } from '@qops/hub-kit';
import { usersContainer } from './database.service.js';

export async function createUser(userData: CreateUserInput) {
  try {
    const { resource } = await usersContainer.items.create({
      id: randomUUID(),
      ...userData,
      createdAt: new Date().toISOString(),
    });
    return resource;
  } catch (error: any) {
    if (error.code === 409) {
      throw new AppError(ErrorCode.CONFLICT, 'User already exists');
    }
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to create user');
  }
}

export async function getUserById(id: string) {
  try {
    const { resource } = await usersContainer.item(id, id).read();
    if (!resource) {
      throw new AppError(ErrorCode.NOT_FOUND, 'User not found');
    }
    return resource;
  } catch (error: any) {
    if (error.code === 404) {
      throw new AppError(ErrorCode.NOT_FOUND, 'User not found');
    }
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch user');
  }
}

export async function updateUser(id: string, updates: Partial<User>) {
  try {
    const { resource: existing } = await usersContainer.item(id, id).read();
    if (!existing) {
      throw new AppError(ErrorCode.NOT_FOUND, 'User not found');
    }

    const { resource } = await usersContainer.item(id, id).replace({
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    return resource;
  } catch (error: any) {
    if (error.code === 404) {
      throw new AppError(ErrorCode.NOT_FOUND, 'User not found');
    }
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to update user');
  }
}

export async function deleteUser(id: string) {
  try {
    await usersContainer.item(id, id).delete();
  } catch (error: any) {
    if (error.code === 404) {
      throw new AppError(ErrorCode.NOT_FOUND, 'User not found');
    }
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to delete user');
  }
}

export async function queryUsers(filters: { status?: string; role?: string }) {
  const querySpec = {
    query: 'SELECT * FROM c WHERE 1=1',
    parameters: [],
  };

  if (filters.status) {
    querySpec.query += ' AND c.status = @status';
    querySpec.parameters.push({ name: '@status', value: filters.status });
  }

  if (filters.role) {
    querySpec.query += ' AND c.role = @role';
    querySpec.parameters.push({ name: '@role', value: filters.role });
  }

  const { resources } = await usersContainer.items.query(querySpec).fetchAll();
  return resources;
}
```

## Azure Blob Storage

### Setup

```bash
npm install @azure/storage-blob
```

### Configuration

```typescript
// services/storage.service.ts
import { BlobServiceClient } from '@azure/storage-blob';
import { AppError, ErrorCode } from '@qops/hub-kit';

const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING!);

const containerClient = blobServiceClient.getContainerClient('uploads');

// Ensure container exists
await containerClient.createIfNotExists({
  access: 'private',
});

export { containerClient };
```

### File Upload

```typescript
// services/file.service.ts
import { containerClient } from './storage.service.js';
import { AppError, ErrorCode } from '@qops/hub-kit';

export async function uploadFile(buffer: Buffer, fileName: string, contentType: string = 'application/octet-stream') {
  try {
    const blobClient = containerClient.getBlockBlobClient(fileName);

    await blobClient.upload(buffer, buffer.length, {
      blobHTTPHeaders: {
        blobContentType: contentType,
      },
    });

    return {
      url: blobClient.url,
      name: fileName,
      size: buffer.length,
    };
  } catch (error: any) {
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to upload file', {
      error: error.message,
    });
  }
}

export async function downloadFile(fileName: string): Promise<Buffer> {
  try {
    const blobClient = containerClient.getBlockBlobClient(fileName);
    const downloadResponse = await blobClient.download();

    if (!downloadResponse.readableStreamBody) {
      throw new AppError(ErrorCode.NOT_FOUND, 'File not found');
    }

    const chunks: Buffer[] = [];
    for await (const chunk of downloadResponse.readableStreamBody) {
      chunks.push(Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  } catch (error: any) {
    if (error.statusCode === 404) {
      throw new AppError(ErrorCode.NOT_FOUND, 'File not found');
    }
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to download file');
  }
}

export async function deleteFile(fileName: string) {
  try {
    const blobClient = containerClient.getBlockBlobClient(fileName);
    await blobClient.delete();
  } catch (error: any) {
    if (error.statusCode === 404) {
      throw new AppError(ErrorCode.NOT_FOUND, 'File not found');
    }
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to delete file');
  }
}

export async function listFiles(prefix?: string) {
  try {
    const blobs = [];
    for await (const blob of containerClient.listBlobsFlat({ prefix })) {
      blobs.push({
        name: blob.name,
        size: blob.properties.contentLength,
        contentType: blob.properties.contentType,
        lastModified: blob.properties.lastModified,
      });
    }
    return blobs;
  } catch (error: any) {
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to list files');
  }
}
```

### File Upload Handler

```typescript
// functions/upload-file.ts
import { app } from '@azure/functions';
import { createHandler, UserRole, z } from '@qops/hub-kit';
import { uploadFile } from '../services/file.service.js';

const uploadSchema = z.object({
  filename: z.string().min(1),
  data: z.string(), // Base64 encoded file data
  contentType: z.string().optional(),
});

const uploadHandler = createHandler(
  async (request, context, { body, user }) => {
    const fileBuffer = Buffer.from(body.data, 'base64');

    // Add user ID to filename for organization
    const fileName = `${user.sub}/${Date.now()}-${body.filename}`;

    const result = await uploadFile(fileBuffer, fileName, body.contentType || 'application/octet-stream');

    return {
      status: 201,
      jsonBody: result,
    };
  },
  {
    bodySchema: uploadSchema,
    jwtConfig: { secret: process.env.JWT_SECRET! },
    requiredRoles: [UserRole.MEMBER],
    enableLogging: true,
  },
);

app.http('uploadFile', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'files',
  handler: uploadHandler,
});
```

## Azure Service Bus

### Setup

```bash
npm install @azure/service-bus
```

### Configuration

```typescript
// services/messaging.service.ts
import { ServiceBusClient } from '@azure/service-bus';
import { AppError, ErrorCode } from '@qops/hub-kit';

const serviceBusClient = new ServiceBusClient(process.env.SERVICE_BUS_CONNECTION_STRING!);

export async function sendMessage(queueName: string, message: any) {
  try {
    const sender = serviceBusClient.createSender(queueName);

    await sender.sendMessages({
      body: message,
      contentType: 'application/json',
    });

    await sender.close();
  } catch (error: any) {
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to send message', {
      error: error.message,
    });
  }
}

export async function sendBatchMessages(queueName: string, messages: any[]) {
  try {
    const sender = serviceBusClient.createSender(queueName);
    const batch = await sender.createMessageBatch();

    for (const message of messages) {
      const added = batch.tryAddMessage({
        body: message,
        contentType: 'application/json',
      });

      if (!added) {
        // Send current batch and create new one
        await sender.sendMessages(batch);
        batch.clear();
        batch.tryAddMessage({
          body: message,
          contentType: 'application/json',
        });
      }
    }

    // Send remaining messages
    if (batch.count > 0) {
      await sender.sendMessages(batch);
    }

    await sender.close();
  } catch (error: any) {
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to send batch messages');
  }
}
```

## Azure Key Vault

### Setup

```bash
npm install @azure/keyvault-secrets @azure/identity
```

### Configuration

```typescript
// services/secrets.service.ts
import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';
import { AppError, ErrorCode } from '@qops/hub-kit';

const vaultUrl = process.env.KEY_VAULT_URL!;
const credential = new DefaultAzureCredential();
const secretClient = new SecretClient(vaultUrl, credential);

export async function getSecret(secretName: string): Promise<string> {
  try {
    const secret = await secretClient.getSecret(secretName);
    if (!secret.value) {
      throw new AppError(ErrorCode.NOT_FOUND, `Secret '${secretName}' not found`);
    }
    return secret.value;
  } catch (error: any) {
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to retrieve secret', {
      secretName,
      error: error.message,
    });
  }
}

export async function setSecret(secretName: string, value: string) {
  try {
    await secretClient.setSecret(secretName, value);
  } catch (error: any) {
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to set secret');
  }
}

// Cache secrets for performance
const secretCache = new Map<string, { value: string; expiry: number }>();

export async function getCachedSecret(secretName: string): Promise<string> {
  const now = Date.now();
  const cached = secretCache.get(secretName);

  if (cached && cached.expiry > now) {
    return cached.value;
  }

  const value = await getSecret(secretName);

  // Cache for 5 minutes
  secretCache.set(secretName, {
    value,
    expiry: now + 5 * 60 * 1000,
  });

  return value;
}
```

## Azure Application Insights

### Setup

Application Insights is built into Azure Functions. Configure it in your function app settings.

### Custom Telemetry

```typescript
// services/telemetry.service.ts
import { TelemetryClient } from 'applicationinsights';

const client = new TelemetryClient(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING);

export function trackEvent(name: string, properties?: Record<string, any>) {
  client.trackEvent({
    name,
    properties,
  });
}

export function trackMetric(name: string, value: number) {
  client.trackMetric({
    name,
    value,
  });
}

export function trackException(error: Error, properties?: Record<string, any>) {
  client.trackException({
    exception: error,
    properties,
  });
}
```

### Usage in Handlers

```typescript
import { createHandler } from '@qops/hub-kit';
import { trackEvent, trackMetric } from '../services/telemetry.service.js';

const handler = createHandler(
  async (request, context, { user, correlationId }) => {
    const startTime = Date.now();

    // Track custom event
    trackEvent('UserLogin', {
      userId: user.sub,
      correlationId,
      timestamp: new Date().toISOString(),
    });

    const result = await processLogin(user);

    // Track performance metric
    const duration = Date.now() - startTime;
    trackMetric('LoginDuration', duration);

    return { status: 200, jsonBody: result };
  },
  {
    jwtConfig: { secret: process.env.JWT_SECRET! },
    enableLogging: true,
  },
);
```

## Azure SQL Database

### Setup

```bash
npm install mssql
```

### Configuration

```typescript
// services/sql.service.ts
import sql from 'mssql';
import { AppError, ErrorCode } from '@qops/hub-kit';

const config: sql.config = {
  server: process.env.SQL_SERVER!,
  database: process.env.SQL_DATABASE!,
  user: process.env.SQL_USER!,
  password: process.env.SQL_PASSWORD!,
  options: {
    encrypt: true,
    trustServerCertificate: false,
  },
};

let pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = await sql.connect(config);
  }
  return pool;
}

export async function queryUsers(filters: { role?: string }) {
  try {
    const pool = await getPool();
    const request = pool.request();

    let query = 'SELECT id, email, name, role FROM users WHERE 1=1';

    if (filters.role) {
      query += ' AND role = @role';
      request.input('role', sql.VarChar, filters.role);
    }

    const result = await request.query(query);
    return result.recordset;
  } catch (error: any) {
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Database query failed', {
      error: error.message,
    });
  }
}

export async function getUserById(id: string) {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('id', sql.VarChar, id)
      .query('SELECT id, email, name, role FROM users WHERE id = @id');

    if (result.recordset.length === 0) {
      throw new AppError(ErrorCode.NOT_FOUND, 'User not found');
    }

    return result.recordset[0];
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Database query failed');
  }
}
```

## Environment Variables

### Required Variables by Service

```env
# Cosmos DB
COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_KEY=your-cosmos-key
COSMOS_DATABASE=mydb

# Blob Storage
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...

# Service Bus
SERVICE_BUS_CONNECTION_STRING=Endpoint=sb://...

# Key Vault
KEY_VAULT_URL=https://your-vault.vault.azure.net/

# Application Insights
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=...

# SQL Database
SQL_SERVER=your-server.database.windows.net
SQL_DATABASE=your-database
SQL_USER=your-username
SQL_PASSWORD=your-password

# JWT Authentication
JWT_SECRET=your-secret-key
```

## Best Practices

1. **Connection Pooling** - Reuse database connections across requests
2. **Error Handling** - Use AppError for consistent error responses
3. **Retry Logic** - Implement retry policies for transient failures
4. **Secrets Management** - Use Key Vault for sensitive data
5. **Monitoring** - Use Application Insights for telemetry
6. **Resource Cleanup** - Close connections and dispose resources properly
7. **Environment Variables** - Never commit secrets to source control
8. **Managed Identities** - Use for authentication when possible

## Next Steps

- **Getting Started**: See [Getting Started Guide](./GETTING-STARTED.md)
- **Advanced Usage**: See [Advanced Usage](./ADVANCED.md)
- **API Reference**: See main [README.md](../README.md)
