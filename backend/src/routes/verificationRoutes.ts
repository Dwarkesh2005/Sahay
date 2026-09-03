import { Router } from 'express';
import { VerificationController } from '../controllers/verificationController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';
import { uploadVerificationDoc } from '../middleware/uploadMiddleware';

const router = Router();

// Protect all NGO verification routes: authenticated users with NGO or ADMIN role
router.use(authenticateToken);
router.use(requireRole(['NGO', 'ADMIN']));

router.get('/', VerificationController.getMyVerification);
router.post('/documents', uploadVerificationDoc.single('document'), VerificationController.uploadDocument);
router.get('/documents', VerificationController.getMyDocuments);
router.delete('/documents/:id', VerificationController.deleteDocument);
router.post('/process', VerificationController.processMyVerification);
router.get('/report', VerificationController.getMyReport);

export default router;
