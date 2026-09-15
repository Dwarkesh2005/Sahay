import { Router } from 'express';
import {
  createRequest,
  getRequests,
  getRequestById,
  sendNeedRequests,
  remindNgos,
  getReminderStatus,
  renewRequest,
  getNgoIncomingRequests,
  acceptNgoIncomingRequest,
  rejectNgoIncomingRequest,
  respondToRequest,
  updateRequestStatus
} from '../controllers/requestController';
import { getRequestRecommendations } from '../controllers/recommendationController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

// All request routes require authentication
router.use(authenticateToken);

// General requests list and creation
router.post('/', requireRole(['MIGRANT', 'VOLUNTEER', 'ADMIN']), createRequest);
router.get('/', getRequests);

// NGO Incoming Requests management (must be defined BEFORE :id routes!)
router.get('/ngo/incoming', requireRole(['NGO', 'ADMIN']), getNgoIncomingRequests);
router.post('/ngo/incoming/:id/accept', requireRole(['NGO', 'ADMIN']), acceptNgoIncomingRequest);
router.post('/ngo/incoming/:id/reject', requireRole(['NGO', 'ADMIN']), rejectNgoIncomingRequest);

// Specific request routes
router.get('/:id', getRequestById);
router.get('/:id/recommendations', getRequestRecommendations);
router.post('/:id/send-requests', requireRole(['MIGRANT', 'VOLUNTEER', 'ADMIN']), sendNeedRequests);
router.post('/:id/remind', requireRole(['MIGRANT', 'VOLUNTEER', 'ADMIN']), remindNgos);
router.get('/:id/reminder-status', requireRole(['MIGRANT', 'VOLUNTEER', 'ADMIN']), getReminderStatus);
router.post('/:id/renew', requireRole(['MIGRANT', 'VOLUNTEER', 'ADMIN']), renewRequest);

// Response & status update
router.post('/:id/respond', requireRole(['NGO', 'VOLUNTEER', 'ADMIN']), respondToRequest);
router.patch('/:id/status', updateRequestStatus);

export default router;
