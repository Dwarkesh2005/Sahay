import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/authMiddleware';

/**
 * GET /api/notifications - Get notifications for current user
 */
export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { page = '1', limit = '20', unread } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { user_id: req.user.user_id };
    if (unread === 'true') {
      where.is_read = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notifications.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.notifications.count({ where }),
      prisma.notifications.count({
        where: { user_id: req.user.user_id, is_read: false }
      })
    ]);

    res.status(200).json({
      notifications,
      unreadCount,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

/**
 * PATCH /api/notifications/:id/read - Mark notification as read
 */
export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const notifId = parseInt(req.params.id as string, 10);
    if (isNaN(notifId)) {
      res.status(400).json({ error: 'Invalid notification ID' });
      return;
    }

    const notification = await prisma.notifications.findUnique({
      where: { notification_id: notifId }
    });

    if (!notification) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    if (notification.user_id !== req.user.user_id) {
      res.status(403).json({ error: 'You cannot modify this notification' });
      return;
    }

    await prisma.notifications.update({
      where: { notification_id: notifId },
      data: { is_read: true }
    });

    res.status(200).json({ message: 'Notification marked as read' });
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
};

/**
 * PATCH /api/notifications/read-all - Mark all notifications as read
 */
export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    await prisma.notifications.updateMany({
      where: {
        user_id: req.user.user_id,
        is_read: false
      },
      data: { is_read: true }
    });

    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error: any) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
};

/**
 * GET /api/notifications/unread-count - Get unread notification count
 */
export const getUnreadCount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const count = await prisma.notifications.count({
      where: {
        user_id: req.user.user_id,
        is_read: false
      }
    });

    res.status(200).json({ unreadCount: count });
  } catch (error: any) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
};
