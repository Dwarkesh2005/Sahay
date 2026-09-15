import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/authMiddleware';
import { getRecommendations } from '../services/recommendationService';

/**
 * GET /api/requests/:id/recommendations
 * Returns NGO recommendations for a specific help request.
 * 
 * Authorization: user must own the request, or be ADMIN.
 */
export const getRequestRecommendations = async (req: AuthRequest, res: Response): Promise<void> => {
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

    // Verify the request exists
    const helpRequest = await prisma.help_requests.findUnique({
      where: { request_id: requestId },
      select: { user_id: true, request_id: true }
    });

    if (!helpRequest) {
      res.status(404).json({ error: 'Help request not found' });
      return;
    }

    // Authorization: only the request owner or an admin can get recommendations
    const isOwner = helpRequest.user_id === req.user.user_id;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      res.status(403).json({ error: 'You do not have permission to view recommendations for this request' });
      return;
    }

    // Get recommendations
    const { categories, recommendations } = await getRecommendations(requestId, helpRequest.user_id);

    res.status(200).json({
      success: true,
      data: recommendations,
      meta: {
        requestId,
        detectedCategories: categories,
        totalResults: recommendations.length
      }
    });
  } catch (error: any) {
    console.error('Error fetching recommendations:', error);

    if (error.message === 'Help request not found') {
      res.status(404).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to fetch NGO recommendations' });
  }
};
