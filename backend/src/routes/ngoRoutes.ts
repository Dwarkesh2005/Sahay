import { Router } from 'express';
import { getNgos, getNgoById, updateMyNgoProfile, reportNgo } from '../controllers/ngoController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

// Public: Browse & search NGOs
router.get('/', getNgos);

// Protected: NGO profile management (MUST be before /:id to avoid route conflict)
router.put('/my/profile', authenticateToken, requireRole(['NGO']), updateMyNgoProfile);

// Public: Get single NGO details
router.get('/:id', getNgoById);

// Protected: Report an NGO
router.post('/:id/report', authenticateToken, reportNgo);

export default router;
