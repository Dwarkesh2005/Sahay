import { Router } from 'express';
import {
  createRequest,
  getRequests,
  getRequestById,
  respondToRequest,
  updateRequestStatus
} from '../controllers/requestController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

// All request routes require authentication
router.use(authenticateToken);

router.post('/', requireRole(['MIGRANT', 'VOLUNTEER', 'ADMIN']), createRequest);
router.get('/', getRequests);
router.get('/:id', getRequestById);
router.post('/:id/respond', requireRole(['NGO', 'VOLUNTEER']), respondToRequest);
router.patch('/:id/status', updateRequestStatus);

export default router;
