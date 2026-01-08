import { createHandler, UserRole } from '@qops/hub-kit';
import { uploadFile, initializeStorage } from '../services/file.service.js';

// Initialize storage on module load
await initializeStorage();

/**
 * File upload endpoint
 *
 * POST /api/files/upload
 *
 * Demonstrates how to handle file uploads with Azure Functions.
 *
 * In production, you would typically:
 * 1. Parse multipart/form-data using a library or Azure Functions binding
 * 2. Validate file type and size
 * 3. Upload to blob storage (Azure Blob Storage, AWS S3, etc.)
 * 4. Store metadata in database
 * 5. Return file ID and URL
 *
 * Note: Azure Functions v4 doesn't have built-in multipart parsing.
 * For production use, consider:
 * - Accepting base64-encoded files in JSON
 * - Using blob storage input/output bindings
 * - Using Azure Functions with custom middleware for parsing
 */
export default createHandler(
  async (request, _context, { user }) => {
    // Get content type
    const contentType = request.headers.get('content-type') || 'application/octet-stream';

    // For this example, we expect:
    // 1. JSON body with base64-encoded file data, OR
    // 2. Raw binary data in the body

    let fileBuffer: Buffer;
    let fileName: string;
    let mimeType: string;

    if (contentType.includes('application/json')) {
      // Handle JSON with base64-encoded file
      const body = (await request.json()) as { fileName?: string; fileData?: string; mimeType?: string };

      if (!body.fileName || !body.fileData) {
        return {
          status: 400,
          jsonBody: {
            error: {
              code: 'INVALID_REQUEST',
              message: 'fileName and fileData (base64) are required',
            },
          },
        };
      }

      fileName = body.fileName;
      mimeType = body.mimeType || 'application/octet-stream';
      fileBuffer = Buffer.from(body.fileData, 'base64');
    } else {
      // Handle raw binary upload
      const arrayBuffer = await request.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);

      // Get filename from header or query param
      fileName = request.query.get('fileName') || request.headers.get('x-file-name') || 'uploaded-file';
      mimeType = contentType;
    }

    // Validate file size (max 10MB for example)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (fileBuffer.length > maxSize) {
      return {
        status: 413,
        jsonBody: {
          error: {
            code: 'FILE_TOO_LARGE',
            message: `File size exceeds maximum allowed size of ${maxSize} bytes`,
          },
        },
      };
    }

    // Upload file
    const file = await uploadFile(fileBuffer, fileName, mimeType, user!.sub!);

    return {
      status: 201,
      jsonBody: {
        id: file.id,
        filename: file.filename,
        originalName: file.originalName,
        contentType: file.contentType,
        size: file.size,
        uploadedAt: file.uploadedAt,
        message: 'File uploaded successfully',
      },
    };
  },
  {
    jwtConfig: {
      secret: process.env.JWT_SECRET || 'your-secret-key-change-this-in-production',
    },
    requiredRoles: [UserRole.MEMBER, UserRole.ADMIN],
    skipBodyParsing: true, // Don't auto-parse as JSON
    enableLogging: true,
  },
);
