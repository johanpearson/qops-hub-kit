import { app } from '@azure/functions';
import { createHealthHandler } from '@qops/hub-kit';

/**
 * Health check endpoint
 * Returns 200 OK when the service is healthy
 */
app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: createHealthHandler(),
});
