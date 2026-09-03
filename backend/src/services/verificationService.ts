import { prisma } from '../db';
import {
  document_type,
  document_status,
  doc_verification_status,
  field_importance,
} from '@prisma/client';
import { FIELD_WEIGHTS, FIELD_IMPORTANCE, OCR_CONFIG } from '../config/verification';
import { FileService } from './fileService';
import { MatchingService, FieldComparisonResult } from './matchingService';
import { VerificationStateMachine } from './verificationStateMachine';

export class VerificationService {
  /**
   * Retrieves or initializes the verification record for an NGO.
   */
  public static async getOrCreateVerification(ngoId: number) {
    let verif = await prisma.ngo_doc_verification.findUnique({
      where: { ngo_id: ngoId },
      include: {
        documents: {
          where: { is_active: true },
          orderBy: { created_at: 'desc' },
        },
        fields: true,
        issues: true,
        audit_logs: {
          orderBy: { created_at: 'desc' },
          take: 20,
        },
      },
    });

    if (!verif) {
      verif = await prisma.ngo_doc_verification.create({
        data: {
          ngo_id: ngoId,
          status: 'NOT_SUBMITTED',
        },
        include: {
          documents: true,
          fields: true,
          issues: true,
          audit_logs: true,
        },
      });

      // Initial audit log
      await prisma.ngo_verification_audit_log.create({
        data: {
          verification_id: verif.verification_id,
          ngo_id: ngoId,
          action: 'INITIALIZED',
          previous_status: null,
          new_status: 'NOT_SUBMITTED',
          reason: 'Verification record initialized for NGO.',
        },
      });
    }

    return verif;
  }

  /**
   * Handles document upload for an NGO.
   */
  public static async uploadDocument(
    ngoId: number,
    file: Express.Multer.File,
    documentType: document_type
  ) {
    const verif = await this.getOrCreateVerification(ngoId);

    // Calculate file hash
    const fileHash = await FileService.calculateFileHash(file.path);

    // Check for duplicates
    const duplicateDoc = await prisma.ngo_verification_documents.findFirst({
      where: {
        file_hash: fileHash,
        is_active: true,
      },
    });

    const isDuplicate = !!duplicateDoc;

    // Check if there is an existing active document of the same type for versioning
    const existingDoc = await prisma.ngo_verification_documents.findFirst({
      where: {
        verification_id: verif.verification_id,
        document_type: documentType,
        is_active: true,
      },
      orderBy: { version: 'desc' },
    });

    const nextVersion = existingDoc ? existingDoc.version + 1 : 1;

    // If updating, soft-deactivate old version
    if (existingDoc) {
      await prisma.ngo_verification_documents.update({
        where: { document_id: existingDoc.document_id },
        data: { is_active: false },
      });
    }

    const newDoc = await prisma.ngo_verification_documents.create({
      data: {
        verification_id: verif.verification_id,
        ngo_id: ngoId,
        document_type: documentType,
        original_filename: file.originalname,
        stored_filename: file.filename,
        file_path: file.path,
        file_size: file.size,
        mime_type: file.mimetype,
        file_hash: fileHash,
        version: nextVersion,
        is_active: true,
        status: 'UPLOADED',
        quality_issues: isDuplicate
          ? 'This document appears identical to a previously uploaded document.'
          : null,
      },
    });

    // Update verification status to DOCUMENTS_UPLOADED
    if (
      verif.status === 'NOT_SUBMITTED' ||
      verif.status === 'DOCUMENTS_REQUIRED' ||
      verif.status === 'NEEDS_CORRECTION'
    ) {
      const prevStatus = verif.status;
      await prisma.ngo_doc_verification.update({
        where: { verification_id: verif.verification_id },
        data: {
          status: 'DOCUMENTS_UPLOADED',
          updated_at: new Date(),
        },
      });

      await prisma.ngo_verification_audit_log.create({
        data: {
          verification_id: verif.verification_id,
          ngo_id: ngoId,
          action: 'DOCUMENT_UPLOADED',
          previous_status: prevStatus,
          new_status: 'DOCUMENTS_UPLOADED',
          reason: `Uploaded ${documentType} (v${nextVersion})${isDuplicate ? ' [Duplicate Hash Detected]' : ''}`,
          metadata: {
            document_id: newDoc.document_id,
            document_type: documentType,
            version: nextVersion,
            file_hash: fileHash,
            is_duplicate: isDuplicate,
          },
        },
      });
    }

    return newDoc;
  }

  /**
   * Deletes (deactivates) an uploaded document.
   */
  public static async removeDocument(ngoId: number, documentId: number) {
    const doc = await prisma.ngo_verification_documents.findFirst({
      where: { document_id: documentId, ngo_id: ngoId },
    });

    if (!doc) {
      throw new Error('Document not found or unauthorized.');
    }

    await prisma.ngo_verification_documents.update({
      where: { document_id: documentId },
      data: { is_active: false, updated_at: new Date() },
    });

    FileService.deleteFile(doc.file_path);

    await prisma.ngo_verification_audit_log.create({
      data: {
        verification_id: doc.verification_id,
        ngo_id: ngoId,
        action: 'DOCUMENT_REMOVED',
        previous_status: null,
        new_status: null,
        reason: `Removed document: ${doc.original_filename} (${doc.document_type})`,
      },
    });

    return { success: true, message: 'Document removed successfully.' };
  }

  /**
   * Runs the full automated verification pipeline:
   * OCR Processing -> Text Extraction -> Normalization -> Matching Engine -> Consistency Score -> Issues
   */
  public static async processVerification(ngoId: number) {
    const ngo = await prisma.ngos.findUnique({
      where: { ngo_id: ngoId },
      include: {
        ngo_doc_verification: true,
        cities: true,
      },
    });

    if (!ngo) {
      throw new Error('NGO not found.');
    }

    const verif = await this.getOrCreateVerification(ngoId);

    // Assert state transition to PROCESSING
    VerificationStateMachine.assertTransition(verif.status, 'PROCESSING');

    // Update status to PROCESSING
    await prisma.ngo_doc_verification.update({
      where: { verification_id: verif.verification_id },
      data: {
        status: 'PROCESSING',
        submitted_at: new Date(),
        updated_at: new Date(),
      },
    });

    const activeDocs = await prisma.ngo_verification_documents.findMany({
      where: {
        verification_id: verif.verification_id,
        is_active: true,
      },
    });

    if (activeDocs.length === 0) {
      await prisma.ngo_doc_verification.update({
        where: { verification_id: verif.verification_id },
        data: { status: 'DOCUMENTS_REQUIRED', updated_at: new Date() },
      });
      throw new Error('No active documents uploaded for verification.');
    }

    // Process each document through Python OCR service
    const extractedFieldsMap: Record<string, { value: string; confidence: number; docId: number; page: number }> = {};
    const ocrConfidences: number[] = [];

    for (const doc of activeDocs) {
      await prisma.ngo_verification_documents.update({
        where: { document_id: doc.document_id },
        data: { status: 'PROCESSING', updated_at: new Date() },
      });

      try {
        const ocrResult = await this.callOcrService(doc.file_path, doc.document_type, doc.document_id);

        const avgConfidence = ocrResult.quality?.overall_confidence ?? 0.85;
        ocrConfidences.push(avgConfidence);

        const rawText = ocrResult.pages?.map((p: any) => p.text).join('\n\n') || '';

        await prisma.ngo_verification_documents.update({
          where: { document_id: doc.document_id },
          data: {
            status: 'PROCESSED',
            ocr_confidence: avgConfidence,
            ocr_raw_text: rawText,
            quality_score: avgConfidence,
            quality_issues: ocrResult.quality?.issues?.join('; ') || null,
            processing_error: null,
            updated_at: new Date(),
          },
        });

        // Collect extracted fields
        if (ocrResult.extracted_fields) {
          for (const [key, item] of Object.entries<any>(ocrResult.extracted_fields)) {
            if (item && item.value && (!extractedFieldsMap[key] || item.confidence > extractedFieldsMap[key].confidence)) {
              extractedFieldsMap[key] = {
                value: item.value,
                confidence: item.confidence,
                docId: doc.document_id,
                page: item.page || 1,
              };
            }
          }
        }
      } catch (err: any) {
        console.error(`[VerificationService] OCR failed for doc ${doc.document_id}:`, err);
        await prisma.ngo_verification_documents.update({
          where: { document_id: doc.document_id },
          data: {
            status: 'FAILED',
            processing_error: err.message || 'OCR processing service unreachable or failed.',
            updated_at: new Date(),
          },
        });
      }
    }

    // Prepare fields to compare
    const fieldsToCompare: Array<{ fieldName: string; submitted: string | null; importance: field_importance }> = [
      { fieldName: 'organization_name', submitted: ngo.ngo_name, importance: 'HIGH' },
      { fieldName: 'registration_number', submitted: ngo.registration_number, importance: 'HIGH' },
      { fieldName: 'pan', submitted: ngo.pan, importance: 'HIGH' },
      { fieldName: 'address', submitted: `${ngo.address}, ${ngo.cities?.city_name || ''}`, importance: 'MEDIUM' },
      { fieldName: 'phone', submitted: ngo.phone_number, importance: 'MEDIUM' },
      { fieldName: 'email', submitted: ngo.email, importance: 'MEDIUM' },
    ];

    // Clear previous verification fields and issues for this verification run
    await prisma.ngo_verification_fields.deleteMany({
      where: { verification_id: verif.verification_id },
    });
    await prisma.ngo_verification_issues.deleteMany({
      where: { verification_id: verif.verification_id },
    });

    let totalWeight = 0;
    let weightedScoreSum = 0;
    let matchCount = 0;
    let mismatchCount = 0;
    let notFoundCount = 0;

    const generatedIssues: Array<{
      issue_type: string;
      severity: string;
      description: string;
      field_name?: string;
      document_id?: number;
    }> = [];

    // Compare each field
    for (const item of fieldsToCompare) {
      const extracted = extractedFieldsMap[item.fieldName];
      const comparison: FieldComparisonResult = await MatchingService.compareField({
        fieldName: item.fieldName,
        submittedValue: item.submitted,
        extractedValue: extracted?.value || null,
        ocrConfidence: extracted?.confidence ?? 0.85,
      });

      // Record field comparison in DB
      await prisma.ngo_verification_fields.create({
        data: {
          verification_id: verif.verification_id,
          document_id: extracted?.docId || null,
          field_name: item.fieldName,
          submitted_value: comparison.submittedValue,
          extracted_value: comparison.extractedValue,
          normalized_submitted: comparison.normalizedSubmitted,
          normalized_extracted: comparison.normalizedExtracted,
          match_result: comparison.result,
          confidence: comparison.confidence,
          importance: item.importance,
          source_page: extracted?.page || null,
          extraction_notes: comparison.notes,
        },
      });

      const weight = FIELD_WEIGHTS[item.fieldName] || 5;

      if (comparison.result === 'MATCH') {
        matchCount++;
        weightedScoreSum += weight * (comparison.matchScore / 100);
        totalWeight += weight;
      } else if (comparison.result === 'PARTIAL_MATCH') {
        matchCount++;
        weightedScoreSum += weight * (comparison.matchScore / 100);
        totalWeight += weight;
        generatedIssues.push({
          issue_type: 'PARTIAL_MATCH',
          severity: 'LOW',
          description: `${item.fieldName.replace('_', ' ')}: ${comparison.notes}`,
          field_name: item.fieldName,
          document_id: extracted?.docId,
        });
      } else if (comparison.result === 'MISMATCH') {
        mismatchCount++;
        totalWeight += weight;
        generatedIssues.push({
          issue_type: 'MISMATCH',
          severity: item.importance === 'HIGH' ? 'HIGH' : 'MEDIUM',
          description: `${item.fieldName.replace('_', ' ')} mismatch: ${comparison.notes}`,
          field_name: item.fieldName,
          document_id: extracted?.docId,
        });
      } else if (comparison.result === 'NOT_FOUND') {
        notFoundCount++;
        totalWeight += weight;
        generatedIssues.push({
          issue_type: 'MISSING_FIELD',
          severity: item.importance === 'HIGH' ? 'MEDIUM' : 'LOW',
          description: `${item.fieldName.replace('_', ' ')} was submitted but not found in uploaded documents.`,
          field_name: item.fieldName,
        });
      } else if (comparison.result === 'LOW_CONFIDENCE') {
        totalWeight += weight;
        weightedScoreSum += weight * 0.5;
        generatedIssues.push({
          issue_type: 'LOW_OCR_CONFIDENCE',
          severity: 'MEDIUM',
          description: `${item.fieldName.replace('_', ' ')} has low OCR extraction confidence (${Math.round((comparison.confidence || 0) * 100)}%).`,
          field_name: item.fieldName,
        });
      }
    }

    // Compute Document Consistency Score (0-100)
    const screeningScore = totalWeight > 0 ? Math.round((weightedScoreSum / totalWeight) * 100) : 0;
    const avgOcrConf = ocrConfidences.length > 0
      ? ocrConfidences.reduce((a, b) => a + b, 0) / ocrConfidences.length
      : 0;

    // Insert generated issues
    for (const issue of generatedIssues) {
      await prisma.ngo_verification_issues.create({
        data: {
          verification_id: verif.verification_id,
          document_id: issue.document_id || null,
          issue_type: issue.issue_type,
          severity: issue.severity,
          description: issue.description,
          field_name: issue.field_name || null,
        },
      });
    }

    // Transition to AUTO_REVIEW_READY then NEEDS_ADMIN_REVIEW
    await prisma.ngo_doc_verification.update({
      where: { verification_id: verif.verification_id },
      data: {
        status: 'NEEDS_ADMIN_REVIEW',
        screening_score: screeningScore,
        total_matches: matchCount,
        total_mismatches: mismatchCount,
        total_not_found: notFoundCount,
        ocr_confidence_avg: avgOcrConf,
        processed_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Create Audit Log
    await prisma.ngo_verification_audit_log.create({
      data: {
        verification_id: verif.verification_id,
        ngo_id: ngoId,
        action: 'AUTOMATED_SCREENING_COMPLETED',
        previous_status: 'PROCESSING',
        new_status: 'NEEDS_ADMIN_REVIEW',
        reason: `Automated screening complete. Score: ${screeningScore}%. Matches: ${matchCount}, Mismatches: ${mismatchCount}, Missing: ${notFoundCount}`,
        screening_score: screeningScore,
        metadata: {
          score: screeningScore,
          matches: matchCount,
          mismatches: mismatchCount,
          not_found: notFoundCount,
          issues_count: generatedIssues.length,
        },
      },
    });

    return this.getOrCreateVerification(ngoId);
  }

  /**
   * Calls Python OCR service endpoint. Falls back to mock extraction if service is down.
   */
  private static async callOcrService(filePath: string, documentType: string, documentId: number): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OCR_CONFIG.TIMEOUT_MS);

    try {
      const response = await fetch(`${OCR_CONFIG.SERVICE_URL}/process-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_path: filePath,
          document_type: documentType,
          document_id: documentId,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`OCR service responded with status ${response.status}`);
      }

      return await response.json();
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn(`[VerificationService] Python OCR Service unavailable or timed out: ${err.message}. Using safe fallback extraction.`);
      return {
        success: true,
        document_id: documentId,
        pages: [{ page: 1, text: '', confidence: 0.75, word_count: 0 }],
        extracted_fields: {},
        quality: { overall_confidence: 0.75, is_readable: true, issues: ['Local OCR fallback applied'] },
      };
    }
  }

  /**
   * Admin approves verification.
   */
  public static async adminApprove(verificationId: number, adminId: number, remarks?: string) {
    const verif = await prisma.ngo_doc_verification.findUnique({
      where: { verification_id: verificationId },
      include: { ngos: true },
    });

    if (!verif) throw new Error('Verification record not found.');

    VerificationStateMachine.assertTransition(verif.status, 'APPROVED');

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update doc verification status
      const updatedVerif = await tx.ngo_doc_verification.update({
        where: { verification_id: verificationId },
        data: {
          status: 'APPROVED',
          admin_notes: remarks || 'Approved by administrator.',
          reviewed_at: new Date(),
          reviewed_by: adminId,
          updated_at: new Date(),
        },
      });

      // 2. Set existing NGO verification status to MANUALLY_VERIFIED (maintains backward compatibility)
      await tx.ngos.update({
        where: { ngo_id: verif.ngo_id },
        data: {
          verification_status: 'MANUALLY_VERIFIED',
          updated_at: new Date(),
        },
      });

      // 3. Mark user as verified
      await tx.users.update({
        where: { user_id: verif.ngos.user_id },
        data: {
          is_verified: true,
          updated_at: new Date(),
        },
      });

      // 4. Create audit log
      await tx.ngo_verification_audit_log.create({
        data: {
          verification_id: verificationId,
          ngo_id: verif.ngo_id,
          admin_id: adminId,
          action: 'APPROVED',
          previous_status: verif.status,
          new_status: 'APPROVED',
          reason: remarks || 'Approved by administrator after evidence review.',
          screening_score: verif.screening_score,
        },
      });

      // 5. Add record to legacy ngo_verification table
      await tx.ngo_verification.create({
        data: {
          ngo_id: verif.ngo_id,
          verification_method: 'MANUALLY_VERIFIED',
          verified_by: `Admin #${adminId}`,
          remarks: remarks || 'Approved via document verification system.',
        },
      });

      return updatedVerif;
    });

    return result;
  }

  /**
   * Admin rejects verification. Requires a reason.
   */
  public static async adminReject(verificationId: number, adminId: number, reason: string) {
    if (!reason || reason.trim().length < 5) {
      throw new Error('A rejection reason is required (at least 5 characters).');
    }

    const verif = await prisma.ngo_doc_verification.findUnique({
      where: { verification_id: verificationId },
    });

    if (!verif) throw new Error('Verification record not found.');

    VerificationStateMachine.assertTransition(verif.status, 'REJECTED');

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.ngo_doc_verification.update({
        where: { verification_id: verificationId },
        data: {
          status: 'REJECTED',
          admin_notes: reason.trim(),
          reviewed_at: new Date(),
          reviewed_by: adminId,
          updated_at: new Date(),
        },
      });

      await tx.ngo_verification_audit_log.create({
        data: {
          verification_id: verificationId,
          ngo_id: verif.ngo_id,
          admin_id: adminId,
          action: 'REJECTED',
          previous_status: verif.status,
          new_status: 'REJECTED',
          reason: reason.trim(),
          screening_score: verif.screening_score,
        },
      });

      return updated;
    });

    return result;
  }

  /**
   * Admin requests corrections or document re-upload. Requires a reason.
   */
  public static async adminRequestCorrection(verificationId: number, adminId: number, reason: string) {
    if (!reason || reason.trim().length < 5) {
      throw new Error('A reason specifying required corrections is required (at least 5 characters).');
    }

    const verif = await prisma.ngo_doc_verification.findUnique({
      where: { verification_id: verificationId },
    });

    if (!verif) throw new Error('Verification record not found.');

    VerificationStateMachine.assertTransition(verif.status, 'NEEDS_CORRECTION');

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.ngo_doc_verification.update({
        where: { verification_id: verificationId },
        data: {
          status: 'NEEDS_CORRECTION',
          admin_notes: reason.trim(),
          reviewed_at: new Date(),
          reviewed_by: adminId,
          updated_at: new Date(),
        },
      });

      await tx.ngo_verification_audit_log.create({
        data: {
          verification_id: verificationId,
          ngo_id: verif.ngo_id,
          admin_id: adminId,
          action: 'REQUEST_CORRECTION',
          previous_status: verif.status,
          new_status: 'NEEDS_CORRECTION',
          reason: reason.trim(),
          screening_score: verif.screening_score,
        },
      });

      return updated;
    });

    return result;
  }
}
