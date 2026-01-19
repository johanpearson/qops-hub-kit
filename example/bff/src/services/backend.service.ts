import type { InvocationContext } from '@azure/functions';

/**
 * User service - simulates calling a separate Azure Function
 * In production, this would make HTTP calls to the actual user service
 */
export async function getUserProfile(userId: string, context: InvocationContext) {
  context.log(`[UserService] Fetching profile for user: ${userId}`);

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In production:
  // const response = await fetch(`${process.env.USER_SERVICE_URL}/users/${userId}`, {
  //   headers: { 'Authorization': `Bearer ${token}` }
  // });
  // return response.json();

  // Mock data for demonstration
  return {
    id: userId,
    email: 'user@example.com',
    name: 'John Doe',
    role: 'member' as const,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Order service - simulates calling a separate Azure Function
 * In production, this would make HTTP calls to the actual order service
 */
export async function getUserOrders(userId: string, context: InvocationContext, limit = 5) {
  context.log(`[OrderService] Fetching orders for user: ${userId}, limit: ${limit}`);

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 150));

  // In production:
  // const response = await fetch(`${process.env.ORDER_SERVICE_URL}/orders?userId=${userId}&limit=${limit}`, {
  //   headers: { 'Authorization': `Bearer ${token}` }
  // });
  // return response.json();

  // Mock data for demonstration
  return [
    {
      id: 'order-1',
      userId,
      status: 'completed' as const,
      total: 99.99,
      items: [
        {
          productId: 'prod-1',
          name: 'Product 1',
          quantity: 2,
          price: 49.99,
        },
      ],
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'order-2',
      userId,
      status: 'pending' as const,
      total: 149.99,
      items: [
        {
          productId: 'prod-2',
          name: 'Product 2',
          quantity: 1,
          price: 149.99,
        },
      ],
      createdAt: new Date().toISOString(),
    },
  ];
}

/**
 * Notification service - simulates calling a separate Azure Function
 * In production, this would make HTTP calls to the actual notification service
 */
export async function getUserNotifications(userId: string, context: InvocationContext, unreadOnly = false) {
  context.log(`[NotificationService] Fetching notifications for user: ${userId}, unreadOnly: ${unreadOnly}`);

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 120));

  // In production:
  // const response = await fetch(
  //   `${process.env.NOTIFICATION_SERVICE_URL}/notifications?userId=${userId}&unreadOnly=${unreadOnly}`,
  //   { headers: { 'Authorization': `Bearer ${token}` } }
  // );
  // return response.json();

  // Mock data for demonstration
  const allNotifications = [
    {
      id: 'notif-1',
      userId,
      type: 'success' as const,
      message: 'Your order has been shipped!',
      read: false,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'notif-2',
      userId,
      type: 'info' as const,
      message: 'New features are available',
      read: false,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: 'notif-3',
      userId,
      type: 'warning' as const,
      message: 'Payment method expiring soon',
      read: true,
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
  ];

  return unreadOnly ? allNotifications.filter((n) => !n.read) : allNotifications;
}
