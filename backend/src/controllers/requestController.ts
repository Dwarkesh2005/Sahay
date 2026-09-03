import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/authMiddleware';

/**
 * POST /api/requests - Create a help request
 */
export const createRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { request_type, title, description, city_id, latitude, longitude } = req.body;

    // Validate required fields
    if (!request_type || !title || !description || !city_id) {
      res.status(400).json({
        error: 'request_type, title, description, and city_id are required'
      });
      return;
    }

    // Validate title length
    if (title.length < 5 || title.length > 150) {
      res.status(400).json({ error: 'Title must be between 5 and 150 characters' });
      return;
    }

    // Validate description length
    if (description.length < 10) {
      res.status(400).json({ error: 'Description must be at least 10 characters' });
      return;
    }

    // Validate request type
    const validTypes = ['FOOD', 'SHELTER', 'MEDICAL', 'EMPLOYMENT', 'GUIDANCE'];
    if (!validTypes.includes(request_type)) {
      res.status(400).json({ error: `Invalid request type. Must be one of: ${validTypes.join(', ')}` });
      return;
    }

    // Validate city exists
    const city = await prisma.cities.findUnique({ where: { city_id: parseInt(city_id, 10) } });
    if (!city) {
      res.status(400).json({ error: 'Invalid city_id' });
      return;
    }

    const helpRequest = await prisma.help_requests.create({
      data: {
        user_id: req.user.user_id,
        request_type: request_type as any,
        title,
        description,
        city_id: parseInt(city_id, 10),
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        status: 'PENDING'
      },
      include: {
        cities: true,
        users: {
          select: {
            user_id: true,
            full_name: true,
            email: true,
            role: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Help request created successfully',
      request: helpRequest
    });
  } catch (error: any) {
    console.error('Error creating request:', error);
    res.status(500).json({ error: 'Failed to create help request' });
  }
};

/**
 * GET /api/requests - List requests
 * Query params: my=true (user's own), status, type, city_id, page, limit
 * For NGO/VOLUNTEER role without my=true: Returns city feed matching their services
 */
export const getRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { my, status, type, city_id, page = '1', limit = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (my === 'true') {
      // User viewing their own requests
      where.user_id = req.user.user_id;
    } else if (req.user.role === 'NGO' || req.user.role === 'VOLUNTEER') {
      // NGO/Volunteer viewing city feed - show PENDING requests or requests they responded to
      const user = await prisma.users.findUnique({
        where: { user_id: req.user.user_id },
        select: { city_id: true }
      });
      if (user?.city_id) {
        where.city_id = user.city_id;
      }
    } else if (req.user.role === 'ADMIN') {
      // Admin can see all
    } else {
      // Regular users can only see their own
      where.user_id = req.user.user_id;
    }

    // Apply filters
    if (status && typeof status === 'string') {
      where.status = status as any;
    }
    if (type && typeof type === 'string') {
      where.request_type = type as any;
    }
    if (city_id && typeof city_id === 'string') {
      where.city_id = parseInt(city_id, 10);
    }

    const [requests, total] = await Promise.all([
      prisma.help_requests.findMany({
        where,
        include: {
          cities: true,
          users: {
            select: {
              user_id: true,
              full_name: true,
              role: true
            }
          },
          request_responses: {
            include: {
              users: {
                select: {
                  user_id: true,
                  full_name: true,
                  role: true,
                  ngos: {
                    select: {
                      ngo_id: true,
                      ngo_name: true,
                      verification_status: true
                    }
                  }
                }
              }
            },
            orderBy: { response_time: 'desc' }
          }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.help_requests.count({ where })
    ]);

    res.status(200).json({
      requests,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
};

/**
 * GET /api/requests/:id - Get single request details
 */
export const getRequestById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const requestId = parseInt(req.params.id as string, 10);
    if (isNaN(requestId)) {
      res.status(400).json({ error: 'Invalid request ID' });
      return;
    }

    const helpRequest = await prisma.help_requests.findUnique({
      where: { request_id: requestId },
      include: {
        cities: true,
        users: {
          select: {
            user_id: true,
            full_name: true,
            email: true,
            phone_number: true,
            role: true
          }
        },
        request_responses: {
          include: {
            users: {
              select: {
                user_id: true,
                full_name: true,
                role: true,
                ngos: {
                  select: {
                    ngo_id: true,
                    ngo_name: true,
                    verification_status: true,
                    phone_number: true,
                    email: true
                  }
                }
              }
            }
          },
          orderBy: { response_time: 'desc' }
        },
        chats: true
      }
    });

    if (!helpRequest) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    // Authorization: user can see own, NGO/volunteer can see city requests, admin can see all
    const isOwner = helpRequest.user_id === req.user.user_id;
    const isResponder = helpRequest.request_responses.some(
      (r) => r.responder_id === req.user!.user_id
    );
    const isAdmin = req.user.role === 'ADMIN';
    const isNgoOrVolunteer = req.user.role === 'NGO' || req.user.role === 'VOLUNTEER';

    if (!isOwner && !isResponder && !isAdmin && !isNgoOrVolunteer) {
      res.status(403).json({ error: 'You do not have permission to view this request' });
      return;
    }

    res.status(200).json({ request: helpRequest });
  } catch (error: any) {
    console.error('Error fetching request:', error);
    res.status(500).json({ error: 'Failed to fetch request details' });
  }
};

/**
 * POST /api/requests/:id/respond - NGO/Volunteer responds to a request
 */
export const respondToRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const requestId = parseInt(req.params.id as string, 10);
    if (isNaN(requestId)) {
      res.status(400).json({ error: 'Invalid request ID' });
      return;
    }

    const { response_message } = req.body;
    if (!response_message || response_message.trim().length < 5) {
      res.status(400).json({ error: 'Response message must be at least 5 characters' });
      return;
    }

    // Verify request exists and is pending
    const helpRequest = await prisma.help_requests.findUnique({
      where: { request_id: requestId }
    });

    if (!helpRequest) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    if (helpRequest.status !== 'PENDING') {
      res.status(400).json({ error: 'Can only respond to PENDING requests' });
      return;
    }

    // Cannot respond to own request
    if (helpRequest.user_id === req.user.user_id) {
      res.status(400).json({ error: 'Cannot respond to your own request' });
      return;
    }

    // Check if already responded
    const existingResponse = await prisma.request_responses.findUnique({
      where: {
        request_id_responder_id: {
          request_id: requestId,
          responder_id: req.user.user_id
        }
      }
    });

    if (existingResponse) {
      res.status(409).json({ error: 'You have already responded to this request' });
      return;
    }

    // Create response and update request status in transaction
    const result = await prisma.$transaction(async (tx) => {
      const response = await tx.request_responses.create({
        data: {
          request_id: requestId,
          responder_id: req.user!.user_id,
          response_message: response_message.trim(),
          status: 'ACCEPTED'
        }
      });

      // Update request status to ACCEPTED
      await tx.help_requests.update({
        where: { request_id: requestId },
        data: {
          status: 'ACCEPTED',
          updated_at: new Date()
        }
      });

      // Create a chat channel between requester and responder
      const chat = await tx.chats.create({
        data: {
          request_id: requestId,
          responder_id: req.user!.user_id
        }
      });

      // Add initial message
      await tx.messages.create({
        data: {
          chat_id: chat.chat_id,
          sender_id: req.user!.user_id,
          message: response_message.trim()
        }
      });

      return { response, chat };
    });

    res.status(201).json({
      message: 'Request accepted successfully',
      response: result.response,
      chat_id: result.chat.chat_id
    });
  } catch (error: any) {
    console.error('Error responding to request:', error);
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'You have already responded to this request' });
    } else {
      res.status(500).json({ error: 'Failed to respond to request' });
    }
  }
};

/**
 * PATCH /api/requests/:id/status - Update request status
 * Body: { status: 'ACCEPTED' | 'COMPLETED' | 'CANCELLED' }
 */
export const updateRequestStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const requestId = parseInt(req.params.id as string, 10);
    if (isNaN(requestId)) {
      res.status(400).json({ error: 'Invalid request ID' });
      return;
    }

    const { status } = req.body;
    const validStatuses = ['ACCEPTED', 'COMPLETED', 'CANCELLED'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    const helpRequest = await prisma.help_requests.findUnique({
      where: { request_id: requestId },
      include: { request_responses: true }
    });

    if (!helpRequest) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    // Authorization checks
    const isOwner = helpRequest.user_id === req.user.user_id;
    const isResponder = helpRequest.request_responses.some(
      (r) => r.responder_id === req.user!.user_id
    );
    const isAdmin = req.user.role === 'ADMIN';

    // Only owner can cancel their pending request
    if (status === 'CANCELLED') {
      if (!isOwner && !isAdmin) {
        res.status(403).json({ error: 'Only the request creator or admin can cancel a request' });
        return;
      }
      if (helpRequest.status === 'COMPLETED') {
        res.status(400).json({ error: 'Cannot cancel a completed request' });
        return;
      }
    }

    // Only responder (NGO/Volunteer) or admin can mark as COMPLETED
    if (status === 'COMPLETED') {
      if (!isResponder && !isAdmin) {
        res.status(403).json({ error: 'Only the assigned NGO/volunteer or admin can complete a request' });
        return;
      }
      if (helpRequest.status !== 'ACCEPTED') {
        res.status(400).json({ error: 'Can only complete an ACCEPTED request' });
        return;
      }
    }

    // Only responder or admin can move to ACCEPTED
    if (status === 'ACCEPTED') {
      if (!isResponder && !isAdmin) {
        res.status(403).json({ error: 'Only the responder or admin can accept a request' });
        return;
      }
    }

    const updated = await prisma.help_requests.update({
      where: { request_id: requestId },
      data: {
        status: status as any,
        updated_at: new Date()
      },
      include: {
        cities: true,
        users: {
          select: {
            user_id: true,
            full_name: true,
            role: true
          }
        },
        request_responses: {
          include: {
            users: {
              select: {
                user_id: true,
                full_name: true,
                ngos: {
                  select: { ngo_id: true, ngo_name: true }
                }
              }
            }
          }
        }
      }
    });

    res.status(200).json({
      message: `Request status updated to ${status}`,
      request: updated
    });
  } catch (error: any) {
    console.error('Error updating request status:', error);
    res.status(500).json({ error: 'Failed to update request status' });
  }
};
