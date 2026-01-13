import { z } from '@qops/hub-kit';

/**
 * Schema for file upload form data
 */
export const uploadFileSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  category: z.enum(['document', 'image', 'other']).optional(),
});

/**
 * Response schema for file upload
 */
export const uploadResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  uploadedFiles: z.array(
    z.object({
      filename: z.string(),
      size: z.number(),
      mimeType: z.string(),
    }),
  ),
  metadata: z.object({
    title: z.string(),
    description: z.string().optional(),
    category: z.string().optional(),
  }),
});
