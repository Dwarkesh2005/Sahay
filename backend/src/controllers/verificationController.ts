import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/authMiddleware';
import { VerificationService } from '../services/verificationService';
import { FileService } from '../services/fileService';
import { document_type } from '@prisma/client';

export class VerificationController {
  // ==========================================
  // NGO-FACING ENDPOINTS
  // ==========================================

  /**
   * GET /api/ngos/verification - Get own verification status and report
   */
  public static async getMyVerification(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const ngo = await prisma.ngos.findUnique({
        where: { user_id: req.user.user_id },
        include: { cities: true },
      });

      if (!ngo) {
        res.status(404).json({ error: 'NGO profile not found for this user' });
        return;
      }

      const verif = await VerificationService.getOrCreateVerification(ngo.ngo_id);

      res.status(200).json({
        ngo,
        verification: verif,
      });
    } catch (error: any) {
      console.error('[VerificationController] getMyVerification error:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch verification status' });
    }
  }

  /**
   * POST /api/ngos/verification/documents - Upload document
   */
  public static async uploadDocument(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const ngo = await prisma.ngos.findUnique({
        where: { user_id: req.user.user_id },
      });

      if (!ngo) {
        res.status(404).json({ error: 'NGO profile not found' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded. Supported formats: PDF, JPG, JPEG, PNG.' });
        return;
      }

      const docType = req.body.document_type as document_type;
      const validTypes = [
        'REGISTRATION_CERTIFICATE',
        'PAN_DOCUMENT',
        'TRUST_REGISTRATION',
        'SOCIETY_REGISTRATION',
        'SECTION_8_CERTIFICATE',
        'TWELVE_A_CERTIFICATE',
        'EIGHTY_G_CERTIFICATE',
        'ADDRESS_PROOF',
        'AUTHORIZED_REPRESENTATIVE_PROOF',
        'OTHER',
      ];

      if (!docType || !validTypes.includes(docType)) {
        FileService.deleteFile(req.file.path);
        res.status(400).json({
          error: `Invalid document_type. Must be one of: ${validTypes.join(', ')}`,
        });
        return;
      }

      const document = await VerificationService.uploadDocument(ngo.ngo_id, req.file, docType);

      res.status(201).json({
        message: 'Document uploaded successfully',
        document: {
          document_id: document.document_id,
          document_type: document.document_type,
          original_filename: document.original_filename,
          file_size: document.file_size,
          version: document.version,
          status: document.status,
          quality_issues: document.quality_issues,
          created_at: document.created_at,
        },
      });
    } catch (error: any) {
      if (req.file) FileService.deleteFile(req.file.path);
      console.error('[VerificationController] uploadDocument error:', error);
      res.status(500).json({ error: error.message || 'Failed to upload document' });
    }
  }

  /**
   * GET /api/ngos/verification/documents - List own active documents
   */
  public static async getMyDocuments(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const ngo = await prisma.ngos.findUnique({
        where: { user_id: req.user.user_id },
      });

      if (!ngo) {
        res.status(404).json({ error: 'NGO profile not found' });
        return;
      }

      const documents = await prisma.ngo_verification_documents.findMany({
        where: {
          ngo_id: ngo.ngo_id,
          is_active: true,
        },
        orderBy: { created_at: 'desc' },
        select: {
          document_id: true,
          document_type: true,
          original_filename: true,
          file_size: true,
          version: true,
          status: true,
          ocr_confidence: true,
          quality_score: true,
          quality_issues: true,
          created_at: true,
        },
      });

      res.status(200).json({ documents });
    } catch (error: any) {
      console.error('[VerificationController] getMyDocuments error:', error);
      res.status(500).json({ error: 'Failed to fetch documents' });
    }
  }

  /**
   * DELETE /api/ngos/verification/documents/:id - Remove document
   */
  public static async deleteDocument(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const documentId = parseInt(req.params.id as string, 10);
      if (isNaN(documentId)) {
        res.status(400).json({ error: 'Invalid document ID' });
        return;
      }

      const ngo = await prisma.ngos.findUnique({
        where: { user_id: req.user.user_id },
      });

      if (!ngo) {
        res.status(404).json({ error: 'NGO profile not found' });
        return;
      }

      const result = await VerificationService.removeDocument(ngo.ngo_id, documentId);
      res.status(200).json(result);
    } catch (error: any) {
      console.error('[VerificationController] deleteDocument error:', error);
      res.status(500).json({ error: error.message || 'Failed to remove document' });
    }
  }

  /**
   * POST /api/ngos/verification/process - Run screening
   */
  public static async processMyVerification(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const ngo = await prisma.ngos.findUnique({
        where: { user_id: req.user.user_id },
      });

      if (!ngo) {
        res.status(404).json({ error: 'NGO profile not found' });
        return;
      }

      const updatedVerif = await VerificationService.processVerification(ngo.ngo_id);

      res.status(200).json({
        message: 'Document screening completed successfully',
        verification: updatedVerif,
      });
    } catch (error: any) {
      console.error('[VerificationController] processMyVerification error:', error);
      res.status(500).json({ error: error.message || 'Failed to process verification' });
    }
  }

  /**
   * GET /api/ngos/verification/report - Detailed screening report
   */
  public static async getMyReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const ngo = await prisma.ngos.findUnique({
        where: { user_id: req.user.user_id },
      });

      if (!ngo) {
        res.status(404).json({ error: 'NGO profile not found' });
        return;
      }

      const verif = await prisma.ngo_doc_verification.findUnique({
        where: { ngo_id: ngo.ngo_id },
        include: {
          fields: true,
          issues: true,
          documents: {
            where: { is_active: true },
            select: {
              document_id: true,
              document_type: true,
              original_filename: true,
              status: true,
              ocr_confidence: true,
              quality_issues: true,
            },
          },
        },
      });

      if (!verif) {
        res.status(404).json({ error: 'Verification report not found' });
        return;
      }

      res.status(200).json({
        screening_score: verif.screening_score,
        status: verif.status,
        matches: verif.total_matches,
        mismatches: verif.total_mismatches,
        not_found: verif.total_not_found,
        fields: verif.fields,
        issues: verif.issues,
        documents: verif.documents,
      });
    } catch (error: any) {
      console.error('[VerificationController] getMyReport error:', error);
      res.status(500).json({ error: 'Failed to fetch report' });
    }
  }

  // ==========================================
  // ADMIN-FACING ENDPOINTS
  // ==========================================

  /**
   * GET /api/admin/verifications - Admin queue of verification cases
   */
  public static async getAdminVerifications(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { status, search, page = '1', limit = '20' } = req.query;
      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};
      if (status && typeof status === 'string') {
        where.status = status as any;
      }

      if (search && typeof search === 'string') {
        where.ngos = {
          OR: [
            { ngo_name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { registration_number: { contains: search, mode: 'insensitive' } },
            { pan: { contains: search, mode: 'insensitive' } },
          ],
        };
      }

      const [verifications, total] = await Promise.all([
        prisma.ngo_doc_verification.findMany({
          where,
          include: {
            ngos: {
              include: {
                cities: true,
                users: {
                  select: { full_name: true, email: true, created_at: true },
                },
              },
            },
            documents: {
              where: { is_active: true },
              select: { document_id: true, document_type: true },
            },
            issues: {
              select: { issue_id: true, severity: true, issue_type: true },
            },
          },
          orderBy: { updated_at: 'desc' },
          skip,
          take: limitNum,
        }),
        prisma.ngo_doc_verification.count({ where }),
      ]);

      res.status(200).json({
        verifications,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error: any) {
      console.error('[VerificationController] getAdminVerifications error:', error);
      res.status(500).json({ error: 'Failed to fetch verification queue' });
    }
  }

  /**
   * GET /api/admin/verifications/:id - Get complete verification detail case
   */
  public static async getAdminVerificationById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const verifId = parseInt(req.params.id as string, 10);
      if (isNaN(verifId)) {
        res.status(400).json({ error: 'Invalid verification ID' });
        return;
      }

      const verif = await prisma.ngo_doc_verification.findUnique({
        where: { verification_id: verifId },
        include: {
          ngos: {
            include: {
              cities: true,
              users: {
                select: {
                  user_id: true,
                  full_name: true,
                  email: true,
                  phone_number: true,
                  created_at: true,
                },
              },
            },
          },
          documents: {
            where: { is_active: true },
            orderBy: { created_at: 'asc' },
          },
          fields: {
            orderBy: { field_name: 'asc' },
          },
          issues: {
            orderBy: { created_at: 'desc' },
          },
          audit_logs: {
            orderBy: { created_at: 'desc' },
          },
        },
      });

      if (!verif) {
        res.status(404).json({ error: 'Verification case not found' });
        return;
      }

      res.status(200).json({ verification: verif });
    } catch (error: any) {
      console.error('[VerificationController] getAdminVerificationById error:', error);
      res.status(500).json({ error: 'Failed to fetch verification details' });
    }
  }

  /**
   * GET /api/admin/verifications/:id/document/:docId/view - Generates signed temporary view URL
   */
  public static async getDocumentSignedUrl(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const verifId = parseInt(req.params.id as string, 10);
      const docId = parseInt(req.params.docId as string, 10);

      const doc = await prisma.ngo_verification_documents.findFirst({
        where: {
          document_id: docId,
          verification_id: verifId,
        },
      });

      if (!doc) {
        res.status(404).json({ error: 'Document not found' });
        return;
      }

      const token = FileService.generateSignedDocToken({
        documentId: doc.document_id,
        ngoId: doc.ngo_id,
        userId: req.user.user_id,
        role: req.user.role,
      });

      res.status(200).json({
        signedUrl: `/api/verification/document/download?token=${token}`,
        document: {
          document_id: doc.document_id,
          original_filename: doc.original_filename,
          mime_type: doc.mime_type,
          file_size: doc.file_size,
        },
      });
    } catch (error: any) {
      console.error('[VerificationController] getDocumentSignedUrl error:', error);
      res.status(500).json({ error: 'Failed to generate signed document URL' });
    }
  }

  /**
   * POST /api/admin/verifications/:id/approve - Admin approve
   */
  public static async adminApprove(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const verifId = parseInt(req.params.id as string, 10);
      const { remarks } = req.body;

      const result = await VerificationService.adminApprove(verifId, req.user.user_id, remarks);
      res.status(200).json({
        message: 'NGO verification approved successfully. Verified status granted.',
        verification: result,
      });
    } catch (error: any) {
      console.error('[VerificationController] adminApprove error:', error);
      res.status(400).json({ error: error.message || 'Failed to approve verification' });
    }
  }

  /**
   * POST /api/admin/verifications/:id/reject - Admin reject
   */
  public static async adminReject(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const verifId = parseInt(req.params.id as string, 10);
      const { reason } = req.body;

      if (!reason || reason.trim().length < 5) {
        res.status(400).json({ error: 'A rejection reason is required (at least 5 characters).' });
        return;
      }

      const result = await VerificationService.adminReject(verifId, req.user.user_id, reason);
      res.status(200).json({
        message: 'NGO verification rejected.',
        verification: result,
      });
    } catch (error: any) {
      console.error('[VerificationController] adminReject error:', error);
      res.status(400).json({ error: error.message || 'Failed to reject verification' });
    }
  }

  /**
   * POST /api/admin/verifications/:id/request-correction - Admin request correction
   */
  public static async adminRequestCorrection(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const verifId = parseInt(req.params.id as string, 10);
      const { reason } = req.body;

      if (!reason || reason.trim().length < 5) {
        res.status(400).json({ error: 'A reason describing the requested correction is required.' });
        return;
      }

      const result = await VerificationService.adminRequestCorrection(verifId, req.user.user_id, reason);
      res.status(200).json({
        message: 'Correction requested. NGO has been notified to re-upload documents.',
        verification: result,
      });
    } catch (error: any) {
      console.error('[VerificationController] adminRequestCorrection error:', error);
      res.status(400).json({ error: error.message || 'Failed to request correction' });
    }
  }

  /**
   * POST /api/admin/verifications/:id/reprocess - Admin reprocess screening
   */
  public static async adminReprocess(req: AuthRequest, res: Response): Promise<void> {
    try {
      const verifId = parseInt(req.params.id as string, 10);
      const verif = await prisma.ngo_doc_verification.findUnique({
        where: { verification_id: verifId },
      });

      if (!verif) {
        res.status(404).json({ error: 'Verification record not found' });
        return;
      }

      const result = await VerificationService.processVerification(verif.ngo_id);
      res.status(200).json({
        message: 'Screening reprocessed successfully',
        verification: result,
      });
    } catch (error: any) {
      console.error('[VerificationController] adminReprocess error:', error);
      res.status(400).json({ error: error.message || 'Failed to reprocess verification' });
    }
  }

  // ==========================================
  // SECURE DOCUMENT STREAMING
  // ==========================================

  /**
   * GET /api/verification/document/download?token=...
   * Authenticated streaming using signed JWT token.
   */
  public static async downloadSignedDocument(req: any, res: Response): Promise<void> {
    try {
      const token = req.query.token as string;
      if (!token) {
        res.status(401).json({ error: 'Access token required' });
        return;
      }

      const payload = FileService.verifySignedDocToken(token);
      if (!payload) {
        res.status(403).json({ error: 'Token is invalid or expired. Please generate a new preview link.' });
        return;
      }

      const doc = await prisma.ngo_verification_documents.findUnique({
        where: { document_id: payload.documentId },
      });

      if (!doc || !fs.existsSync(doc.file_path)) {
        res.status(404).json({ error: 'Document file not found on server' });
        return;
      }

      // Security headers to prevent unauthorized execution or sniffing
      res.setHeader('Content-Type', doc.mime_type);
      res.setHeader('Content-Disposition', `inline; filename="${doc.original_filename}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, max-age=300');

      const fileStream = fs.createReadStream(doc.file_path);
      fileStream.pipe(res);
    } catch (error: any) {
      console.error('[VerificationController] downloadSignedDocument error:', error);
      res.status(500).json({ error: 'Failed to access document file' });
    }
  }
}
