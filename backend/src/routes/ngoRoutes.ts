import { Router } from 'express';
import { getNgos, getNgoById, updateMyNgoProfile, reportNgo } from '../controllers/ngoController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

// Public: Browse & search NGOs
router.get('/', getNgos);
router.get('/:id', getNgoById);

// Protected: NGO profile management
router.put('/my/profile', authenticateToken, requireRole(['NGO']), updateMyNgoProfile);

// Protected: Report an NGO
router.post('/:id/report', authenticateToken, reportNgo);

export default router;
