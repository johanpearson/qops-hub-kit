import { z } from '@qops/hub-kit';

/**
 * User profile schema from user service
 */
export const userProfileSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(['admin', 'member']),
  createdAt: z.string(),
});

/**
 * Order schema from order service
 */
export const orderSchema = z.object({
  id: z.string(),
  userId: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'cancelled']),
  total: z.number(),
  items: z.array(
    z.object({
      productId: z.string(),
      name: z.string(),
      quantity: z.number(),
      price: z.number(),
    }),
  ),
  createdAt: z.string(),
});

/**
 * Notification schema from notification service
 */
export const notificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.enum(['info', 'warning', 'error', 'success']),
  message: z.string(),
  read: z.boolean(),
  createdAt: z.string(),
});

/**
 * Aggregated user profile response (BFF combines multiple services)
 */
export const aggregatedUserProfileSchema = z.object({
  user: userProfileSchema,
  recentOrders: z.array(orderSchema),
  unreadNotifications: z.array(notificationSchema),
});

/**
 * Dashboard data schema (aggregated from multiple services)
 */
export const dashboardDataSchema = z.object({
  user: userProfileSchema.pick({ id: true, name: true, role: true }),
  stats: z.object({
    totalOrders: z.number(),
    pendingOrders: z.number(),
    completedOrders: z.number(),
    unreadNotifications: z.number(),
  }),
  recentActivity: z.array(
    z.object({
      type: z.enum(['order', 'notification']),
      id: z.string(),
      description: z.string(),
      timestamp: z.string(),
    }),
  ),
});
