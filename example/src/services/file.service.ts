import { randomUUID } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { AppError, ErrorCode } from '@qops/hub-kit';

/**
 * File metadata interface
 */
export interface FileMetadata {
  id: string;
  filename: string;
  originalName: string;
  contentType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
  path: string;
}

// In-memory store for file metadata (simulating database)
const fileStore = new Map<string, FileMetadata>();

// Local storage directory (simulating blob storage)
const UPLOAD_DIR = join(process.cwd(), 'uploads');

/**
 * Initialize upload directory
 */
export async function initializeStorage(): Promise<void> {
  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create upload directory:', error);
  }
}

/**
 * Upload a file (simulating blob storage upload)
 *
 * In production, replace this with:
 * - Azure Blob Storage: @azure/storage-blob
 * - AWS S3: @aws-sdk/client-s3
 * - Google Cloud Storage: @google-cloud/storage
 *
 * @param fileBuffer - The file buffer
 * @param originalName - Original filename
 * @param contentType - MIME type
 * @param uploadedBy - User ID
 * @returns File metadata
 */
export async function uploadFile(
  fileBuffer: Buffer,
  originalName: string,
  contentType: string,
  uploadedBy: string,
): Promise<FileMetadata> {
  const fileId = randomUUID();
  const filename = `${fileId}-${originalName}`;
  const filePath = join(UPLOAD_DIR, filename);

  try {
    // Save file to local storage (simulating blob storage)
    await writeFile(filePath, fileBuffer);

    // Save metadata to "database"
    const metadata: FileMetadata = {
      id: fileId,
      filename,
      originalName,
      contentType,
      size: fileBuffer.length,
      uploadedBy,
      uploadedAt: new Date(),
      path: filePath,
    };

    fileStore.set(fileId, metadata);

    return metadata;
  } catch (error) {
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to upload file', { error: String(error) });
  }
}

/**
 * Get file metadata by ID
 *
 * In production, query from database
 */
export function getFileById(id: string): FileMetadata | undefined {
  return fileStore.get(id);
}

/**
 * List all files for a user
 *
 * In production, query from database with pagination
 */
export function listFilesByUser(userId: string): FileMetadata[] {
  return Array.from(fileStore.values()).filter((file) => file.uploadedBy === userId);
}

/**
 * List all files (admin only)
 */
export async function listAllFiles(): Promise<FileMetadata[]> {
  return Array.from(fileStore.values());
}

/**
 * Delete a file
 *
 * In production:
 * 1. Delete from blob storage
 * 2. Delete metadata from database
 */
export function deleteFile(id: string): boolean {
  const file = fileStore.get(id);
  if (!file) {
    return false;
  }

  fileStore.delete(id);
  // In production, also delete from blob storage
  return true;
}
