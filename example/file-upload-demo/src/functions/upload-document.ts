import { app } from '@azure/functions';
import { createHandler, UploadedFile, UserRole } from '@qops/hub-kit';
import { documentUploadSchema } from '../schemas/upload.schemas.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Upload document with metadata
 * Demonstrates file upload with form fields validation
 */
const uploadDocumentHandler = createHandler(
  async (request, context, { files, formFields, user }) => {
    context.log(`Processing document upload for user: ${user?.sub}`);

    // Validate files were provided
    if (!files || files.length === 0) {
      return {
        status: 400,
        jsonBody: {
          error: {
            code: 'NO_FILES',
            message: 'At least one file must be uploaded',
          },
        },
      };
    }

    // Process files (in a real app, you'd save to blob storage)
    const processedFiles = files.map((file: UploadedFile) => {
      context.log(`Received file: ${file.filename}, size: ${file.size} bytes, type: ${file.mimeType}`);

      return {
        filename: file.filename,
        mimeType: file.mimeType,
        size: file.size,
      };
    });

    // Create response with document metadata
    const response = {
      id: uuidv4(),
      title: formFields?.title,
      description: formFields?.description,
      category: formFields?.category,
      files: processedFiles,
      uploadedAt: new Date().toISOString(),
      uploadedBy: user?.sub || 'anonymous',
    };

    return {
      status: 201,
      jsonBody: response,
    };
  },
  {
    enableFileUpload: true,
    formFieldsSchema: documentUploadSchema,
    jwtConfig: { secret: process.env.JWT_SECRET! },
    requiredRoles: [UserRole.MEMBER, UserRole.ADMIN],
    enableLogging: true,
  },
);

app.http('uploadDocument', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'documents/upload',
  handler: uploadDocumentHandler,
});
