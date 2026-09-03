import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/authMiddleware';

/**
 * GET /api/chats - List chats for current user
 */
export const getChats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Get chats where user is either the request creator or the responder
    const chats = await prisma.chats.findMany({
      where: {
        OR: [
          { responder_id: req.user.user_id },
          {
            help_requests: {
              user_id: req.user.user_id
            }
          }
        ]
      },
      include: {
        help_requests: {
          select: {
            request_id: true,
            title: true,
            request_type: true,
            status: true,
            user_id: true,
            users: {
              select: {
                user_id: true,
                full_name: true,
                role: true
              }
            }
          }
        },
        users: {
          select: {
            user_id: true,
            full_name: true,
            role: true,
            ngos: {
              select: {
                ngo_id: true,
                ngo_name: true
              }
            }
          }
        },
        messages: {
          orderBy: { sent_at: 'desc' },
          take: 1,
          select: {
            message: true,
            sent_at: true,
            is_read: true,
            sender_id: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    res.status(200).json({ chats });
  } catch (error: any) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
};

/**
 * GET /api/chats/:chatId/messages - Get messages for a chat
 */
export const getMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const chatId = parseInt(req.params.chatId as string, 10);
    if (isNaN(chatId)) {
      res.status(400).json({ error: 'Invalid chat ID' });
      return;
    }

    // Verify user is part of this chat
    const chat = await prisma.chats.findUnique({
      where: { chat_id: chatId },
      include: {
        help_requests: {
          select: { user_id: true }
        }
      }
    });

    if (!chat) {
      res.status(404).json({ error: 'Chat not found' });
      return;
    }

    const isParticipant =
      chat.responder_id === req.user.user_id ||
      chat.help_requests.user_id === req.user.user_id ||
      req.user.role === 'ADMIN';

    if (!isParticipant) {
      res.status(403).json({ error: 'You are not a participant of this chat' });
      return;
    }

    const messages = await prisma.messages.findMany({
      where: { chat_id: chatId },
      include: {
        users: {
          select: {
            user_id: true,
            full_name: true,
            role: true
          }
        }
      },
      orderBy: { sent_at: 'asc' }
    });

    // Mark unread messages as read for current user
    await prisma.messages.updateMany({
      where: {
        chat_id: chatId,
        sender_id: { not: req.user.user_id },
        is_read: false
      },
      data: { is_read: true }
    });

    res.status(200).json({ messages });
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

/**
 * POST /api/chats/:chatId/messages - Send a message
 */
export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const chatId = parseInt(req.params.chatId as string, 10);
    if (isNaN(chatId)) {
      res.status(400).json({ error: 'Invalid chat ID' });
      return;
    }

    const { message } = req.body;
    if (!message || message.trim().length === 0) {
      res.status(400).json({ error: 'Message cannot be empty' });
      return;
    }

    // Verify user is part of this chat
    const chat = await prisma.chats.findUnique({
      where: { chat_id: chatId },
      include: {
        help_requests: {
          select: { user_id: true }
        }
      }
    });

    if (!chat) {
      res.status(404).json({ error: 'Chat not found' });
      return;
    }

    const isParticipant =
      chat.responder_id === req.user.user_id ||
      chat.help_requests.user_id === req.user.user_id;

    if (!isParticipant) {
      res.status(403).json({ error: 'You are not a participant of this chat' });
      return;
    }

    const newMessage = await prisma.messages.create({
      data: {
        chat_id: chatId,
        sender_id: req.user.user_id,
        message: message.trim()
      },
      include: {
        users: {
          select: {
            user_id: true,
            full_name: true,
            role: true
          }
        }
      }
    });

    res.status(201).json({ message: newMessage });
  } catch (error: any) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};
