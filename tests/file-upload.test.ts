import { HttpRequest, InvocationContext } from '@azure/functions';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { CORRELATION_ID_HEADER } from '../src/correlation';
import { ErrorCode } from '../src/errors';
import { createHandler } from '../src/handler';

describe('file upload handler', () => {
  let mockContext: InvocationContext;

  beforeEach(() => {
    mockContext = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      invocationId: 'test-invocation-id',
    } as unknown as InvocationContext;
  });

  describe('multipart/form-data parsing', () => {
    it('should parse form data with file upload', async () => {
      // Create mock File
      const fileContent = Buffer.from('test file content');
      const mockFile = new File([fileContent], 'test.txt', { type: 'text/plain' });

      // Create mock FormData
      const mockFormData = new FormData();
      mockFormData.append('title', 'Test Document');
      mockFormData.append('description', 'A test file');
      mockFormData.append('file', mockFile);

      const mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/upload',
        headers: new Headers(),
        query: new URLSearchParams(),
        formData: vi.fn().mockResolvedValue(mockFormData),
      } as unknown as HttpRequest;

      const formDataSchema = z.object({
        title: z.string().min(1),
        description: z.string().optional(),
      });

      const handler = createHandler(
        async (_request, _context, { formData, files }) => {
          return {
            status: 200,
            jsonBody: {
              formData,
              fileCount: files?.length || 0,
              files: files?.map((f) => ({
                fieldName: f.fieldName,
                filename: f.filename,
                mimeType: f.mimeType,
                size: f.size,
              })),
            },
          };
        },
        { formDataSchema },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody.formData.title).toBe('Test Document');
      expect(response.jsonBody.formData.description).toBe('A test file');
      expect(response.jsonBody.fileCount).toBe(1);
      expect(response.jsonBody.files[0].filename).toBe('test.txt');
      expect(response.jsonBody.files[0].mimeType).toBe('text/plain');
      expect(response.jsonBody.files[0].size).toBe(fileContent.length);
    });

    it('should parse form data with multiple files', async () => {
      const file1Content = Buffer.from('file 1 content');
      const file2Content = Buffer.from('file 2 content');
      const mockFile1 = new File([file1Content], 'file1.txt', { type: 'text/plain' });
      const mockFile2 = new File([file2Content], 'file2.txt', { type: 'text/plain' });

      const mockFormData = new FormData();
      mockFormData.append('title', 'Multiple Files');
      mockFormData.append('file', mockFile1);
      mockFormData.append('file', mockFile2);

      const mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/upload',
        headers: new Headers(),
        query: new URLSearchParams(),
        formData: vi.fn().mockResolvedValue(mockFormData),
      } as unknown as HttpRequest;

      const formDataSchema = z.object({
        title: z.string(),
      });

      const handler = createHandler(
        async (_request, _context, { files }) => {
          return {
            status: 200,
            jsonBody: {
              fileCount: files?.length || 0,
              filenames: files?.map((f) => f.filename) || [],
            },
          };
        },
        { formDataSchema },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody.fileCount).toBe(2);
      expect(response.jsonBody.filenames).toContain('file1.txt');
      expect(response.jsonBody.filenames).toContain('file2.txt');
    });

    it('should handle form data without files', async () => {
      const mockFormData = new FormData();
      mockFormData.append('name', 'John Doe');
      mockFormData.append('email', 'john@example.com');

      const mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/submit',
        headers: new Headers(),
        query: new URLSearchParams(),
        formData: vi.fn().mockResolvedValue(mockFormData),
      } as unknown as HttpRequest;

      const formDataSchema = z.object({
        name: z.string(),
        email: z.string().email(),
      });

      const handler = createHandler(
        async (_request, _context, { formData, files }) => {
          return {
            status: 200,
            jsonBody: {
              formData,
              fileCount: files?.length || 0,
            },
          };
        },
        { formDataSchema },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody.formData.name).toBe('John Doe');
      expect(response.jsonBody.formData.email).toBe('john@example.com');
      expect(response.jsonBody.fileCount).toBe(0);
    });

    it('should validate form data schema', async () => {
      const mockFormData = new FormData();
      mockFormData.append('title', ''); // Empty title should fail validation

      const mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/upload',
        headers: new Headers(),
        query: new URLSearchParams(),
        formData: vi.fn().mockResolvedValue(mockFormData),
      } as unknown as HttpRequest;

      const formDataSchema = z.object({
        title: z.string().min(1),
        description: z.string().optional(),
      });

      const handler = createHandler(
        async (_request, _context, { formData }) => {
          return { status: 200, jsonBody: { formData } };
        },
        { formDataSchema },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(422);
      expect(response.jsonBody.error.code).toBe(ErrorCode.VALIDATION_ERROR);
    });

    it('should return 400 for invalid multipart data', async () => {
      const mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/upload',
        headers: new Headers(),
        query: new URLSearchParams(),
        formData: vi.fn().mockRejectedValue(new Error('Invalid multipart data')),
      } as unknown as HttpRequest;

      const formDataSchema = z.object({
        title: z.string(),
      });

      const handler = createHandler(
        async (_request, _context, { formData }) => {
          return { status: 200, jsonBody: { formData } };
        },
        { formDataSchema },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(400);
      expect(response.jsonBody.error.code).toBe(ErrorCode.BAD_REQUEST);
      expect(response.jsonBody.error.message).toContain('multipart/form-data');
    });

    it('should access file buffer content', async () => {
      const fileContent = Buffer.from('Hello, World!');
      const mockFile = new File([fileContent], 'hello.txt', { type: 'text/plain' });

      const mockFormData = new FormData();
      mockFormData.append('file', mockFile);

      const mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/upload',
        headers: new Headers(),
        query: new URLSearchParams(),
        formData: vi.fn().mockResolvedValue(mockFormData),
      } as unknown as HttpRequest;

      const formDataSchema = z.object({});

      const handler = createHandler(
        async (_request, _context, { files }) => {
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
        { formDataSchema },
      );

      const response = await handler(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody.content).toBe('Hello, World!');
      expect(response.jsonBody.size).toBe(fileContent.length);
    });

    it('should include correlation ID in response', async () => {
      const mockFormData = new FormData();
      mockFormData.append('field', 'value');

      const correlationId = 'test-correlation-123';
      const mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/upload',
        headers: new Headers({ [CORRELATION_ID_HEADER]: correlationId }),
        query: new URLSearchParams(),
        formData: vi.fn().mockResolvedValue(mockFormData),
      } as unknown as HttpRequest;

      const formDataSchema = z.object({
        field: z.string(),
      });

      const handler = createHandler(
        async () => {
          return { status: 200, jsonBody: {} };
        },
        { formDataSchema },
      );

      const response = await handler(mockRequest, mockContext);

      expect((response.headers as Record<string, string>)[CORRELATION_ID_HEADER]).toBe(correlationId);
    });
  });
});
