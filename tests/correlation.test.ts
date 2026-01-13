import { HttpRequest, InvocationContext } from '@azure/functions';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addCorrelationIdToContext,
  CORRELATION_ID_HEADER,
  getCorrelationId,
  getOrCreateCorrelationId,
} from '../src/correlation';

describe('correlation', () => {
  let mockRequest: HttpRequest;
  let mockContext: InvocationContext;

  beforeEach(() => {
    mockRequest = {
      headers: new Headers(),
    } as HttpRequest;

    mockContext = {
      log: vi.fn(),
    } as unknown as InvocationContext;
  });

  describe('getOrCreateCorrelationId', () => {
    it('should return existing correlation ID from header', () => {
      const existingId = 'existing-correlation-id';
      mockRequest.headers.set(CORRELATION_ID_HEADER, existingId);

      const correlationId = getOrCreateCorrelationId(mockRequest, mockContext);

      expect(correlationId).toBe(existingId);
      expect(mockContext.log).not.toHaveBeenCalled();
    });

    it('should generate new correlation ID when header is missing', () => {
      const correlationId = getOrCreateCorrelationId(mockRequest, mockContext);

      expect(correlationId).toBeTruthy();
      expect(typeof correlationId).toBe('string');
      expect(correlationId.length).toBeGreaterThan(0);
      expect(mockContext.log).toHaveBeenCalledWith(expect.stringContaining('Generated new correlation ID'));
    });

    it('should generate unique correlation IDs', () => {
      const id1 = getOrCreateCorrelationId(mockRequest, mockContext);
      const id2 = getOrCreateCorrelationId(mockRequest, mockContext);

      expect(id1).not.toBe(id2);
    });
  });

  describe('addCorrelationIdToContext and getCorrelationId', () => {
    it('should store and retrieve correlation ID from context', () => {
      const correlationId = 'test-correlation-123';

      addCorrelationIdToContext(mockContext, correlationId);
      const retrieved = getCorrelationId(mockContext);

      expect(retrieved).toBe(correlationId);
    });

    it('should return undefined when no correlation ID is set', () => {
      const retrieved = getCorrelationId(mockContext);

      expect(retrieved).toBeUndefined();
    });

    it('should overwrite existing correlation ID', () => {
      addCorrelationIdToContext(mockContext, 'first-id');
      addCorrelationIdToContext(mockContext, 'second-id');

      const retrieved = getCorrelationId(mockContext);

      expect(retrieved).toBe('second-id');
    });
  });
});
