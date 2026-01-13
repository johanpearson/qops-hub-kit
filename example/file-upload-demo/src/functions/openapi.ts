import { app } from '@azure/functions';
import { OpenApiBuilder } from '@qops/hub-kit';
import {
  documentUploadSchema,
  documentUploadResponseSchema,
  imageUploadSchema,
  imageUploadResponseSchema,
} from '../schemas/upload.schemas.js';

// Create OpenAPI builder
const builder = new OpenApiBuilder({
  title: 'File Upload Demo API',
  version: '1.0.0',
  description: 'Demo API showcasing file upload capabilities with multipart/form-data',
  servers: [
    {
      url: 'http://localhost:7071/api',
      description: 'Local development server',
    },
  ],
});

// Register document upload endpoint
builder.registerRoute({
  method: 'POST',
  path: '/api/documents/upload',
  summary: 'Upload document with metadata',
  description:
    'Upload one or more documents with associated metadata. Requires authentication. ' +
    'Supports PDF, Word, Excel, and text files.',
  tags: ['Documents'],
  enableFileUpload: true,
  formFieldsSchema: documentUploadSchema,
  fileFields: [
    {
      name: 'file',
      description: 'Document file(s) to upload (supports multiple files)',
      required: true,
    },
  ],
  responses: {
    201: {
      description: 'Document uploaded successfully',
      schema: documentUploadResponseSchema,
    },
    400: {
      description: 'Bad request - no files provided or invalid data',
    },
    401: {
      description: 'Unauthorized - authentication required',
    },
    422: {
      description: 'Validation error - invalid form fields',
    },
  },
  requiresAuth: true,
});

// Register image upload endpoint
builder.registerRoute({
  method: 'POST',
  path: '/api/images/upload',
  summary: 'Upload image with metadata',
  description:
    'Upload a single image file with metadata. Public endpoint (no authentication required). ' +
    'Supports JPG, PNG, GIF, and WebP formats.',
  tags: ['Images'],
  enableFileUpload: true,
  formFieldsSchema: imageUploadSchema,
  fileFields: [
    {
      name: 'image',
      description: 'Image file to upload (single file only)',
      required: true,
    },
  ],
  responses: {
    201: {
      description: 'Image uploaded successfully',
      schema: imageUploadResponseSchema,
    },
    400: {
      description: 'Bad request - invalid file type or missing file',
    },
    422: {
      description: 'Validation error - invalid form fields',
    },
  },
  requiresAuth: false,
});

// OpenAPI endpoint handler
app.http('openapi', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'openapi.json',
  handler: async () => ({
    status: 200,
    jsonBody: builder.generateDocument(),
  }),
});
