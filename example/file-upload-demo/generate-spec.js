#!/usr/bin/env node

/**
 * Generate OpenAPI specification
 * This script generates the OpenAPI spec and writes it to a file
 */

import { OpenApiBuilder } from '@qops/hub-kit';
import {
  documentUploadSchema,
  documentUploadResponseSchema,
  imageUploadSchema,
  imageUploadResponseSchema,
} from './dist/schemas/upload.schemas.js';
import { writeFileSync } from 'fs';

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
    'Upload one or more documents with associated metadata. Requires authentication. Supports PDF, Word, Excel, and text files.',
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
    'Upload a single image file with metadata. Public endpoint (no authentication required). Supports JPG, PNG, GIF, and WebP formats.',
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

// Generate and save the spec
const spec = builder.generateDocument();
const specJson = JSON.stringify(spec, null, 2);

writeFileSync('openapi.json', specJson);
console.log('✓ OpenAPI specification generated: openapi.json');
console.log('\nTo view in Swagger UI:');
console.log('  1. Go to https://editor.swagger.io/');
console.log('  2. File → Import File → Select openapi.json');
console.log('\nOr run the Functions app and view at:');
console.log('  http://localhost:7071/api/openapi.json');
