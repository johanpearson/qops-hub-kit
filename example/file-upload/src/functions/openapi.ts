import { app } from '@azure/functions';
import { OpenApiBuilder } from '@qops/hub-kit';
import { uploadFileSchema, uploadResponseSchema } from '../schemas/upload.schemas.js';

/**
 * OpenAPI documentation endpoint
 */
const builder = new OpenApiBuilder({
  title: 'File Upload API',
  version: '1.0.0',
  description: 'Azure Functions API demonstrating file upload with multipart/form-data',
  servers: [
    {
      url: 'http://localhost:7071/api',
      description: 'Local development',
    },
  ],
});

// Register file upload endpoint
builder.registerRoute({
  method: 'POST',
  path: '/upload',
  summary: 'Upload file with metadata',
  description: 'Upload one or more files along with metadata using multipart/form-data',
  tags: ['File Upload'],
  formDataSchema: uploadFileSchema,
  fileUploads: {
    file: {
      description: 'File(s) to upload (supports multiple files)',
      required: true,
    },
  },
  responses: {
    200: {
      description: 'Files uploaded successfully',
      schema: uploadResponseSchema,
    },
    400: {
      description: 'Invalid multipart/form-data',
    },
    422: {
      description: 'Validation error',
    },
  },
});

app.http('openapi', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'openapi.json',
  handler: async () => ({
    status: 200,
    jsonBody: builder.generateDocument(),
  }),
});
