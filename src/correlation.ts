import { HttpRequest, InvocationContext } from '@azure/functions';
import { v4 as uuidv4 } from 'uuid';

/**
 * Context key for storing correlation ID
 */
export const CORRELATION_ID_KEY = 'x-correlation-id';
export const CORRELATION_ID_HEADER = 'x-correlation-id';

/**
 * Get or create a correlation ID for the request
 * 
 * @param request - The HTTP request
 * @param context - The invocation context
 * @returns The correlation ID
 */
export function getOrCreateCorrelationId(
  request: HttpRequest,
  context: InvocationContext
): string {
  // Try to get from header
  const headerValue = request.headers.get(CORRELATION_ID_HEADER);
  if (headerValue) {
    return headerValue;
  }

  // Generate new correlation ID
  const correlationId = uuidv4();
  context.log(`Generated new correlation ID: ${correlationId}`);
  return correlationId;
}

/**
 * Add correlation ID to context for logging
 * 
 * @param context - The invocation context
 * @param correlationId - The correlation ID
 */
export function addCorrelationIdToContext(
  context: InvocationContext,
  correlationId: string
): void {
  // Store in context for access by other middleware
  (context as any)[CORRELATION_ID_KEY] = correlationId;
}

/**
 * Get correlation ID from context
 * 
 * @param context - The invocation context
 * @returns The correlation ID or undefined
 */
export function getCorrelationId(context: InvocationContext): string | undefined {
  return (context as any)[CORRELATION_ID_KEY];
}
