import { describe, it, expect } from 'vitest';
import { getOrCreateCorrelationId, CORRELATION_ID_HEADER } from '../src/correlation';

describe('correlation', () => {
  describe('getOrCreateCorrelationId', () => {
    it('should extract correlation ID from header', () => {
      const request = {
        headers: {
          get: (key: string) => (key === CORRELATION_ID_HEADER ? 'existing-correlation-id' : null),
        },
      } as any;

      const context = {
        log: () => {},
      } as any;

      const correlationId = getOrCreateCorrelationId(request, context);
      expect(correlationId).toBe('existing-correlation-id');
    });

    it('should generate new correlation ID if not in header', () => {
      const request = {
        headers: {
          get: () => null,
        },
      } as any;

      const context = {
        log: () => {},
      } as any;

      const correlationId = getOrCreateCorrelationId(request, context);
      expect(correlationId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });
  });
});
