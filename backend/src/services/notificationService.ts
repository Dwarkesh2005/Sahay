import { prisma } from '../db';

interface NotificationData {
  userId: number;
  title: string;
  message: string;
  type: string;
  referenceId?: number;
  referenceType?: string;
}

/**
 * Creates a notification for a user.
 * Fails silently to avoid breaking the main request flow.
 */
export async function createNotification(data: NotificationData): Promise<void> {
  try {
    await prisma.notifications.create({
      data: {
        user_id: data.userId,
        title: data.title,
        message: data.message,
        type: data.type,
        reference_id: data.referenceId || null,
        reference_type: data.referenceType || null
      }
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
    // Notifications should never crash the main flow
  }
}

/**
 * Creates notifications for multiple users.
 */
export async function createNotifications(notifications: NotificationData[]): Promise<void> {
  try {
    await prisma.notifications.createMany({
      data: notifications.map(n => ({
        user_id: n.userId,
        title: n.title,
        message: n.message,
        type: n.type,
        reference_id: n.referenceId || null,
        reference_type: n.referenceType || null
      }))
    });
  } catch (error) {
    console.error('Failed to create batch notifications:', error);
  }
}

// ─── Notification Templates ─────────────────────────────────────

export async function notifyNgoNewRequest(ngoUserId: number, requestTitle: string, requestId: number): Promise<void> {
  await createNotification({
    userId: ngoUserId,
    title: 'New Help Request',
    message: `A new help request "${requestTitle}" has been sent to your NGO.`,
    type: 'NEW_REQUEST',
    referenceId: requestId,
    referenceType: 'help_request'
  });
}

export async function notifyMigrantAccepted(migrantUserId: number, ngoName: string, requestId: number): Promise<void> {
  await createNotification({
    userId: migrantUserId,
    title: 'Request Accepted! 🎉',
    message: `${ngoName} has accepted your help request. You can now chat with them.`,
    type: 'REQUEST_ACCEPTED',
    referenceId: requestId,
    referenceType: 'help_request'
  });
}

export async function notifyMigrantRejected(migrantUserId: number, ngoName: string, requestId: number): Promise<void> {
  await createNotification({
    userId: migrantUserId,
    title: 'NGO Declined Request',
    message: `${ngoName} was unable to accept your help request. Other NGOs may still respond.`,
    type: 'REQUEST_REJECTED',
    referenceId: requestId,
    referenceType: 'help_request'
  });
}

export async function notifyNgoReminder(ngoUserId: number, requestTitle: string, requestId: number): Promise<void> {
  await createNotification({
    userId: ngoUserId,
    title: 'Request Reminder',
    message: `Reminder: A migrant is still waiting for your response to "${requestTitle}".`,
    type: 'REMINDER',
    referenceId: requestId,
    referenceType: 'help_request'
  });
}

export async function notifyMigrantExpired(migrantUserId: number, requestTitle: string, requestId: number): Promise<void> {
  await createNotification({
    userId: migrantUserId,
    title: 'Request Expired',
    message: `Your help request "${requestTitle}" has expired. You can renew it to start a new cycle.`,
    type: 'REQUEST_EXPIRED',
    referenceId: requestId,
    referenceType: 'help_request'
  });
}

export async function notifyMigrantRenewed(migrantUserId: number, requestTitle: string, newRequestId: number): Promise<void> {
  await createNotification({
    userId: migrantUserId,
    title: 'Request Renewed',
    message: `Your help request "${requestTitle}" has been renewed for a new 7-day period. You can now select NGOs.`,
    type: 'REQUEST_RENEWED',
    referenceId: newRequestId,
    referenceType: 'help_request'
  });
}
