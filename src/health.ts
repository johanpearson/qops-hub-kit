/**
 * Health check endpoint functionality
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { z } from 'zod';
import { getOrCreateCorrelationId, addCorrelationIdToContext, CORRELATION_ID_HEADER } from './correlation.js';

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: 'healthy';
  timestamp: string;
  uptime: number;
}

/**
 * Zod schema for health check response
 * Use this with OpenApiBuilder to document the health endpoint
 *
 * @example
 * ```typescript
 * builder.registerRoute({
 *   method: 'GET',
 *   path: '/api/health',
 *   summary: 'Health check',
 *   description: 'Check API health status',
 *   tags: ['Health'],
 *   responses: {
 *     200: {
 *       description: 'Service is healthy',
 *       schema: healthCheckResponseSchema,
 *     },
 *   },
 *   requiresAuth: false,
 * });
 * ```
 */
export const healthCheckResponseSchema = z.object({
  status: z.literal('healthy'),
  timestamp: z.string().describe('ISO 8601 timestamp'),
  uptime: z.number().describe('Process uptime in seconds'),
});

/**
 * Create a health check handler
 *
 * This handler provides a simple health check endpoint that returns:
 * - status: Always "healthy"
 * - timestamp: Current ISO 8601 timestamp
 * - uptime: Process uptime in seconds
 *
 * The handler is designed to be used out-of-the-box without any configuration.
 *
 * @returns Azure Function handler for health checks
 *
 * @example
 * ```typescript
 * import { app } from '@azure/functions';
 * import { createHealthHandler } from '@qops/hub-kit';
 *
 * app.http('health', {
 *   methods: ['GET'],
 *   authLevel: 'anonymous',
 *   route: 'health',
 *   handler: createHealthHandler(),
 * });
 * ```
 */
export function createHealthHandler() {
  return async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    // Add correlation ID for consistency with other handlers
    const correlationId = getOrCreateCorrelationId(request, context);
    addCorrelationIdToContext(context, correlationId);

    const healthResponse: HealthCheckResponse = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        [CORRELATION_ID_HEADER]: correlationId,
      },
      jsonBody: healthResponse,
    };
  };
}
