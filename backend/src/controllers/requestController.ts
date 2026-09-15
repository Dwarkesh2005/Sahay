import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/authMiddleware';
import { getRecommendations } from '../services/recommendationService';

/**
 * Auto-expires pending requests that have passed their 7-day expires_at.
 * Synchronously marks the need as EXPIRED and all of its PENDING NGO requests as EXPIRED.
 */
export const autoExpirePendingRequests = async (): Promise<number> => {
  try {
    const now = new Date();
    const expiredRequests = await prisma.help_requests.findMany({
      where: {
        status: 'PENDING',
        expires_at: {
          lte: now
        }
      },
      select: { request_id: true }
    });

    if (expiredRequests.length === 0) return 0;

    const expiredIds = expiredRequests.map((r) => r.request_id);

    await prisma.$transaction([
      prisma.help_requests.updateMany({
        where: { request_id: { in: expiredIds } },
        data: { status: 'EXPIRED' }
      }),
      prisma.need_ngo_requests.updateMany({
        where: {
          need_id: { in: expiredIds },
          status: 'PENDING'
        },
        data: { status: 'EXPIRED' }
      })
    ]);

    return expiredIds.length;
  } catch (error) {
    console.error('Error auto-expiring requests:', error);
    return 0;
  }
};

/**
 * Enriches a help request with reminder metadata, time remaining, and NGO response summary.
 */
function enrichRequestMetadata(req: any) {
  const now = Date.now();
  const expiresAt = req.expires_at ? new Date(req.expires_at).getTime() : null;
  const isExpired = req.status === 'EXPIRED' || (expiresAt !== null && expiresAt <= now && req.status === 'PENDING');
  const isCompleted = req.status === 'COMPLETED' || req.status === 'ACCEPTED';

  // 24-hour reminder rule
  const lastReminder = req.last_reminder_at ? new Date(req.last_reminder_at).getTime() : null;
  const REMINDER_COOLDOWN_MS = 24 * 60 * 60 * 1000;
  let canRemind = false;
  let nextReminderAt: string | null = null;
  let remainingReminderCooldownSeconds = 0;

  if (req.status === 'PENDING' && !isExpired && !req.accepted_ngo_id) {
    if (!lastReminder) {
      canRemind = true;
    } else {
      const elapsed = now - lastReminder;
      if (elapsed >= REMINDER_COOLDOWN_MS) {
        canRemind = true;
      } else {
        const nextTime = lastReminder + REMINDER_COOLDOWN_MS;
        nextReminderAt = new Date(nextTime).toISOString();
        remainingReminderCooldownSeconds = Math.max(0, Math.ceil((nextTime - now) / 1000));
      }
    }
  }

  // NGO responses stats
  const ngoRequests = req.need_ngo_requests || [];
  const contactedCount = ngoRequests.length;
  const acceptedCount = ngoRequests.filter((r: any) => r.status === 'ACCEPTED').length;
  const rejectedCount = ngoRequests.filter((r: any) => r.status === 'REJECTED').length;
  const pendingCount = ngoRequests.filter((r: any) => r.status === 'PENDING').length;
  const cancelledCount = ngoRequests.filter((r: any) => r.status === 'CANCELLED').length;
  const expiredCount = ngoRequests.filter((r: any) => r.status === 'EXPIRED').length;

  // Days/Hours remaining
  let remainingSeconds = 0;
  if (expiresAt && !isExpired && !isCompleted) {
    remainingSeconds = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  }

  return {
    ...req,
    status: isExpired && req.status === 'PENDING' ? 'EXPIRED' : req.status,
    is_expired: isExpired,
    remaining_seconds: remainingSeconds,
    can_remind: canRemind && pendingCount > 0,
    next_reminder_at: nextReminderAt,
    remaining_reminder_cooldown_seconds: remainingReminderCooldownSeconds,
    stats: {
      contacted: contactedCount,
      accepted: acceptedCount,
      rejected: rejectedCount,
      pending: pendingCount,
      cancelled: cancelledCount,
      expired: expiredCount
    }
  };
}

/**
 * POST /api/requests - Create a help request
 * Initializes 7-day validity period (expires_at = now + 7 days)
 */
export const createRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { request_type, title, description, city_id, latitude, longitude, urgency } = req.body;

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

    // Validate urgency if provided
    const validUrgencies = ['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'];
    const urgencyLevel = urgency && validUrgencies.includes(urgency.toUpperCase())
      ? urgency.toUpperCase()
      : 'MEDIUM';

    // Validate city exists
    const city = await prisma.cities.findUnique({ where: { city_id: parseInt(city_id, 10) } });
    if (!city) {
      res.status(400).json({ error: 'Invalid city_id' });
      return;
    }

    // Calculate authoritative 7-day expiration date
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const helpRequest = await prisma.help_requests.create({
      data: {
        user_id: req.user.user_id,
        request_type: request_type as any,
        title,
        description,
        city_id: parseInt(city_id, 10),
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        urgency: urgencyLevel,
        status: 'PENDING',
        created_at: now,
        expires_at: expiresAt,
        renewal_number: 0
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
        },
        need_ngo_requests: {
          include: { ngo: true }
        }
      }
    });

    res.status(201).json({
      message: 'Help request created successfully',
      request: enrichRequestMetadata(helpRequest)
    });
  } catch (error: any) {
    console.error('Error creating request:', error);
    res.status(500).json({ error: 'Failed to create help request' });
  }
};

/**
 * GET /api/requests - List requests
 */
export const getRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Run auto-expire check to guarantee consistency
    await autoExpirePendingRequests();

    const { my, status, type, city_id, page = '1', limit = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (my === 'true') {
      where.user_id = req.user.user_id;
    } else if (req.user.role === 'NGO' || req.user.role === 'VOLUNTEER') {
      const user = await prisma.users.findUnique({
        where: { user_id: req.user.user_id },
        select: { city_id: true }
      });
      if (user?.city_id) {
        where.city_id = user.city_id;
      }
    } else if (req.user.role === 'ADMIN') {
      // Admin sees all
    } else {
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
          accepted_ngo: {
            select: {
              ngo_id: true,
              ngo_name: true,
              phone_number: true,
              email: true,
              address: true,
              verification_status: true
            }
          },
          parent_request: {
            select: {
              request_id: true,
              title: true,
              created_at: true
            }
          },
          need_ngo_requests: {
            include: {
              ngo: {
                select: {
                  ngo_id: true,
                  ngo_name: true,
                  verification_status: true,
                  city_id: true,
                  phone_number: true,
                  email: true
                }
              }
            },
            orderBy: { sent_at: 'desc' }
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
          },
          chats: true
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.help_requests.count({ where })
    ]);

    const enrichedRequests = requests.map(enrichRequestMetadata);

    res.status(200).json({
      requests: enrichedRequests,
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

    await autoExpirePendingRequests();

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
        accepted_ngo: true,
        parent_request: {
          select: {
            request_id: true,
            title: true,
            created_at: true,
            renewal_number: true
          }
        },
        renewed_requests: {
          select: {
            request_id: true,
            title: true,
            status: true,
            created_at: true,
            renewal_number: true
          },
          orderBy: { created_at: 'desc' }
        },
        need_ngo_requests: {
          include: {
            ngo: {
              select: {
                ngo_id: true,
                ngo_name: true,
                phone_number: true,
                email: true,
                verification_status: true,
                address: true,
                cities: true
              }
            }
          },
          orderBy: { sent_at: 'desc' }
        },
        request_responses: {
          include: {
            users: {
              select: {
                user_id: true,
                full_name: true,
                role: true,
                ngos: true
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

    // Authorization
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

    res.status(200).json({ request: enrichRequestMetadata(helpRequest) });
  } catch (error: any) {
    console.error('Error fetching request:', error);
    res.status(500).json({ error: 'Failed to fetch request details' });
  }
};

/**
 * POST /api/requests/:id/send-requests
 * Sends the help request to either:
 * - Option A: One specific suggested NGO (mode: 'SINGLE', ngo_id: number)
 * - Option B: All recommended NGOs for this need (mode: 'ALL')
 */
export const sendNeedRequests = async (req: AuthRequest, res: Response): Promise<void> => {
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

    await autoExpirePendingRequests();

    const helpRequest = await prisma.help_requests.findUnique({
      where: { request_id: requestId }
    });

    if (!helpRequest) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    // Must be request owner or admin
    if (helpRequest.user_id !== req.user.user_id && req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Only the request creator can send requests to NGOs' });
      return;
    }

    // Check request status
    if (helpRequest.status !== 'PENDING') {
      res.status(400).json({
        error: `Cannot send requests for a need in status ${helpRequest.status}`
      });
      return;
    }

    if (helpRequest.expires_at && new Date(helpRequest.expires_at) <= new Date()) {
      res.status(400).json({ error: 'This request has expired and cannot be sent to NGOs. Please renew it.' });
      return;
    }

    const { mode, ngo_id, ngo_ids } = req.body;
    let targetNgoIds: number[] = [];

    if (mode === 'SINGLE' || (ngo_id && !mode)) {
      const selectedId = parseInt(ngo_id, 10);
      if (isNaN(selectedId)) {
        res.status(400).json({ error: 'Valid ngo_id is required for SINGLE mode' });
        return;
      }
      // Verify NGO exists
      const ngo = await prisma.ngos.findUnique({ where: { ngo_id: selectedId } });
      if (!ngo) {
        res.status(404).json({ error: 'Selected NGO does not exist' });
        return;
      }
      targetNgoIds = [selectedId];
    } else if (mode === 'ALL') {
      // Calculate recommendations specifically for this need
      const { recommendations } = await getRecommendations(requestId, helpRequest.user_id);
      if (recommendations && recommendations.length > 0) {
        targetNgoIds = recommendations.map((r) => r.ngoId);
      } else {
        // Fallback: If no strict recommendation match, suggest active NGOs in the same city
        const cityNgos = await prisma.ngos.findMany({
          where: { city_id: helpRequest.city_id },
          take: 5,
          select: { ngo_id: true }
        });
        targetNgoIds = cityNgos.map((n) => n.ngo_id);
      }

      if (targetNgoIds.length === 0) {
        res.status(400).json({
          error: 'No recommended NGOs found to send request to. You can browse and select an NGO directly.'
        });
        return;
      }
    } else if (Array.isArray(ngo_ids) && ngo_ids.length > 0) {
      targetNgoIds = ngo_ids.map((id: any) => parseInt(id, 10)).filter((id: number) => !isNaN(id));
    } else {
      res.status(400).json({
        error: "Please specify mode: 'SINGLE' (with ngo_id) or mode: 'ALL'"
      });
      return;
    }

    const createdRequests: any[] = [];
    for (const nId of targetNgoIds) {
      const reqRecord = await prisma.need_ngo_requests.upsert({
        where: {
          need_id_ngo_id: {
            need_id: requestId,
            ngo_id: nId
          }
        },
        update: {
          status: 'PENDING',
          sent_at: new Date()
        },
        create: {
          need_id: requestId,
          ngo_id: nId,
          status: 'PENDING',
          sent_at: new Date()
        },
        include: {
          ngo: {
            select: {
              ngo_id: true,
              ngo_name: true,
              verification_status: true
            }
          }
        }
      });
      createdRequests.push(reqRecord);
    }

    res.status(200).json({
      message: `Request successfully sent to ${createdRequests.length} NGO(s)`,
      count: createdRequests.length,
      mode: mode || 'SINGLE',
      requests: createdRequests
    });
  } catch (error: any) {
    console.error('Error sending need requests:', error);
    res.status(500).json({ error: 'Failed to send request to NGOs' });
  }
};

/**
 * GET /api/requests/:id/reminder-status
 * Checks whether the migrant can remind NGOs (enforcing max 1 per 24 hours).
 */
export const getReminderStatus = async (req: AuthRequest, res: Response): Promise<void> => {
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

    await autoExpirePendingRequests();

    const helpRequest = await prisma.help_requests.findUnique({
      where: { request_id: requestId },
      include: {
        need_ngo_requests: {
          where: { status: 'PENDING' }
        }
      }
    });

    if (!helpRequest) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    const now = Date.now();
    const expiresAt = helpRequest.expires_at ? new Date(helpRequest.expires_at).getTime() : null;
    const isExpired = helpRequest.status === 'EXPIRED' || (expiresAt !== null && expiresAt <= now);
    const isAccepted = helpRequest.status === 'COMPLETED' || helpRequest.status === 'ACCEPTED' || !!helpRequest.accepted_ngo_id;
    const pendingCount = helpRequest.need_ngo_requests.length;

    const REMINDER_COOLDOWN_MS = 24 * 60 * 60 * 1000;
    const lastReminder = helpRequest.last_reminder_at
      ? new Date(helpRequest.last_reminder_at).getTime()
      : null;

    let canRemind = false;
    let nextReminderAt: string | null = null;
    let reason = '';

    if (isAccepted) {
      reason = 'Request has already been accepted. Reminders are no longer available.';
    } else if (isExpired) {
      reason = 'Request has expired. You can renew the request instead.';
    } else if (helpRequest.status !== 'PENDING') {
      reason = `Request is ${helpRequest.status}. Reminders are not available.`;
    } else if (pendingCount === 0) {
      reason = 'No pending NGO requests to remind.';
    } else if (lastReminder && now - lastReminder < REMINDER_COOLDOWN_MS) {
      const nextTime = lastReminder + REMINDER_COOLDOWN_MS;
      nextReminderAt = new Date(nextTime).toISOString();
      canRemind = false;
      reason = 'You can send another reminder after 24 hours.';
    } else {
      canRemind = true;
    }

    res.status(200).json({
      canRemind,
      nextReminderAt,
      lastReminderAt: helpRequest.last_reminder_at,
      reminderCount: helpRequest.reminder_count,
      pendingCount,
      reason
    });
  } catch (error: any) {
    console.error('Error fetching reminder status:', error);
    res.status(500).json({ error: 'Failed to fetch reminder status' });
  }
};

/**
 * POST /api/requests/:id/remind
 * Sends a reminder to all NGOs whose request status is PENDING.
 * Strictly enforces backend 24-hour rate limit.
 */
export const remindNgos = async (req: AuthRequest, res: Response): Promise<void> => {
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

    await autoExpirePendingRequests();

    const helpRequest = await prisma.help_requests.findUnique({
      where: { request_id: requestId },
      include: {
        need_ngo_requests: {
          where: { status: 'PENDING' }
        }
      }
    });

    if (!helpRequest) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    // Authorization
    if (helpRequest.user_id !== req.user.user_id && req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Only the request creator can send reminders' });
      return;
    }

    // Rules check
    if (helpRequest.status !== 'PENDING') {
      res.status(400).json({
        error: helpRequest.status === 'ACCEPTED' || helpRequest.status === 'COMPLETED'
          ? 'Request accepted. Reminders are no longer available.'
          : `Cannot remind for request in ${helpRequest.status} state.`
      });
      return;
    }

    if (helpRequest.expires_at && new Date(helpRequest.expires_at) <= new Date()) {
      res.status(400).json({
        error: 'Request expired. Reminders cannot be sent. Please renew the request.'
      });
      return;
    }

    if (helpRequest.accepted_ngo_id) {
      res.status(400).json({
        error: 'Request already accepted by an NGO. Reminders are no longer available.'
      });
      return;
    }

    const pendingRequests = helpRequest.need_ngo_requests;
    if (pendingRequests.length === 0) {
      res.status(400).json({
        error: 'No pending NGO requests available to remind.'
      });
      return;
    }

    // Enforce 24-hour frequency: NOW - last_reminder_at >= 24 hours
    const now = new Date();
    const REMINDER_COOLDOWN_MS = 24 * 60 * 60 * 1000;

    if (helpRequest.last_reminder_at) {
      const elapsed = now.getTime() - new Date(helpRequest.last_reminder_at).getTime();
      if (elapsed < REMINDER_COOLDOWN_MS) {
        const nextTime = new Date(new Date(helpRequest.last_reminder_at).getTime() + REMINDER_COOLDOWN_MS);
        res.status(400).json({
          error: 'You can send another reminder after 24 hours.',
          canRemind: false,
          nextReminderAt: nextTime.toISOString()
        });
        return;
      }
    }

    // Atomic update in transaction
    await prisma.$transaction([
      prisma.help_requests.update({
        where: { request_id: requestId },
        data: {
          last_reminder_at: now,
          reminder_count: { increment: 1 }
        }
      }),
      prisma.need_ngo_requests.updateMany({
        where: {
          need_id: requestId,
          status: 'PENDING'
        },
        data: {
          last_reminder_at: now,
          reminder_count: { increment: 1 }
        }
      })
    ]);

    const nextReminderAt = new Date(now.getTime() + REMINDER_COOLDOWN_MS).toISOString();

    res.status(200).json({
      success: true,
      message: `Reminder sent to ${pendingRequests.length} pending NGO(s)`,
      remindedCount: pendingRequests.length,
      nextReminderAt,
      reminderCount: (helpRequest.reminder_count || 0) + 1
    });
  } catch (error: any) {
    console.error('Error sending reminder:', error);
    res.status(500).json({ error: 'Failed to send reminders' });
  }
};

/**
 * POST /api/requests/:id/renew
 * Renews an expired request by creating a new active request cycle linked to the original.
 * Starts a new 7-day validity period, resets reminder cooldown, and allows selecting NGOs again.
 */
export const renewRequest = async (req: AuthRequest, res: Response): Promise<void> => {
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

    await autoExpirePendingRequests();

    const originalRequest = await prisma.help_requests.findUnique({
      where: { request_id: requestId }
    });

    if (!originalRequest) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    // Authorization
    if (originalRequest.user_id !== req.user.user_id && req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Only the request creator can renew this request' });
      return;
    }

    // Verify it is expired
    const isPastExpiry = originalRequest.expires_at && new Date(originalRequest.expires_at) <= new Date();
    if (originalRequest.status !== 'EXPIRED' && !isPastExpiry) {
      res.status(400).json({ error: 'Only expired requests can be renewed.' });
      return;
    }

    // Ensure original is explicitly marked EXPIRED if not already
    if (originalRequest.status !== 'EXPIRED') {
      await prisma.help_requests.update({
        where: { request_id: requestId },
        data: { status: 'EXPIRED' }
      });
    }

    // Create new request cycle linked to original
    const now = new Date();
    const newExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const newRenewalNumber = (originalRequest.renewal_number || 0) + 1;

    const renewedRequest = await prisma.help_requests.create({
      data: {
        user_id: originalRequest.user_id,
        request_type: originalRequest.request_type,
        title: originalRequest.title,
        description: originalRequest.description,
        city_id: originalRequest.city_id,
        latitude: originalRequest.latitude,
        longitude: originalRequest.longitude,
        urgency: originalRequest.urgency || 'MEDIUM',
        status: 'PENDING',
        created_at: now,
        expires_at: newExpiresAt,
        parent_request_id: originalRequest.request_id,
        renewal_number: newRenewalNumber,
        last_reminder_at: null,
        reminder_count: 0
      },
      include: {
        cities: true,
        parent_request: {
          select: {
            request_id: true,
            title: true,
            renewal_number: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Request renewed successfully. You can now select NGOs for the new 7-day period.',
      request: enrichRequestMetadata(renewedRequest)
    });
  } catch (error: any) {
    console.error('Error renewing request:', error);
    res.status(500).json({ error: 'Failed to renew request' });
  }
};

/**
 * GET /api/requests/ngo/incoming
 * Retrieves incoming requests sent to the authenticated NGO with status filter.
 */
export const getNgoIncomingRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    await autoExpirePendingRequests();

    // Find NGO associated with user
    const ngo = await prisma.ngos.findUnique({
      where: { user_id: req.user.user_id }
    });

    if (!ngo && req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'NGO profile required' });
      return;
    }

    const { status } = req.query;
    const where: any = {};

    if (ngo) {
      where.ngo_id = ngo.ngo_id;
    }

    if (status && typeof status === 'string' && status !== 'ALL') {
      where.status = status as any;
    }

    const incoming = await prisma.need_ngo_requests.findMany({
      where,
      include: {
        need: {
          include: {
            cities: true,
            users: {
              select: {
                user_id: true,
                full_name: true,
                phone_number: true,
                email: true
              }
            },
            accepted_ngo: {
              select: {
                ngo_id: true,
                ngo_name: true
              }
            },
            chats: true
          }
        },
        ngo: {
          select: {
            ngo_id: true,
            ngo_name: true
          }
        }
      },
      orderBy: { sent_at: 'desc' }
    });

    const enrichedIncoming = incoming.map((item) => {
      const need = enrichRequestMetadata(item.need);
      return {
        ...item,
        need
      };
    });

    res.status(200).json({ requests: enrichedIncoming });
  } catch (error: any) {
    console.error('Error fetching incoming NGO requests:', error);
    res.status(500).json({ error: 'Failed to fetch incoming NGO requests' });
  }
};

/**
 * Concurrency-Safe Atomic Acceptance Logic
 * Core implementation used by both acceptNgoIncomingRequest and respondToRequest.
 */
async function atomicAcceptRequest({
  needId,
  ngoId,
  userId,
  responseMessage
}: {
  needId: number;
  ngoId: number;
  userId: number;
  responseMessage?: string;
}) {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch and verify help_requests
    const helpRequest = await tx.help_requests.findUnique({
      where: { request_id: needId }
    });

    if (!helpRequest) {
      throw { status: 404, message: 'Help request not found' };
    }

    if (helpRequest.status !== 'PENDING') {
      throw {
        status: 409,
        message: 'This request has already been accepted or is no longer available.'
      };
    }

    if (helpRequest.expires_at && new Date(helpRequest.expires_at) <= new Date()) {
      throw {
        status: 400,
        message: 'This request has expired and can no longer be accepted.'
      };
    }

    // 2. Fetch or ensure need_ngo_requests record for this NGO
    let ngoReq = await tx.need_ngo_requests.findUnique({
      where: {
        need_id_ngo_id: {
          need_id: needId,
          ngo_id: ngoId
        }
      }
    });

    if (ngoReq && ngoReq.status === 'REJECTED') {
      throw {
        status: 400,
        message: 'Your NGO previously rejected this request and cannot accept it now.'
      };
    }

    const now = new Date();

    // 3. Mark this NGO request as ACCEPTED
    if (ngoReq) {
      ngoReq = await tx.need_ngo_requests.update({
        where: { id: ngoReq.id },
        data: {
          status: 'ACCEPTED',
          responded_at: now
        }
      });
    } else {
      ngoReq = await tx.need_ngo_requests.create({
        data: {
          need_id: needId,
          ngo_id: ngoId,
          status: 'ACCEPTED',
          responded_at: now
        }
      });
    }

    // 4. Concurrently CANCEL all other PENDING NGO requests for this need
    await tx.need_ngo_requests.updateMany({
      where: {
        need_id: needId,
        ngo_id: { not: ngoId },
        status: 'PENDING'
      },
      data: {
        status: 'CANCELLED'
      }
    });

    // 5. Update main request to COMPLETED with accepted_ngo_id
    const updatedRequest = await tx.help_requests.update({
      where: { request_id: needId },
      data: {
        status: 'COMPLETED',
        accepted_ngo_id: ngoId,
        completed_at: now,
        updated_at: now
      }
    });

    // 6. Create / get chat channel for communication
    let chat = await tx.chats.findUnique({
      where: {
        request_id_responder_id: {
          request_id: needId,
          responder_id: userId
        }
      }
    });

    if (!chat) {
      chat = await tx.chats.create({
        data: {
          request_id: needId,
          responder_id: userId
        }
      });
    }

    // 7. If a message was provided, add initial message
    const msgText = responseMessage?.trim() || 'Request accepted by NGO. We are ready to help.';
    await tx.messages.create({
      data: {
        chat_id: chat.chat_id,
        sender_id: userId,
        message: msgText
      }
    });

    // 8. Create request_responses record for legacy compatibility
    await tx.request_responses.upsert({
      where: {
        request_id_responder_id: {
          request_id: needId,
          responder_id: userId
        }
      },
      update: {
        response_message: msgText,
        status: 'ACCEPTED',
        response_time: now
      },
      create: {
        request_id: needId,
        responder_id: userId,
        response_message: msgText,
        status: 'ACCEPTED',
        response_time: now
      }
    });

    return { updatedRequest, ngoReq, chat };
  });
}

/**
 * POST /api/requests/ngo/incoming/:id/accept
 * NGO accepts an incoming request from their dashboard.
 * :id can be the need_ngo_requests ID or the help_requests ID.
 */
export const acceptNgoIncomingRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid ID' });
      return;
    }

    // Get NGO
    const ngo = await prisma.ngos.findUnique({
      where: { user_id: req.user.user_id }
    });

    if (!ngo && req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Only NGOs can accept requests' });
      return;
    }

    const { response_message } = req.body;

    // Check if :id is need_ngo_requests ID or request_id
    let needId = id;
    const ngoReq = await prisma.need_ngo_requests.findUnique({ where: { id } });
    if (ngoReq) {
      needId = ngoReq.need_id;
    }

    const effectiveNgoId = ngo ? ngo.ngo_id : req.body.ngo_id;
    if (!effectiveNgoId) {
      res.status(400).json({ error: 'Target NGO ID required' });
      return;
    }

    const result = await atomicAcceptRequest({
      needId,
      ngoId: effectiveNgoId,
      userId: req.user.user_id,
      responseMessage: response_message
    });

    res.status(200).json({
      message: 'Request accepted successfully. Request is now COMPLETED.',
      request: enrichRequestMetadata(result.updatedRequest),
      chat_id: result.chat.chat_id
    });
  } catch (error: any) {
    console.error('Error accepting incoming NGO request:', error);
    if (error.status) {
      res.status(error.status).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to accept request' });
    }
  }
};

/**
 * POST /api/requests/ngo/incoming/:id/reject
 * NGO rejects an incoming request with optional reason.
 * The NGO cannot accept or act on this request again.
 */
export const rejectNgoIncomingRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid ID' });
      return;
    }

    const ngo = await prisma.ngos.findUnique({
      where: { user_id: req.user.user_id }
    });

    if (!ngo && req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Only NGOs can reject requests' });
      return;
    }

    const { reason } = req.body;

    // Find the need_ngo_requests record
    let ngoReq = await prisma.need_ngo_requests.findUnique({ where: { id } });
    if (!ngoReq && ngo) {
      // Try resolving by need_id and ngo_id
      ngoReq = await prisma.need_ngo_requests.findUnique({
        where: {
          need_id_ngo_id: {
            need_id: id,
            ngo_id: ngo.ngo_id
          }
        }
      });
    }

    if (!ngoReq) {
      res.status(404).json({ error: 'Incoming request not found' });
      return;
    }

    // Verify ownership
    if (ngo && ngoReq.ngo_id !== ngo.ngo_id && req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'You do not have permission to reject this request' });
      return;
    }

    if (ngoReq.status !== 'PENDING') {
      res.status(400).json({
        error: `Cannot reject a request in ${ngoReq.status} status`
      });
      return;
    }

    const updated = await prisma.need_ngo_requests.update({
      where: { id: ngoReq.id },
      data: {
        status: 'REJECTED',
        responded_at: new Date(),
        rejection_reason: reason?.trim() || null
      }
    });

    res.status(200).json({
      message: 'Request rejected',
      status: 'REJECTED',
      request: updated
    });
  } catch (error: any) {
    console.error('Error rejecting incoming NGO request:', error);
    res.status(500).json({ error: 'Failed to reject request' });
  }
};

/**
 * POST /api/requests/:id/respond - NGO/Volunteer responds to a request (legacy & feed endpoint)
 * Uses the exact same atomic transaction logic.
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

    // Find NGO ID
    const ngo = await prisma.ngos.findUnique({
      where: { user_id: req.user.user_id }
    });

    if (!ngo && req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Only verified NGOs can accept requests' });
      return;
    }

    const ngoId = ngo ? ngo.ngo_id : 1; // Fallback for admin

    const result = await atomicAcceptRequest({
      needId: requestId,
      ngoId,
      userId: req.user.user_id,
      responseMessage: response_message.trim()
    });

    res.status(201).json({
      message: 'Request accepted successfully',
      request: enrichRequestMetadata(result.updatedRequest),
      chat_id: result.chat.chat_id
    });
  } catch (error: any) {
    console.error('Error responding to request:', error);
    if (error.status) {
      res.status(error.status).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to respond to request' });
    }
  }
};

/**
 * PATCH /api/requests/:id/status - Update request status
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

      // Also cancel pending need_ngo_requests
      await prisma.need_ngo_requests.updateMany({
        where: { need_id: requestId, status: 'PENDING' },
        data: { status: 'CANCELLED' }
      });
    }

    // Only responder (NGO/Volunteer) or admin can mark as COMPLETED
    if (status === 'COMPLETED') {
      if (!isResponder && !isAdmin) {
        res.status(403).json({ error: 'Only the assigned NGO/volunteer or admin can complete a request' });
        return;
      }
    }

    const updated = await prisma.help_requests.update({
      where: { request_id: requestId },
      data: {
        status: status as any,
        completed_at: status === 'COMPLETED' ? new Date() : helpRequest.completed_at,
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
        need_ngo_requests: {
          include: { ngo: true }
        }
      }
    });

    res.status(200).json({
      message: `Request status updated to ${status}`,
      request: enrichRequestMetadata(updated)
    });
  } catch (error: any) {
    console.error('Error updating request status:', error);
    res.status(500).json({ error: 'Failed to update request status' });
  }
};
