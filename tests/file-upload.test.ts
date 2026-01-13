import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpRequest, InvocationContext } from '@azure/functions';
import { z } from 'zod';
import { createHandler } from '../src/handler';
import { ErrorCode } from '../src/errors';
// File class is available in Node.js 18+ from the buffer module
import { File } from 'buffer';

describe('file upload', () => {
  let mockRequest: HttpRequest;
  let mockContext: InvocationContext;

  beforeEach(() => {
    mockRequest = {
      method: 'POST',
      url: 'http://localhost:7071/api/upload',
      headers: new Headers(),
      query: new URLSearchParams(),
      formData: vi.fn(),
    } as unknown as HttpRequest;

    mockContext = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
      invocationId: 'test-invocation-id',
    } as unknown as InvocationContext;
  });

  // Helper to create a mock File
  function createMockFile(name: string, type: string, content: string): File {
    const buffer = Buffer.from(content);
    return new File([buffer], name, { type });
  }

  describe('createHandler - file upload', () => {
    it('should parse multipart form data with files', async () => {
      const mockFile = createMockFile('test.txt', 'text/plain', 'test content');

      const mockFormData = new Map([
        ['file', mockFile],
        ['description', 'Test file description'],
      ]);

      (mockRequest.formData as any).mockResolvedValue(mockFormData);

      const handler = createHandler(
        async (request, context, { files, formFields }) => {
          return {
            status: 200,
            jsonBody: {
              filesCount: files?.length || 0,
              files: files?.map((f) => ({
                fieldName: f.fieldName,
                filename: f.filename,
                mimeType: f.mimeType,
                size: f.size,
              })),
              formFields,
            },
          };
        },
        { enableFileUpload: true },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody.filesCount).toBe(1);
      expect(response.jsonBody.files[0].filename).toBe('test.txt');
      expect(response.jsonBody.files[0].mimeType).toBe('text/plain');
      expect(response.jsonBody.formFields.description).toBe('Test file description');
    });

    it('should validate form fields with schema', async () => {
      const formFieldsSchema = z.object({
        title: z.string().min(1),
        description: z.string().optional(),
      });

      const mockFile = createMockFile('document.pdf', 'application/pdf', 'pdf content');

      const mockFormData = new Map([
        ['file', mockFile],
        ['title', 'My Document'],
        ['description', 'Important document'],
      ]);

      (mockRequest.formData as any).mockResolvedValue(mockFormData);

      const handler = createHandler(
        async (request, context, { files, formFields }) => {
          return {
            status: 201,
            jsonBody: {
              uploaded: true,
              title: formFields?.title,
              description: formFields?.description,
            },
          };
        },
        {
          enableFileUpload: true,
          formFieldsSchema,
        },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(201);
      expect(response.jsonBody.title).toBe('My Document');
      expect(response.jsonBody.description).toBe('Important document');
    });

    it('should return 422 for invalid form fields', async () => {
      const formFieldsSchema = z.object({
        title: z.string().min(1),
      });

      const mockFile = createMockFile('test.txt', 'text/plain', 'content');

      const mockFormData = new Map([
        ['file', mockFile],
        ['title', ''], // Invalid - too short
      ]);

      (mockRequest.formData as any).mockResolvedValue(mockFormData);

      const handler = createHandler(
        async (request, context, { files, formFields }) => {
          return { status: 200, jsonBody: { success: true } };
        },
        {
          enableFileUpload: true,
          formFieldsSchema,
        },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(422);
      expect(response.jsonBody.error.code).toBe(ErrorCode.VALIDATION_ERROR);
    });

    it('should handle multiple files', async () => {
      const mockFile1 = createMockFile('file1.txt', 'text/plain', 'content1');
      const mockFile2 = createMockFile('file2.txt', 'text/plain', 'content2');

      const mockFormData = new Map([
        ['file1', mockFile1],
        ['file2', mockFile2],
        ['note', 'Multiple files'],
      ]);

      (mockRequest.formData as any).mockResolvedValue(mockFormData);

      const handler = createHandler(
        async (request, context, { files, formFields }) => {
          return {
            status: 200,
            jsonBody: {
              filesCount: files?.length || 0,
              filenames: files?.map((f) => f.filename),
              note: formFields?.note,
            },
          };
        },
        { enableFileUpload: true },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody.filesCount).toBe(2);
      expect(response.jsonBody.filenames).toContain('file1.txt');
      expect(response.jsonBody.filenames).toContain('file2.txt');
      expect(response.jsonBody.note).toBe('Multiple files');
    });

    it('should handle form data without files', async () => {
      const mockFormData = new Map([
        ['name', 'John Doe'],
        ['email', 'john@example.com'],
      ]);

      (mockRequest.formData as any).mockResolvedValue(mockFormData);

      const handler = createHandler(
        async (request, context, { files, formFields }) => {
          return {
            status: 200,
            jsonBody: {
              filesCount: files?.length || 0,
              formFields,
            },
          };
        },
        { enableFileUpload: true },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody.filesCount).toBe(0);
      expect(response.jsonBody.formFields.name).toBe('John Doe');
      expect(response.jsonBody.formFields.email).toBe('john@example.com');
    });

    it('should return 400 for invalid multipart data', async () => {
      (mockRequest.formData as any).mockRejectedValue(new Error('Invalid multipart data'));

      const handler = createHandler(
        async (request, context, { files }) => {
          return { status: 200, jsonBody: { success: true } };
        },
        { enableFileUpload: true },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(400);
      expect(response.jsonBody.error.code).toBe(ErrorCode.BAD_REQUEST);
      expect(response.jsonBody.error.message).toContain('Invalid multipart/form-data');
    });

    it('should provide file buffer for processing', async () => {
      const fileContent = 'This is test content';
      const mockFile = createMockFile('test.txt', 'text/plain', fileContent);

      const mockFormData = new Map([['file', mockFile]]);

      (mockRequest.formData as any).mockResolvedValue(mockFormData);

      const handler = createHandler(
        async (request, context, { files }) => {
          const file = files?.[0];
          const content = file?.buffer.toString('utf-8');

          return {
            status: 200,
            jsonBody: {
              content,
              size: file?.size,
            },
          };
        },
        { enableFileUpload: true },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody.content).toBe(fileContent);
      expect(response.jsonBody.size).toBe(fileContent.length);
    });

    it('should work with JWT authentication', async () => {
      const jwt = await import('jsonwebtoken');
      const secret = 'test-secret';
      const token = jwt.default.sign({ sub: '123', roles: ['admin'] }, secret);

      mockRequest.headers.set('authorization', `Bearer ${token}`);

      const mockFile = createMockFile('secure.txt', 'text/plain', 'content');

      const mockFormData = new Map([['file', mockFile]]);

      (mockRequest.formData as any).mockResolvedValue(mockFormData);

      const handler = createHandler(
        async (request, context, { files, user }) => {
          return {
            status: 200,
            jsonBody: {
              userId: user?.sub,
              filesCount: files?.length || 0,
            },
          };
        },
        {
          enableFileUpload: true,
          jwtConfig: { secret },
        },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody.userId).toBe('123');
      expect(response.jsonBody.filesCount).toBe(1);
    });
  });
});
