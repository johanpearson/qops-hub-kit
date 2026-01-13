import { OpenApiBuilder, z } from './dist/index.js';

const builder = new OpenApiBuilder({
  title: 'Test API',
  version: '1.0.0',
});

const formDataSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
});

try {
  builder.registerRoute({
    method: 'POST',
    path: '/upload',
    summary: 'Upload file',
    formDataSchema,
    fileUploads: {
      file: {
        description: 'File to upload',
        required: true,
      },
    },
    responses: {
      200: {
        description: 'Success',
      },
    },
  });

  const doc = builder.generateDocument();
  console.log(JSON.stringify(doc, null, 2));
} catch (err) {
  console.error('Error:', err.message);
  console.error(err.stack);
}
