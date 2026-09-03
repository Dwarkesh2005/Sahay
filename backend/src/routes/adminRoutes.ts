import { Router } from 'express';
import {
  getStats,
  getAdminNgos,
  verifyNgo,
  rejectNgo,
  getAdminUsers,
  toggleUserStatus,
  getAdminRequests,
  getAdminReports,
  resolveReport
} from '../controllers/adminController';
import { VerificationController } from '../controllers/verificationController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

// All admin routes require authentication + ADMIN role
router.use(authenticateToken);
router.use(requireRole(['ADMIN']));

router.get('/stats', getStats);
router.get('/ngos', getAdminNgos);
router.patch('/ngos/:id/verify', verifyNgo);
router.patch('/ngos/:id/reject', rejectNgo);
router.get('/users', getAdminUsers);
router.patch('/users/:id/status', toggleUserStatus);
router.get('/requests', getAdminRequests);
router.get('/reports', getAdminReports);
router.patch('/reports/:id', resolveReport);

// Verification queue and actions
router.get('/verifications', VerificationController.getAdminVerifications);
router.get('/verifications/:id', VerificationController.getAdminVerificationById);
router.get('/verifications/:id/document/:docId/view', VerificationController.getDocumentSignedUrl);
router.post('/verifications/:id/approve', VerificationController.adminApprove);
router.post('/verifications/:id/reject', VerificationController.adminReject);
router.post('/verifications/:id/request-correction', VerificationController.adminRequestCorrection);
router.post('/verifications/:id/reprocess', VerificationController.adminReprocess);

export default router;
