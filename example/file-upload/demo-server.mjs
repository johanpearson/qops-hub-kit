import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the OpenAPI builder
import('./dist/functions/openapi.js')
  .then((module) => {
    const PORT = 3000;

    const server = http.createServer(async (req, res) => {
      console.log(`${req.method} ${req.url}`);

      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      if (req.url === '/' || req.url === '/swagger.html') {
        // Serve swagger.html
        const swaggerPath = path.join(__dirname, 'swagger.html');
        const swaggerHtml = fs.readFileSync(swaggerPath, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(swaggerHtml);
      } else if (req.url === '/api-docs.html' || req.url === '/docs') {
        // Serve api-docs.html
        const docsPath = path.join(__dirname, 'api-docs.html');
        const docsHtml = fs.readFileSync(docsPath, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(docsHtml);
      } else if (req.url === '/api/openapi.json') {
        // Generate OpenAPI document
        try {
          const { OpenApiBuilder } = await import('./node_modules/@qops/hub-kit/dist/openapi.js');
          const { z } = await import('./node_modules/@qops/hub-kit/dist/openapi.js');
          const { uploadFileSchema, uploadResponseSchema } = await import('./dist/schemas/upload.schemas.js');

          const builder = new OpenApiBuilder({
            title: 'File Upload API',
            version: '1.0.0',
            description: 'Azure Functions API demonstrating file upload with multipart/form-data',
            servers: [
              {
                url: `http://localhost:${PORT}/api`,
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

          const doc = builder.generateDocument();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(doc, null, 2));
        } catch (error) {
          console.error('Error generating OpenAPI:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    server.listen(PORT, () => {
      console.log(`\n✅ Server running at http://localhost:${PORT}/`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/docs`);
      console.log(`📄 OpenAPI Spec: http://localhost:${PORT}/api/openapi.json\n`);
    });
  })
  .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
