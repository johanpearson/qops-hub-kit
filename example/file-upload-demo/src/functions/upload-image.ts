import { app } from '@azure/functions';
import { createHandler, UploadedFile } from '@qops/hub-kit';
import { imageUploadSchema } from '../schemas/upload.schemas.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Upload image with metadata
 * Demonstrates file upload without authentication (public endpoint)
 */
const uploadImageHandler = createHandler(
  async (request, context, { files, formFields }) => {
    context.log('Processing image upload');

    // Validate that exactly one file was provided
    if (!files || files.length === 0) {
      return {
        status: 400,
        jsonBody: {
          error: {
            code: 'NO_FILE',
            message: 'One image file must be uploaded',
          },
        },
      };
    }

    if (files.length > 1) {
      return {
        status: 400,
        jsonBody: {
          error: {
            code: 'TOO_MANY_FILES',
            message: 'Only one image file can be uploaded at a time',
          },
        },
      };
    }

    const file: UploadedFile = files[0];

    // Validate MIME type
    if (!file.mimeType.startsWith('image/')) {
      return {
        status: 400,
        jsonBody: {
          error: {
            code: 'INVALID_FILE_TYPE',
            message: 'Only image files are allowed',
          },
        },
      };
    }

    context.log(`Received image: ${file.filename}, size: ${file.size} bytes, type: ${file.mimeType}`);

    // Parse tags
    const tags = formFields?.tags ? formFields.tags.split(',').map((tag: string) => tag.trim()) : undefined;

    // In a real app, you would:
    // 1. Save the file to blob storage
    // 2. Process the image (resize, optimize, etc.)
    // 3. Extract metadata (dimensions, etc.)
    // 4. Save metadata to database

    const response = {
      id: uuidv4(),
      altText: formFields?.altText,
      tags,
      image: {
        filename: file.filename,
        mimeType: file.mimeType,
        size: file.size,
        // In a real app, extract dimensions from buffer
        dimensions: undefined,
      },
      uploadedAt: new Date().toISOString(),
    };

    return {
      status: 201,
      jsonBody: response,
    };
  },
  {
    enableFileUpload: true,
    formFieldsSchema: imageUploadSchema,
    enableLogging: true,
  },
);

app.http('uploadImage', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'images/upload',
  handler: uploadImageHandler,
});
