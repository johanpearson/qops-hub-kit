# File Upload Demo

This example demonstrates how to use `@qops/hub-kit` to create Azure Functions with file upload capabilities using multipart/form-data.

## Features

- **Document Upload** (`POST /api/documents/upload`)
  - Upload one or more documents with metadata
  - Requires JWT authentication
  - Form fields validation with Zod schemas
  - Role-based access control

- **Image Upload** (`POST /api/images/upload`)
  - Upload a single image with metadata
  - Public endpoint (no authentication)
  - MIME type validation
  - Form fields validation

- **OpenAPI Documentation** (`GET /api/openapi.json`)
  - Auto-generated OpenAPI 3.0 spec
  - Ready for Swagger UI
  - Complete with file upload definitions

## Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Link to local hub-kit (for development):**

   ```bash
   # From the example directory
   npm link ../../../
   ```

3. **Create environment file:**

   ```bash
   cp .env.example .env
   ```

4. **Build the project:**

   ```bash
   npm run build
   ```

5. **Start the Azure Functions runtime:**
   ```bash
   npm start
   ```

## Testing with Swagger UI

1. **Access OpenAPI spec:**

   ```
   http://localhost:7071/api/openapi.json
   ```

2. **Use online Swagger UI:**
   - Go to https://editor.swagger.io/
   - Click "File" → "Import URL"
   - Enter: `http://localhost:7071/api/openapi.json`

3. **Or use local Swagger UI with Docker:**
   ```bash
   docker run -p 8080:8080 -e SWAGGER_JSON_URL=http://host.docker.internal:7071/api/openapi.json swaggerapi/swagger-ui
   ```
   Then open http://localhost:8080

## Testing Endpoints

### Upload Image (Public)

```bash
curl -X POST http://localhost:7071/api/images/upload \
  -F "image=@/path/to/image.jpg" \
  -F "altText=My test image" \
  -F "tags=test,demo,azure"
```

### Upload Document (Requires Auth)

First, generate a test JWT token:

```bash
# Using Node.js
node -e "console.log(require('jsonwebtoken').sign({sub:'user123',email:'test@example.com',name:'Test User',roles:['member']}, 'demo-secret-key-change-in-production'))"
```

Then upload:

```bash
curl -X POST http://localhost:7071/api/documents/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/document.pdf" \
  -F "title=Important Document" \
  -F "description=This is a test document" \
  -F "category=report"
```

### Test with multiple files

```bash
curl -X POST http://localhost:7071/api/documents/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/doc1.pdf" \
  -F "file=@/path/to/doc2.pdf" \
  -F "title=Multiple Documents" \
  -F "category=report"
```

## Code Structure

```
src/
├── schemas/
│   └── upload.schemas.ts    # Zod schemas for validation and OpenAPI
├── functions/
│   ├── upload-document.ts   # Document upload handler (with auth)
│   ├── upload-image.ts      # Image upload handler (public)
│   └── openapi.ts          # OpenAPI documentation endpoint
```

## Key Concepts

### 1. Enable File Upload

```typescript
const handler = createHandler(
  async (request, context, { files, formFields }) => {
    // files: UploadedFile[] - array of uploaded files
    // formFields: Record<string, string> - form field values

    // Process files...
    return { status: 201, jsonBody: { success: true } };
  },
  {
    enableFileUpload: true, // Enable multipart/form-data parsing
    formFieldsSchema: yourZodSchema, // Validate form fields
  },
);
```

### 2. File Information

Each file in the `files` array contains:

- `fieldName`: Form field name
- `filename`: Original filename
- `mimeType`: MIME type
- `size`: File size in bytes
- `buffer`: File content as Buffer

### 3. OpenAPI Documentation

```typescript
builder.registerRoute({
  method: 'POST',
  path: '/api/upload',
  enableFileUpload: true,
  formFieldsSchema: mySchema,
  fileFields: [
    {
      name: 'file',
      description: 'File to upload',
      required: true,
    },
  ],
  responses: {
    /* ... */
  },
});
```

## Production Considerations

When deploying to production:

1. **Store files in Azure Blob Storage** instead of processing in memory
2. **Implement file size limits** to prevent abuse
3. **Validate file types** and scan for malware
4. **Use secure JWT secrets** (store in Key Vault)
5. **Add rate limiting** to prevent DoS attacks
6. **Implement file retention policies**
7. **Consider using SAS tokens** for direct blob uploads

## License

MIT
