import { app } from '@azure/functions';
import { createHandler, UserRole } from '@qops/hub-kit';
import { getUserProfile, getUserOrders, getUserNotifications } from '../services/backend.service.js';

/**
 * Get aggregated user profile
 * Combines data from multiple backend services:
 * - User service (profile data)
 * - Order service (recent orders)
 * - Notification service (unread notifications)
 */
const handler = createHandler(
  async (request, context, { user }) => {
    // With jwtConfig and requiredRoles, user and user.sub are guaranteed to be present
    const userId = user!.sub!;
    context.log(`Fetching aggregated profile for user: ${userId}`);

    // Call multiple backend services in parallel for better performance
    const [userProfile, recentOrders, unreadNotifications] = await Promise.all([
      getUserProfile(userId, context),
      getUserOrders(userId, context, 5),
      getUserNotifications(userId, context, true),
    ]);

    // Transform and combine data for frontend
    return {
      status: 200,
      jsonBody: {
        user: userProfile,
        recentOrders,
        unreadNotifications,
      },
    };
  },
  {
    // Require JWT authentication
    jwtConfig: {
      secret: process.env.JWT_SECRET || 'dev-secret-key-change-in-production',
    },
    // Allow both admin and member roles
    requiredRoles: [UserRole.ADMIN, UserRole.MEMBER],
    enableLogging: true,
  },
);

app.http('getUserProfile', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'profile',
  handler,
});
