/**
 * Azure Blob Storage integration example
 *
 * This file demonstrates how to integrate Azure Blob Storage
 * with the @qops/hub-kit package for file uploads.
 *
 * Install: npm install @azure/storage-blob
 */

/**
 * Example: Azure Blob Storage setup
 *
 * import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
 *
 * // Option 1: Using connection string
 * const blobServiceClient = BlobServiceClient.fromConnectionString(
 *   process.env.AZURE_STORAGE_CONNECTION_STRING!
 * );
 *
 * // Option 2: Using account name and key
 * const credential = new StorageSharedKeyCredential(
 *   process.env.AZURE_STORAGE_ACCOUNT_NAME!,
 *   process.env.AZURE_STORAGE_ACCOUNT_KEY!
 * );
 * const blobServiceClient = new BlobServiceClient(
 *   `https://${process.env.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
 *   credential
 * );
 *
 * const containerClient = blobServiceClient.getContainerClient('uploads');
 *
 * // Ensure container exists
 * await containerClient.createIfNotExists({
 *   access: 'blob' // or 'container' or 'private'
 * });
 */

/**
 * Example: Upload file to Azure Blob Storage
 *
 * export async function uploadToAzureBlob(
 *   fileBuffer: Buffer,
 *   fileName: string,
 *   contentType: string
 * ): Promise<string> {
 *   const blobClient = containerClient.getBlockBlobClient(fileName);
 *
 *   await blobClient.upload(fileBuffer, fileBuffer.length, {
 *     blobHTTPHeaders: {
 *       blobContentType: contentType,
 *     },
 *   });
 *
 *   return blobClient.url;
 * }
 */

/**
 * Example: Download file from Azure Blob Storage
 *
 * export async function downloadFromAzureBlob(fileName: string): Promise<Buffer> {
 *   const blobClient = containerClient.getBlockBlobClient(fileName);
 *   const downloadResponse = await blobClient.download();
 *
 *   return await streamToBuffer(downloadResponse.readableStreamBody!);
 * }
 *
 * async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
 *   const chunks: Buffer[] = [];
 *   return new Promise((resolve, reject) => {
 *     stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
 *     stream.on('error', reject);
 *     stream.on('end', () => resolve(Buffer.concat(chunks)));
 *   });
 * }
 */

/**
 * Example: Delete file from Azure Blob Storage
 *
 * export async function deleteFromAzureBlob(fileName: string): Promise<void> {
 *   const blobClient = containerClient.getBlockBlobClient(fileName);
 *   await blobClient.delete();
 * }
 */

/**
 * Example: Generate SAS URL for temporary access
 *
 * import { generateBlobSASQueryParameters, BlobSASPermissions } from '@azure/storage-blob';
 *
 * export function generateSasUrl(
 *   fileName: string,
 *   expiresInMinutes: number = 60
 * ): string {
 *   const blobClient = containerClient.getBlockBlobClient(fileName);
 *
 *   const sasOptions = {
 *     containerName: containerClient.containerName,
 *     blobName: fileName,
 *     permissions: BlobSASPermissions.parse('r'), // read-only
 *     startsOn: new Date(),
 *     expiresOn: new Date(Date.now() + expiresInMinutes * 60 * 1000),
 *   };
 *
 *   const sasToken = generateBlobSASQueryParameters(
 *     sasOptions,
 *     credential
 *   ).toString();
 *
 *   return `${blobClient.url}?${sasToken}`;
 * }
 */

/**
 * Example: List blobs in container
 *
 * export async function listBlobs(prefix?: string): Promise<string[]> {
 *   const blobs = containerClient.listBlobsFlat({ prefix });
 *   const blobNames: string[] = [];
 *
 *   for await (const blob of blobs) {
 *     blobNames.push(blob.name);
 *   }
 *
 *   return blobNames;
 * }
 */

/**
 * Best Practices:
 *
 * 1. Use managed identity for authentication in Azure
 * 2. Set appropriate access levels (private, blob, container)
 * 3. Implement retry policies for transient failures
 * 4. Use SAS tokens for temporary access
 * 5. Store metadata in a database (file size, type, owner, etc.)
 * 6. Validate file types and sizes before upload
 * 7. Use CDN for frequently accessed files
 * 8. Implement lifecycle management for auto-deletion
 */

// Mock implementation for demonstration
const mockBlobStorage = new Map<string, { buffer: Buffer; metadata: any }>();

export async function uploadToMockBlob(fileBuffer: Buffer, fileName: string, metadata: any): Promise<string> {
  mockBlobStorage.set(fileName, { buffer: fileBuffer, metadata });
  return `https://mock-storage.blob.core.windows.net/uploads/${fileName}`;
}

export async function downloadFromMockBlob(fileName: string): Promise<Buffer | undefined> {
  return mockBlobStorage.get(fileName)?.buffer;
}

export async function deleteFromMockBlob(fileName: string): Promise<boolean> {
  return mockBlobStorage.delete(fileName);
}

export async function listMockBlobs(): Promise<string[]> {
  return Array.from(mockBlobStorage.keys());
}
