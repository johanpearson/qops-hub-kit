import { app } from '@azure/functions';
import { createHealthHandler } from '@qops/hub-kit';

// Simple health check endpoint - no configuration needed!
app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: createHealthHandler(),
});
