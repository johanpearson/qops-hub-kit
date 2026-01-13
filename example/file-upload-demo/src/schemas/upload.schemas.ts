import { z } from 'zod';

/**
 * Schema for document upload form fields
 */
export const documentUploadSchema = z.object({
  title: z.string().min(1).max(200).describe('Document title'),
  description: z.string().max(1000).optional().describe('Document description'),
  category: z.enum(['report', 'invoice', 'contract', 'other']).describe('Document category'),
});

/**
 * Schema for document upload response
 */
export const documentUploadResponseSchema = z.object({
  id: z.string().describe('Generated document ID'),
  title: z.string().describe('Document title'),
  description: z.string().optional().describe('Document description'),
  category: z.string().describe('Document category'),
  files: z
    .array(
      z.object({
        filename: z.string().describe('Original filename'),
        mimeType: z.string().describe('MIME type'),
        size: z.number().describe('File size in bytes'),
      }),
    )
    .describe('Uploaded files'),
  uploadedAt: z.string().describe('Upload timestamp'),
  uploadedBy: z.string().describe('User ID who uploaded'),
});

/**
 * Schema for image upload form fields
 */
export const imageUploadSchema = z.object({
  altText: z.string().min(1).max(200).describe('Alternative text for image'),
  tags: z.string().optional().describe('Comma-separated tags'),
});

/**
 * Schema for image upload response
 */
export const imageUploadResponseSchema = z.object({
  id: z.string().describe('Generated image ID'),
  altText: z.string().describe('Alternative text'),
  tags: z.array(z.string()).optional().describe('Image tags'),
  image: z.object({
    filename: z.string().describe('Original filename'),
    mimeType: z.string().describe('MIME type'),
    size: z.number().describe('File size in bytes'),
    dimensions: z
      .object({
        width: z.number(),
        height: z.number(),
      })
      .optional()
      .describe('Image dimensions'),
  }),
  uploadedAt: z.string().describe('Upload timestamp'),
});
