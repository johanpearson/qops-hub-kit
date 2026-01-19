import { app } from '@azure/functions';
import { createHandler, UserRole } from '@qops/hub-kit';
import { getUserProfile, getUserOrders, getUserNotifications } from '../services/backend.service.js';

/**
 * Get dashboard data
 * Aggregates data from multiple backend services and transforms it
 * into a format optimized for the dashboard UI
 */
const handler = createHandler(
  async (request, context, { user }) => {
    const userId = user.sub;
    context.log(`Fetching dashboard data for user: ${userId}`);

    // Fetch data from multiple backend services in parallel
    const [userProfile, allOrders, allNotifications] = await Promise.all([
      getUserProfile(userId, context),
      getUserOrders(userId, context, 100), // Get more orders for stats
      getUserNotifications(userId, context, false), // Get all notifications
    ]);

    // Calculate statistics
    const stats = {
      totalOrders: allOrders.length,
      pendingOrders: allOrders.filter((o) => o.status === 'pending').length,
      completedOrders: allOrders.filter((o) => o.status === 'completed').length,
      unreadNotifications: allNotifications.filter((n) => !n.read).length,
    };

    // Combine recent activity from orders and notifications
    const recentActivity = [
      ...allOrders.slice(0, 3).map((order) => ({
        type: 'order' as const,
        id: order.id,
        description: `Order ${order.status}: $${order.total}`,
        timestamp: order.createdAt,
      })),
      ...allNotifications.slice(0, 3).map((notif) => ({
        type: 'notification' as const,
        id: notif.id,
        description: notif.message,
        timestamp: notif.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);

    // Return transformed data optimized for dashboard
    return {
      status: 200,
      jsonBody: {
        user: {
          id: userProfile.id,
          name: userProfile.name,
          role: userProfile.role,
        },
        stats,
        recentActivity,
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

app.http('getDashboard', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'dashboard',
  handler,
});
