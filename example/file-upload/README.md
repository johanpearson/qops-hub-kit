# File Upload Example

This example demonstrates how to use `@qops/hub-kit` to create an Azure Function that accepts file uploads with multipart/form-data.

## Features

- ✅ File upload with multipart/form-data
- ✅ Form field validation with Zod
- ✅ Multiple file support
- ✅ OpenAPI documentation
- ✅ Swagger UI for testing

## Setup

1. Install dependencies:

```bash
npm install
```

2. Build the project:

```bash
npm run build
```

3. Start the Azure Functions runtime:

```bash
npm start
```

## Testing

### Using Swagger UI

1. Open http://localhost:7071/swagger.html in your browser
2. Click on the "POST /upload" endpoint
3. Click "Try it out"
4. Fill in the form fields:
   - `title`: Required text field
   - `description`: Optional text field
   - `category`: Optional dropdown (document/image/other)
   - `file`: Click "Choose File" to select one or more files
5. Click "Execute"

### Using curl

```bash
curl -X POST http://localhost:7071/api/upload \
  -F "title=My Document" \
  -F "description=A test document" \
  -F "category=document" \
  -F "file=@/path/to/your/file.txt"
```

### Multiple files

```bash
curl -X POST http://localhost:7071/api/upload \
  -F "title=Multiple Files" \
  -F "file=@/path/to/file1.txt" \
  -F "file=@/path/to/file2.pdf"
```

## API Endpoints

### POST /api/upload

Upload files with metadata.

**Request:**

- Content-Type: `multipart/form-data`
- Form fields:
  - `title` (required): Title of the upload
  - `description` (optional): Description
  - `category` (optional): Category (document/image/other)
  - `file` (required): One or more files

**Response:**

```json
{
  "success": true,
  "message": "Files uploaded successfully",
  "uploadedFiles": [
    {
      "filename": "example.txt",
      "size": 1024,
      "mimeType": "text/plain"
    }
  ],
  "metadata": {
    "title": "My Document",
    "description": "A test document",
    "category": "document"
  }
}
```

### GET /api/openapi.json

Returns the OpenAPI 3.0 specification for the API.

## Key Implementation Details

### Handler Configuration

```typescript
import { createHandler } from '@qops/hub-kit';
import { uploadFileSchema } from '../schemas/upload.schemas.js';

const handler = createHandler(
  async (request, context, { formData, files }) => {
    // formData contains validated form fields
    // files contains array of uploaded files with buffer content

    return {
      status: 200,
      jsonBody: {
        /* response */
      },
    };
  },
  {
    formDataSchema: uploadFileSchema, // Validates form fields
    enableLogging: true,
  },
);
```

### OpenAPI Documentation

```typescript
builder.registerRoute({
  method: 'POST',
  path: '/upload',
  summary: 'Upload file with metadata',
  formDataSchema: uploadFileSchema, // Form fields schema
  fileUploads: {
    file: {
      description: 'File(s) to upload',
      required: true,
    },
  },
  responses: {
    /* ... */
  },
});
```

## File Structure

```
example/file-upload/
├── src/
│   ├── schemas/
│   │   └── upload.schemas.ts    # Zod schemas
│   └── functions/
│       ├── upload-file.ts       # File upload handler
│       └── openapi.ts           # OpenAPI documentation
├── package.json
├── tsconfig.json
├── host.json
└── swagger.html                 # Swagger UI page
```

## Next Steps

In a production application, you would typically:

1. **Validate file types and sizes** - Add checks for allowed MIME types and maximum file size
2. **Upload to storage** - Save files to Azure Blob Storage, AWS S3, or another storage service
3. **Store metadata** - Save file metadata in a database (Cosmos DB, SQL, etc.)
4. **Return file URLs** - Provide URLs where the files can be accessed
5. **Add authentication** - Protect the endpoint with JWT authentication
6. **Add virus scanning** - Scan uploaded files for malware
7. **Add rate limiting** - Prevent abuse with rate limiting

## Resources

- [@qops/hub-kit Documentation](../../README.md)
- [Azure Functions Documentation](https://docs.microsoft.com/en-us/azure/azure-functions/)
- [OpenAPI Specification](https://swagger.io/specification/)
