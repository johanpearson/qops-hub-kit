import { app } from '@azure/functions';
import { createHandler } from '@qops/hub-kit';
import { uploadFileSchema } from '../schemas/upload.schemas.js';

/**
 * File upload endpoint
 * Accepts multipart/form-data with file uploads
 */
const handler = createHandler(
  async (request, context, { formData, files }) => {
    context.log(`Processing file upload: ${formData.title}`);
    context.log(`Received ${files?.length || 0} file(s)`);

    // Log file details
    if (files && files.length > 0) {
      for (const file of files) {
        context.log(`  - ${file.filename} (${file.size} bytes, ${file.mimeType})`);
        context.log(`    Content preview: ${file.buffer.toString('utf-8', 0, Math.min(50, file.size))}...`);
      }
    }

    // In a real application, you would:
    // 1. Validate file types and sizes
    // 2. Upload files to Azure Blob Storage or another storage service
    // 3. Store metadata in a database
    // 4. Return the file URLs

    return {
      status: 200,
      jsonBody: {
        success: true,
        message: 'Files uploaded successfully',
        uploadedFiles:
          files?.map((file) => ({
            filename: file.filename,
            size: file.size,
            mimeType: file.mimeType,
          })) || [],
        metadata: {
          title: formData.title,
          description: formData.description,
          category: formData.category,
        },
      },
    };
  },
  {
    formDataSchema: uploadFileSchema,
    enableLogging: true,
  },
);

app.http('uploadFile', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'upload',
  handler,
});
